import { formatEther } from "viem";
import { useChainId, useReadContract, useWriteContract } from "wagmi";
import { nftMinterAbi } from "../lib/abi/nftMinter";
import toast from "react-hot-toast";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function useNFTContract() {
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();

  const baseConfig = {
    address: (CONTRACT_ADDRESS ?? ZERO_ADDRESS) as `0x${string}`,
    abi: nftMinterAbi,
    chainId,
  } as const;
  const readsEnabled = Boolean(CONTRACT_ADDRESS);

  const mintPriceQuery = useReadContract({
    ...baseConfig,
    functionName: "mintPrice",
    query: { enabled: readsEnabled },
  });
  const totalMintedQuery = useReadContract({
    ...baseConfig,
    functionName: "totalMinted",
    query: { enabled: readsEnabled },
  });
  const maxSupplyQuery = useReadContract({
    ...baseConfig,
    functionName: "maxSupply",
    query: { enabled: readsEnabled },
  });
  const allowlistOpenQuery = useReadContract({
    ...baseConfig,
    functionName: "allowlistMintOpen",
    query: { enabled: readsEnabled },
  });
  const publicOpenQuery = useReadContract({
    ...baseConfig,
    functionName: "publicMintOpen",
    query: { enabled: readsEnabled },
  });

  const mintPrice = (mintPriceQuery.data as bigint | undefined) ?? 0n;
  const mintPriceEth = formatEther(mintPrice);

  const handleTx = async (action: () => Promise<`0x${string}`>) => {
    if (!CONTRACT_ADDRESS) {
      toast.error("Contract address missing");
      throw new Error("Contract address missing");
    }
    try {
      const txHash = await action();
      toast.success(`Transaction submitted: ${txHash.slice(0, 10)}…`);
    } catch (error: any) {
      toast.error(error?.shortMessage || error?.message || "Transaction failed");
      throw error;
    }
  };

  const allowlistMint = (amount: number, proof: readonly `0x${string}`[]) =>
    handleTx(() =>
      writeContractAsync({
        ...baseConfig,
        functionName: "allowlistMint",
        args: [BigInt(amount), proof],
        value: mintPrice * BigInt(amount),
      })
    );

  const publicMint = (amount: number) =>
    handleTx(() =>
      writeContractAsync({
        ...baseConfig,
        functionName: "publicMint",
        args: [BigInt(amount)],
        value: mintPrice * BigInt(amount),
      })
    );

  return {
    isReady: Boolean(CONTRACT_ADDRESS),
    mintPriceEth,
    totalMinted: Number(totalMintedQuery.data ?? 0),
    maxSupply: Number(maxSupplyQuery.data ?? 0),
    allowlistOpen: Boolean(allowlistOpenQuery.data),
    publicOpen: Boolean(publicOpenQuery.data),
    loading:
      mintPriceQuery.isPending ||
      totalMintedQuery.isPending ||
      maxSupplyQuery.isPending,
    allowlistMint,
    publicMint,
    isWriting: isPending,
  };
}

