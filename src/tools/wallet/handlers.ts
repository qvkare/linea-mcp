import {
  isAddress,
  parseEther,
  createWalletClient,
  http,
  Address,
  // Hex, // Unused
  // TransactionReceipt, // Unused
} from 'viem';
import BlockchainService, { NetworkName } from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { GetAddressParams, ListBalancesParams, TransferFundsParams } from './schemas.js';
import config from '../../config/index.js'; // Import config for RPC URL

/**
 * Get RPC URL based on network name - Helper function
 */
function getRpcUrl(network: NetworkName): string {
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
  } catch (error: unknown) {
    console.error('Error in getAddress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
  } catch (error: unknown) {
    console.error('Error in listBalances:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     if (errorMessage.includes('Invalid owner address')) {
         throw new Error(`Failed to list balances: Invalid address format.`);
     }
    throw new Error(`Failed to list balances: ${errorMessage}`);
  }
}

/**
 * Transfer ETH funds from one wallet to another using viem
 * @param params The parameters for transferring funds
 * @returns The transaction details
 */
export async function transferFunds(params: TransferFundsParams) {
  try {
    const { destination, amount, assetId = 'ETH' } = params; // Default to ETH

    // Validate destination address
    if (!isAddress(destination)) {
      throw new Error('Invalid destination address');
    }

    // Only ETH transfers are supported currently
    if (assetId !== 'ETH') {
        // Re-use the ERC20 transfer logic from the tokens tool if needed later
         throw new Error(`Only ETH transfers are supported by this tool currently. Use the 'tokens_erc20Transfer' tool for tokens.`);
    }

    // Parse amount
    let parsedAmount: bigint;
    try {
      parsedAmount = parseEther(amount);
    } catch (error: unknown) {
      throw new Error('Invalid amount format. Amount must be a string representing Ether (e.g., "0.1").');
    }

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();

    // Get the default account (sender)
    const account = keyService.getDefaultAccount();

    // Create a WalletClient instance to send transactions
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(getRpcUrl('mainnet')),
    });

    console.log(`Attempting to transfer ${amount} ETH from ${account.address} to ${destination}...`);

    // Send ETH transaction
    const hash = await walletClient.sendTransaction({
      to: destination,
      value: parsedAmount,
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
    };

  } catch (error: unknown) {
    console.error('Error in transferFunds:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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
