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

/**
 * Schema for claiming bridged funds
 */
export const ClaimFundsSchema = z.object({
  messageHash: z.string(),
  sourceChain: z.enum(['ethereum', 'linea']),
  messageDetails: z.object({
    from: z.string(),
    to: z.string(),
    fee: z.number().int(),
    value: z.number().int(),
    nonce: z.union([z.number(), z.bigint()]),
    calldata: z.string(),
  }),
  proof: z.array(z.string()).default([]),
});

// TypeScript type definitions
export type BridgeAssetsParams = z.infer<typeof BridgeAssetsSchema>;
export type BridgeStatusParams = z.infer<typeof BridgeStatusSchema>;
export type ClaimFundsParams = z.infer<typeof ClaimFundsSchema>;
