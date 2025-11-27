"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-5xl font-bold">NFT Minter</h1>
      <p className="text-slate-400">Head to the mint page to start minting.</p>
      <Link
        href="/mint"
        className="rounded-2xl bg-primary px-6 py-2 font-semibold text-white hover:bg-primary/80"
      >
        Go to Mint
      </Link>
    </main>
  );
}

