import { Hex, formatEther } from 'viem';
import BlockchainService, { NetworkName } from '../../services/blockchain.js';
import { GetTransactionStatusParams } from './schemas.js';

/**
 * Get the status and details of a transaction.
 * @param params Parameters including transactionHash and optional network.
 * @returns Transaction status and details.
 */
export async function getTransactionStatus(params: GetTransactionStatusParams) {
  const { transactionHash, network = 'mainnet' } = params;
  const txHash = transactionHash as Hex; // Cast to Hex type

  console.log(`Checking status for transaction ${txHash} on network ${network}...`);

  try {
    const blockchain = new BlockchainService(network as NetworkName);
    const publicClient = blockchain.client;

    // 1. Try to get the transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    if (receipt) {
      console.log(`Receipt found. Status: ${receipt.status}`);
      const status = receipt.status === 'success' ? 'success' : 'reverted';
      return {
        success: true,
        transactionHash: txHash,
        network,
        status: status,
        blockNumber: receipt.blockNumber.toString(),
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(), // Optional
        from: receipt.from,
        to: receipt.to,
        contractAddress: receipt.contractAddress, // If it was a contract deployment
        logs: receipt.logs, // Include logs (might be large)
      };
    }

    // 2. If no receipt, check if the transaction is pending
    console.log('No receipt found, checking for pending transaction...');
    const transaction = await publicClient.getTransaction({ hash: txHash });

    if (transaction) {
      console.log('Transaction found but still pending.');
      return {
        success: true,
        transactionHash: txHash,
        network,
        status: 'pending',
        message: 'Transaction found but is still pending confirmation.',
        details: { // Include basic tx details if available
            from: transaction.from,
            to: transaction.to,
            value: transaction.value ? formatEther(transaction.value) : '0',
            nonce: transaction.nonce,
            gasPrice: transaction.gasPrice?.toString(),
            maxFeePerGas: transaction.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: transaction.maxPriorityFeePerGas?.toString(),
        }
      };
    }

    // 3. If neither receipt nor transaction is found
    console.log('Transaction not found.');
    return {
      success: true, // The operation succeeded, but the tx wasn't found
      transactionHash: txHash,
      network,
      status: 'not_found',
      message: `Transaction hash ${txHash} not found on network ${network}.`,
    };

  } catch (error: unknown) {
    console.error(`Error fetching status for transaction ${txHash}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    // Don't throw, return an error status
    return {
        success: false,
        transactionHash: txHash,
        network,
        status: 'error',
        error: `Failed to get transaction status: ${errorMessage}`,
    };
  }
}
