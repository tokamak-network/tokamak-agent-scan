import Image from "next/image";
import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/tokamak-symbol.svg"
            alt="Tokamak Network"
            width={36}
            height={24}
          />
          <span className="text-lg font-semibold text-white">
            Tokamak Agent Scan
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/agents"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Agents
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-gray-400 transition hover:text-white"
          >
            Leaderboard
          </Link>
          <ConnectWallet />
        </nav>
      </div>
    </header>
  );
}
