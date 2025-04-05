import { z } from 'zod';
import { isAddress } from 'viem';

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

/**
 * Schema for staking LP tokens in a SyncSwap farm
 */
export const StakeLpTokensSchema = z.object({
  // poolAddress: z.string().describe('The address of the SyncSwap LP token contract.'),
  amount: z.string().describe('The amount of LP tokens to stake (in wei or smallest unit).'),
  // Pool ID is essential for MasterChef interactions
  poolId: z.number().int().nonnegative().describe('The ID of the farming pool in the SyncSwap MasterChef contract.'), 
});

/**
 * Schema for unstaking LP tokens from a SyncSwap farm
 */
export const UnstakeLpTokensSchema = z.object({
  // poolAddress: z.string().describe('The address of the SyncSwap LP token contract.'),
  amount: z.string().describe('The amount of LP tokens to unstake (in wei or smallest unit).'),
  poolId: z.number().int().nonnegative().describe('The ID of the farming pool in the SyncSwap MasterChef contract.'),
});

/**
 * Schema for getting yield farming information for a user
 */
export const GetYieldInfoSchema = z.object({
  userAddress: z.string().refine((val) => isAddress(val), { message: 'Invalid Ethereum address for userAddress.' }).describe('The address of the user to check yields for.'),
  // Require poolId for specific pool info
  // poolAddress: z.string().optional().describe('The address of the SyncSwap LP token contract.'),
  poolId: z.number().int().nonnegative().describe('The ID of the farming pool in the SyncSwap MasterChef contract.'),
});

// Type definitions for the schemas
export type SwapTokensParams = z.infer<typeof SwapTokensSchema>;
export type LiquidityPoolsParams = z.infer<typeof LiquidityPoolsSchema>;
export type StakeLpTokensParams = z.infer<typeof StakeLpTokensSchema>;
export type UnstakeLpTokensParams = z.infer<typeof UnstakeLpTokensSchema>;
export type GetYieldInfoParams = z.infer<typeof GetYieldInfoSchema>;
