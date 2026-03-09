import Link from "next/link";
import { getAllAgents } from "@/lib/agents";
import AgentListClient from "@/components/AgentListClient";

export const revalidate = 60;

export default async function AgentsPage() {
  const agents = await getAllAgents();

  // Serialize bigint fields for client component transfer
  const serializedAgents = agents.map((a) => ({
    ...a,
    agentId: a.agentId.toString(),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Browse Agents</h1>
        </div>
        <Link
          href="/register"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Register Agent
        </Link>
      </div>

      <AgentListClient agents={serializedAgents} />
    </div>
  );
}
