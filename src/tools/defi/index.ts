import { swapTokens, liquidityPools } from './handlers.js';
import { SwapTokensSchema, LiquidityPoolsSchema } from './schemas.js';

// Export all handlers
export { swapTokens, liquidityPools };

// Export all schemas
export { SwapTokensSchema, LiquidityPoolsSchema };

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  swapTokens: {
    name: 'swap-tokens', // Optional: kebab-case name
    description: 'Swap tokens on a DEX',
    example: 'Swap 1 ETH for USDC on Uniswap.', // Add example
  },
  liquidityPools: {
    name: 'liquidity-pools', // Optional: kebab-case name
    description: 'Get information about liquidity pools',
    example: 'Get info about the ETH/USDC pool on Uniswap.', // Add example
  },
};
