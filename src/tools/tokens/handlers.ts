import {
  isAddress,
  parseUnits,
  formatUnits,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createWalletClient, // Kept for post-confirmation logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  http, // Kept for post-confirmation logic
  Abi,
  Address,
  // Hex, // Unused
  formatEther, // Added for fee formatting
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PublicClient, // Needed for estimation & post-confirmation logic
} from 'viem';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import {
    Erc20BalanceParams,
    Erc20TransferParams,
    ListAvailableTokensParamsType,
    ListAvailableTokensResultType,
    GetTokenInfoParamsType,
    GetTokenInfoResultType,
    GetTokenPriceHistoryParamsType,
    GetTokenPriceHistoryResultType,
    TokenInfoSchema,
    PricePointType
} from './schemas.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../config/index.js'; // Kept for post-confirmation logic
import { z } from 'zod'; // Import z for parsing API responses
import axios from 'axios'; // Import axios for HTTP requests

// ERC20 Token ABI (minimal for balance and transfer) - viem compatible
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
    stateMutability: 'nonpayable', // Indicate it's a write function
  },
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: 'success', type: 'bool' }],
    type: 'function',
    stateMutability: 'nonpayable',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
] as const satisfies Abi; // Use 'as const' for better type inference with viem

// Base URL for the Linea Token API
const LINEA_TOKEN_API_BASE_URL = 'https://token-api.linea.build';

// Helper function to safely parse API response with Zod using Axios
async function safeFetchAndParse<T extends z.ZodTypeAny>(url: string, schema: T): Promise<z.infer<T>> {
    try {
        // Use axios.get instead of fetch
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json' // Ensure we request JSON
            }
        });

        // Axios throws for non-2xx status codes by default, so no need to check response.ok
        const data = response.data;

        const parsed = schema.safeParse(data);
        if (!parsed.success) {
            console.error("Zod parsing error:", parsed.error.errors);
            throw new Error(`API response validation failed: ${parsed.error.message}`);
        }
        return parsed.data;
    } catch (error: unknown) {
        console.error(`Error fetching or parsing ${url}:`, error);

        // Type narrowing
        if (axios.isAxiosError(error)) {
            // Axios error handling
            const status = error.response?.status ?? 'N/A';
            const responseData = error.response?.data ? JSON.stringify(error.response.data) : 'No data';
            throw new Error(`Linea Token API request failed with status ${status}: ${error.message}. Response: ${responseData}`);
        } else if (error instanceof Error) {
            // Generic Error handling (includes our custom validation error)
            throw new Error(`Failed to process data from Linea Token API: ${error.message}`);
        } else {
             // Handle cases where error is not an Error object (e.g., string thrown)
            throw new Error(`An unknown error occurred while contacting the Linea Token API: ${String(error)}`);
        }
    }
}

/**
 * Get the balance of an ERC20 token for a wallet
 * @param params The parameters for getting the token balance
 * @returns The token balance and details
 */
