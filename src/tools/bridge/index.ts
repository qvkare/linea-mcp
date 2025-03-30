import { bridgeAssets, bridgeStatus } from './handlers.js';
import { BridgeAssetsSchema, BridgeStatusSchema } from './schemas.js';

// Export all handlers
export { bridgeAssets, bridgeStatus };

// Export all schemas
export { BridgeAssetsSchema, BridgeStatusSchema };

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
};
