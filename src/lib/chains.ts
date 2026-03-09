import { defineChain } from "viem";
import { sepolia } from "viem/chains";

export { sepolia };

export const titan = defineChain({
  id: 55004,
  name: "Titan",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.titan.tokamak.network"],
      webSocket: ["wss://rpc.titan.tokamak.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.titan.tokamak.network",
    },
  },
});

export const thanosSepolia = defineChain({
  id: 111551119090,
  name: "Thanos Sepolia",
  nativeCurrency: {
    name: "Tokamak Network",
    symbol: "TON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.thanos-sepolia.tokamak.network"],
      webSocket: ["wss://rpc.thanos-sepolia.tokamak.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.thanos-sepolia.tokamak.network",
    },
  },
  testnet: true,
});

// Use Sepolia for testing, Titan for production
export const DEFAULT_CHAIN = sepolia;
export const SUPPORTED_CHAINS = [sepolia, titan, thanosSepolia] as const;
