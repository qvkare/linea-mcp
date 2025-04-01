import { z } from 'zod';

/**
 * Schema for listing NFTs owned by an address
 */
export const ListNftsSchema = z.object({
  address: z.string().optional(),
  contractAddress: z.string().optional(),
  tokenId: z.string().optional(),
  standard: z.enum(['ERC721', 'ERC1155', 'ALL']).optional().default('ALL'),
  limit: z.number().optional().default(50),
  cursor: z.string().optional(),
});

/**
 * Schema for transferring an NFT
 */
export const TransferNftSchema = z.object({
  contractAddress: z.string(),
  tokenId: z.string(),
  destination: z.string(),
  amount: z.string().optional().default('1'),
  standard: z.enum(['ERC721', 'ERC1155']).optional(),
  data: z.string().optional().default('0x'),
});

/**
 * Schema for retrieving NFT metadata
 */
export const NftMetadataSchema = z.object({
  contractAddress: z.string(),
  tokenId: z.string(),
  standard: z.enum(['ERC721', 'ERC1155']).optional(),
});

// Type definitions for the schemas
export type ListNftsParams = z.infer<typeof ListNftsSchema>;
export type TransferNftParams = z.infer<typeof TransferNftSchema>;
export type NftMetadataParams = z.infer<typeof NftMetadataSchema>;
