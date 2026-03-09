// ERC-8004 Deterministic Contract Addresses (same across all chains via CREATE2)

// Mainnet addresses (Titan, Ethereum, etc.)
export const IDENTITY_REGISTRY_ADDRESS =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

export const REPUTATION_REGISTRY_ADDRESS =
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as const;

// Testnet addresses (Sepolia, Thanos Sepolia, etc.)
export const IDENTITY_REGISTRY_TESTNET =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

export const REPUTATION_REGISTRY_TESTNET =
  "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const;

// Chain IDs
export const TITAN_CHAIN_ID = 55004;
export const THANOS_SEPOLIA_CHAIN_ID = 111551119090;
export const SEPOLIA_CHAIN_ID = 11155111;

const TESTNET_CHAIN_IDS = new Set([SEPOLIA_CHAIN_ID, THANOS_SEPOLIA_CHAIN_ID]);

export function getRegistryAddresses(chainId: number) {
  if (TESTNET_CHAIN_IDS.has(chainId)) {
    return {
      identity: IDENTITY_REGISTRY_TESTNET,
      reputation: REPUTATION_REGISTRY_TESTNET,
    };
  }
  return {
    identity: IDENTITY_REGISTRY_ADDRESS,
    reputation: REPUTATION_REGISTRY_ADDRESS,
  };
}
