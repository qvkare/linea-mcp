import { erc20Balance, erc20Transfer } from './handlers.js';
import { Erc20BalanceSchema, Erc20TransferSchema } from './schemas.js';

// Export all handlers
export { erc20Balance, erc20Transfer };

// Export all schemas
export { Erc20BalanceSchema, Erc20TransferSchema };

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  erc20Balance: {
    name: 'erc20-balance', // Optional: kebab-case name
    description: 'Get the balance of an ERC20 token for a wallet',
    example: 'Get USDC balance for address 0x...', // Add example
  },
  erc20Transfer: {
    name: 'erc20-transfer', // Optional: kebab-case name
    description: 'Transfer ERC20 tokens from one wallet to another',
    example: 'Transfer 100 USDC from contract 0x... to address 0x...', // Add example
  },
};