export async function erc20Balance(params: Erc20BalanceParams) {
  try {
    const { tokenAddress } = params;
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet for now
    const publicClient = blockchain.client;

    // Validate token address
    if (!isAddress(tokenAddress)) {
        throw new Error('Invalid token address provided.');
    }

    let ownerAddress: Address;
    if (!params.address) {
      // If no address is provided, use the default account's address
      const keyService = new KeyManagementService();
      const account = keyService.getDefaultAccount();
      ownerAddress = account.address;
      console.warn(`No address provided, using default account address: ${ownerAddress}`);
    } else if (isAddress(params.address)) {
      ownerAddress = params.address;
    } else {
        throw new Error('Invalid owner address provided.');
    }

    // Create read-only contract instance using BlockchainService
    const tokenContract = blockchain.createContract(tokenAddress, ERC20_ABI);

    // Get token details using multicall for efficiency
    const results = await publicClient.multicall({
        contracts: [
            { ...tokenContract, functionName: 'balanceOf', args: [ownerAddress] },
            { ...tokenContract, functionName: 'decimals' },
            { ...tokenContract, functionName: 'symbol' },
            { ...tokenContract, functionName: 'name' },
        ],
        allowFailure: false, // Throw if any call fails
    });

    // Explicitly type the results from multicall
    const [balance, decimals, symbol, name] = results as [bigint, number, string, string];

    // Format balance based on token decimals
    const formattedBalance = formatUnits(balance, decimals);

    return {
      success: true,
      address: ownerAddress,
      token: {
        address: tokenAddress,
        name,
        symbol,
        decimals,
      },
      balance: formattedBalance,
    };
  } catch (error: unknown) {
    console.error('Error in erc20Balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    // Improve error message context
    if (errorMessage.includes('Invalid token address')) {
         throw new Error(`Failed to get token balance: Invalid token address format.`);
    } else if (errorMessage.includes('call revert')) {
         throw new Error(`Failed to get token balance: Contract call failed. Is the token address correct and on the Linea mainnet?`);
    }
    throw new Error(`Failed to get token balance: ${errorMessage}`);
  }
}

/**
 * Transfer ERC20 tokens from one wallet to another, with fee estimation and confirmation
 * @param params The parameters for transferring tokens
 * @returns The transaction details or an abort message
 */
export async function erc20Transfer(params: Erc20TransferParams): Promise<any> { // Return type needs to be flexible
  try {
    const { tokenAddress, destination, amount } = params;

    // Validate addresses
    if (!isAddress(tokenAddress)) {
      throw new Error('Invalid token address');
    }
    if (!isAddress(destination)) {
      throw new Error('Invalid destination address');
    }

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();

    // Get the default account (sender)
    const account = keyService.getDefaultAccount();

    // --- Get token details (read operations) ---
     const tokenContractReader = blockchain.createContract(tokenAddress, ERC20_ABI);
     const decimals = await publicClient.readContract({
         ...tokenContractReader,
         functionName: 'decimals',
     });
     const symbol = await publicClient.readContract({
         ...tokenContractReader,
         functionName: 'symbol',
     });
      const name = await publicClient.readContract({
         ...tokenContractReader,
         functionName: 'name',
     });
    // -----------------------------------------

    // Parse amount based on token decimals (ensure decimals is treated as number)
    const parsedAmount = parseUnits(amount, decimals as number);

    // --- Estimate Gas Fee ---
    console.log(`Estimating gas for transferring ${amount} ${symbol} to ${destination}...`);
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let estimatedFeeEther: string;
    try {
        // Use estimateContractGas for contract interactions
        gasEstimate = await publicClient.estimateContractGas({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [destination, parsedAmount],
            account, // Account is needed for estimation context
        });
        gasPrice = await publicClient.getGasPrice();
        const estimatedFee = gasEstimate * gasPrice;
        estimatedFeeEther = formatEther(estimatedFee);
        console.log(`Estimated Gas: ${gasEstimate}, Gas Price: ${gasPrice}, Estimated Fee: ~${estimatedFeeEther} ETH`);
    } catch (estimationError: unknown) {
        console.error("Error estimating contract gas:", estimationError);
        // Provide more context in error message
        if (estimationError instanceof Error && estimationError.message.includes('insufficient funds')) {
             throw new Error(`Failed to estimate gas fee: Insufficient balance for gas. Sender: ${account.address}`);
        } else if (estimationError instanceof Error && estimationError.message.includes('transfer amount exceeds balance')) {
             throw new Error(`Failed to estimate gas fee: Transfer amount likely exceeds token balance.`);
        }
        throw new Error(`Failed to estimate gas fee: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
    }
    // --- End Estimation ---

     // --- Ask for Confirmation ---
    throw new Error(`CONFIRMATION_REQUIRED: Estimated fee to transfer ${amount} ${symbol} (${name}) to ${destination} is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);
    // --- End Confirmation ---

    /*
    // --- Code to run *after* user confirms (Yes) ---

    // Create a WalletClient instance to send transactions
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(config.rpc.mainnet || 'https://rpc.linea.build'),
    });

    console.log(`Proceeding with transfer of ${amount} ${symbol} from ${account.address} to ${destination}...`);

    // --- Execute the transfer (write operation) ---
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [destination, parsedAmount],
      gas: gasEstimate, // Apply estimated gas
      gasPrice: gasPrice, // Apply fetched gas price
      // Account is implicitly used by walletClient
    });

    console.log(`Transaction submitted with hash: ${hash}. Waiting for confirmation...`);

    // Wait for the transaction to be confirmed
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`Transaction confirmed in block ${receipt.blockNumber}. Status: ${receipt.status}`);

    if (receipt.status === 'reverted') {
        throw new Error(`Transaction failed (reverted). Hash: ${hash}`);
    }
    // -----------------------------------------

    return {
      success: true,
      transactionHash: hash,
      receipt: { // Include receipt details
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      from: account.address,
      to: destination,
      amount, // Return original amount string
      token: {
        address: tokenAddress,
        name,
        symbol,
        decimals,
      },
      estimatedFee: estimatedFeeEther, // Include estimate
    };
    // --- End Post-Confirmation Code ---
    */

  } catch (error: unknown) {
     // Re-throw confirmation request errors
    if (error instanceof Error && error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw error;
    }

    console.error('Error in erc20Transfer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     // Add more specific error handling
     if (errorMessage.includes('insufficient funds')) {
         throw new Error(`Failed to transfer tokens: Insufficient funds for transaction.`);
     } else if (errorMessage.includes('Invalid destination address')) {
         throw new Error(`Failed to transfer tokens: Invalid destination address format.`);
     } else if (errorMessage.includes('Invalid token address')) {
         throw new Error(`Failed to transfer tokens: Invalid token address format.`);
     } else if (errorMessage.includes('Transaction failed (reverted)')) {
         throw new Error(`Failed to transfer tokens: Transaction was reverted by the contract. Check allowance or balance.`);
     }
    throw new Error(`Failed to transfer tokens: ${errorMessage}`);
  }
}

// --- New Handler Functions for Linea Token API ---

/**
 * List available tokens on Linea, with optional search and pagination.
 * @param params Parameters including optional query, limit, page, and includePrice.
 * @returns A list of tokens matching the criteria.
 */
export async function listAvailableTokens(params: ListAvailableTokensParamsType): Promise<ListAvailableTokensResultType> {
    try {
        const { query, limit, page, includePrice } = params;
        const urlParams = new URLSearchParams({
            limit: limit.toString(),
            page: page.toString(),
            includePrice: includePrice.toString(),
        });
        if (query) {
            urlParams.append('query', query);
        }

        const apiUrl = `${LINEA_TOKEN_API_BASE_URL}/tokens?${urlParams.toString()}`;

        // Define the expected API response structure (adjust based on actual API)
        const ApiResponseSchema = z.object({
            // Adjust based on Swagger/API docs: Often it's { data: [], meta: {} }
            data: z.array(TokenInfoSchema), // Assume the token objects match our schema
            meta: z.object({
                currentPage: z.number(),
                itemsPerPage: z.number(),
                totalItems: z.number().optional(),
                totalPages: z.number().optional(),
            }).optional(),
        });

        const rawResponse = await safeFetchAndParse(apiUrl, ApiResponseSchema);

        // Map the response to our expected result structure
        return {
            success: true,
            tokens: rawResponse.data,
            page: rawResponse.meta?.currentPage ?? page,
            limit: rawResponse.meta?.itemsPerPage ?? limit,
            total: rawResponse.meta?.totalItems,
        };

    } catch (error: unknown) {
        console.error('Error in listAvailableTokens:', error);
        if (error instanceof Error) {
            throw new Error(`Failed to list available tokens: ${error.message}`);
        }
        throw new Error('Failed to list available tokens due to an unknown error.');
    }
}

/**
 * Get detailed information about a specific token by its contract address.
 * @param params Parameters including the contract address and includePrice flag.
 * @returns Detailed information about the specified token.
 */
export async function getTokenInfo(params: GetTokenInfoParamsType): Promise<GetTokenInfoResultType> {
    try {
        const { contractAddress, includePrice } = params;
        if (!isAddress(contractAddress)) {
            throw new Error('Invalid contract address provided.');
        }

        const urlParams = new URLSearchParams({
            includePrice: includePrice.toString(),
        });
        const apiUrl = `${LINEA_TOKEN_API_BASE_URL}/tokens/${contractAddress}?${urlParams.toString()}`;

        // The API endpoint GET /tokens/{contractAddress} likely returns the token object directly
        const tokenData = await safeFetchAndParse(apiUrl, TokenInfoSchema);

        return {
            success: true,
            token: tokenData,
        };
    } catch (error: unknown) {
        console.error('Error in getTokenInfo:', error);
         if (axios.isAxiosError(error) && error.response?.status === 404) {
             // Handle 404 Not Found specifically
            console.log(`Token not found via API: ${params.contractAddress}`);
            return { success: true, token: null };
        }
        if (error instanceof Error) {
            throw new Error(`Failed to get token info for ${params.contractAddress}: ${error.message}`);
        }
        throw new Error(`Failed to get token info for ${params.contractAddress} due to an unknown error.`);
    }
}


/**
 * Get historical hourly price data for a specific token.
 * @param params Parameters including the contract address.
 * @returns Historical price data for the token.
 */
export async function getTokenPriceHistory(params: GetTokenPriceHistoryParamsType): Promise<GetTokenPriceHistoryResultType> {
     try {
        const { contractAddress } = params;
         if (!isAddress(contractAddress)) {
            throw new Error('Invalid contract address provided.');
        }

        const apiUrl = `${LINEA_TOKEN_API_BASE_URL}/prices/${contractAddress}`;

         // Define the expected API response structure for price history
         const ApiResponseSchema = z.array(z.object({
             // Assuming timestamp is Unix seconds. If ms, adjust schema or conversion.
             timestamp: z.number().int().positive(),
             price: z.number(),
         }));

        const historyData = await safeFetchAndParse(apiUrl, ApiResponseSchema);

        // Explicitly type the point parameter in map
        const formattedHistory: PricePointType[] = historyData.map((point: { timestamp: number, price: number }) => ({
            timestamp: point.timestamp, // Assuming API timestamp matches our schema
            price: point.price,
        }));

        // Ensure the return structure matches GetTokenPriceHistoryResultType
        return {
            success: true,
            address: contractAddress,
            history: formattedHistory,
        };
    } catch (error: unknown) {
        console.error('Error in getTokenPriceHistory:', error);
         if (axios.isAxiosError(error) && error.response?.status === 404) {
             // Handle 404 Not Found specifically
             console.log(`Price history not found via API for: ${params.contractAddress}`);
            return { success: true, address: params.contractAddress, history: [] };
        }
        if (error instanceof Error) {
            throw new Error(`Failed to get price history for ${params.contractAddress}: ${error.message}`);
        }
        throw new Error(`Failed to get price history for ${params.contractAddress} due to an unknown error.`);
    }
}
