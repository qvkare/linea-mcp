import { ethers } from 'ethers';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { Erc20BalanceParams, Erc20TransferParams } from './schemas.js';

// ERC20 Token ABI (minimal for balance and transfer)
const ERC20_ABI = [
  // Read-only functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  
  // Authenticated functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)'
];

/**
 * Get the balance of an ERC20 token for a wallet
 * @param params The parameters for getting the token balance
 * @returns The token balance and details
 */
export async function erc20Balance(params: Erc20BalanceParams) {
  try {
    const { tokenAddress } = params;
    const blockchain = new BlockchainService('mainnet');
    
    // If no address is provided, generate a new one
    let address: string;
    if (!params.address) {
      const keyService = new KeyManagementService();
      const wallet = keyService.generateWallet();
      address = wallet.address;
    } else {
      address = params.address;
    }
    
    // Create token contract instance
    const tokenContract = blockchain.createContract(tokenAddress, ERC20_ABI);
    
    // Get token details
    const [balance, decimals, symbol, name] = await Promise.all([
      tokenContract.balanceOf(address),
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name()
    ]);
    
    // Format balance based on token decimals
    const formattedBalance = ethers.utils.formatUnits(balance, decimals);
    
    return {
      success: true,
      address,
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
    
    // Validate destination address
    if (!ethers.utils.isAddress(destination)) {
      throw new Error('Invalid destination address');
    }
    
    // Initialize services
    const blockchain = new BlockchainService('mainnet');
    const keyService = new KeyManagementService();
    
    // In a real implementation, you would retrieve the user's wallet
    // Here, we're generating a new one for demonstration purposes
    const wallet = keyService.getDefaultWallet();
    const connectedWallet = wallet.connect(blockchain.provider);
    
    // Create token contract instance with signer
    const tokenContract = blockchain.createContractWithSigner(
      tokenAddress,
      ERC20_ABI,
      connectedWallet
    );
    
    // Get token details
    const [decimals, symbol, name] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name()
    ]);
    
    // Parse amount based on token decimals
    const parsedAmount = ethers.utils.parseUnits(amount, decimals);
    
    // Execute the transfer
    const tx = await tokenContract.transfer(destination, parsedAmount);
    await tx.wait();
    
    return {
      success: true,
      transactionHash: tx.hash,
      from: wallet.address,
      to: destination,
      amount,
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
    throw new Error(`Failed to transfer tokens: ${errorMessage}`);
  }
}
