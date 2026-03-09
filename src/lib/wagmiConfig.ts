import { http, createConfig, injected } from "wagmi";
import { titan, thanosSepolia, sepolia } from "./chains";

export const wagmiConfig = createConfig({
  chains: [sepolia, titan, thanosSepolia],
  connectors: [
    injected({ target: "metaMask" }),
    injected(), // fallback for other injected wallets (Rivet, etc.)
  ],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
    [titan.id]: http(),
    [thanosSepolia.id]: http(),
  },
  ssr: true,
});
