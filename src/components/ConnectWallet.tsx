"use client";

import {
  useConnection,
  useConnect,
  useDisconnect,
  useReconnect,
} from "wagmi";
import { useState, useEffect } from "react";

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ConnectWallet() {
  const connection = useConnection();
  const { connectors, connectAsync, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { reconnect } = useReconnect();
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reconnect();
  }, [reconnect]);

  // Deduplicate connectors by id and keep only those with icons
  const uniqueConnectors = connectors
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .filter((c) => !!c.icon);

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    setError(null);
    try {
      // If already connected with a different connector, disconnect first
      if (connection.status === "connected") {
        disconnect();
        await new Promise((r) => setTimeout(r, 200));
      }
      await connectAsync({ connector });
      setShowMenu(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      if (msg.includes("rejected") || msg.includes("denied")) {
        setError("Connection rejected by user");
      } else if (msg.includes("already connected")) {
        setShowMenu(false);
      } else {
        setError(msg.slice(0, 120));
      }
    }
  };

  if (connection.isConnected && connection.address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm transition hover:border-gray-600"
        >
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="font-mono">{shortenAddress(connection.address)}</span>
          {connection.chain && (
            <span className="text-xs text-gray-400">{connection.chain.name}</span>
          )}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-800 p-2 shadow-xl">
              <div className="mb-2 border-b border-gray-700 px-3 py-2">
                <p className="text-xs text-gray-400">Connected to</p>
                <p className="font-mono text-sm">{shortenAddress(connection.address)}</p>
              </div>
              <button
                onClick={() => { disconnect(); setShowMenu(false); }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-red-400 transition hover:bg-gray-700"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setShowMenu(!showMenu); setError(null); }}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-700 bg-gray-800 p-2 shadow-xl">
            <p className="mb-2 px-3 py-1 text-xs text-gray-400">Select a wallet</p>
            {uniqueConnectors.map((connector) => (
              <button
                key={connector.uid}
                disabled={isPending}
                onClick={() => handleConnect(connector)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition hover:bg-gray-700 disabled:opacity-50"
              >
                {connector.icon && (
                  <img src={connector.icon} alt="" className="h-6 w-6 rounded" />
                )}
                <span>{connector.name}</span>
              </button>
            ))}
            {isPending && (
              <p className="px-3 py-2 text-xs text-yellow-400">Check your wallet...</p>
            )}
            {(error || connectError) && (
              <p className="px-3 py-2 text-xs text-red-400">
                {error || connectError?.message?.slice(0, 120)}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
