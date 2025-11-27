import { promises as fs } from "fs";
import path from "path";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";

const ALLOWLIST_PATH = path.resolve("allowlist.json");
const OUTPUT_PATH = path.resolve("scripts", "output", "merkle.json");

async function main() {
  const allowlistRaw = await fs.readFile(ALLOWLIST_PATH, "utf8");
  const allowlist: string[] = JSON.parse(allowlistRaw);

  const leaves = allowlist.map((addr) => keccak256(addr.toLowerCase()));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  const proofs = allowlist.reduce<Record<string, string[]>>((acc, address) => {
    acc[address] = tree.getHexProof(keccak256(address.toLowerCase()));
    return acc;
  }, {});

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify({ root, proofs, generatedAt: new Date().toISOString() }, null, 2)
  );

  console.log("Merkle root:", root);
  console.log("Proofs saved to:", OUTPUT_PATH);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

