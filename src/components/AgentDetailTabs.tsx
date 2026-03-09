"use client";

import { useState, type ReactNode } from "react";

const TABS = ["Basic Info", "Capabilities", "Reputation"] as const;
type Tab = (typeof TABS)[number];

export default function AgentDetailTabs({
  basicInfo,
  capabilities,
  reputation,
}: {
  basicInfo: ReactNode;
  capabilities: ReactNode;
  reputation: ReactNode;
}) {
  const [active, setActive] = useState<Tab>("Basic Info");

  const panels: Record<Tab, ReactNode> = {
    "Basic Info": basicInfo,
    Capabilities: capabilities,
    Reputation: reputation,
  };

  return (
    <div>
      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-800 bg-gray-900/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              active === tab
                ? "bg-gray-700/80 text-white shadow-sm"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Active Panel */}
      <div>{panels[active]}</div>
    </div>
  );
}
