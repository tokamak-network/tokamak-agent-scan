import { getAllAgents } from "@/lib/agents";
import { AgentCard } from "@/components/AgentCard";
import { StatsCard } from "@/components/StatsCard";
import Link from "next/link";

export const revalidate = 60;

export default async function Home() {
  const allAgents = await getAllAgents();
  const recentAgents = allAgents.slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Tokamak Agent Scan
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
          On-chain explorer for ERC-8004 based AI agents.
          <br />
          Discover trusted agents and verify their reputation.
        </p>
      </section>

      {/* Stats */}
      <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          label="Registered Agents"
          value={allAgents.length.toString()}
        />
        <StatsCard label="Network" value="Ethereum Sepolia" />
        <StatsCard label="Protocol" value="ERC-8004" />
      </section>

      {/* Recent Agents */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Agents</h2>
          <Link
            href="/agents"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View all →
          </Link>
        </div>
        {recentAgents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentAgents.map((agent) => (
              <AgentCard key={agent.agentId.toString()} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
            <p>No agents found. Try switching to a different network or check back later.</p>
          </div>
        )}
      </section>
    </div>
  );
}
