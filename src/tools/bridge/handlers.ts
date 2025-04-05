import {
  createWalletClient,
  http,
  parseEther,
  Abi,
  Address,
  Hex,
  // PublicClient, // Unused
  // WalletClient, // Unused
  // TransactionReceipt, // Unused
  encodeFunctionData, // Needed for ETH bridging via sendTransaction
  isAddress,
  parseUnits, // Add missing import
 } from 'viem';
 import KeyManagementService /*, { SupportedAccount } */ from '../../services/keyManagement.js'; // Removed unused SupportedAccount
 import BlockchainService, { NetworkName } from '../../services/blockchain.js';
 import { BridgeAssetsParams, BridgeStatusParams } from './schemas.js';
import config from '../../config/index.js';

// --- ABIs (viem compatible) ---
const LINEA_BRIDGE_ABI = [
  {
    name: 'bridgeETH',
    type: 'function',
    stateMutability: 'payable', // Important: indicates value can be sent
    inputs: [{ name: 'minGasLimit', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'bridgeERC20',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'minGasLimit', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'MessageSent',
    type: 'event',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'messageHash', type: 'bytes32' },
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: false, name: 'fee', type: 'uint256' },
    ],
  },
  // Add other events if needed for status checking later
] as const satisfies Abi;

const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Add symbol/name/decimals if needed, but prefer reading from token handler if possible
] as const satisfies Abi;
// -----------------------------

/**
 * Get RPC URL based on network name
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
 * Get Bridge Contract Address based on network name
 */
function getBridgeAddress(network: NetworkName): Address {
     switch (network) {
        case 'ethereum': return config.bridge.ethereumBridgeAddress as Address;
        case 'testnet': // Assuming testnet bridge is same as mainnet for now
        case 'mainnet':
        default: return config.bridge.lineaBridgeAddress as Address;
    }
}


/**
 * Bridge assets between Ethereum and Linea using viem
 * @param params The parameters for bridging assets
 * @returns The transaction details
 */
export async function bridgeAssets(params: BridgeAssetsParams) {
  try {
    const { sourceChain, destinationChain, assetType, tokenAddress, amount } = params;

    // Validate chains
    if (sourceChain === destinationChain) {
      throw new Error('Source and destination chains must be different.');
    }
    if (!['ethereum', 'mainnet', 'testnet'].includes(sourceChain) ||
        !['ethereum', 'mainnet', 'testnet'].includes(destinationChain)) {
        throw new Error('Invalid source or destination chain specified.');
    }

    // Initialize services for the source chain
    const sourceNetwork = sourceChain as NetworkName;
    const blockchain = new BlockchainService(sourceNetwork);
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();

    // Create WalletClient for the source chain
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(getRpcUrl(sourceNetwork)),
    });

    // Get bridge contract address for the source chain
    const bridgeAddress = getBridgeAddress(sourceNetwork);
    if (!isAddress(bridgeAddress)) {
        throw new Error(`Bridge address for ${sourceNetwork} is not configured or invalid.`);
    }

    // Parse amount (assuming 18 decimals for ETH, will need token decimals for ERC20)
    // Default gas limit for the bridge (adjust as needed)
    const minGasLimit = 100000n; // Use bigint

    let txHash: Hex;

    if (assetType === 'ETH') {
      console.log(`Bridging ${amount} ETH from ${sourceChain} to ${destinationChain}...`);
      const parsedValue = parseEther(amount);

      // For bridging ETH, we call bridgeETH function via sendTransaction
      txHash = await walletClient.sendTransaction({
          to: bridgeAddress,
          value: parsedValue,
          // Encode the function call data manually
          data: encodeFunctionData({
              abi: LINEA_BRIDGE_ABI,
              functionName: 'bridgeETH',
              args: [minGasLimit],
          }),
      });

    } else if (assetType === 'ERC20' && tokenAddress) {
        if (!isAddress(tokenAddress)) {
            throw new Error('Invalid token address provided for ERC20 bridge.');
        }
        console.log(`Bridging ${amount} of token ${tokenAddress} from ${sourceChain} to ${destinationChain}...`);

        // 1. Get token decimals (Requires reading from token contract)
        //    We might need a separate helper or use the token service if available
        //    For now, assuming 18 decimals for demonstration. Replace with actual logic.
        const decimals = 18; // TODO: Fetch actual decimals
        console.warn(`Assuming token ${tokenAddress} has ${decimals} decimals. Fetch actual decimals in production.`);
        const parsedAmount = parseUnits(amount, decimals);

        // 2. Approve the bridge contract to spend the tokens
        console.log(`Approving bridge contract ${bridgeAddress} to spend ${amount} tokens...`);
        const approveHash = await walletClient.writeContract({
            address: tokenAddress as Address,
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [bridgeAddress, parsedAmount],
        });
        console.log(`Approval transaction submitted: ${approveHash}. Waiting for confirmation...`);
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status === 'reverted') {
            throw new Error(`Token approval failed (reverted). Hash: ${approveHash}`);
        }
        console.log('Token approval successful.');

        // 3. Call the bridgeERC20 function
        console.log('Initiating bridgeERC20 transaction...');
        txHash = await walletClient.writeContract({
            address: bridgeAddress,
            abi: LINEA_BRIDGE_ABI,
            functionName: 'bridgeERC20',
            args: [tokenAddress as Address, parsedAmount, minGasLimit],
        });

    } else {
      throw new Error('Invalid asset type or missing token address for ERC20.');
    }

    console.log(`Bridge transaction submitted: ${txHash}. Waiting for confirmation...`);
    // Wait for the bridge transaction confirmation on the source chain
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
     console.log(`Bridge transaction confirmed on ${sourceChain}. Status: ${receipt.status}`);

    if (receipt.status === 'reverted') {
        throw new Error(`Bridge transaction failed (reverted). Hash: ${txHash}`);
    }

    return {
      success: true,
      transactionHash: txHash,
      sourceChain,
      destinationChain,
      assetType,
      tokenAddress: assetType === 'ERC20' ? tokenAddress : null,
      amount,
      from: account.address,
      status: 'initiated_on_source', // More specific status
      receipt: { // Include source chain receipt details
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      message: `Bridge transaction initiated on ${sourceChain}. Monitor destination chain for completion.`,
    };
  } catch (error: unknown) {
    console.error('Error in bridgeAssets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     if (errorMessage.includes('insufficient funds')) {
         throw new Error(`Failed to bridge assets: Insufficient funds for transaction.`);
     } else if (errorMessage.includes('reverted')) {
          throw new Error(`Failed to bridge assets: Transaction reverted. Check parameters, approval, or funds.`);
     }
    throw new Error(`Failed to bridge assets: ${errorMessage}`);
  }
}

