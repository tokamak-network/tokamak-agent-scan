import Link from "next/link";
import { getAllAgents, getTotalAgents } from "@/lib/agents";
import { AgentCard } from "@/components/AgentCard";

export const revalidate = 60;

export default async function AgentsPage() {
  const [totalAgents, agents] = await Promise.all([
    getTotalAgents(),
    getAllAgents(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Browse Agents</h1>
          <p className="mt-2 text-gray-400">
            {totalAgents.toString()} agents registered on Ethereum Sepolia
          </p>
        </div>
        <Link
          href="/register"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Register Agent
        </Link>
      </div>

      {agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.agentId.toString()} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
          <p>No agents found on this network.</p>
        </div>
      )}
    </div>
  );
}
