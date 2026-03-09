import { getClient } from "./viemClient";
import {
  identityRegistryAbi,
  reputationRegistryAbi,
  getRegistryAddresses,
} from "@/contracts";
import { DEFAULT_CHAIN } from "./chains";
import { supabase } from "./supabase";
import type {
  Agent,
  AgentMetadata,
  FeedbackSummary,
  RegistrationInfo,
  EndpointCheck,
  MetadataCompleteness,
} from "@/types/agent";

const DEFAULT_CHAIN_ID = DEFAULT_CHAIN.id;

function resolveURI(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith("data:")) {
    return uri;
  }
  return uri;
}

async function fetchMetadata(uri: string): Promise<AgentMetadata | null> {
  try {
    const resolved = resolveURI(uri);

    if (resolved.startsWith("data:")) {
      const [, encoded] = resolved.split(",");
      if (!encoded) return null;
      const decoded = resolved.includes("base64")
        ? atob(encoded)
        : decodeURIComponent(encoded);
      return JSON.parse(decoded);
    }

    const res = await fetch(resolved, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getTotalAgents(
  chainId: number = DEFAULT_CHAIN_ID
): Promise<bigint> {
  const client = getClient(chainId);
  const { identity } = getRegistryAddresses(chainId);
  try {
    return (await client.readContract({
      address: identity,
      abi: identityRegistryAbi,
      functionName: "totalSupply",
    })) as bigint;
  } catch {
    return 0n;
  }
}

export async function getAgent(
  agentId: bigint,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<Agent | null> {
  const client = getClient(chainId);
  const { identity } = getRegistryAddresses(chainId);

  try {
    const [owner, agentURI] = await Promise.all([
      client.readContract({
        address: identity,
        abi: identityRegistryAbi,
        functionName: "ownerOf",
        args: [agentId],
      }) as Promise<string>,
      client.readContract({
        address: identity,
        abi: identityRegistryAbi,
        functionName: "tokenURI",
        args: [agentId],
      }) as Promise<string>,
    ]);

    const metadata = agentURI ? await fetchMetadata(agentURI) : null;

    let wallet: string | undefined;
    try {
      wallet = (await client.readContract({
        address: identity,
        abi: identityRegistryAbi,
        functionName: "getAgentWallet",
        args: [agentId],
      })) as string;
    } catch {
      // No wallet set
    }

    return { agentId, owner, agentURI, metadata, wallet, chainId };
  } catch {
    return null;
  }
}

export async function getReputationSummary(
  agentId: bigint,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<FeedbackSummary | null> {
  const client = getClient(chainId);
  const { reputation } = getRegistryAddresses(chainId);

  try {
    const result = await client.readContract({
      address: reputation,
      abi: reputationRegistryAbi,
      functionName: "getSummary",
      args: [agentId, [], "", ""],
    });

    const [count, summaryValue, summaryValueDecimals] = result as [
      bigint,
      bigint,
      number,
    ];

    return { count, summaryValue, summaryValueDecimals };
  } catch {
    return null;
  }
}

export async function getRecentAgents(
  chainId: number = DEFAULT_CHAIN_ID,
  limit: number = 20
): Promise<Agent[]> {
  const client = getClient(chainId);
  const { identity } = getRegistryAddresses(chainId);

  try {
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock > 500n ? latestBlock - 500n : 0n;

    const logs = await client.getLogs({
      address: identity,
      event: {
        type: "event",
        name: "Registered",
        inputs: [
          { name: "agentId", type: "uint256", indexed: true },
          { name: "owner", type: "address", indexed: true },
          { name: "agentURI", type: "string", indexed: false },
        ],
      },
      fromBlock,
      toBlock: latestBlock,
    });

    const recentLogs = logs.slice(-limit).reverse();

    const agents = await Promise.all(
      recentLogs.map(async (log) => {
        const agentId = log.args.agentId!;
        const owner = log.args.owner!;
        const agentURI = log.args.agentURI || "";
        const metadata = agentURI ? await fetchMetadata(agentURI) : null;

        return { agentId, owner, agentURI, metadata, chainId } as Agent;
      })
    );

    return agents;
  } catch (error) {
    console.error("Error fetching recent agents:", error);
    return [];
  }
}

// ─── Supabase-backed agent list ───────────────────────

export async function getAllAgents(
  chainId: number = DEFAULT_CHAIN_ID
): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("agent_id, chain_id, owner")
    .eq("chain_id", chainId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to fetch agents from Supabase:", error);
    return [];
  }

  const agents = await Promise.all(
    data.map((row) => getAgent(BigInt(row.agent_id), row.chain_id))
  );

  return agents.filter((a): a is Agent => a !== null);
}

// ─── Registration info (block, tx, timestamp) ────────

export async function getRegistrationInfo(
  agentId: bigint,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<RegistrationInfo | null> {
  const client = getClient(chainId);
  const { identity } = getRegistryAddresses(chainId);

  try {
    const logs = await client.getLogs({
      address: identity,
      event: {
        type: "event",
        name: "Registered",
        inputs: [
          { name: "agentId", type: "uint256", indexed: true },
          { name: "owner", type: "address", indexed: true },
          { name: "agentURI", type: "string", indexed: false },
        ],
      },
      args: { agentId },
      fromBlock: 0n,
      toBlock: "latest",
    });

    if (logs.length === 0) return null;

    const log = logs[0];
    let timestamp: number | null = null;
    try {
      const block = await client.getBlock({
        blockNumber: log.blockNumber!,
      });
      timestamp = Number(block.timestamp);
    } catch {
      // timestamp unavailable
    }

    return {
      blockNumber: log.blockNumber!,
      txHash: log.transactionHash!,
      timestamp,
    };
  } catch {
    return null;
  }
}

// ─── Endpoint verification ────────────────────────────

export async function checkEndpoints(
  agent: Agent
): Promise<EndpointCheck[]> {
  const services = agent.metadata?.services;
  if (!services || services.length === 0) return [];

  const checks = await Promise.all(
    services
      .filter((svc) => svc.endpoint)
      .map(async (svc): Promise<EndpointCheck> => {
        try {
          const res = await fetch(svc.endpoint, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000),
          });
          return { name: svc.name, endpoint: svc.endpoint, reachable: res.ok };
        } catch {
          return { name: svc.name, endpoint: svc.endpoint, reachable: false };
        }
      })
  );

  return checks;
}

// ─── Metadata completeness ───────────────────────────

export function calcMetadataCompleteness(
  agent: Agent
): MetadataCompleteness {
  const meta = agent.metadata;

  const fields: { label: string; present: boolean }[] = [
    { label: "Name", present: !!meta?.name },
    { label: "Description", present: !!meta?.description },
    { label: "Image", present: !!meta?.image },
    {
      label: "Services",
      present: !!meta?.services && meta.services.length > 0,
    },
    {
      label: "Endpoints",
      present: !!meta?.services?.some((s) => !!s.endpoint),
    },
    { label: "Tags", present: !!meta?.tags && meta.tags.length > 0 },
    {
      label: "Trust Models",
      present: !!meta?.supportedTrust && meta.supportedTrust.length > 0,
    },
    { label: "Socials", present: !!meta?.socials },
    { label: "Active Status", present: meta?.active !== undefined },
  ];

  const score = fields.filter((f) => f.present).length;
  const total = fields.length;
  const missing = fields.filter((f) => !f.present).map((f) => f.label);

  return {
    score,
    total,
    percentage: Math.round((score / total) * 100),
    missing,
  };
}

export async function getAgentClients(
  agentId: bigint,
  chainId: number = DEFAULT_CHAIN_ID
): Promise<string[]> {
  const client = getClient(chainId);
  const { reputation } = getRegistryAddresses(chainId);

  try {
    return (await client.readContract({
      address: reputation,
      abi: reputationRegistryAbi,
      functionName: "getClients",
      args: [agentId],
    })) as string[];
  } catch {
    return [];
  }
}