/**
 * Check the status of a bridge transaction using viem
 * @param params The parameters for checking bridge status
 * @returns The status of the bridge transaction
 */
export async function bridgeStatus(params: BridgeStatusParams) {
  try {
    const { transactionHash, sourceChain } = params;

     if (!['ethereum', 'mainnet', 'testnet'].includes(sourceChain)) {
        throw new Error('Invalid source chain specified.');
    }
     const sourceNetwork = sourceChain as NetworkName;

    // Initialize services for the source chain
    const blockchain = new BlockchainService(sourceNetwork);
    const publicClient = blockchain.client;

    console.log(`Checking status for transaction ${transactionHash} on ${sourceChain}...`);

    // Get transaction receipt on the source chain
    const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash as Hex });

    if (!receipt) {
      // Check if transaction is just pending
       const tx = await publicClient.getTransaction({ hash: transactionHash as Hex });
       const status = tx ? 'pending' : 'not_found';
       const message = tx ? 'Transaction is pending confirmation on source chain.' : 'Transaction not found on source chain.';
      return {
        success: true,
        transactionHash,
        sourceChain,
        status: status,
        message: message,
      };
    }

    // Check if transaction failed on the source chain
    if (receipt.status === 'reverted') {
      return {
        success: true,
        transactionHash,
        sourceChain,
        status: 'failed_on_source',
        message: 'Bridge transaction failed (reverted) on source chain.',
         receipt: {
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status,
        },
      };
    }

    // Transaction succeeded on source chain.
    // A real implementation would now:
    // 1. Parse logs from the receipt to find the message hash or identifier.
    // 2. Query a bridge relay service or the destination chain's bridge contract
    //    using the identifier to check if the message has been processed.
    // For this example, we'll just indicate it's in progress.

    const destinationChain = sourceChain === 'ethereum' ? 'linea' : 'ethereum'; // Simplified logic

    return {
      success: true,
      transactionHash,
      sourceChain,
      destinationChain, // Indicate expected destination
      status: 'completed_on_source', // More accurate status
      message: `Bridge transaction confirmed on ${sourceChain}. Processing on ${destinationChain} may take time. Further status check requires cross-chain monitoring (not implemented in this example).`,
      receipt: {
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status,
      },
    };
  } catch (error: unknown) {
    console.error('Error in bridgeStatus:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to check bridge status: ${errorMessage}`);
  }
}
