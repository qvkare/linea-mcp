import { z } from 'zod';

/**
 * Schema for getting the status of a transaction.
 */
export const GetTransactionStatusSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
  network: z.enum(['mainnet', 'testnet', 'ethereum']).optional().default('mainnet')
    .describe('The network where the transaction occurred (linea mainnet, linea testnet, or ethereum mainnet)'),
});

// Type definition for the schema
export type GetTransactionStatusParams = z.infer<typeof GetTransactionStatusSchema>;

/**
 * Example Output Schema (Informational - actual output structure defined in handler)
 *
 * success: boolean;
 * transactionHash: string;
 * network: string;
 * status: 'pending' | 'success' | 'reverted' | 'not_found';
 * blockNumber?: string | null;
 * gasUsed?: string | null;
 * from?: string;
 * to?: string | null;
 * value?: string | null;
 * data?: string | null;
 * error?: string | null; // If status is 'reverted' or fetch fails
 */
