"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

export function EditAgentButton({
  agentId,
  ownerAddress,
}: {
  agentId: string;
  ownerAddress: string;
}) {
  const { address } = useAccount();

  if (!address || address.toLowerCase() !== ownerAddress.toLowerCase()) {
    return null;
  }

  return (
    <Link
      href={`/agents/${agentId}/edit`}
      className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
    >
      Edit Agent
    </Link>
  );
}
