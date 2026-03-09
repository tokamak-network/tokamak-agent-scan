import { getAllAgents, getReputationSummary } from "@/lib/agents";
import Link from "next/link";

export const revalidate = 60;

function formatScore(value: bigint, decimals: number, count: bigint): string {
  if (count === 0n) return "0";
  const avg = value / count;
  if (decimals === 0) return avg.toString();
  const divisor = 10n ** BigInt(decimals);
  const whole = avg / divisor;
  const frac = avg % divisor;
  return `${whole}.${frac.toString().padStart(decimals, "0")}`;
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default async function LeaderboardPage() {
  const agents = await getAllAgents();

  // Fetch reputation for all agents
  const agentsWithRep = await Promise.all(
    agents.map(async (agent) => {
      const rep = await getReputationSummary(agent.agentId);
      return { ...agent, reputation: rep };
    })
  );

  // Sort by feedback count (descending)
  const sorted = agentsWithRep
    .filter((a) => a.reputation && a.reputation.count > 0n)
    .sort((a, b) => {
      const countA = a.reputation?.count ?? 0n;
      const countB = b.reputation?.count ?? 0n;
      return countB > countA ? 1 : countB < countA ? -1 : 0;
    });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Leaderboard</h1>
      <p className="mb-8 text-gray-400">
        Top agents ranked by feedback and reputation score
      </p>

      {sorted.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 text-right font-medium">Feedbacks</th>
                <th className="px-4 py-3 text-right font-medium">
                  Avg Score
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => {
                const name =
                  agent.metadata?.name ||
                  `Agent #${agent.agentId.toString()}`;
                return (
                  <tr
                    key={agent.agentId.toString()}
                    className="border-b border-gray-800/50 transition hover:bg-gray-900/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-500">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/agents/${agent.agentId.toString()}`}
                        className="font-medium text-white hover:text-blue-400"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-400">
                      {shortenAddress(agent.owner)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {agent.reputation!.count.toString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-400">
                      {formatScore(
                        agent.reputation!.summaryValue,
                        agent.reputation!.summaryValueDecimals,
                        agent.reputation!.count
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
          <p>No agents with feedback found yet.</p>
        </div>
      )}
    </div>
  );
}
