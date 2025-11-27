import { promises as fs } from "fs";
import path from "path";
import { File, Web3Storage } from "web3.storage";
import dotenv from "dotenv";

dotenv.config();

const IMAGES_DIR = path.resolve("images");
const METADATA_DIR = path.resolve("metadata");
const OUTPUT_FILE = path.resolve("scripts", "output", "ipfs.json");

async function dirFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function guessMime(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

async function toFile(filePath: string) {
  const data = await fs.readFile(filePath);
  return new File([data], path.basename(filePath), { type: guessMime(filePath) });
}

async function uploadDirectory(
  client: Web3Storage,
  dir: string,
  wrapName: string
) {
  const files = await dirFiles(dir);
  const fileObjects = await Promise.all(files.map(toFile));
  return client.put(fileObjects, { wrapWithDirectory: true, name: wrapName });
}

async function updateMetadataImages(imageCid: string) {
  const files = await dirFiles(METADATA_DIR);
  for (const filePath of files) {
    const json = JSON.parse(await fs.readFile(filePath, "utf8"));
    json.image = `ipfs://${imageCid}/${path.basename(json.image || path.basename(filePath, ".json") + ".png")}`;
    await fs.writeFile(filePath, JSON.stringify(json, null, 2));
  }
}

async function main() {
  const token = process.env.WEB3_STORAGE_TOKEN;
  if (!token) {
    throw new Error("WEB3_STORAGE_TOKEN is not set");
  }

  const client = new Web3Storage({ token });

  console.log("Uploading images...");
  const imageCid = await uploadDirectory(client, IMAGES_DIR, "nft-images");
  console.log("Images CID:", imageCid);

  console.log("Linking metadata to image CID...");
  await updateMetadataImages(imageCid);

  console.log("Uploading metadata...");
  const metadataCid = await uploadDirectory(client, METADATA_DIR, "nft-metadata");
  console.log("Metadata CID:", metadataCid);

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(
    OUTPUT_FILE,
    JSON.stringify(
      {
        imageCid,
        metadataCid,
        gateway: `https://${metadataCid}.ipfs.w3s.link/`,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log("IPFS details written to", OUTPUT_FILE);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

