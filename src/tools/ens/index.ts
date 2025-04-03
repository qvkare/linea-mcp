import { z } from 'zod';
import { resolveENSName, lookupENSAddress, checkENSNameAvailability, getENSRecords } from '../ens-resolver.js';

// Define schema for resolve name
export const resolveNameSchema = z.object({
  name: z.string().min(1).describe('The ENS name to resolve'),
  testnet: z.boolean().optional().describe('Whether to use Linea Sepolia testnet'),
});

// Define schema for lookup address
export const lookupAddressSchema = z.object({
  address: z.string().min(1).describe('The Ethereum address to lookup'),
  testnet: z.boolean().optional().describe('Whether to use Linea Sepolia testnet'),
});

// Define schema for checking name availability
export const checkNameAvailabilitySchema = z.object({
  name: z.string().min(1).describe('The ENS name to check availability for'),
  testnet: z.boolean().optional().describe('Whether to use Linea Sepolia testnet'),
});

// Define schema for getting ENS records
export const getRecordsSchema = z.object({
  name: z.string().min(1).describe('The ENS name to get records for'),
  records: z.array(z.string()).min(1).describe('The record keys to retrieve'),
  testnet: z.boolean().optional().describe('Whether to use Linea Sepolia testnet'),
});

// Tool handlers
export async function resolveName(params: z.infer<typeof resolveNameSchema>) {
  const { name, testnet = false } = params;
  const address = await resolveENSName(name, testnet);
  
  return {
    success: true,
    name,
    address,
    resolved: address !== null,
    network: testnet ? 'sepolia' : 'mainnet',
  };
}

export async function lookupAddress(params: z.infer<typeof lookupAddressSchema>) {
  const { address, testnet = false } = params;
  const name = await lookupENSAddress(address, testnet);
  
  return {
    success: true,
    address,
    name,
    resolved: name !== null,
    network: testnet ? 'sepolia' : 'mainnet',
  };
}

export async function checkNameAvailability(params: z.infer<typeof checkNameAvailabilitySchema>) {
  const { name, testnet = false } = params;
  const isAvailable = await checkENSNameAvailability(name, testnet);
  
  return {
    success: true,
    name,
    available: isAvailable,
    network: testnet ? 'sepolia' : 'mainnet',
  };
}

export async function getRecords(params: z.infer<typeof getRecordsSchema>) {
  const { name, records, testnet = false } = params;
  const recordsData = await getENSRecords(name, records, testnet);
  
  return {
    success: true,
    name,
    records: recordsData,
    network: testnet ? 'sepolia' : 'mainnet',
  };
}

// Tool metadata
export const toolMetadata = {
  resolveName: {
    description: 'Resolve an ENS name to its address on Linea',
  },
  lookupAddress: {
    description: 'Lookup ENS name for an address on Linea',
  },
  checkNameAvailability: {
    description: 'Check if an ENS name is available on Linea',
  },
  getRecords: {
    description: 'Get ENS records for a name on Linea',
  },
}; 