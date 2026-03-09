import { getAgent } from "@/lib/agents";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agentId = BigInt(id);

  const agent = await getAgent(agentId);
  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link
        href={`/agents/${id}`}
        className="mb-6 inline-block text-sm text-gray-400 hover:text-white"
      >
        &larr; Back to Agent
      </Link>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Edit Agent</h1>
        <p className="mt-2 text-gray-400">
          Update metadata for Agent #{id}. Only the owner can submit this
          transaction.
        </p>
      </div>

      <RegisterForm
        mode="edit"
        editAgentId={id}
        initialMetadata={agent.metadata}
      />
    </div>
  );
}
