import {
  isAddress,
  parseEther,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createWalletClient, // Kept for post-confirmation logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  http, // Kept for post-confirmation logic
  Address,
  // Hex, // Unused
  // TransactionReceipt, // Unused
  // estimateGas, // Use client.estimateGas
  // getGasPrice, // Use client.getGasPrice
  formatEther, // Added for fee formatting
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PublicClient, // Needed for estimation & post-confirmation logic
} from 'viem';
import BlockchainService, { NetworkName } from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { GetAddressParams, ListBalancesParams, TransferFundsParams } from './schemas.js';
import config from '../../config/index.js'; // Import config for RPC URL

/**
 * Get RPC URL based on network name - Helper function (Currently unused but kept for post-confirmation logic)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRpcUrl(network: NetworkName): string { // Keep this function, might be needed later
    switch (network) {
        case 'ethereum': return config.rpc.ethereum;
        case 'testnet': return config.rpc.testnet;
        case 'mainnet':
        default: return config.rpc.mainnet || 'https://rpc.linea.build';
    }
}

/**
 * Get the default wallet address using viem
 * @returns The wallet address
 */
export async function getAddress(_params: GetAddressParams) {
  try {
    const keyService = new KeyManagementService();
    // Use the updated method returning a viem account
    const account = keyService.getDefaultAccount();

    return {
      success: true,
      address: account.address,
    };
  } catch (_error: unknown) {
    console.error('Error in getAddress:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
    throw new Error(`Failed to get address: ${errorMessage}`);
  }
}

/**
 * List balances for a wallet using viem
 * @param params The parameters for listing balances
 * @returns The wallet balances
 */
export async function listBalances(params: ListBalancesParams) {
  try {
    // Assuming mainnet for now, could be parameterized later
    const blockchain = new BlockchainService('mainnet');
    let ownerAddress: Address;

    // If no address is provided, use the default account's address
    if (!params.address) {
      const keyService = new KeyManagementService();
      const account = keyService.getDefaultAccount();
      ownerAddress = account.address;
      console.warn(`No address provided, using default account address: ${ownerAddress}`);
    } else if (isAddress(params.address)) {
      ownerAddress = params.address;
    } else {
        throw new Error('Invalid owner address provided.');
    }

    // Get ETH balance using the viem-based service
    const ethBalance = await blockchain.getBalance(ownerAddress);

    // TODO: Implement fetching balances for common ERC20 tokens on Linea
    // This would involve:
    // 1. Defining a list of common token addresses for Linea.
    // 2. Using publicClient.multicall to fetch balances efficiently.
    // 3. Formatting the results.

    return {
      success: true,
      address: ownerAddress,
      balances: {
        ETH: ethBalance,
        // Example: USDC: await getTokenBalance(ownerAddress, USDC_ADDRESS, publicClient),
      },
      // Add a note about token balances being incomplete
      note: "ERC20 token balances are not fully implemented in this version.",
    };
  } catch (_error: unknown) {
    console.error('Error in listBalances:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
     if (errorMessage.includes('Invalid owner address')) {
         throw new Error(`Failed to list balances: Invalid address format.`);
     }
    throw new Error(`Failed to list balances: ${errorMessage}`);
  }
}

/**
 * Transfer ETH funds from one wallet to another using viem, with fee estimation and confirmation
 * @param params The parameters for transferring funds
 * @returns The transaction details or an abort message
 */
export async function transferFunds(params: TransferFundsParams): Promise<any> { // Return type needs to be flexible for confirmation step
  try {
    const { destination, amount, assetId = 'ETH' } = params; // Default to ETH

    // Validate destination address
    if (!isAddress(destination)) {
      throw new Error('Invalid destination address');
    }

    // Only ETH transfers are supported currently
    if (assetId !== 'ETH') {
         throw new Error(`Only ETH transfers are supported by this tool currently. Use the 'tokens_erc20Transfer' tool for tokens.`);
    }

    // Parse amount
    let parsedAmount: bigint;
    try {
      parsedAmount = parseEther(amount);
    } catch (_error: unknown) {
      throw new Error('Invalid amount format. Amount must be a string representing Ether (e.g., "0.1").');
    }

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();

    // Get the default account (sender)
    const account = keyService.getDefaultAccount();

    // --- Estimate Gas Fee ---
    console.log(`Estimating gas for transferring ${amount} ETH to ${destination}...`);
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let estimatedFeeEther: string;

    try {
        gasEstimate = await publicClient.estimateGas({
            account,
            to: destination,
            value: parsedAmount,
        });
        gasPrice = await publicClient.getGasPrice();
        const estimatedFee = gasEstimate * gasPrice;
        estimatedFeeEther = formatEther(estimatedFee);
        console.log(`Estimated Gas: ${gasEstimate}, Gas Price: ${gasPrice}, Estimated Fee: ${estimatedFeeEther} ETH`);
    } catch (_estimationError: unknown) {
        console.error("Error estimating gas:", _estimationError);
        throw new Error(`Failed to estimate gas fee: ${_estimationError instanceof Error ? _estimationError.message : 'Unknown error'}`);
    }
    // --- End Estimation ---

    // --- Ask for Confirmation ---
    // This requires integration with the MCP client to ask the user
    // We'll simulate this by throwing a specific error that the client can catch
    // In a real MCP server, you'd use the SDK's requestUserConfirmation or similar
    throw new Error(`CONFIRMATION_REQUIRED: Estimated fee to transfer ${amount} ETH to ${destination} is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);
    // --- End Confirmation ---

    /*
    // --- Code to run *after* user confirms (Yes) ---
    // This part would be executed in a subsequent call or callback in a real MCP server

    // Create a WalletClient instance to send transactions
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(getRpcUrl('mainnet')),
    });

    console.log(`Proceeding with transfer of ${amount} ETH from ${account.address} to ${destination}...`);

    // Send ETH transaction
    const hash = await walletClient.sendTransaction({
      to: destination,
      value: parsedAmount,
      gas: gasEstimate, // Use estimated gas
      gasPrice: gasPrice, // Use fetched gas price (or maxFeePerGas/maxPriorityFeePerGas for EIP-1559)
    });

    console.log(`Transaction submitted with hash: ${hash}. Waiting for confirmation...`);

    // Wait for the transaction to be confirmed
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(`Transaction confirmed in block ${receipt.blockNumber}. Status: ${receipt.status}`);

    if (receipt.status === 'reverted') {
        throw new Error(`ETH transfer transaction failed (reverted). Hash: ${hash}`);
    }

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
      assetId,
      estimatedFee: estimatedFeeEther, // Include estimate
    };
    // --- End Post-Confirmation Code ---
    */

  } catch (_error: unknown) {
    // Re-throw confirmation request errors
    if (_error instanceof Error && _error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw _error;
    }

    console.error('Error in transferFunds:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
     if (errorMessage.includes('Invalid destination address')) {
         throw new Error(`Failed to transfer funds: Invalid destination address format.`);
     } else if (errorMessage.includes('Invalid amount format')) {
          throw new Error(`Failed to transfer funds: ${errorMessage}`);
     } else if (errorMessage.includes('insufficient funds')) {
         throw new Error(`Failed to transfer funds: Insufficient ETH balance for the transaction.`);
     } else if (errorMessage.includes('reverted')) {
         throw new Error(`Failed to transfer funds: Transaction reverted.`);
     }
    throw new Error(`Failed to transfer funds: ${errorMessage}`);
  }
}
