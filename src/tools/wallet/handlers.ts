import { ethers } from 'ethers';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { GetAddressParams, ListBalancesParams, TransferFundsParams } from './schemas.js';

/**
 * Get a wallet address
 * @returns The wallet address
 */
export async function getAddress(_params: GetAddressParams) {
  try {
    const keyService = new KeyManagementService();
    const wallet = keyService.getDefaultWallet();
    
    return {
      success: true,
      address: wallet.address,
    };
  } catch (error: unknown) {
    console.error('Error in getAddress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get address: ${errorMessage}`);
  }
}

/**
 * List balances for a wallet
 * @param params The parameters for listing balances
 * @returns The wallet balances
 */
export async function listBalances(params: ListBalancesParams) {
  try {
    const blockchain = new BlockchainService('mainnet');
    
    // If no address is provided, use the default wallet from .env
    let address: string;
    if (!params.address) {
      const keyService = new KeyManagementService();
      const wallet = keyService.getDefaultWallet();
      address = wallet.address;
    } else {
      address = params.address;
    }
    
    // Get ETH balance
    const ethBalance = await blockchain.getBalance(address);
    
    // In a real implementation, you would also get token balances here
    // For example, by querying popular tokens on Linea
    
    return {
      success: true,
      address,
      balances: {
        ETH: ethBalance,
        // Other token balances would be added here
      },
    };
  } catch (error: unknown) {
    console.error('Error in listBalances:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to list balances: ${errorMessage}`);
  }
}

/**
 * Transfer funds from one wallet to another
 * @param params The parameters for transferring funds
 * @returns The transaction details
 */
export async function transferFunds(params: TransferFundsParams) {
  try {
    const { destination, amount, assetId } = params;
    
    // Validate destination address
    if (!ethers.utils.isAddress(destination)) {
      throw new Error('Invalid destination address');
    }
    
    // Parse amount
    let parsedAmount: ethers.BigNumber;
    try {
      parsedAmount = ethers.utils.parseEther(amount);
    } catch (error: unknown) {
      throw new Error('Invalid amount format');
    }
    
    // Initialize services
    const blockchain = new BlockchainService('mainnet');
    const keyService = new KeyManagementService();
    
    // Use the default wallet from .env
    const wallet = keyService.getDefaultWallet();
    const connectedWallet = wallet.connect(blockchain.provider);
    
    // Check if we're transferring ETH or an ERC20 token
    if (assetId === 'ETH') {
      // Transfer ETH
      const tx = await connectedWallet.sendTransaction({
        to: destination,
        value: parsedAmount,
      });
      
      return {
        success: true,
        transactionHash: tx.hash,
        from: wallet.address,
        to: destination,
        amount,
        assetId,
      };
    } else {
      // For ERC20 tokens, you would need to implement token transfer logic
      // This would involve creating a contract instance and calling transfer
      throw new Error('ERC20 token transfers not implemented in this example');
    }
  } catch (error: unknown) {
    console.error('Error in transferFunds:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to transfer funds: ${errorMessage}`);
  }
}
