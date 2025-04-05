import {
  // createWalletClient, // Unused (in current state)
  // http, // Unused (in current state)
  parseEther,
  Abi,
  Address,
  Hex,
  PublicClient, // Needed for estimation
  // WalletClient, // Unused
  // TransactionReceipt, // Unused
  encodeFunctionData, // Needed for ETH bridging via sendTransaction
  isAddress,
  parseUnits, // Add missing import
  formatEther, // Added for fee formatting
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
 * Bridge assets between Ethereum and Linea using viem, with fee estimation and confirmation
 * @param params The parameters for bridging assets
 * @returns The transaction details or an abort message
 */
export async function bridgeAssets(params: BridgeAssetsParams): Promise<any> { // Return type needs to be flexible
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

    // Get bridge contract address for the source chain
    const bridgeAddress = getBridgeAddress(sourceNetwork);
    if (!isAddress(bridgeAddress)) {
        throw new Error(`Bridge address for ${sourceNetwork} is not configured or invalid.`);
    }

    const minGasLimit = 100000n; // Use bigint
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let txHash: Hex; // Kept for post-confirmation logic
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let estimatedFeeEther: string;

    if (assetType === 'ETH') {
      const parsedValue = parseEther(amount);
      const bridgeData = encodeFunctionData({
          abi: LINEA_BRIDGE_ABI,
          functionName: 'bridgeETH',
          args: [minGasLimit],
      });

      // --- Estimate Gas Fee (ETH Bridge) ---
      console.log(`Estimating gas for bridging ${amount} ETH to ${destinationChain}...`);
      try {
          gasEstimate = await publicClient.estimateGas({
              account,
              to: bridgeAddress,
              value: parsedValue,
              data: bridgeData,
          });
          gasPrice = await publicClient.getGasPrice();
          estimatedFeeEther = formatEther(gasEstimate * gasPrice);
          console.log(`Estimated Fee: ~${estimatedFeeEther} ETH`);
      } catch (estimationError: unknown) {
          console.error("Error estimating ETH bridge gas:", estimationError);
          throw new Error(`Failed to estimate gas fee: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
      }
      // --- End Estimation ---

      // --- Ask for Confirmation (ETH Bridge) ---
      throw new Error(`CONFIRMATION_REQUIRED: Estimated fee to bridge ${amount} ETH from ${sourceChain} to ${destinationChain} is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);
      // --- End Confirmation ---

      /*
      // --- Code to run *after* user confirms (Yes) ---
      const walletClient = createWalletClient({ account, chain: blockchain.currentChain, transport: http(getRpcUrl(sourceNetwork)) });
      console.log(`Proceeding with ETH bridge...`);
      txHash = await walletClient.sendTransaction({
          account, // Ensure account is passed if not implicit in client
          to: bridgeAddress,
          value: parsedValue,
          data: bridgeData,
          gas: gasEstimate,
          gasPrice: gasPrice,
      });
      // ... rest of the post-confirmation logic ...
      */

    } else if (assetType === 'ERC20' && tokenAddress) {
        if (!isAddress(tokenAddress)) {
            throw new Error('Invalid token address provided for ERC20 bridge.');
        }
        const tokenAddressHex = tokenAddress as Address;

        // TODO: Fetch actual decimals
        const decimals = 18;
        console.warn(`Assuming token ${tokenAddress} has ${decimals} decimals. Fetch actual decimals in production.`);
        const parsedAmount = parseUnits(amount, decimals);

        // --- Estimate Gas Fee (Approval) ---
        console.log(`Estimating gas for approving bridge contract ${bridgeAddress} to spend ${amount} tokens...`);
        let approveGasEstimate: bigint;
        let approveGasPrice: bigint;
        let approveEstimatedFeeEther: string;
        try {
            approveGasEstimate = await publicClient.estimateContractGas({
                address: tokenAddressHex,
                abi: ERC20_APPROVE_ABI,
                functionName: 'approve',
                args: [bridgeAddress, parsedAmount],
                account,
            });
            approveGasPrice = await publicClient.getGasPrice(); // Can potentially reuse gasPrice if fetched recently
            approveEstimatedFeeEther = formatEther(approveGasEstimate * approveGasPrice);
            console.log(`Approval Estimated Fee: ~${approveEstimatedFeeEther} ETH`);
        } catch (estimationError: unknown) {
            console.error("Error estimating approval gas:", estimationError);
            throw new Error(`Failed to estimate gas fee for approval: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
        }
        // --- End Estimation (Approval) ---

        // --- Ask for Confirmation (Approval) ---
        throw new Error(`CONFIRMATION_REQUIRED: Step 1/2: Estimated fee to approve bridge for ${amount} tokens is ~${approveEstimatedFeeEther} ETH. Proceed? (Yes/No)`);
        // --- End Confirmation (Approval) ---

        /*
        // --- Code to run *after* user confirms Approval (Yes) ---
        const walletClient = createWalletClient({ account, chain: blockchain.currentChain, transport: http(getRpcUrl(sourceNetwork)) });
        console.log(`Proceeding with token approval...`);
        const approveHash = await walletClient.writeContract({
            address: tokenAddressHex,
            abi: ERC20_APPROVE_ABI,
            functionName: 'approve',
            args: [bridgeAddress, parsedAmount],
            gas: approveGasEstimate,
            gasPrice: approveGasPrice,
        });
        console.log(`Approval transaction submitted: ${approveHash}. Waiting...`);
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status === 'reverted') {
            throw new Error(`Token approval failed (reverted). Hash: ${approveHash}`);
        }
        console.log('Token approval successful.');
        // --- End Post-Confirmation Code (Approval) ---
        */

        // --- Estimate Gas Fee (Bridge ERC20) ---
        console.log(`Estimating gas for bridging ${amount} of token ${tokenAddress}...`);
        try {
            gasEstimate = await publicClient.estimateContractGas({
                address: bridgeAddress,
                abi: LINEA_BRIDGE_ABI,
                functionName: 'bridgeERC20',
                args: [tokenAddressHex, parsedAmount, minGasLimit],
                account,
            });
            gasPrice = await publicClient.getGasPrice(); // Re-fetch or reuse approveGasPrice
            estimatedFeeEther = formatEther(gasEstimate * gasPrice);
            console.log(`Bridge Estimated Fee: ~${estimatedFeeEther} ETH`);
        } catch (estimationError: unknown) {
            console.error("Error estimating bridgeERC20 gas:", estimationError);
            // Cast to any to bypass persistent TS error, then access message
            const errorMsg = (estimationError as any)?.message || 'Unknown error';
            throw new Error(`Failed to estimate gas fee for bridge transaction: ${errorMsg}`);
        }
        // --- End Estimation (Bridge ERC20) ---

        // --- Ask for Confirmation (Bridge ERC20) ---
        throw new Error(`CONFIRMATION_REQUIRED: Step 2/2: Estimated fee for the bridge transaction itself is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);
        // --- End Confirmation (Bridge ERC20) ---

        /*
        // --- Code to run *after* user confirms Bridge (Yes) ---
        // Ensure walletClient is defined (it should be from approval step)
        console.log('Proceeding with bridgeERC20 transaction...');
        txHash = await walletClient.writeContract({
            address: bridgeAddress,
            abi: LINEA_BRIDGE_ABI,
            functionName: 'bridgeERC20',
            args: [tokenAddressHex, parsedAmount, minGasLimit],
            gas: gasEstimate,
            gasPrice: gasPrice,
        });
        // ... rest of the post-confirmation logic ...
        */

    } else {
      throw new Error('Invalid asset type or missing token address for ERC20.');
    }

    // This part is now unreachable due to the confirmation throws
    /*
    console.log(`Bridge transaction submitted: ${txHash}. Waiting for confirmation...`);
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
      status: 'initiated_on_source',
      receipt: {
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      message: `Bridge transaction initiated on ${sourceChain}. Monitor destination chain for completion.`,
      estimatedFee: estimatedFeeEther // Include estimate if available
    };
    */

  } catch (error: unknown) {
     // Re-throw confirmation request errors
    if (error instanceof Error && error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw error;
    }
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
