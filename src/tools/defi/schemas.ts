import { z } from 'zod';

/**
 * Schema for swapping tokens
 */
export const SwapTokensSchema = z.object({
  fromToken: z.string(),
  toToken: z.string(),
  amount: z.string(),
  slippageTolerance: z.number().min(0).max(100).default(0.5),
});

/**
 * Schema for getting liquidity pool information
 */
export const LiquidityPoolsSchema = z.object({
  poolAddress: z.string().optional(),
  tokenA: z.string().optional(),
  tokenB: z.string().optional(),
});

// Type definitions for the schemas
export type SwapTokensParams = z.infer<typeof SwapTokensSchema>;
export type LiquidityPoolsParams = z.infer<typeof LiquidityPoolsSchema>;
