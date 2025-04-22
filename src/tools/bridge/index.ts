import { bridgeAssets, bridgeStatus, claimFunds, autoClaimFunds } from './handlers.js';
import { BridgeAssetsSchema, BridgeStatusSchema, ClaimFundsSchema } from './schemas.js';

// Export all handlers
export { bridgeAssets, bridgeStatus, claimFunds, autoClaimFunds };

// Export all schemas
export { BridgeAssetsSchema, BridgeStatusSchema, ClaimFundsSchema };

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  bridgeAssets: {
    name: 'bridge-assets', // Optional: kebab-case name if needed elsewhere
    description: 'Bridge assets between Ethereum and Linea',
    example: 'Bridge 0.1 ETH from Ethereum to Linea.', // Add an example
  },
  bridgeStatus: {
    name: 'bridge-status', // Optional: kebab-case name if needed elsewhere
    description: 'Check the status of a bridge transaction',
    example: 'Check status of bridge transaction 0xabcdef...', // Add an example
  },
  claimFunds: {
    name: 'claim-funds',
    description: 'Claim bridged funds that are ready on the destination chain',
    example: 'First check status with bridge-status, then claim funds when ready using the returned claimData.',
  },
  autoClaimFunds: {
    name: 'auto-claim-funds',
    description: 'Automatically claim bridged funds with boosted gas price for faster processing',
    example: 'Auto-claim funds with bridgeStatus results when they are in ready_to_claim state.',
  },
};
