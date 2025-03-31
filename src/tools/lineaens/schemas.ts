import { z } from 'zod';

/**
 * Schema for resolving a Linea ENS name to an address
 */
export const ResolveNameSchema = z.object({
  name: z.string().describe('The Linea ENS name to resolve (e.g., "example.linea")'),
});

/**
 * Schema for looking up a Linea ENS name from an address
 */
export const LookupAddressSchema = z.object({
  address: z.string().describe('The Ethereum address to look up a Linea ENS name for'),
});

/**
 * Schema for checking if a Linea ENS name is available
 */
export const CheckNameAvailabilitySchema = z.object({
  name: z.string().describe('The Linea ENS name to check availability for (e.g., "example.linea")'),
});

// Type definitions for the schemas
export type ResolveNameParams = z.infer<typeof ResolveNameSchema>;
export type LookupAddressParams = z.infer<typeof LookupAddressSchema>;
export type CheckNameAvailabilityParams = z.infer<typeof CheckNameAvailabilitySchema>; 