// These are the official ENS contract addresses
// ENS registry and resolver on Ethereum L1
import config from '../../config/index.js';

// Linea ENS Registry contract address 
export const LINEA_ENS_REGISTRY_MAINNET = config.ens.linea.registry || '0x6E258c8A3A3e5e85FEd39BF5D936add0AbcBE90A'; // Linea ENS Registry
export const LINEA_ENS_REGISTRY_TESTNET = '0x6E258c8A3A3e5e85FEd39BF5D936add0AbcBE90A'; // Linea ENS Registry

// Linea ENS Resolver contract address
export const LINEA_ENS_RESOLVER_MAINNET = config.ens.linea.resolver || '0xec5B648618481dF6d6FfA72B6ca3AaCC36dF7c9d'; // Linea ENS Resolver
export const LINEA_ENS_RESOLVER_TESTNET = '0xec5B648618481dF6d6FfA72B6ca3AaCC36dF7c9d'; // Linea ENS Resolver

// CCIP Gateway URLs
export const LINEA_CCIP_GATEWAY_URL = config.ens.linea.gateway || 'https://linea-ccip-gateway.linea.build';
export const LINEA_CCIP_GATEWAY_ENDPOINT = config.ens.linea.queryEndpoint || '/';

// Linea ENS Registry ABI
export const LINEA_ENS_REGISTRY_ABI = [
  'function resolver(bytes32 node) view returns (address)',
  'function owner(bytes32 node) view returns (address)',
  'function ttl(bytes32 node) view returns (uint64)',
];

// Linea ENS Resolver ABI
export const LINEA_ENS_RESOLVER_ABI = [
  'function addr(bytes32 node) view returns (address)',
  'function name(bytes32 node) view returns (string)',
  'function text(bytes32 node, string key) view returns (string)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function resolve(bytes name, bytes data) external view returns (bytes)',
  'function interfaceImplementer(bytes32 node, bytes4 interfaceId) external view returns (address)'
];

// Use the proper ethers.js namehash function
import { utils } from 'ethers';
export function namehash(name: string): string {
  // Normalize the name to lowercase first
  const normalized = name.toLowerCase();
  
  // Log the name being processed to debug
  console.log(`Calculating namehash for: ${normalized}`);
  
  // Calculate namehash using ethers.js utility
  const hash = utils.namehash(normalized);
  
  // Log the resulting hash
  console.log(`Resulting hash: ${hash}`);
  
  return hash;
}

// Linea ENS TLD (Top Level Domain)
export const LINEA_ENS_TLD = config.ens.linea.tld || 'linea';

// Linea ENS full format
export const LINEA_ENS_FORMAT = config.ens.linea.format || '{name}.linea.eth';

// Check and format ENS name to proper format
export function formatEnsName(name: string): string {
  // Null or empty check
  if (!name) {
    console.warn('Empty name passed to formatEnsName');
    return '';
  }
  
  try {
    // Configuration-based dynamic format
    const format = LINEA_ENS_FORMAT;
    const tld = LINEA_ENS_TLD;
    
    console.log(`Formatting ENS name: ${name}`);
    console.log(`Using format: ${format}`);
    
    // Clean the name (remove any leading/trailing spaces)
    const cleanedName = name.trim().toLowerCase();
    
    // If it's already a full Ethereum ENS name like 'name.linea.eth'
    if (cleanedName.endsWith('.linea.eth')) {
      console.log(`Name already in full format: ${cleanedName}`);
      return cleanedName;
    }
    
    // If it's just a 'name.linea'
    if (cleanedName.endsWith(`.${tld}`)) {
      // Replace .linea with .linea.eth
      const formatted = `${cleanedName}.eth`;
      console.log(`Reformatted from ${cleanedName} to ${formatted}`);
      return formatted;
    }
    
    // If it's just 'name' without any suffix
    if (!cleanedName.includes('.')) {
      const formatted = format.replace('{name}', cleanedName);
      console.log(`Formatted bare name from ${cleanedName} to ${formatted}`);
      return formatted;
    }
    
    // If it's already a full ENS name with another TLD like 'name.eth'
    if (cleanedName.endsWith('.eth')) {
      console.log(`Keeping original ENS name: ${cleanedName}`);
      return cleanedName;
    }
    
    // Default case - use the format from config
    const formatted = format.replace('{name}', cleanedName);
    console.log(`Formatted using default rule from ${cleanedName} to ${formatted}`);
    return formatted;
  } catch (error) {
    console.error('Error in formatEnsName:', error);
    // Return the original name as fallback
    return name;
  }
} 