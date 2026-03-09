"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useBalance,
  useConnection,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { decodeEventLog, formatEther } from "viem";
import { identityRegistryAbi, getRegistryAddresses } from "@/contracts";
import { DEFAULT_CHAIN } from "@/lib/chains";
import {
  buildAgentMetadata,
  buildDataURI,
  estimateCalldataGas,
} from "@/lib/metadata";

// ─── Types ───────────────────────────────────────────────

interface ServiceEntry {
  name: string;
  endpoint: string;
  version: string;
}

interface FormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  image: string;
  // Step 2: Services
  services: ServiceEntry[];
  // Step 3: Capabilities (OASF)
  skills: string[];
  customSkills: string[];
  customSkillInput: string;
  domains: string[];
  customDomains: string[];
  customDomainInput: string;
  // Step 4: Advanced (Trust, Tags, Settings)
  supportedTrust: string[];
  tags: string[];
  tagInput: string;
  active: boolean;
  // Step 5: Storage
  storageMethod: "onchain" | "ipfs";
  // Profile & Settings
  x402Support: boolean;
  website: string;
  twitter: string;
  github: string;
  discord: string;
  email: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  image: "",
  services: [
    { name: "MCP", endpoint: "", version: "" },
    { name: "A2A", endpoint: "", version: "" },
  ],
  skills: [],
  customSkills: [],
  customSkillInput: "",
  domains: [],
  customDomains: [],
  customDomainInput: "",
  supportedTrust: [],
  tags: [],
  tagInput: "",
  active: false,
  storageMethod: "onchain",
  x402Support: false,
  website: "",
  twitter: "",
  github: "",
  discord: "",
  email: "",
};

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Endpoints" },
  { id: 3, title: "Capabilities" },
  { id: 4, title: "Advanced" },
  { id: 5, title: "Storage" },
  { id: 6, title: "Review" },
];


const TRUST_OPTIONS = [
  { value: "reputation", label: "Reputation", desc: "On-chain feedback from clients" },
  { value: "crypto-economic", label: "Crypto-Economic", desc: "Stake-based validation" },
  { value: "tee-attestation", label: "TEE Attestation", desc: "Hardware-level verification" },
];

// ─── Shared UI ───────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm text-gray-400">
      {children}
      {required && <span className="text-red-400"> *</span>}
    </label>
  );
}

// ─── Step Components ─────────────────────────────────────

