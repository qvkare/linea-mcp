import { getAddressSchema, listBalancesSchema, transferFundsSchema } from './schemas.js';
import { getAddress, listBalances, transferFunds } from './handlers.js';

// Export schemas and handlers
export {
  // Schemas
  getAddressSchema,
  listBalancesSchema,
  transferFundsSchema,
  
  // Handlers
  getAddress,
  listBalances,
  transferFunds,
};

// Define tool metadata for documentation
export const toolMetadata = {
  getAddress: {
    name: 'get-address',
    description: 'Retrieves a wallet address for Linea blockchain',
    example: 'What\'s my wallet address on Linea?',
  },
  listBalances: {
    name: 'list-balances',
    description: 'Lists all balances for a wallet on Linea',
    example: 'Show me my wallet balances on Linea.',
  },
  transferFunds: {
    name: 'transfer-funds',
    description: 'Transfers funds from your wallet to another address on Linea',
    example: 'Transfer 0.01 ETH to 0x1234567890abcdef1234567890abcdef12345678 on Linea.',
  },
};
