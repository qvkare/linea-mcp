import {
  createWalletClient,
  http,
  // parseEther, // Unused
  formatEther, // Added for fee formatting
  parseUnits,
  formatUnits,
  Abi,
  Address,
  Hex,
  PublicClient, // Used in getTokenDecimals and getPoolInfo
  // WalletClient, // Unused
  // TransactionReceipt, // Unused
  isAddress,
  zeroAddress, // viem's equivalent of AddressZero
  // multicall is a client method, not a direct import
} from 'viem';
import KeyManagementService from '../../services/keyManagement.js';
import BlockchainService, { NetworkName } from '../../services/blockchain.js';
import { SwapTokensParams, LiquidityPoolsParams } from './schemas.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../config/index.js'; // Kept for post-confirmation logic

// --- ABIs (viem compatible) ---
// Note: These ABIs are simplified. Real DEX interactions might need more functions.
const DEX_ROUTER_ABI = [
  { name: 'swapExactTokensForTokens', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapExactETHForTokens', type: 'function', stateMutability: 'payable', inputs: [{ name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapExactTokensForETH', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'getAmountsOut', type: 'function', stateMutability: 'view', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'WETH', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] }, // Some routers have a WETH() function
] as const satisfies Abi;

const FACTORY_ABI = [
  { name: 'getPair', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }], outputs: [{ name: 'pair', type: 'address' }] },
  { name: 'allPairs', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: 'pair', type: 'address' }] },
  { name: 'allPairsLength', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const satisfies Abi;

const PAIR_ABI = [
  { name: 'token0', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'token1', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'getReserves', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'reserve0', type: 'uint112' }, { name: 'reserve1', type: 'uint112' }, { name: 'blockTimestampLast', type: 'uint32' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const satisfies Abi;

const ERC20_ABI_MINIMAL = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const satisfies Abi;
// -----------------------------

// Use actual config values, ensuring type safety
const DEX_ADDRESSES = {
  ROUTER: (config.defi.routerAddress || '0x1111111111111111111111111111111111111111') as Address, // Fallback placeholder
  FACTORY: (config.defi.factoryAddress || '0x2222222222222222222222222222222222222222') as Address, // Fallback placeholder
  WETH: (config.defi.wethAddress || '0x3333333333333333333333333333333333333333') as Address, // Fallback placeholder
};

/**
 * Get RPC URL based on network name - Helper function (Currently unused but kept for post-confirmation logic)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRpcUrl(network: NetworkName): string {
    switch (network) {
        case 'ethereum': return config.rpc.ethereum;
        case 'testnet': return config.rpc.testnet;
        case 'mainnet':
        default: return config.rpc.mainnet || 'https://rpc.linea.build';
    }
}

/**
 * Fetch token decimals - replace with a more robust solution if possible (Currently unused but kept for post-confirmation logic)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getTokenDecimals(tokenAddress: Address, publicClient: PublicClient): Promise<number> {
    if (!isAddress(tokenAddress)) throw new Error("Invalid token address for fetching decimals.");
    try {
        const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI_MINIMAL,
            functionName: 'decimals',
        });
        return decimals;
    } catch (e) {
        console.error(`Failed to fetch decimals for ${tokenAddress}:`, e);
        throw new Error(`Could not fetch decimals for token ${tokenAddress}. Is it a valid ERC20 token?`);
    }
}


/**
 * Swap tokens on a DEX using viem, with fee estimation and confirmation
 * @param params The parameters for swapping tokens
 * @returns The transaction details or an abort message
 */
export async function swapTokens(params: SwapTokensParams): Promise<any> { // Return type needs to be flexible
  try {
    const { fromToken, toToken, amount, slippageTolerance = 0.5 } = params; // Default slippage 0.5%

    // Validate addresses (allow 'ETH' string)
    if (fromToken.toLowerCase() !== 'eth' && !isAddress(fromToken)) {
        throw new Error('Invalid "fromToken" address.');
    }
     if (toToken.toLowerCase() !== 'eth' && !isAddress(toToken)) {
        throw new Error('Invalid "toToken" address.');
    }

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();

    // Determine swap type and path
    const isFromETH = fromToken.toLowerCase() === 'eth';
    const isToETH = toToken.toLowerCase() === 'eth';
    const path: Address[] = [];
    let fromTokenAddress: Address;
    let toTokenAddress: Address;
    let fromDecimals: number;
    let fromSymbol = 'Token'; // Type inferred

    if (isFromETH) {
        path.push(DEX_ADDRESSES.WETH);
        fromTokenAddress = DEX_ADDRESSES.WETH; // Use WETH internally
        fromDecimals = 18; // ETH/WETH always has 18 decimals
        fromSymbol = 'ETH';
    } else {
        fromTokenAddress = fromToken as Address;
        path.push(fromTokenAddress);
        // Fetch decimals and symbol together
        try {
             const results = await publicClient.multicall({ contracts: [
                { address: fromTokenAddress, abi: ERC20_ABI_MINIMAL, functionName: 'decimals' },
                { address: fromTokenAddress, abi: ERC20_ABI_MINIMAL, functionName: 'symbol' },
             ], allowFailure: false });
             fromDecimals = results[0] as number;
             fromSymbol = results[1] as string;
        } catch (e) {
             console.error(`Failed to fetch details for fromToken ${fromTokenAddress}:`, e);
             throw new Error(`Could not fetch details for token ${fromTokenAddress}. Is it a valid ERC20 token?`);
        }
    }

    if (isToETH) {
        path.push(DEX_ADDRESSES.WETH);
        toTokenAddress = DEX_ADDRESSES.WETH;
    } else {
        toTokenAddress = toToken as Address;
        path.push(toTokenAddress);
    }

    // Parse input amount
    const parsedAmountIn = parseUnits(amount, fromDecimals);

    // Get expected output amount using readContract
    console.log(`Getting quote for swapping ${amount} ${fromSymbol} -> ${isToETH ? 'ETH' : toTokenAddress}...`);
    const amountsOut = await publicClient.readContract({
        address: DEX_ADDRESSES.ROUTER,
        abi: DEX_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [parsedAmountIn, path],
    });
    const expectedOutput = amountsOut[amountsOut.length - 1];

    // Calculate minimum output with slippage tolerance (using bigint)
    const slippageFactor = BigInt(Math.floor((1 - slippageTolerance / 100) * 10000)); // Use 10000 for precision
    const minOutput = (expectedOutput * slippageFactor) / 10000n;

    // Set deadline (e.g., 20 minutes from now)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let txHash: Hex; // Kept for post-confirmation logic
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let estimatedFeeEther: string;
    let approveGasEstimate: bigint | undefined;
    let approveGasPrice: bigint | undefined;
    let approveEstimatedFeeEther: string | undefined;

    // --- Approve Router if needed (Token -> ETH or Token -> Token) ---
    if (!isFromETH) {
        console.log(`Estimating gas for approving router ${DEX_ADDRESSES.ROUTER} to spend ${amount} ${fromSymbol}...`);
        try {
            approveGasEstimate = await publicClient.estimateContractGas({
                address: fromTokenAddress,
                abi: ERC20_ABI_MINIMAL,
                functionName: 'approve',
                args: [DEX_ADDRESSES.ROUTER, parsedAmountIn],
                account,
            });
            approveGasPrice = await publicClient.getGasPrice();
            approveEstimatedFeeEther = formatEther(approveGasEstimate * approveGasPrice);
            console.log(`Approval Estimated Fee: ~${approveEstimatedFeeEther} ETH`);
        } catch (estimationError: unknown) {
            console.error("Error estimating approval gas:", estimationError);
            throw new Error(`Failed to estimate gas fee for approval: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
        }
        // Ask for Approval Confirmation
        throw new Error(`CONFIRMATION_REQUIRED: Step 1/2: Estimated fee to approve router for ${amount} ${fromSymbol} is ~${approveEstimatedFeeEther} ETH. Proceed? (Yes/No)`);

        /*
        // --- Code to run *after* user confirms Approval (Yes) ---
        const walletClient = createWalletClient({ account, chain: blockchain.currentChain, transport: http(getRpcUrl('mainnet')) });
        console.log(`Proceeding with token approval...`);
        const approveHash = await walletClient.writeContract({
            address: fromTokenAddress,
            abi: ERC20_ABI_MINIMAL,
            functionName: 'approve',
            args: [DEX_ADDRESSES.ROUTER, parsedAmountIn],
            gas: approveGasEstimate,
            gasPrice: approveGasPrice,
        });
        console.log(`Approval submitted: ${approveHash}. Waiting...`);
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status === 'reverted') {
            throw new Error(`Token approval failed (reverted). Hash: ${approveHash}`);
        }
        console.log('Approval successful.');
        // --- End Post-Confirmation Code (Approval) ---
        */
    }
    // ----------------------------------------------------------------

    // --- Estimate Gas for Swap ---
    console.log(`Estimating gas for swap transaction...`);
    try {
        if (isFromETH) {
            gasEstimate = await publicClient.estimateContractGas({
                address: DEX_ADDRESSES.ROUTER,
                abi: DEX_ROUTER_ABI,
                functionName: 'swapExactETHForTokens',
                args: [minOutput, path, account.address, deadline],
                account,
                value: parsedAmountIn,
            });
        } else if (isToETH) {
            gasEstimate = await publicClient.estimateContractGas({
                address: DEX_ADDRESSES.ROUTER,
                abi: DEX_ROUTER_ABI,
                functionName: 'swapExactTokensForETH',
                args: [parsedAmountIn, minOutput, path, account.address, deadline],
                account,
                // value: undefined (default)
            });
        } else {
            gasEstimate = await publicClient.estimateContractGas({
                address: DEX_ADDRESSES.ROUTER,
                abi: DEX_ROUTER_ABI,
                functionName: 'swapExactTokensForTokens',
                args: [parsedAmountIn, minOutput, path, account.address, deadline],
                account,
                 // value: undefined (default)
            });
        }
        gasPrice = await publicClient.getGasPrice(); // Re-fetch or use approveGasPrice if available and recent
        estimatedFeeEther = formatEther(gasEstimate * gasPrice);
        console.log(`Swap Estimated Fee: ~${estimatedFeeEther} ETH`);
    } catch (estimationError: unknown) {
        console.error("Error estimating swap gas:", estimationError);
        throw new Error(`Failed to estimate gas fee for swap: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
    }
    // --- End Estimation (Swap) ---

    // --- Ask for Confirmation (Swap) ---
    const totalFee = approveEstimatedFeeEther
        ? formatEther((approveGasEstimate! * approveGasPrice!) + (gasEstimate * gasPrice))
        : estimatedFeeEther;
    const confirmationMsg = approveEstimatedFeeEther
        ? `Step 2/2: Estimated fee for the swap is ~${estimatedFeeEther} ETH (Total estimated: ~${totalFee} ETH). Proceed? (Yes/No)`
        : `Estimated fee for the swap is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`;
    throw new Error(`CONFIRMATION_REQUIRED: ${confirmationMsg}`);
    // --- End Confirmation (Swap) ---


    /*
    // --- Code to run *after* user confirms Swap (Yes) ---
    // Ensure walletClient is defined
    const walletClient = createWalletClient({ account, chain: blockchain.currentChain, transport: http(getRpcUrl('mainnet')) });

    console.log(`Proceeding with swap...`);
    // Execute the correct swap function based on the case
    if (isFromETH) {
        txHash = await walletClient.writeContract({
            address: DEX_ADDRESSES.ROUTER,
            abi: DEX_ROUTER_ABI,
            functionName: 'swapExactETHForTokens',
            args: [minOutput, path, account.address, deadline],
            value: parsedAmountIn,
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
    } else if (isToETH) {
         txHash = await walletClient.writeContract({
            address: DEX_ADDRESSES.ROUTER,
            abi: DEX_ROUTER_ABI,
            functionName: 'swapExactTokensForETH',
            args: [parsedAmountIn, minOutput, path, account.address, deadline],
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
    } else {
         txHash = await walletClient.writeContract({
            address: DEX_ADDRESSES.ROUTER,
            abi: DEX_ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [parsedAmountIn, minOutput, path, account.address, deadline],
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
    }

    console.log(`Swap transaction submitted: ${txHash}. Waiting for confirmation...`);
    // --- End Confirmation (Swap) ---


    /*
    // --- Code to run *after* user confirms Swap (Yes) ---
    // Ensure walletClient is defined
    const walletClient = createWalletClient({ account, chain: blockchain.currentChain, transport: http(getRpcUrl('mainnet')) });

    console.log(`Proceeding with swap...`);
    // Execute the correct swap function based on the case
    if (isFromETH) {
        txHash = await walletClient.writeContract({
            address: DEX_ADDRESSES.ROUTER,
            abi: DEX_ROUTER_ABI,
            functionName: 'swapExactETHForTokens',
            args: [minOutput, path, account.address, deadline],
            value: parsedAmountIn,
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
    } else if (isToETH) {
         txHash = await walletClient.writeContract({
            address: DEX_ADDRESSES.ROUTER,
            abi: DEX_ROUTER_ABI,
            functionName: 'swapExactTokensForETH',
            args: [parsedAmountIn, minOutput, path, account.address, deadline],
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
    } else {
         txHash = await walletClient.writeContract({
            address: DEX_ADDRESSES.ROUTER,
            abi: DEX_ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [parsedAmountIn, minOutput, path, account.address, deadline],
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
    }

    console.log(`Swap transaction submitted: ${txHash}. Waiting for confirmation...`);
        gasPrice: gasPrice,
    });

    console.log(`Swap transaction submitted: ${txHash}. Waiting for confirmation...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Swap transaction confirmed. Status: ${receipt.status}`);

    if (receipt.status === 'reverted') {
        throw new Error(`Swap transaction failed (reverted). Hash: ${txHash}`);
    }

    const toDecimals = isToETH ? 18 : await getTokenDecimals(toTokenAddress, publicClient);

    return {
      success: true,
      transactionHash: txHash,
      fromToken: isFromETH ? 'ETH' : fromTokenAddress,
      toToken: isToETH ? 'ETH' : toTokenAddress,
      amountIn: amount,
      expectedAmountOut: formatUnits(expectedOutput, toDecimals),
      minAmountOut: formatUnits(minOutput, toDecimals),
      slippageTolerance,
      from: account.address,
       receipt: {
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      estimatedFee: estimatedFeeEther, // Add swap estimate
      approveEstimatedFee: approveEstimatedFeeEther // Add approval estimate if applicable
    };
    // --- End Post-Confirmation Code (Swap) ---
    */

  } catch (error: unknown) {
     // Re-throw confirmation request errors
    if (error instanceof Error && error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw error;
    }
    console.error('Error in swapTokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     if (errorMessage.includes('insufficient funds')) {
         throw new Error(`Failed to swap tokens: Insufficient funds for transaction or approval.`);
     } else if (errorMessage.includes('reverted')) {
          throw new Error(`Failed to swap tokens: Transaction reverted. Check slippage, approval, or path.`);
     }
    throw new Error(`Failed to swap tokens: ${errorMessage}`);
  }
}

/**
 * Get information about liquidity pools using viem
 * @param params The parameters for getting liquidity pool information
 * @returns The liquidity pool information
 */
export async function liquidityPools(params: LiquidityPoolsParams) {
  try {
    const { poolAddress, tokenA, tokenB } = params;
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;

    // If a specific pool is requested
    if (poolAddress) {
        if (!isAddress(poolAddress)) throw new Error("Invalid pool address provided.");
        return await getPoolInfo(poolAddress, publicClient);
    }

    // If a token pair is specified
    if (tokenA && tokenB) {
        if (!isAddress(tokenA) || !isAddress(tokenB)) throw new Error("Invalid token addresses provided.");

        console.log(`Fetching pair address for ${tokenA} / ${tokenB}...`);
        const pairAddress = await publicClient.readContract({
            address: DEX_ADDRESSES.FACTORY,
            abi: FACTORY_ABI,
            functionName: 'getPair',
            args: [tokenA, tokenB],
        });

        if (pairAddress === zeroAddress) {
            return {
            success: true,
            pools: [],
            message: 'No liquidity pool found for the specified token pair.',
            };
        }
        console.log(`Found pair address: ${pairAddress}`);
        return await getPoolInfo(pairAddress, publicClient);
    }

    // If no specific pool or token pair is requested
    // TODO: Implement fetching multiple pools (e.g., via allPairsLength/allPairs or indexer)
    console.warn("Fetching all pools is not implemented. Provide a poolAddress or tokenA/tokenB.");
    return {
      success: true,
      pools: [],
      message: 'Listing all pools requires further implementation (e.g., using allPairs or an indexer). Please specify a pool address or token pair.',
    };
  } catch (error: unknown) {
    console.error('Error in liquidityPools:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get liquidity pool information: ${errorMessage}`);
  }
}

/**
 * Get information about a specific liquidity pool using viem and multicall
 * @param poolAddress The address of the pool
 * @param publicClient The viem PublicClient instance
 * @returns The pool information
 */
async function getPoolInfo(poolAddress: Address, publicClient: PublicClient) { // Pass publicClient
  try {
    console.log(`Fetching info for pool: ${poolAddress}`);

    // Define contracts for multicall
    const pairContract = { address: poolAddress, abi: PAIR_ABI };

    // Initial reads for token addresses
    const [token0Address, token1Address] = await publicClient.multicall({
        contracts: [
            { ...pairContract, functionName: 'token0' },
            { ...pairContract, functionName: 'token1' },
        ],
        allowFailure: false,
    });

     if (!isAddress(token0Address) || !isAddress(token1Address)) {
         throw new Error(`Invalid token addresses returned by pool ${poolAddress}`);
     }

    // Define token contracts
    const token0Contract = { address: token0Address, abi: ERC20_ABI_MINIMAL };
    const token1Contract = { address: token1Address, abi: ERC20_ABI_MINIMAL };

    // Multicall for all remaining details using the client method
    const results = await publicClient.multicall({
        contracts: [
            { ...token0Contract, functionName: 'symbol' },      // 0
            { ...token0Contract, functionName: 'name' },        // 1
            { ...token0Contract, functionName: 'decimals' },    // 2
            { ...token1Contract, functionName: 'symbol' },      // 3
            { ...token1Contract, functionName: 'name' },        // 4
            { ...token1Contract, functionName: 'decimals' },    // 5
            { ...pairContract, functionName: 'getReserves' },   // 6
            { ...pairContract, functionName: 'totalSupply' },   // 7
        ],
        allowFailure: false, // Throw if any call fails
    });

    // Destructure results with type safety
    const [
        token0Symbol, token0Name, token0Decimals,
        token1Symbol, token1Name, token1Decimals,
        reserves, totalSupply
    ] = results as [
        string, string, number, // token0 details
        string, string, number, // token1 details
        readonly [bigint, bigint, number], // reserves (reserve0, reserve1, timestamp)
        bigint // totalSupply
    ];

    // Format reserves
    const reserve0 = formatUnits(reserves[0], token0Decimals);
    const reserve1 = formatUnits(reserves[1], token1Decimals);

    // Calculate prices (handle potential division by zero)
    const reserve0Num = parseFloat(reserve0);
    const reserve1Num = parseFloat(reserve1);
    const price0In1 = reserve0Num !== 0 ? reserve1Num / reserve0Num : 0;
    const price1In0 = reserve1Num !== 0 ? reserve0Num / reserve1Num : 0;

    return {
      success: true,
      pool: {
        address: poolAddress,
        token0: {
          address: token0Address,
          symbol: token0Symbol,
          name: token0Name,
          decimals: token0Decimals,
          reserve: reserve0,
        },
        token1: {
          address: token1Address,
          symbol: token1Symbol,
          name: token1Name,
          decimals: token1Decimals,
          reserve: reserve1,
        },
        totalSupply: formatUnits(totalSupply, 18), // LP tokens usually have 18 decimals
        prices: {
          [`${token0Symbol}_in_${token1Symbol}`]: price0In1, // Use underscore for safer keys
          [`${token1Symbol}_in_${token0Symbol}`]: price1In0,
        },
        lastUpdatedTimestamp: reserves[2],
      },
    };
  } catch (error: unknown) {
    console.error(`Error in getPoolInfo for ${poolAddress}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     if (errorMessage.includes('call revert')) {
         throw new Error(`Failed to get pool info: Contract call failed. Is ${poolAddress} a valid LP pair address?`);
     }
    throw new Error(`Failed to get pool information: ${errorMessage}`);
  }
}