function Step1({ form, setForm, walletAddress }: { form: FormData; setForm: (f: FormData) => void; walletAddress?: string }) {
  const [imageError, setImageError] = useState(false);
  const diceBearUrl = walletAddress
    ? `https://api.dicebear.com/9.x/bottts/svg?seed=${walletAddress}`
    : undefined;

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(false);
    setForm({ ...form, image: e.target.value });
  }, [form, setForm]);

  const previewUrl = form.image || diceBearUrl;

  return (
    <div className="space-y-5">
      <div>
        <Label required>Agent Name</Label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="My AI Agent"
          maxLength={200}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          A concise, memorable name shown in search results and profiles.
        </p>
      </div>
      <div>
        <Label required>Description</Label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe what your agent does, who it's for, and what makes it unique..."
          rows={4}
          maxLength={500}
          className={inputClass}
        />
        <p className={`mt-1 text-xs ${form.description.trim().length > 0 && form.description.trim().length < 50 ? "text-red-400" : "text-gray-500"}`}>
          {form.description.length}/500 characters{form.description.trim().length > 0 && form.description.trim().length < 50 && ` (minimum 50 characters, ${50 - form.description.trim().length} more needed)`}
        </p>
      </div>
      <div>
        <Label>Image URL (Optional)</Label>
        <input
          type="text"
          value={form.image}
          onChange={handleImageChange}
          placeholder="https://example.com/logo.png or ipfs://..."
          className={inputClass}
        />
        {imageError && (
          <p className="mt-1 text-xs text-red-400">
            Failed to load image. Please check the URL and try again.
          </p>
        )}
        {form.image && !imageError && (
          <img
            src={form.image}
            alt=""
            className="hidden"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
}

function Step2({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const updateEndpoint = (name: string, endpoint: string) => {
    const updated = form.services.map((s) =>
      s.name === name ? { ...s, endpoint } : s
    );
    setForm({ ...form, services: updated });
  };

  const mcpService = form.services.find((s) => s.name === "MCP");
  const a2aService = form.services.find((s) => s.name === "A2A");

  return (
    <div className="space-y-5">
      {/* MCP Endpoint */}
      <div>
        <Label>MCP Endpoint</Label>
        <input
          type="text"
          value={mcpService?.endpoint ?? ""}
          onChange={(e) => updateEndpoint("MCP", e.target.value)}
          placeholder="https://api.example.com/mcp"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Model Context Protocol endpoint for agent communication
        </p>
      </div>

      {/* A2A Endpoint */}
      <div>
        <Label>A2A Endpoint</Label>
        <input
          type="text"
          value={a2aService?.endpoint ?? ""}
          onChange={(e) => updateEndpoint("A2A", e.target.value)}
          placeholder="https://agent.example/.well-known/agent-card.json"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Agent-to-Agent protocol endpoint for inter-agent messaging
        </p>
      </div>
    </div>
  );
}

// ─── OASF Taxonomy ──────────────────────────────────────

const OASF_SKILLS: { category: string; items: string[] }[] = [
  { category: "NATURAL LANGUAGE PROCESSING", items: ["Natural Language Processing", "Summarization", "Question Answering", "Sentiment Analysis", "Translation", "Named Entity Recognition", "Storytelling"] },
  { category: "IMAGES COMPUTER VISION", items: ["Computer Vision", "Image Generation", "Image Classification", "Object Detection"] },
  { category: "MULTI MODAL", items: ["Speech Recognition", "Text-to-Speech", "Text to Image", "Image to Text"] },
  { category: "ANALYTICAL SKILLS", items: ["Code Generation", "Code Optimization", "Math Problem Solving"] },
  { category: "DATA ENGINEERING", items: [] },
];

const OASF_DOMAINS: { category: string; items: string[] }[] = [
  { category: "TECHNOLOGY", items: ["Technology", "Software Engineering", "DevOps", "Data Science", "Blockchain", "DeFi", "Cybersecurity", "Cloud Computing"] },
  { category: "FINANCE AND BUSINESS", items: ["Finance & Business", "Finance", "Banking"] },
  { category: "HEALTHCARE", items: ["Healthcare", "Telemedicine", "Healthcare Informatics"] },
  { category: "EDUCATION", items: ["Education", "E-Learning"] },
  { category: "LEGAL", items: ["Legal", "Regulatory Compliance", "Contract Law"] },
];

function SkillChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
        selected
          ? "border-blue-500 bg-blue-900/30 text-blue-300"
          : "border-gray-700 text-gray-300 hover:border-gray-500"
      }`}
    >
      {label}
    </button>
  );
}

function Step3({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const [skillSearch, setSkillSearch] = useState("");
  const [domainSearch, setDomainSearch] = useState("");

  const toggleSkill = (skill: string) => {
    setForm({
      ...form,
      skills: form.skills.includes(skill)
        ? form.skills.filter((s) => s !== skill)
        : [...form.skills, skill],
    });
  };

  const toggleDomain = (domain: string) => {
    setForm({
      ...form,
      domains: form.domains.includes(domain)
        ? form.domains.filter((d) => d !== domain)
        : [...form.domains, domain],
    });
  };

  const addCustomSkill = () => {
    const skill = form.customSkillInput.trim();
    if (skill && !form.customSkills.includes(skill) && !form.skills.includes(skill)) {
      setForm({ ...form, customSkills: [...form.customSkills, skill], customSkillInput: "" });
    }
  };

  const removeCustomSkill = (skill: string) =>
    setForm({ ...form, customSkills: form.customSkills.filter((s) => s !== skill) });

  const addCustomDomain = () => {
    const domain = form.customDomainInput.trim();
    if (domain && !form.customDomains.includes(domain) && !form.domains.includes(domain)) {
      setForm({ ...form, customDomains: [...form.customDomains, domain], customDomainInput: "" });
    }
  };

  const removeCustomDomain = (domain: string) =>
    setForm({ ...form, customDomains: form.customDomains.filter((d) => d !== domain) });

  const filteredSkills = OASF_SKILLS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.toLowerCase().includes(skillSearch.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  const filteredDomains = OASF_DOMAINS.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.toLowerCase().includes(domainSearch.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Agent Skills (OASF) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base">&#10024;</span>
          <h3 className="text-base font-semibold font-mono">Agent Skills (OASF)</h3>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Select the capabilities your agent provides. Skills are mapped to OASF v0.8.0 taxonomy.
        </p>

        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Search skills..."
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredSkills.map((cat) => (
            <div key={cat.category}>
              <p className="mb-2 text-xs font-medium tracking-wider text-gray-500">{cat.category}</p>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((skill) => (
                  <SkillChip
                    key={skill}
                    label={skill}
                    selected={form.skills.includes(skill)}
                    onClick={() => toggleSkill(skill)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Skills */}
        <div className="mt-5 border-t border-gray-800 pt-4">
          <p className="mb-2 text-sm font-medium">Custom Skills</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.customSkillInput}
              onChange={(e) => setForm({ ...form, customSkillInput: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
              placeholder="Add custom skill..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCustomSkill}
              className="flex shrink-0 items-center justify-center rounded-lg border border-gray-700 px-3 text-lg transition hover:border-gray-500"
            >
              +
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Custom skills will be prefixed with &quot;custom/&quot; in OASF format
          </p>
          {form.customSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.customSkills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-900/20 px-3 py-1.5 text-sm text-blue-300"
                >
                  custom/{skill}
                  <button onClick={() => removeCustomSkill(skill)} className="ml-1 text-gray-500 hover:text-white">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application Domains (OASF) */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base">&#10024;</span>
          <h3 className="text-base font-semibold font-mono">Application Domains (OASF)</h3>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Choose the industries or areas where your agent operates. Domains are mapped to OASF v0.8.0 taxonomy.
        </p>

        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={domainSearch}
              onChange={(e) => setDomainSearch(e.target.value)}
              placeholder="Search domains..."
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredDomains.map((cat) => (
            <div key={cat.category}>
              <p className="mb-2 text-xs font-medium tracking-wider text-gray-500">{cat.category}</p>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((domain) => (
                  <SkillChip
                    key={domain}
                    label={domain}
                    selected={form.domains.includes(domain)}
                    onClick={() => toggleDomain(domain)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom Domains */}
        <div className="mt-5 border-t border-gray-800 pt-4">
          <p className="mb-2 text-sm font-medium">Custom Domains</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.customDomainInput}
              onChange={(e) => setForm({ ...form, customDomainInput: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomDomain())}
              placeholder="Add custom domain..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={addCustomDomain}
              className="flex shrink-0 items-center justify-center rounded-lg border border-gray-700 px-3 text-lg transition hover:border-gray-500"
            >
              +
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Custom domains will be prefixed with &quot;custom/&quot; in OASF format
          </p>
          {form.customDomains.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.customDomains.map((domain) => (
                <span
                  key={domain}
                  className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-900/20 px-3 py-1.5 text-sm text-blue-300"
                >
                  custom/{domain}
                  <button onClick={() => removeCustomDomain(domain)} className="ml-1 text-gray-500 hover:text-white">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step4Advanced({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const toggleTrust = (value: string) => {
    const current = form.supportedTrust;
    setForm({
      ...form,
      supportedTrust: current.includes(value)
        ? current.filter((t) => t !== value)
        : [...current, value],
    });
  };

  const addTag = () => {
    const tag = form.tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag], tagInput: "" });
    }
  };

  const removeTag = (tag: string) =>
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });

  return (
    <div className="space-y-6">
      {/* Trust Models */}
      <div>
        <Label>Supported Trust Models</Label>
        <p className="mb-3 text-xs text-gray-500">
          Select the trust mechanisms your agent supports.
        </p>
        <div className="space-y-2">
          {TRUST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleTrust(opt.value)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                form.supportedTrust.includes(opt.value)
                  ? "border-blue-500 bg-blue-900/20"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  form.supportedTrust.includes(opt.value)
                    ? "border-blue-500 bg-blue-600"
                    : "border-gray-600"
                }`}
              >
                {form.supportedTrust.includes(opt.value) && (
                  <span className="text-xs text-white">&#10003;</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Search Tags</Label>
        <p className="mb-2 text-xs text-gray-500">
          Add tags to help others discover your agent (e.g., defi, analytics, trading).
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.tagInput}
            onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="Add a tag..."
            className={inputClass}
          />
          <button
            onClick={addTag}
            className="shrink-0 rounded-lg bg-gray-800 px-4 text-sm transition hover:bg-gray-700"
          >
            Add
          </button>
        </div>
        {form.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="text-gray-500 hover:text-white">
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status & Payment */}
      <div className="space-y-4">
        <Label>Agent Settings</Label>
        <div className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-gray-500">Mark as production-ready</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, active: !form.active })}
            className={`relative h-6 w-11 rounded-full transition ${form.active ? "bg-blue-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${form.active ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
          <div>
            <p className="text-sm font-medium">x402 Payment Support</p>
            <p className="text-xs text-gray-500">Accept HTTP 402 micropayments</p>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, x402Support: !form.x402Support })}
            className={`relative h-6 w-11 rounded-full transition ${form.x402Support ? "bg-blue-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${form.x402Support ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <Label>Social & Contact</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Website</label>
            <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://myagent.com" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Twitter / X</label>
            <input type="text" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} placeholder="@myagent" className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">GitHub</label>
            <input type="text" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} placeholder="https://github.com/..." className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Discord</label>
            <input type="text" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} placeholder="https://discord.gg/..." className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Contact Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="agent@example.com" className={inputClass} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Storage ─────────────────────────────────────

const STORAGE_OPTIONS: {
  value: FormData["storageMethod"];
  label: string;
  desc: string;
  pros: string;
  cons: string;
}[] = [
  {
    value: "onchain",
    label: "On-Chain (Data URI)",
    desc: "Metadata is fully encoded and stored on-chain as a base64 data URI.",
    pros: "Fully decentralized, always available, no external dependency",
    cons: "Higher gas cost proportional to metadata size",
  },
  {
    value: "ipfs",
    label: "IPFS (via Pinata)",
    desc: "Metadata is automatically uploaded to IPFS. Only the content-addressed CID is stored on-chain.",
    pros: "Low gas cost, content-addressed (immutable), decentralized",
    cons: "Depends on IPFS pinning service for availability",
  },
];

function Step5Storage({
  form,
  setForm,
  dataUri,
  estimatedGas,
  metadata,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
  dataUri: string;
  estimatedGas: number;
  metadata: ReturnType<typeof buildAgentMetadata>;
}) {
  const onchainSize = new TextEncoder().encode(dataUri).length;
  const ipfsUriExample = "ipfs://QmXyz...48chars";
  const ipfsGas = (() => {
    const bytes = new TextEncoder().encode(ipfsUriExample);
    let gas = 0;
    for (const b of bytes) gas += b === 0 ? 4 : 16;
    return gas + 21_000;
  })();

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">
        Choose how your agent metadata will be stored. The agentURI is recorded on-chain per ERC-8004.
      </p>

      {/* Storage Method Selection */}
      <div className="space-y-3">
        {STORAGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setForm({ ...form, storageMethod: opt.value })}
            className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition ${
              form.storageMethod === opt.value
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                form.storageMethod === opt.value
                  ? "border-blue-500"
                  : "border-gray-600"
              }`}
            >
              {form.storageMethod === opt.value && (
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-green-400/80">+ {opt.pros}</span>
                <span className="text-red-400/60">- {opt.cons}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* IPFS Info */}
      {form.storageMethod === "ipfs" && (
        <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-4 text-sm text-gray-400">
          <p className="mb-1 font-medium text-blue-400">Automatic IPFS Upload</p>
          <p className="text-xs">
            When you click &quot;Register Agent&quot;, your metadata will be automatically uploaded to IPFS via Pinata.
            The returned CID will be used as the on-chain agentURI (<span className="font-mono text-gray-300">ipfs://&#123;CID&#125;</span>).
          </p>
        </div>
      )}

      {/* Storage Details */}
      <div className="rounded-lg border border-gray-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-400">Storage Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Network</dt>
            <dd>{DEFAULT_CHAIN.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Storage Method</dt>
            <dd>{STORAGE_OPTIONS.find((o) => o.value === form.storageMethod)?.label}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">On-Chain Data Size</dt>
            <dd className="font-mono">
              {form.storageMethod === "onchain"
                ? `${onchainSize} bytes`
                : `~${new TextEncoder().encode(ipfsUriExample).length} bytes`}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Estimated Gas</dt>
            <dd className="font-mono">
              ~{form.storageMethod === "onchain"
                ? estimatedGas.toLocaleString()
                : ipfsGas.toLocaleString()}
            </dd>
          </div>
          {form.storageMethod === "onchain" && (
            <div className="flex justify-between border-t border-gray-800 pt-2">
              <dt className="text-gray-500">Gas Savings with IPFS</dt>
              <dd className="font-mono text-green-400">
                ~{(estimatedGas - ipfsGas).toLocaleString()} ({Math.round(((estimatedGas - ipfsGas) / estimatedGas) * 100)}%)
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Raw Data Preview */}
      <details className="rounded-lg border border-gray-800">
        <summary className="cursor-pointer px-4 py-3 text-sm text-gray-400 hover:text-white">
          {form.storageMethod === "onchain" ? "View Raw Data URI" : "View Metadata JSON"}
        </summary>
        <pre className="max-h-48 overflow-auto border-t border-gray-800 p-4 text-xs text-gray-300 break-all whitespace-pre-wrap">
          {form.storageMethod === "onchain" ? dataUri : JSON.stringify(metadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Step 6: Review ──────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

function Step7Review({ form, metadata, walletAddress }: {
  form: FormData;
  metadata: ReturnType<typeof buildAgentMetadata>;
  walletAddress?: string;
}) {
  const filledServices = form.services.filter((s) => s.endpoint);
  const previewUrl = form.image || (walletAddress ? `https://api.dicebear.com/9.x/bottts/svg?seed=${walletAddress}` : undefined);
  const allSkills = [...form.skills, ...form.customSkills.map((s) => `custom/${s}`)];
  const allDomains = [...form.domains, ...form.customDomains.map((d) => `custom/${d}`)];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Review all information before submitting. This will be recorded on-chain permanently.
      </p>

      <ReviewSection title="Basic Info">
        <div className="flex items-start gap-4">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-14 w-14 rounded-xl object-cover bg-gray-800" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 text-xl font-bold text-gray-400">
              {(form.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold">{form.name || "Unnamed Agent"}</p>
            <p className="mt-1 text-sm text-gray-400">{form.description || "No description"}</p>
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title="Endpoints">
        {filledServices.length > 0 ? (
          <div className="space-y-2">
            {filledServices.map((svc, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-400">{svc.name}</span>
                <span className="font-mono text-xs text-gray-400">{svc.endpoint}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No endpoints configured</p>
        )}
      </ReviewSection>

      <ReviewSection title="Capabilities (OASF)">
        <div className="space-y-3">
          {allSkills.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {allSkills.map((s) => (
                  <span key={s} className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs text-blue-400">{s}</span>
                ))}
              </div>
            </div>
          )}
          {allDomains.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Domains</p>
              <div className="flex flex-wrap gap-1.5">
                {allDomains.map((d) => (
                  <span key={d} className="rounded-full bg-purple-900/30 px-2.5 py-0.5 text-xs text-purple-400">{d}</span>
                ))}
              </div>
            </div>
          )}
          {allSkills.length === 0 && allDomains.length === 0 && (
            <span className="text-sm text-gray-500">No skills or domains selected</span>
          )}
        </div>
      </ReviewSection>

      <ReviewSection title="Trust & Tags">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {form.supportedTrust.length > 0 ? (
              form.supportedTrust.map((t) => (
                <span key={t} className="rounded-full bg-green-900/30 px-2.5 py-0.5 text-xs text-green-400">{t}</span>
              ))
            ) : (
              <span className="text-sm text-gray-500">No trust models selected</span>
            )}
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {form.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </ReviewSection>

      <ReviewSection title="Storage">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Method</dt>
            <dd>{form.storageMethod === "onchain" ? "On-Chain (Data URI)" : "IPFS (via Pinata)"}</dd>
          </div>
          {form.storageMethod === "ipfs" && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Upload</dt>
              <dd className="text-xs text-gray-400">Automatic on registration</dd>
            </div>
          )}
        </dl>
      </ReviewSection>

      <ReviewSection title="Advanced">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Status</dt>
            <dd>{form.active ? <span className="text-green-400">Active</span> : <span className="text-gray-400">Inactive</span>}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">x402 Payment</dt>
            <dd>{form.x402Support ? "Enabled" : "Disabled"}</dd>
          </div>
          {form.website && <div className="flex justify-between"><dt className="text-gray-500">Website</dt><dd className="text-xs">{form.website}</dd></div>}
          {form.twitter && <div className="flex justify-between"><dt className="text-gray-500">Twitter</dt><dd className="text-xs">{form.twitter}</dd></div>}
          {form.github && <div className="flex justify-between"><dt className="text-gray-500">GitHub</dt><dd className="text-xs">{form.github}</dd></div>}
          {form.email && <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="text-xs">{form.email}</dd></div>}
        </dl>
      </ReviewSection>

      <details className="rounded-lg border border-gray-800">
        <summary className="cursor-pointer px-4 py-3 text-sm text-gray-400 hover:text-white">
          View Raw Metadata JSON
        </summary>
        <pre className="max-h-48 overflow-auto border-t border-gray-800 p-4 text-xs text-gray-300">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter();
  const { isConnected } = useConnection();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteContract();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const isWrongChain = chainId !== DEFAULT_CHAIN.id;

  const { data: balanceData } = useBalance({
    address,
    chainId: DEFAULT_CHAIN.id,
    query: { enabled: !!address },
  });

  const hasBalance = balanceData ? balanceData.value > 0n : true; // default true while loading

  // Build metadata from form
  // Combine selected + custom skills/domains
  const allSkills = [
    ...form.skills,
    ...form.customSkills.map((s) => `custom/${s}`),
  ];
  const allDomains = [
    ...form.domains,
    ...form.customDomains.map((d) => `custom/${d}`),
  ];

  const metadata = buildAgentMetadata({
    name: form.name || "Unnamed Agent",
    description: form.description || "No description",
    image: form.image || undefined,
    services: form.services
      .filter((s) => s.endpoint)
      .map((s) => ({
        name: s.name,
        endpoint: s.endpoint,
        version: s.version || undefined,
        skills: allSkills.length > 0 ? allSkills : undefined,
        domains: allDomains.length > 0 ? allDomains : undefined,
      })),
    active: form.active,
    supportedTrust: form.supportedTrust,
    tags: form.tags,
    x402Support: form.x402Support,
    socials: {
      website: form.website,
      twitter: form.twitter,
      github: form.github,
      discord: form.discord,
      email: form.email,
    },
  });
  const dataUri = buildDataURI(metadata);
  const estimatedGas = estimateCalldataGas(dataUri);

  // Step validation
  const canProceed = (s: number) => {
    if (s === 1) return form.name.trim().length > 0 && form.description.trim().length >= 50;
    return true; // steps 2-4 are optional
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setAgentId(null);
    setTxHash(undefined);

    try {
      let agentUri = dataUri;

      // Upload to IPFS via our API route if IPFS is selected
      if (form.storageMethod === "ipfs") {
        setIsUploading(true);
        try {
          const res = await fetch("/api/pinata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metadata),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Failed to upload to IPFS.");
            return;
          }
          agentUri = `ipfs://${data.cid}`;
        } finally {
          setIsUploading(false);
        }
      }

      const { identity } = getRegistryAddresses(DEFAULT_CHAIN.id);

      // Use inline ABI to avoid ambiguity with register() overloads
      const hash = await writeContractAsync({
        address: identity,
        abi: [
          {
            type: "function",
            name: "register",
            inputs: [{ name: "agentURI", type: "string" }],
            outputs: [{ name: "agentId", type: "uint256" }],
            stateMutability: "nonpayable",
          },
        ] as const,
        functionName: "register",
        args: [agentUri],
        chainId: DEFAULT_CHAIN.id,
      });

      setTxHash(hash);

      const { createPublicClient, http } = await import("viem");
      const client = createPublicClient({ chain: DEFAULT_CHAIN, transport: http() });
      const receipt = await client.waitForTransactionReceipt({ hash });

      // Try to find agentId from Registered or Transfer event
      let newAgentId: string | null = null;
      let ownerAddr: string = address ?? "";

      for (const log of receipt.logs) {
        try {
          const event = decodeEventLog({
            abi: identityRegistryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "Registered") {
            const args = event.args as { agentId: bigint; owner: string };
            newAgentId = args.agentId.toString();
            ownerAddr = args.owner;
            break;
          }
          if (!newAgentId && event.eventName === "Transfer") {
            const args = event.args as { from: string; to: string; tokenId: bigint };
            newAgentId = args.tokenId.toString();
            ownerAddr = args.to;
          }
        } catch {
          // Not a matching event
        }
      }

      if (newAgentId) {
        await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: newAgentId,
            owner: ownerAddr,
            chainId: DEFAULT_CHAIN.id,
          }),
        });
        router.push(`/agents/${newAgentId}`);
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      if (message.includes("User rejected") || message.includes("denied")) {
        setError("Transaction was rejected.");
      } else {
        setError(message.slice(0, 200));
      }
    }
  };

  // ─── Not connected ───
  if (!isConnected) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
        <p className="text-lg text-gray-400">Connect your wallet to register an agent.</p>
      </div>
    );
  }

  // ─── Success ───
  if (agentId) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-green-800/50 bg-green-900/10 p-8 text-center">
        <div className="mb-4 text-5xl">&#10003;</div>
        <h2 className="mb-2 text-xl font-bold text-green-400">Agent Registered!</h2>
        <p className="mb-6 text-gray-400">
          Your agent has been registered with ID{" "}
          <span className="font-mono font-semibold text-white">{agentId}</span>
        </p>
        <div className="flex justify-center gap-3">
          <a href={`/agents/${agentId}`} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-500">
            View Agent
          </a>
          {txHash && (
            <a
              href={`${DEFAULT_CHAIN.blockExplorers?.default.url}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm transition hover:border-gray-500"
            >
              View Transaction
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Wizard ───
  return (
    <div>
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-start">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-start last:flex-none">
              {/* Step circle + label column */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => s.id !== step && setStep(s.id)}
                  className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    s.id === step
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : s.id < step
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "border border-gray-700 bg-gray-800/80 text-gray-500 hover:border-gray-500 hover:text-gray-300"
                  }`}
                >
                  {s.id < step ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </button>
                <p
                  className={`mt-2 text-xs leading-tight text-center whitespace-nowrap ${
                    s.id === step
                      ? "font-medium text-white"
                      : s.id < step
                        ? "text-blue-400"
                        : "text-gray-500"
                  }`}
                >
                  {s.title}
                </p>
              </div>
              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div className="relative mx-1 mt-5 h-0.5 flex-1">
                  <div className="absolute inset-0 rounded-full bg-gray-800" />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                      s.id < step ? "w-full bg-blue-600" : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold">
          Step {step}: {STEPS[step - 1].title}
        </h2>

        {step === 1 && <Step1 form={form} setForm={setForm} walletAddress={address} />}
        {step === 2 && <Step2 form={form} setForm={setForm} />}
        {step === 3 && <Step3 form={form} setForm={setForm} />}
        {step === 4 && <Step4Advanced form={form} setForm={setForm} />}
        {step === 5 && <Step5Storage form={form} setForm={setForm} dataUri={dataUri} estimatedGas={estimatedGas} metadata={metadata} />}
        {step === 6 && <Step7Review form={form} metadata={metadata} walletAddress={address} />}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-800/50 bg-red-900/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm transition hover:border-gray-500 disabled:invisible"
        >
          Back
        </button>

        {step < 6 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed(step)}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        ) : isWrongChain ? (
          <button
            onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
            className="rounded-lg bg-yellow-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-yellow-500"
          >
            Switch to {DEFAULT_CHAIN.name}
          </button>
        ) : !hasBalance ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-400">Insufficient balance</span>
            <button
              disabled
              className="rounded-lg bg-gray-700 px-6 py-2.5 text-sm font-semibold cursor-not-allowed opacity-50"
            >
              Register Agent
            </button>
          </div>
        ) : (
          <button
            onClick={handleRegister}
            disabled={isPending || isConfirming || isUploading}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading to IPFS..." : isPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : "Register Agent"}
          </button>
        )}
      </div>

      {/* Insufficient Balance Warning */}
      {step === 6 && !isWrongChain && !hasBalance && (
        <div className="mt-4 rounded-lg border border-yellow-800/50 bg-yellow-900/10 p-4">
          <p className="text-sm font-medium text-yellow-400">
            No {DEFAULT_CHAIN.nativeCurrency.symbol} balance on {DEFAULT_CHAIN.name}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            You need {DEFAULT_CHAIN.nativeCurrency.symbol} to pay for gas fees.
            {DEFAULT_CHAIN.testnet && (
              <> Get testnet {DEFAULT_CHAIN.nativeCurrency.symbol} from a{" "}
                <a
                  href={`https://cloud.google.com/application/web3/faucet/ethereum/sepolia`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  faucet
                </a>.
              </>
            )}
          </p>
          {balanceData && (
            <p className="mt-2 text-xs text-gray-500">
              Current balance: <span className="font-mono">{formatEther(balanceData.value)} {DEFAULT_CHAIN.nativeCurrency.symbol}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
