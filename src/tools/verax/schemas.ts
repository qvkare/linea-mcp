import { z } from 'zod';

/**
 * Schema for verifying if an address is a verified human (PoH-like functionality)
 */
export const VerifyHumanSchema = z.object({
  address: z.string().describe('The address to verify as human'),
});

// Type definitions for the schemas
export type VerifyHumanParams = z.infer<typeof VerifyHumanSchema>; 