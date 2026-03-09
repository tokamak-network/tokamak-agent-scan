import Link from "next/link";
import type { Agent } from "@/types/agent";

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getProtocolBadges(agent: Agent) {
  const badges: string[] = [];
  if (!agent.metadata?.services) return badges;

  for (const svc of agent.metadata.services) {
    const ep = svc.endpoint.toLowerCase();
    if (ep.includes("a2a")) badges.push("A2A");
    if (ep.includes("mcp")) badges.push("MCP");
    if (ep.includes("oasf")) badges.push("OASF");
  }
  return [...new Set(badges)];
}

export function AgentCard({ agent }: { agent: Agent }) {
  const badges = getProtocolBadges(agent);
  const name = agent.metadata?.name || `Agent #${agent.agentId.toString()}`;
  const description = agent.metadata?.description || "No description";

  return (
    <Link
      href={`/agents/${agent.agentId.toString()}`}
      className="group block rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition hover:border-gray-600 hover:bg-gray-900"
    >
      <div className="flex items-start gap-4">
        {agent.metadata?.image ? (
          <img
            src={
              agent.metadata.image.startsWith("ipfs://")
                ? `https://ipfs.io/ipfs/${agent.metadata.image.slice(7)}`
                : agent.metadata.image
            }
            alt={name}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 text-lg font-bold text-gray-400">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white group-hover:text-blue-400">
            {name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-gray-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-400"
            >
              {badge}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          Owner: {shortenAddress(agent.owner)}
        </span>
      </div>
    </Link>
  );
}
