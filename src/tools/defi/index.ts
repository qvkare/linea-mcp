import {
  swapTokens,
  liquidityPools,
  stakeLpTokens,
  unstakeLpTokens,
  getYieldInfo
} from './handlers.js';
import {
  SwapTokensSchema,
  LiquidityPoolsSchema,
  StakeLpTokensSchema,
  UnstakeLpTokensSchema,
  GetYieldInfoSchema
} from './schemas.js';

// Export all handlers
export {
  swapTokens,
  liquidityPools,
  stakeLpTokens,
  unstakeLpTokens,
  getYieldInfo
};

// Export all schemas
export {
  SwapTokensSchema,
  LiquidityPoolsSchema,
  StakeLpTokensSchema,
  UnstakeLpTokensSchema,
  GetYieldInfoSchema
};

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  swapTokens: {
    name: 'swap-tokens',
    description: 'Swap tokens on a DEX (e.g., SyncSwap)',
    example: 'Swap 0.1 ETH for USDC on SyncSwap.',
  },
  liquidityPools: {
    name: 'liquidity-pools',
    description: 'Get information about liquidity pools (e.g., reserves, token addresses)',
    example: 'Get info about the ETH/USDC pool on SyncSwap.',
  },
  stakeLpTokens: {
    name: 'defi_stakeLpTokens', // Using requested naming convention
    description: 'Stake SyncSwap LP tokens into a MasterChef farm to earn rewards.',
    example: 'Stake 1.5 ETH/USDC LP tokens in SyncSwap pool 5.',
  },
  unstakeLpTokens: {
    name: 'defi_unstakeLpTokens', // Using requested naming convention
    description: 'Unstake (withdraw) SyncSwap LP tokens from a MasterChef farm.',
    example: 'Unstake 0.5 ETH/USDC LP tokens from SyncSwap pool 5.',
  },
  getYieldInfo: {
    name: 'defi_getYieldInfo', // Using requested naming convention
    description: 'Get yield farming info (staked amount, pending rewards) for a user from a SyncSwap farm.',
    example: 'Get my yield info for SyncSwap pool 5.',
  },
};
