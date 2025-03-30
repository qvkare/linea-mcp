import { z } from 'zod';

/**
 * Schema for calling a contract function
 */
export const CallContractSchema = z.object({
  contractAddress: z.string(),
  abi: z.array(z.string()).or(z.string()),
  functionName: z.string(),
  params: z.array(z.any()).optional(),
  value: z.string().optional(),
});

/**
 * Schema for deploying a contract
 */
export const DeployContractSchema = z.object({
  bytecode: z.string(),
  abi: z.array(z.string()).or(z.string()),
  constructorArgs: z.array(z.any()).optional(),
  value: z.string().optional(),
});

// Type definitions for the schemas
export type CallContractParams = z.infer<typeof CallContractSchema>;
export type DeployContractParams = z.infer<typeof DeployContractSchema>;
