import { createPublicClient, http } from "viem";
import { titan, thanosSepolia, sepolia, DEFAULT_CHAIN } from "./chains";

const CHAINS_BY_ID = {
  [sepolia.id]: sepolia,
  [titan.id]: titan,
  [thanosSepolia.id]: thanosSepolia,
} as const;

export function getClient(chainId: number = DEFAULT_CHAIN.id) {
  const chain = CHAINS_BY_ID[chainId as keyof typeof CHAINS_BY_ID];

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}.`);
  }

  const rpcUrl =
    chainId === sepolia.id
      ? "https://ethereum-sepolia-rpc.publicnode.com"
      : undefined;

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}
