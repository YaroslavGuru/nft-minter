"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { MintCard } from "../../components/MintCard";

export default function MintPage() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, status } = useConnect();
  const { disconnect } = useDisconnect();
  const primaryConnector = connectors[0];
  const isPending = status === "pending";

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center gap-10 px-4 py-16">
      <header className="w-full rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-center shadow-lg">
        <p className="text-sm uppercase tracking-[0.3em] text-primary mb-2">Day 7 Drop</p>
        <h1 className="text-4xl font-bold">NFT Minter</h1>
        <p className="mt-3 text-slate-300">
          Secure allowlist minting, public rounds, and reveal-ready metadata all in one stack.
        </p>
        <button
          onClick={() =>
            isConnected ? disconnect() : connect({ connector: primaryConnector })
          }
          disabled={isPending || (!isConnected && !primaryConnector)}
          className="mt-6 rounded-2xl border border-white/20 bg-white/10 px-6 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
        >
          {isConnected ? `Disconnect ${address?.slice(0, 6)}…${address?.slice(-4)}` : "Connect Wallet"}
        </button>
      </header>
      <MintCard />
    </main>
  );
}

