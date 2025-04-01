import { z } from 'zod';

/**
 * Schema for the get-address tool
 * This tool doesn't require any parameters
 */
export const getAddressSchema = z.object({
  random_string: z.string().describe('Dummy parameter for no-parameter tools')
});

/**
 * Schema for the list-balances tool
 * @param address Optional address to check balances for
 */
export const listBalancesSchema = z.object({
  address: z.string().optional(),
});

/**
 * Schema for the transfer-funds tool
 * @param destination The address to send funds to
 * @param amount The amount to send
 * @param assetId The asset to send (defaults to ETH)
 */
export const transferFundsSchema = z.object({
  destination: z.string(),
  amount: z.string(),
  assetId: z.string().default('ETH'),
});

export type GetAddressParams = z.infer<typeof getAddressSchema>;
export type ListBalancesParams = z.infer<typeof listBalancesSchema>;
export type TransferFundsParams = z.infer<typeof transferFundsSchema>;
