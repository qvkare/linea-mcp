import {
  isAddress,
  parseUnits,
  formatUnits,
  createWalletClient,
  http,
  Abi,
  Address,
  // Hex, // Unused
} from 'viem';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { Erc20BalanceParams, Erc20TransferParams } from './schemas.js';
import config from '../../config/index.js'; // Import config for RPC URL

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
 * Transfer ERC20 tokens from one wallet to another
 * @param params The parameters for transferring tokens
 * @returns The transaction details
 */
export async function erc20Transfer(params: Erc20TransferParams) {
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

    // Create a WalletClient instance to send transactions
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      // Use the same transport as the public client
      transport: http(config.rpc.mainnet || 'https://rpc.linea.build'),
    });

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

    // --- Execute the transfer (write operation) ---
    console.log(`Attempting to transfer ${amount} ${symbol} from ${account.address} to ${destination}...`);

    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [destination, parsedAmount],
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
    };
  } catch (error: unknown) {
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
