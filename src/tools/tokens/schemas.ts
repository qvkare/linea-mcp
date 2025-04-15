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

// New Schemas for Linea Token API

export const ListAvailableTokensParams = z.object({
  query: z.string().optional().describe('Optional search query to filter tokens by name or symbol'),
  limit: z.number().int().positive().optional().default(10).describe('Maximum number of tokens to return (default 10)'),
  page: z.number().int().positive().optional().default(1).describe('Page number for pagination (default 1)'),
  includePrice: z.boolean().optional().default(true).describe('Whether to include price data in the response (default true)'),
}).describe('Parameters to list available tokens on Linea, with optional search and pagination.');

export type ListAvailableTokensParamsType = z.infer<typeof ListAvailableTokensParams>;

export const TokenInfoSchema = z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    logoURI: z.string().url().optional().nullable(),
    currentPrice: z.number().optional().nullable().describe('Current price in USD'),
    priceChange24h: z.number().optional().nullable().describe('Percentage price change in the last 24 hours'),
    // Add other relevant fields from the API response as needed
}).describe('Information about a specific ERC20 token on Linea.');

export type TokenInfoType = z.infer<typeof TokenInfoSchema>;

export const ListAvailableTokensResult = z.object({
    success: z.boolean(),
    tokens: z.array(TokenInfoSchema),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().optional().describe('Total number of tokens matching the query, if available'),
}).describe('Result of listing available tokens.');

export type ListAvailableTokensResultType = z.infer<typeof ListAvailableTokensResult>;

export const GetTokenInfoParams = z.object({
  contractAddress: z.string().describe('The contract address of the token to get information for.'),
  includePrice: z.boolean().optional().default(true).describe('Whether to include price data (default true)'),
}).describe('Parameters to get detailed information about a specific token.');

export type GetTokenInfoParamsType = z.infer<typeof GetTokenInfoParams>;

export const GetTokenInfoResult = z.object({
    success: z.boolean(),
    token: TokenInfoSchema.optional().nullable(), // Make optional in case token not found
}).describe('Result of getting token information.');

export type GetTokenInfoResultType = z.infer<typeof GetTokenInfoResult>;

export const GetTokenPriceHistoryParams = z.object({
    contractAddress: z.string().describe('The contract address of the token.'),
    // Potentially add time range params like 'days' or 'interval' if API supports
}).describe('Parameters to get historical price data for a token.');

export type GetTokenPriceHistoryParamsType = z.infer<typeof GetTokenPriceHistoryParams>;

export const PricePointSchema = z.object({
    timestamp: z.number().int().positive().describe('Unix timestamp of the price point'),
    price: z.number().describe('Price in USD at the given timestamp'),
});

export type PricePointType = z.infer<typeof PricePointSchema>;

export const GetTokenPriceHistoryResult = z.object({
    success: z.boolean(),
    address: z.string(),
    history: z.array(PricePointSchema),
}).describe('Result containing the historical price data for a token.');

export type GetTokenPriceHistoryResultType = z.infer<typeof GetTokenPriceHistoryResult>;
