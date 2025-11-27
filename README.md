# NFT Minter 

Production-ready ERC-721 stack featuring allowlist + public minting, revealable metadata, Hardhat coverage, deployment utilities, IPFS workflow, and a minimal Wagmi-powered UI.

## Features
- ERC-721 smart contract with allowlist/public rounds, wallet caps, reveal, and owner treasury controls.
- TypeScript Hardhat workspace with 95%+ coverage tests, Merkle tooling, and deployment automation.
- Metadata + IPFS upload scripts for deterministic asset handling.
- Next.js (App Router) frontend with Wagmi v2, Tailwind UI, and toast-powered mint feedback.

## Requirements
- Node.js 18+
- pnpm / npm / yarn
- Foundry/Hardhat-compatible wallet private key
- Web3.Storage or Pinata token for IPFS uploads

## User Guide
1. **Bootstrap**
   - Clone repo, install root deps: `npm install`.
   - Copy `.env.example` → `.env`, populate `RPC_URL`, `PRIVATE_KEY`, `MERKLE_ROOT`, `HIDDEN_URI`, etc.
2. **Allowlist + Metadata**
   - Edit `allowlist.json` and run `npm run generate:merkle`; record root and proofs (saved under `scripts/output/merkle.json`).
   - Drop preview PNGs into `images/` and JSON metadata into `metadata/`.
   - Run `npm run upload:ipfs` (requires `WEB3_STORAGE_TOKEN`) to upload assets and obtain image/metadata CIDs.
3. **Contract Lifecycle**
   - Compile/tests: `npm run build` / `npm run test` (optional `npm run coverage` for report).
   - Deploy: `npm run deploy -- --network <network>` (e.g., `sepolia`) to emit contract address + deployment record in `deployments/`.
   - Post deploy, configure sale states and pricing via Hardhat console or scripts if needed.
4. **Frontend Setup**
   - Create `frontend/.env.local` with:
     ```
     NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContract
     NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.infura.io/v3/...
     ```
   - Install UI deps: `cd frontend && npm install --legacy-peer-deps`.
   - Run dev server: `npm run dev` and open `http://localhost:3000/mint`.
5. **Minting UX**
   - Connect wallet (MetaMask/Wagmi-injected).
   - For allowlist, paste proof from `merkle.json`; select amount (respects contract wallet limits) and submit.
   - For public mint, use the public form once owner toggles `publicMintOpen`.
   - Toast messages show tx status; mint counters auto-refresh.
6. **Reveal + Withdraw**
   - After assets live on IPFS, call `reveal("ipfs://<metadata-cid>/")` from owner wallet.
   - Use `withdraw` to collect mint proceeds, optionally passing a treasury address.

## Installation
```bash
npm install
cd frontend && npm install
```

Copy `.env.example` to `.env` and fill RPC, keys, and Merkle root parameters.

## Hardhat Usage
- **Compile:** `npm run build`
- **Test:** `npm run test`
- **Coverage:** `npm run coverage`
- **Generate Merkle:** `npm run generate:merkle`
- **Deploy:** `npm run deploy -- --network sepolia`

## Deployment
1. Run `npm run generate:merkle` and set `MERKLE_ROOT`.
2. Upload images + metadata via `npm run upload:ipfs`, note metadata CID, and set `HIDDEN_URI` / `baseURI`.
3. Execute `npm run deploy -- --network <network>` to deploy `NFTMinter`.
4. Update `frontend/.env.local` with `NEXT_PUBLIC_CONTRACT_ADDRESS` and RPC URL.
5. Deploy the Next.js app (`npm run build && npm run start` or your preferred hosting).

## Frontend Usage
```bash
cd frontend
npm run dev
```
Navigate to `/mint`, connect wallet, paste allowlist proof if applicable, and mint.

## Directory Structure
```
nft-minter/
├── contracts/           # Solidity sources
├── scripts/             # Merkle, deploy, and IPFS automation
├── metadata/            # JSON metadata seeds
├── images/              # NFT art assets
├── frontend/            # Next.js mint UI
├── docs/                # Architecture + workflow notes
└── test/                # Hardhat test suite
```

## IPFS Workflow
1. Place assets in `/images` and `/metadata`.
2. Run `npm run upload:ipfs` with `WEB3_STORAGE_TOKEN`.
3. Script uploads images, rewrites metadata image links, uploads metadata, and stores CID info under `scripts/output/ipfs.json`.
4. Call `reveal` with `ipfs://<metadata-cid>/` when ready.

