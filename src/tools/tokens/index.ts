import {
    Erc20BalanceSchema,
    Erc20TransferSchema,
    ListAvailableTokensParams,
    ListAvailableTokensResult,
    GetTokenInfoParams,
    GetTokenInfoResult,
    GetTokenPriceHistoryParams,
    GetTokenPriceHistoryResult
} from './schemas.js';
import {
    erc20Balance,
    erc20Transfer,
    listAvailableTokens,
    getTokenInfo,
    getTokenPriceHistory
} from './handlers.js';

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

export const tokenTools = [
    {
        name: 'tokens_erc20Balance',
        description: 'Check the balance of a specific ERC20 token for a given wallet address (defaults to the configured wallet).',
        inputSchema: Erc20BalanceSchema,
        handler: erc20Balance,
    },
    {
        name: 'tokens_erc20Transfer',
        description: 'Transfer a specific amount of an ERC20 token to a destination address. Estimates gas and asks for confirmation before sending.',
        inputSchema: Erc20TransferSchema,
        handler: erc20Transfer,
    },
    {
        name: 'tokens_listAvailableTokens',
        description: 'List available ERC20 tokens on Linea. Supports searching by name/symbol and pagination.',
        inputSchema: ListAvailableTokensParams,
        outputSchema: ListAvailableTokensResult,
        handler: listAvailableTokens,
    },
    {
        name: 'tokens_getTokenInfo',
        description: 'Get detailed information (name, symbol, decimals, logo, price) for a specific ERC20 token using its contract address.',
        inputSchema: GetTokenInfoParams,
        outputSchema: GetTokenInfoResult,
        handler: getTokenInfo,
    },
    {
        name: 'tokens_getTokenPriceHistory',
        description: 'Get the historical hourly price data (in USD) for a specific ERC20 token.',
        inputSchema: GetTokenPriceHistoryParams,
        outputSchema: GetTokenPriceHistoryResult,
        handler: getTokenPriceHistory,
    },
];
