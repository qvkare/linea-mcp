import { z } from 'zod';

/**
 * Schema for bridging assets between Ethereum and Linea
 */
export const BridgeAssetsSchema = z.object({
  sourceChain: z.enum(['ethereum', 'linea']),
  destinationChain: z.enum(['ethereum', 'linea']),
  assetType: z.enum(['ETH', 'ERC20']),
  tokenAddress: z.string().optional(),
  amount: z.string(),
});

/**
 * Schema for checking bridge transaction status
 */
export const BridgeStatusSchema = z.object({
  transactionHash: z.string(),
  sourceChain: z.enum(['ethereum', 'linea']),
});

// Type definitions for the schemas
export type BridgeAssetsParams = z.infer<typeof BridgeAssetsSchema>;
export type BridgeStatusParams = z.infer<typeof BridgeStatusSchema>;
