import { z } from 'zod';

/**
 * Schema for listing NFTs owned by an address
 */
export const ListNftsSchema = z.object({
  address: z.string().optional(),
  contractAddress: z.string().optional(),
  tokenId: z.string().optional(),
});

/**
 * Schema for transferring an NFT
 */
export const TransferNftSchema = z.object({
  contractAddress: z.string(),
  tokenId: z.string(),
  destination: z.string(),
});

// Type definitions for the schemas
export type ListNftsParams = z.infer<typeof ListNftsSchema>;
export type TransferNftParams = z.infer<typeof TransferNftSchema>;
