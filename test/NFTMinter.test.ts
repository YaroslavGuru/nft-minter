import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const NAME = "Day7 Collection";
const SYMBOL = "DAY7";
const MAX_SUPPLY = 10n;
const MINT_PRICE = ethers.parseEther("0.05");
const MAX_PER_WALLET = 3n;
const HIDDEN_URI = "ipfs://hidden/metadata.json";

async function deployFixture() {
  const [owner, allowlisted, publicMinter, outsider] = await ethers.getSigners();

  const allowlist = [owner.address, allowlisted.address];
  const tree = new MerkleTree(allowlist.map((a) => keccak256(a.toLowerCase())), keccak256, {
    sortPairs: true,
  });
  const merkleRoot = tree.getHexRoot();

  const NFTMinter = await ethers.getContractFactory("NFTMinter");
  const contract = await NFTMinter.deploy(
    NAME,
    SYMBOL,
    MAX_SUPPLY,
    MINT_PRICE,
    MAX_PER_WALLET,
    HIDDEN_URI,
    merkleRoot
  );

  return { contract, owner, allowlisted, publicMinter, outsider, tree };
}

describe("NFTMinter", () => {
  it("sets constructor state correctly", async () => {
    const { contract, owner } = await loadFixture(deployFixture);
    expect(await contract.name()).to.eq(NAME);
    expect(await contract.symbol()).to.eq(SYMBOL);
    expect(await contract.mintPrice()).to.eq(MINT_PRICE);
    expect(await contract.maxPerWallet()).to.eq(MAX_PER_WALLET);
    await contract.toggleSaleState(false, true);
    await contract.connect(owner).publicMint(1, { value: MINT_PRICE });
    expect(await contract.tokenURI(1)).to.eq(HIDDEN_URI);
  });

  it("mints via allowlist when open", async () => {
    const { contract, allowlisted, tree } = await loadFixture(deployFixture);
    await contract.toggleSaleState(true, false);

    const proof = tree.getHexProof(keccak256(allowlisted.address.toLowerCase()));

    await expect(
      contract.connect(allowlisted).allowlistMint(2, proof, { value: MINT_PRICE * 2n })
    )
      .to.emit(contract, "Mint")
      .withArgs(allowlisted.address, 2, MINT_PRICE * 2n);

    expect(await contract.totalMinted()).to.eq(2);
    expect(await contract.walletMintCount(allowlisted.address)).to.eq(2);
  });

  it("reverts allowlist mint when sale closed", async () => {
    const { contract, allowlisted, tree } = await loadFixture(deployFixture);
    const proof = tree.getHexProof(keccak256(allowlisted.address.toLowerCase()));
    await expect(
      contract.connect(allowlisted).allowlistMint(1, proof, { value: MINT_PRICE })
    ).to.be.revertedWithCustomError(contract, "AllowlistMintClosed");
  });

  it("reverts allowlist mint with bad proof", async () => {
    const { contract, allowlisted } = await loadFixture(deployFixture);
    await contract.toggleSaleState(true, false);
    await expect(
      contract.connect(allowlisted).allowlistMint(1, [], { value: MINT_PRICE })
    ).to.be.revertedWithCustomError(contract, "InvalidProof");
  });

  it("mints publicly when enabled", async () => {
    const { contract, publicMinter } = await loadFixture(deployFixture);
    await contract.toggleSaleState(false, true);

    await expect(
      contract.connect(publicMinter).publicMint(1, { value: MINT_PRICE })
    ).to.emit(contract, "Mint");

    expect(await contract.totalMinted()).to.eq(1);
    expect(await contract.walletMintCount(publicMinter.address)).to.eq(1);
  });

  it("reverts public mint if disabled", async () => {
    const { contract, publicMinter } = await loadFixture(deployFixture);
    await expect(
      contract.connect(publicMinter).publicMint(1, { value: MINT_PRICE })
    ).to.be.revertedWithCustomError(contract, "PublicMintClosed");
  });

  it("requires sufficient payment", async () => {
    const { contract, publicMinter } = await loadFixture(deployFixture);
    await contract.toggleSaleState(false, true);
    await expect(
      contract.connect(publicMinter).publicMint(1, { value: 0 })
    ).to.be.revertedWithCustomError(contract, "InsufficientPayment");
  });

  it("enforces wallet mint limits", async () => {
    const { contract, publicMinter } = await loadFixture(deployFixture);
    await contract.toggleSaleState(false, true);
    await contract.connect(publicMinter).publicMint(2, { value: MINT_PRICE * 2n });
    await expect(
      contract.connect(publicMinter).publicMint(2, { value: MINT_PRICE * 2n })
    ).to.be.revertedWithCustomError(contract, "ExceedsWalletLimit");
  });

  it("guards against max supply exhaustion", async () => {
    const { contract, owner } = await loadFixture(deployFixture);
    await contract.toggleSaleState(false, true);
    await contract.setMaxPerWallet(MAX_SUPPLY);
    await contract.connect(owner).publicMint(Number(MAX_SUPPLY), {
      value: MINT_PRICE * MAX_SUPPLY,
    });
    await expect(
      contract.connect(owner).publicMint(1, { value: MINT_PRICE })
    ).to.be.revertedWithCustomError(contract, "MintExceedsMaxSupply");
  });

  it("handles reveal workflow", async () => {
    const { contract, publicMinter } = await loadFixture(deployFixture);
    await contract.toggleSaleState(false, true);
    await contract.connect(publicMinter).publicMint(1, { value: MINT_PRICE });
    expect(await contract.tokenURI(1)).to.eq(HIDDEN_URI);

    await expect(contract.reveal("ipfs://revealed/"))
      .to.emit(contract, "Reveal")
      .withArgs("ipfs://revealed/");

    expect(await contract.tokenURI(1)).to.eq("ipfs://revealed/1.json");
  });

  it("prevents non owner actions", async () => {
    const { contract, outsider } = await loadFixture(deployFixture);
    await expect(
      contract.connect(outsider).setMintPrice(0)
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
  });

  it("emits withdraw event and transfers funds", async () => {
    const { contract, owner, publicMinter } = await loadFixture(deployFixture);
    await contract.toggleSaleState(false, true);
    await contract.connect(publicMinter).publicMint(1, { value: MINT_PRICE });

    const balanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await contract.withdraw(owner.address);
    const receipt = await tx.wait();
    const gasUsed = receipt?.gasUsed * receipt?.gasPrice!;
    const balanceAfter = await ethers.provider.getBalance(owner.address);

    expect(balanceAfter - balanceBefore + gasUsed).to.eq(MINT_PRICE);
    await expect(tx).to.emit(contract, "Withdraw");
  });

  it("reverts withdraw when empty", async () => {
    const { contract } = await loadFixture(deployFixture);
    await expect(contract.withdraw(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      contract,
      "NothingToWithdraw"
    );
  });
});

