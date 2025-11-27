## Minting Workflow
1. Owner toggles allowlist or public sale via `toggleSaleState`.
2. User connects wallet and selects amount in the UI.
3. For allowlist rounds, UI injects Merkle proof generated from `generateMerkle.ts`.
4. Contract validates price, supply, wallet limit, proof, and mints sequential token IDs.
5. Events emit (`Mint`) for indexers and on-chain analytics.

## Merkle Workflow
1. Populate `allowlist.json` with addresses.
2. Run `pnpm generate:merkle` (or `npm run generate:merkle`) to get root + proofs in `scripts/output/merkle.json`.
3. Set `MERKLE_ROOT` env var or call `setMerkleRoot` on-chain.
4. Distribute each wallet’s proof to allowlisted participants.

## Reveal Workflow
1. Metadata references `sample.png` until reveal.
2. After uploading real assets via `uploadToIPFS.ts`, note the metadata CID.
3. Call `reveal("ipfs://<metadata-cid>/")` with owner account.
4. `tokenURI` automatically switches from hidden URI to `baseURI + tokenId + ".json"`.

## IPFS Pipeline
1. Drop PNGs into `/images` and JSON metadata into `/metadata`.
2. Run `uploadToIPFS.ts` with a valid `WEB3_STORAGE_TOKEN`.
3. Script uploads images first, rewrites metadata image paths, then uploads metadata and records both CIDs.
4. Update contract `baseURI` to `ipfs://<metadata-cid>/`.

## Deployment Pipeline
1. Configure `.env` with `RPC_URL`, `PRIVATE_KEY`, `MERKLE_ROOT`, and constructor params.
2. `npm run deploy -- --network sepolia` executes `deployNFT.ts`.
3. Script stores the deployed address + args in `/deployments/<network>.json` and ABI for the frontend.
4. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_SEPOLIA_RPC` before deploying the Next.js UI.

