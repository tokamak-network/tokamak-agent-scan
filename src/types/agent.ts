export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface AgentRegistration {
  agentId: string;
  agentRegistry: string;
}

export interface AgentSocials {
  website?: string;
  twitter?: string;
  github?: string;
  discord?: string;
  email?: string;
}

export interface AgentMetadata {
  type?: string;
  name: string;
  description: string;
  image?: string;
  services?: AgentService[];
  x402Support?: boolean;
  active?: boolean;
  registrations?: AgentRegistration[];
  supportedTrust?: string[];
  socials?: AgentSocials;
  tags?: string[];
}

export interface Agent {
  agentId: bigint;
  owner: string;
  agentURI: string;
  metadata: AgentMetadata | null;
  wallet?: string;
  chainId: number;
}

export interface FeedbackSummary {
  count: bigint;
  summaryValue: bigint;
  summaryValueDecimals: number;
}

export interface FeedbackEntry {
  clientAddress: string;
  feedbackIndex: bigint;
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
}

export interface AgentWithReputation extends Agent {
  reputation?: FeedbackSummary;
  feedbackCount?: number;
}

export interface RegistrationInfo {
  blockNumber: bigint;
  txHash: string;
  timestamp: number | null;
}

export interface EndpointCheck {
  name: string;
  endpoint: string;
  reachable: boolean;
}

export interface MetadataCompleteness {
  score: number;
  total: number;
  percentage: number;
  missing: string[];
}
