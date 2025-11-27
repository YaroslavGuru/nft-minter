import { useMemo, useState } from "react";
import { useNFTContract } from "../hooks/useNFTContract";
import clsx from "clsx";

export function MintCard() {
  const { mintPriceEth, totalMinted, maxSupply, allowlistMint, publicMint, allowlistOpen, publicOpen, isWriting } =
    useNFTContract();
  const [allowlistAmount, setAllowlistAmount] = useState(1);
  const [publicAmount, setPublicAmount] = useState(1);
  const [proofInput, setProofInput] = useState("");

  const parsedProofs = useMemo(() => {
    return proofInput
      .split(",")
      .map((hash) => hash.trim())
      .filter(Boolean) as `0x${string}`[];
  }, [proofInput]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
      <h2 className="text-2xl font-semibold mb-2">NFTMinter</h2>
      <p className="text-sm text-slate-400 mb-6">
        Mint price <span className="text-white font-medium">{mintPriceEth} ETH</span>
      </p>
      <div className="mb-8">
        <span className="text-4xl font-bold">{totalMinted}</span>
        <span className="text-slate-500 ml-2">/ {maxSupply}</span>
        <p className="text-sm text-slate-400">Total minted</p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 p-4">
          <header className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Allowlist Mint</h3>
              <p className="text-xs text-slate-400">Requires Merkle proof</p>
            </div>
            <span className={clsx("text-xs px-2 py-1 rounded-full", allowlistOpen ? "bg-emerald-600/20 text-emerald-300" : "bg-red-600/20 text-red-300")}>
              {allowlistOpen ? "Open" : "Closed"}
            </span>
          </header>
          <label className="text-xs uppercase tracking-wide text-slate-400">Amount</label>
          <input
            type="number"
            min={1}
            value={allowlistAmount}
            onChange={(e) => setAllowlistAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-white focus:border-primary focus:outline-none"
          />
          <label className="mt-3 text-xs uppercase tracking-wide text-slate-400">Merkle Proof (comma separated)</label>
          <textarea
            value={proofInput}
            onChange={(e) => setProofInput(e.target.value)}
            placeholder="0x123..., 0xabc..."
            className="mt-1 h-20 w-full rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-sm text-white focus:border-primary focus:outline-none"
          />
          <button
            disabled={!allowlistOpen || isWriting}
            onClick={() => allowlistMint(allowlistAmount, parsedProofs)}
            className="mt-4 w-full rounded-xl bg-primary/90 py-2 font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Mint Allowlist
          </button>
        </section>

        <section className="rounded-2xl border border-slate-800 p-4">
          <header className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Public Mint</h3>
              <p className="text-xs text-slate-400">First come, first served</p>
            </div>
            <span className={clsx("text-xs px-2 py-1 rounded-full", publicOpen ? "bg-emerald-600/20 text-emerald-300" : "bg-red-600/20 text-red-300")}>
              {publicOpen ? "Open" : "Closed"}
            </span>
          </header>
          <label className="text-xs uppercase tracking-wide text-slate-400">Amount</label>
          <input
            type="number"
            min={1}
            value={publicAmount}
            onChange={(e) => setPublicAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-white focus:border-primary focus:outline-none"
          />
          <button
            disabled={!publicOpen || isWriting}
            onClick={() => publicMint(publicAmount)}
            className="mt-4 w-full rounded-xl bg-accent/90 py-2 font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Mint Public
          </button>
        </section>
      </div>
    </div>
  );
}

