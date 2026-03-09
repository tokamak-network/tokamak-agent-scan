import {
  getAgent,
  getReputationSummary,
  getAgentClients,
  getRegistrationInfo,
  checkEndpoints,
  calcMetadataCompleteness,
} from "@/lib/agents";
import { getRegistryAddresses } from "@/contracts";
import { SUPPORTED_CHAINS } from "@/lib/chains";
import Link from "next/link";
import { notFound } from "next/navigation";
import AgentDetailTabs from "@/components/AgentDetailTabs";

export const revalidate = 60;

/* ── Helpers ── */

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatScore(value: bigint, decimals: number): string {
  if (decimals === 0) return value.toString();
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  return `${whole}.${frac.toString().padStart(decimals, "0")}`;
}

function resolveImage(url: string) {
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  return url;
}

function explorerUrl(chainId: number, type: "address" | "tx", value: string) {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
  const base = chain?.blockExplorers?.default.url;
  return base ? `${base}/${type}/${value}` : null;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function completenessColor(pct: number) {
  if (pct >= 80) return "text-green-400 bg-green-900/30";
  if (pct >= 50) return "text-amber-400 bg-amber-900/30";
  return "text-red-400 bg-red-900/30";
}

/* ── Page ── */

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agentId = BigInt(id);

  const [agent, reputation, clients, regInfo] = await Promise.all([
    getAgent(agentId),
    getReputationSummary(agentId),
    getAgentClients(agentId),
    getRegistrationInfo(agentId),
  ]);

  if (!agent) notFound();

  const meta = agent.metadata;
  const name = meta?.name || `Agent #${id}`;
  const completeness = calcMetadataCompleteness(agent);
  const endpointChecks = await checkEndpoints(agent);
  const { identity } = getRegistryAddresses(agent.chainId);
  const chainName =
    SUPPORTED_CHAINS.find((c) => c.id === agent.chainId)?.name ??
    `Chain ${agent.chainId}`;
  const fullAgentId = `${agent.chainId}:${identity}:${id}`;

  const protocols: string[] = [];
  meta?.services?.forEach((svc) => {
    const n = svc.name.toUpperCase();
    if (n.includes("MCP")) protocols.push("MCP");
    if (n.includes("A2A")) protocols.push("A2A");
  });
  const uniqueProtocols = [...new Set(protocols)];

  // Collect all skills and domains from services
  const allSkills = [
    ...new Set(meta?.services?.flatMap((svc) => svc.skills ?? []) ?? []),
  ];
  const allDomains = [
    ...new Set(meta?.services?.flatMap((svc) => svc.domains ?? []) ?? []),
  ];

  /* ── Tab Contents ── */

  const basicInfoContent = (
    <div className="space-y-6">
      {/* Identity */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Identity</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-gray-400">Agent ID</dt>
            <dd className="truncate font-mono text-xs">{fullAgentId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Token ID</dt>
            <dd className="font-mono">{id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Owner</dt>
            <dd className="font-mono">
              {(() => {
                const url = explorerUrl(agent.chainId, "address", agent.owner);
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {shortenAddress(agent.owner)}
                  </a>
                ) : (
                  shortenAddress(agent.owner)
                );
              })()}
            </dd>
          </div>
          {agent.wallet && (
            <div className="flex justify-between">
              <dt className="text-gray-400">Agent Wallet</dt>
              <dd className="font-mono">{shortenAddress(agent.wallet)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-400">Contract</dt>
            <dd className="font-mono">
              {(() => {
                const url = explorerUrl(agent.chainId, "address", identity);
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {shortenAddress(identity)}
                  </a>
                ) : (
                  shortenAddress(identity)
                );
              })()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400">Chain</dt>
            <dd>{chainName}</dd>
          </div>
          {meta?.type && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-400">Type</dt>
              <dd className="truncate font-mono text-xs text-gray-300">
                {meta.type}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Services */}
      {meta?.services && meta.services.length > 0 && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Services</h2>
          <div className="space-y-4">
            {meta.services.map((svc, i) => {
              const check = endpointChecks.find(
                (c) => c.endpoint === svc.endpoint
              );
              return (
                <div key={i} className="rounded-lg border border-gray-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{svc.name}</h3>
                      {check && (
                        <span
                          className={`h-2 w-2 rounded-full ${
                            check.reachable ? "bg-green-400" : "bg-red-400"
                          }`}
                          title={
                            check.reachable ? "Reachable" : "Unreachable"
                          }
                        />
                      )}
                    </div>
                    {svc.version && (
                      <span className="text-xs text-gray-500">
                        v{svc.version}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-gray-400">
                    {svc.endpoint}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Links */}
      {meta?.socials && Object.values(meta.socials).some(Boolean) && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Links</h2>
          <div className="flex flex-wrap gap-3">
            {meta.socials.website && (
              <a
                href={meta.socials.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Website
              </a>
            )}
            {meta.socials.github && (
              <a
                href={meta.socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                GitHub
              </a>
            )}
            {meta.socials.twitter && (
              <a
                href={meta.socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Twitter
              </a>
            )}
            {meta.socials.discord && (
              <a
                href={meta.socials.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Discord
              </a>
            )}
            {meta.socials.email && (
              <a
                href={`mailto:${meta.socials.email}`}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Email
              </a>
            )}
          </div>
        </section>
      )}

      {/* Registration Info */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Registration</h2>
        <dl className="space-y-3 text-sm">
          {regInfo ? (
            <>
              <div className="flex justify-between">
                <dt className="text-gray-400">Block Number</dt>
                <dd className="font-mono">{regInfo.blockNumber.toString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-400">Transaction</dt>
                <dd className="truncate font-mono text-xs">
                  {(() => {
                    const url = explorerUrl(
                      agent.chainId,
                      "tx",
                      regInfo.txHash
                    );
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {regInfo.txHash}
                      </a>
                    ) : (
                      regInfo.txHash
                    );
                  })()}
                </dd>
              </div>
              {regInfo.timestamp && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">Registered At</dt>
                  <dd>{formatDate(regInfo.timestamp)}</dd>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Registration info unavailable
            </p>
          )}
        </dl>
      </section>

      {/* Agent URI */}
      {agent.agentURI && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Agent URI</h2>
          <p className="break-all font-mono text-xs text-gray-400">
            {agent.agentURI.length > 500
              ? `${agent.agentURI.slice(0, 500)}...`
              : agent.agentURI}
          </p>
        </section>
      )}
    </div>
  );

  const capabilitiesContent = (
    <div className="space-y-6">
      {/* Skills */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Skills</h2>
        {allSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-blue-900/30 px-3 py-1 text-sm text-blue-400"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No skills configured</p>
        )}
      </section>

      {/* Domains */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Domains</h2>
        {allDomains.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allDomains.map((domain) => (
              <span
                key={domain}
                className="rounded-full bg-emerald-900/30 px-3 py-1 text-sm text-emerald-400"
              >
                {domain}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No domains configured</p>
        )}
      </section>

      {/* Trust Models */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Trust Models</h2>
        {meta?.supportedTrust && meta.supportedTrust.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {meta.supportedTrust.map((trust) => (
              <span
                key={trust}
                className="rounded-full bg-amber-900/30 px-3 py-1 text-sm text-amber-400"
              >
                {trust}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No trust models configured</p>
        )}
      </section>

      {/* Tags */}
      {meta?.tags && meta.tags.length > 0 && (
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Search Tags</h2>
          <div className="flex flex-wrap gap-2">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Agent Settings */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Agent Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                meta?.active
                  ? "bg-green-900/40 text-green-400"
                  : "bg-red-900/40 text-red-400"
              }`}
            >
              {meta?.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">x402 Payment Support</span>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                meta?.x402Support
                  ? "bg-purple-900/40 text-purple-400"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {meta?.x402Support ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );

  const reputationContent = (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <p className="text-2xl font-bold">
            {reputation ? reputation.count.toString() : "0"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Feedbacks</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <p className="text-2xl font-bold">{clients.length}</p>
          <p className="mt-1 text-xs text-gray-400">Unique Clients</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {reputation && reputation.count > 0n
              ? formatScore(
                  reputation.summaryValue / reputation.count,
                  reputation.summaryValueDecimals
                )
              : "-"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Avg Score</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 text-center">
          <p
            className={`text-2xl font-bold ${completenessColor(completeness.percentage)}`}
          >
            {completeness.percentage}%
          </p>
          <p className="mt-1 text-xs text-gray-400">Metadata</p>
        </div>
      </div>

      {/* Reputation Detail */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Feedback Details</h2>
        {reputation && reputation.count > 0n ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Total Feedbacks</dt>
              <dd className="font-semibold">
                {reputation.count.toString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Average Score</dt>
              <dd className="font-semibold text-blue-400">
                {formatScore(
                  reputation.summaryValue / reputation.count,
                  reputation.summaryValueDecimals
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Unique Clients</dt>
              <dd>{clients.length}</dd>
            </div>
            {clients.length > 0 && (
              <div>
                <dt className="mb-2 text-gray-400">Client Addresses</dt>
                <dd className="space-y-1">
                  {clients.map((addr) => (
                    <p key={addr} className="font-mono text-xs text-gray-500">
                      {shortenAddress(addr)}
                    </p>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No feedback yet</p>
        )}
      </section>

      {/* Endpoint Verification */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Endpoint Verification</h2>
        {endpointChecks.length > 0 ? (
          <div className="space-y-2">
            {endpointChecks.map((check, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2"
              >
                <span className="text-sm">{check.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    check.reachable
                      ? "bg-green-900/40 text-green-400"
                      : "bg-red-900/40 text-red-400"
                  }`}
                >
                  {check.reachable ? "Reachable" : "Unreachable"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No endpoints configured</p>
        )}
      </section>

      {/* Metadata Completeness */}
      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Metadata Completeness</h2>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full ${
              completeness.percentage >= 80
                ? "bg-green-500"
                : completeness.percentage >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${completeness.percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {completeness.score}/{completeness.total} fields filled
        </p>
        {completeness.missing.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {completeness.missing.map((field) => (
              <span
                key={field}
                className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500"
              >
                {field}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link
        href="/agents"
        className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
      >
        &larr; Back to Agents
      </Link>

      {/* ════════ Header (always visible) ════════ */}
      <div className="mb-8 flex items-start gap-6">
        {meta?.image ? (
          <img
            src={resolveImage(meta.image)}
            alt={name}
            className="h-20 w-20 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 text-3xl font-bold text-gray-400">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{name}</h1>
            {meta?.active !== undefined && (
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                  meta.active
                    ? "bg-green-900/40 text-green-400"
                    : "bg-red-900/40 text-red-400"
                }`}
              >
                {meta.active ? "Active" : "Inactive"}
              </span>
            )}
            {meta?.x402Support && (
              <span className="rounded-full bg-purple-900/40 px-3 py-0.5 text-xs font-medium text-purple-400">
                x402
              </span>
            )}
            {uniqueProtocols.map((p) => (
              <span
                key={p}
                className="rounded-full bg-blue-900/40 px-3 py-0.5 text-xs font-medium text-blue-400"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="mt-2 text-gray-400">
            {meta?.description || "No description available"}
          </p>
        </div>
      </div>

      {/* ════════ Tabs ════════ */}
      <AgentDetailTabs
        basicInfo={basicInfoContent}
        capabilities={capabilitiesContent}
        reputation={reputationContent}
      />
    </div>
  );
}
