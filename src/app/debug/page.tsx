"use client";

import {
  useConnection,
  useConnect,
  useDisconnect,
  useReconnect,
  useConnectors,
} from "wagmi";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const connection = useConnection();
  const { connectors, connectAsync, isPending, error } = useConnect();
  const allConnectors = useConnectors();
  const { disconnect } = useDisconnect();
  const { reconnect } = useReconnect();
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    addLog(`Connection status: ${connection.status}`);
    addLog(`Address: ${connection.address ?? "none"}`);
    addLog(`Chain: ${connection.chain?.name ?? "none"} (${connection.chainId ?? "?"})`);
    addLog(`Connectors from useConnect: ${connectors.map((c) => `${c.name}(${c.id}/${c.uid})`).join(", ")}`);
    addLog(`All connectors: ${allConnectors.map((c) => `${c.name}(${c.id}/${c.uid})`).join(", ")}`);
  }, []);

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    addLog(`Attempting connect with: ${connector.name} (${connector.id})`);
    try {
      const result = await connectAsync({ connector });
      addLog(`Connected! Accounts: ${result.accounts.join(", ")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`ERROR: ${msg}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 font-mono text-sm">
      <h1 className="mb-6 text-2xl font-bold">Wallet Debug</h1>

      <section className="mb-6 rounded-lg border border-gray-700 p-4">
        <h2 className="mb-2 font-bold">Connection State</h2>
        <pre className="text-gray-400">
          {JSON.stringify(
            {
              status: connection.status,
              address: connection.address,
              chainId: connection.chainId,
              chainName: connection.chain?.name,
              isConnected: connection.isConnected,
              isConnecting: connection.isConnecting,
              isReconnecting: connection.isReconnecting,
              isDisconnected: connection.isDisconnected,
            },
            null,
            2
          )}
        </pre>
      </section>

      <section className="mb-6 rounded-lg border border-gray-700 p-4">
        <h2 className="mb-2 font-bold">
          Connectors ({connectors.length})
        </h2>
        {connectors.map((c) => (
          <div
            key={c.uid}
            className="mb-2 flex items-center justify-between rounded border border-gray-800 p-3"
          >
            <div>
              <p>
                {c.name} <span className="text-gray-500">({c.id})</span>
              </p>
              <p className="text-xs text-gray-500">uid: {c.uid}</p>
            </div>
            <button
              onClick={() => handleConnect(c)}
              disabled={isPending}
              className="rounded bg-blue-600 px-3 py-1 text-xs hover:bg-blue-500 disabled:opacity-50"
            >
              Connect
            </button>
          </div>
        ))}
      </section>

      <section className="mb-6 flex gap-3">
        <button
          onClick={() => {
            addLog("Disconnecting...");
            disconnect();
          }}
          className="rounded bg-red-600 px-4 py-2 text-xs hover:bg-red-500"
        >
          Disconnect
        </button>
        <button
          onClick={() => {
            addLog("Reconnecting...");
            reconnect();
          }}
          className="rounded bg-yellow-600 px-4 py-2 text-xs hover:bg-yellow-500"
        >
          Reconnect
        </button>
      </section>

      {error && (
        <section className="mb-6 rounded-lg border border-red-800 bg-red-900/20 p-4">
          <h2 className="mb-1 font-bold text-red-400">useConnect Error</h2>
          <pre className="text-xs text-red-300">{error.message}</pre>
        </section>
      )}

      <section className="rounded-lg border border-gray-700 p-4">
        <h2 className="mb-2 font-bold">Log</h2>
        <div className="max-h-60 overflow-auto">
          {log.map((entry, i) => (
            <p key={i} className="text-xs text-gray-400">
              {entry}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
