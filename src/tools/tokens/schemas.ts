import { z } from 'zod';

/**
 * Schema for ERC20 balance request
 */
export const Erc20BalanceSchema = z.object({
  address: z.string().optional(),
  tokenAddress: z.string(),
});

/**
 * Schema for ERC20 transfer request
 */
export const Erc20TransferSchema = z.object({
  tokenAddress: z.string(),
  destination: z.string(),
  amount: z.string(),
});

// Type definitions for the schemas
export type Erc20BalanceParams = z.infer<typeof Erc20BalanceSchema>;
export type Erc20TransferParams = z.infer<typeof Erc20TransferSchema>;
