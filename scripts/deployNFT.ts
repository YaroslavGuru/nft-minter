import { ethers, network, artifacts } from "hardhat";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const name = process.env.COLLECTION_NAME || "NFT Minter";
  const symbol = process.env.COLLECTION_SYMBOL || "NFTM";
  const maxSupply = BigInt(process.env.MAX_SUPPLY || "1000");
  const mintPrice = BigInt(process.env.MINT_PRICE_WEI || ethers.parseEther("0.05").toString());
  const maxPerWallet = BigInt(process.env.MAX_PER_WALLET || "5");
  const hiddenURI = process.env.HIDDEN_URI || "ipfs://hidden/hidden.json";
  const merkleRoot = process.env.MERKLE_ROOT || ethers.ZeroHash;

  const contract = await ethers.deployContract("NFTMinter", [
    name,
    symbol,
    maxSupply,
    mintPrice,
    maxPerWallet,
    hiddenURI,
    merkleRoot,
  ]);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`NFTMinter deployed to ${address} on ${network.name}`);

  const deploymentDir = path.resolve("deployments");
  await fs.mkdir(deploymentDir, { recursive: true });

  const deploymentRecord = {
    address,
    network: network.name,
    deployer: deployer.address,
    args: {
      name,
      symbol,
      maxSupply: maxSupply.toString(),
      mintPrice: mintPrice.toString(),
      maxPerWallet: maxPerWallet.toString(),
      hiddenURI,
      merkleRoot,
    },
    emittedAt: new Date().toISOString(),
  };

  const filePath = path.join(deploymentDir, `${network.name}.json`);
  await fs.writeFile(filePath, JSON.stringify(deploymentRecord, null, 2));
  console.log("Deployment saved to", filePath);

  const artifact = await artifacts.readArtifact("NFTMinter");
  const abiPath = path.join(deploymentDir, "NFTMinter.abi.json");
  await fs.writeFile(abiPath, JSON.stringify(artifact.abi, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

