"use client";

import { useState, useMemo } from "react";
import { AgentCard } from "./AgentCard";
import type { Agent, AgentMetadata } from "@/types/agent";

/** Serializable version of Agent (bigint → string) for server→client transfer */
export interface SerializedAgent {
  agentId: string;
  owner: string;
  agentURI: string;
  metadata: AgentMetadata | null;
  wallet?: string;
  chainId: number;
}

function deserialize(sa: SerializedAgent): Agent {
  return { ...sa, agentId: BigInt(sa.agentId) };
}

/* ── helpers ── */

function getProtocols(agent: Agent): string[] {
  const protocols: string[] = [];
  if (!agent.metadata?.services) return protocols;
  for (const svc of agent.metadata.services) {
    const n = svc.name.toUpperCase();
    const ep = svc.endpoint.toLowerCase();
    if (n.includes("MCP") || ep.includes("mcp")) protocols.push("MCP");
    if (n.includes("A2A") || ep.includes("a2a")) protocols.push("A2A");
    if (n.includes("OASF") || ep.includes("oasf")) protocols.push("OASF");
  }
  return [...new Set(protocols)];
}

function getDomains(agent: Agent): string[] {
  return [
    ...new Set([
      ...(agent.metadata?.domains ?? []),
      ...(agent.metadata?.services?.flatMap((svc) => svc.domains ?? []) ?? []),
    ]),
  ];
}

function getSkills(agent: Agent): string[] {
  return [
    ...new Set([
      ...(agent.metadata?.skills ?? []),
      ...(agent.metadata?.services?.flatMap((svc) => svc.skills ?? []) ?? []),
    ]),
  ];
}

/* ── component ── */

interface Props {
  agents: SerializedAgent[];
}

type StatusFilter = "all" | "active" | "inactive";

export default function AgentListClient({ agents: serializedAgents }: Props) {
  const agents = useMemo(
    () => serializedAgents.map(deserialize),
    [serializedAgents]
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [protocolFilter, setProtocolFilter] = useState<string[]>([]);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Collect all unique values for filter options
  const allProtocols = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => getProtocols(a).forEach((p) => set.add(p)));
    return [...set].sort();
  }, [agents]);

  const allDomains = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => getDomains(a).forEach((d) => set.add(d)));
    return [...set].sort();
  }, [agents]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => a.metadata?.tags?.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [agents]);

  // Apply filters
  const filtered = useMemo(() => {
    return agents.filter((agent) => {
      const meta = agent.metadata;

      // Text search
      if (query) {
        const q = query.toLowerCase();
        const name = (meta?.name ?? "").toLowerCase();
        const desc = (meta?.description ?? "").toLowerCase();
        const owner = agent.owner.toLowerCase();
        const tags = (meta?.tags ?? []).join(" ").toLowerCase();
        if (
          !name.includes(q) &&
          !desc.includes(q) &&
          !owner.includes(q) &&
          !tags.includes(q)
        ) {
          return false;
        }
      }

      // Status filter (undefined is treated as inactive)
      if (statusFilter === "active" && meta?.active !== true) return false;
      if (statusFilter === "inactive" && meta?.active === true) return false;

      // Protocol filter
      if (protocolFilter.length > 0) {
        const agentProtocols = getProtocols(agent);
        if (!protocolFilter.some((p) => agentProtocols.includes(p)))
          return false;
      }

      // Domain filter
      if (domainFilter) {
        const agentDomains = getDomains(agent);
        if (!agentDomains.includes(domainFilter)) return false;
      }

      // Tag filter
      if (tagFilter) {
        if (!meta?.tags?.includes(tagFilter)) return false;
      }

      return true;
    });
  }, [agents, query, statusFilter, protocolFilter, domainFilter, tagFilter]);

  const hasActiveFilters =
    query ||
    statusFilter !== "all" ||
    protocolFilter.length > 0 ||
    domainFilter ||
    tagFilter;

  function clearAll() {
    setQuery("");
    setStatusFilter("all");
    setProtocolFilter([]);
    setDomainFilter(null);
    setTagFilter(null);
  }

  function toggleProtocol(p: string) {
    setProtocolFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, description, owner, or tag..."
          className="w-full rounded-lg border border-gray-700 bg-gray-900/80 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Filters row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Status */}
        <div className="flex rounded-lg border border-gray-700 text-xs">
          {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 capitalize transition first:rounded-l-lg last:rounded-r-lg ${
                statusFilter === s
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Protocols */}
        {allProtocols.length > 0 && (
          <div className="flex gap-1.5">
            {allProtocols.map((p) => (
              <button
                key={p}
                onClick={() => toggleProtocol(p)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  protocolFilter.includes(p)
                    ? "bg-blue-600 text-white"
                    : "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Domain dropdown */}
        {allDomains.length > 0 && (
          <div className="relative">
            <select
              value={domainFilter ?? ""}
              onChange={(e) => setDomainFilter(e.target.value || null)}
              className="appearance-none rounded-lg border border-gray-700 bg-gray-900/80 py-1.5 pl-3 pr-7 text-xs text-gray-300 outline-none transition focus:border-blue-500"
            >
              <option value="">All Domains</option>
              {allDomains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </div>
        )}

        {/* Tag dropdown */}
        {allTags.length > 0 && (
          <div className="relative">
            <select
              value={tagFilter ?? ""}
              onChange={(e) => setTagFilter(e.target.value || null)}
              className="appearance-none rounded-lg border border-gray-700 bg-gray-900/80 py-1.5 pl-3 pr-7 text-xs text-gray-300 outline-none transition focus:border-blue-500"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </div>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 transition hover:text-white"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        {filtered.length === agents.length
          ? `${agents.length} agents registered`
          : `${filtered.length} of ${agents.length} agents`}
      </p>

      {/* Agent grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.agentId.toString()} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
          {hasActiveFilters ? (
            <div>
              <p>No agents match the current filters.</p>
              <button
                onClick={clearAll}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <p>No agents found on this network.</p>
          )}
        </div>
      )}
    </>
  );
}
