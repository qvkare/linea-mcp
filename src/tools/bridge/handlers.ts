import { ethers } from 'ethers';
import KeyManagementService from '../../services/keyManagement.js';
import { BridgeAssetsParams, BridgeStatusParams } from './schemas.js';
import config from '../../config/index.js';

// Simplified Linea Bridge ABI (for demonstration purposes)
const LINEA_BRIDGE_ABI = [
  // Bridge functions
  'function bridgeETH(uint256 minGasLimit) payable',
  'function bridgeERC20(address token, uint256 amount, uint256 minGasLimit)',
  
  // Events
  'event MessageSent(bytes32 indexed messageHash, address indexed from, address indexed to, uint256 value, uint256 fee)',
  'event ETHBridgeInitiated(address indexed from, address indexed to, uint256 amount, uint256 fee)',
  'event ERC20BridgeInitiated(address indexed from, address indexed to, address token, uint256 amount, uint256 fee)'
];

/**
 * Bridge assets between Ethereum and Linea
 * @param params The parameters for bridging assets
 * @returns The transaction details
 */
export async function bridgeAssets(params: BridgeAssetsParams) {
  try {
    const { sourceChain, destinationChain, assetType, tokenAddress, amount } = params;
    
    // Validate source and destination chains
    if (sourceChain === destinationChain) {
      throw new Error('Source and destination chains must be different');
    }
    
    // Initialize services based on source chain
    const rpcUrl = sourceChain === 'ethereum' 
      ? config.ethereum.mainnet 
      : config.rpc.mainnet;
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const keyService = new KeyManagementService();
    
    // In a real implementation, you would retrieve the user's wallet
    // Here, we're generating a new one for demonstration purposes
    const wallet = keyService.getDefaultWallet();
    const connectedWallet = wallet.connect(provider);
    
    // Get bridge contract address based on source chain
    const bridgeAddress = sourceChain === 'ethereum'
      ? config.bridge.ethereumBridgeAddress
      : config.bridge.lineaBridgeAddress;
    
    // Create bridge contract instance with signer
    const bridgeContract = new ethers.Contract(
      bridgeAddress,
      LINEA_BRIDGE_ABI,
      connectedWallet
    );
    
    // Parse amount
    const parsedAmount = ethers.utils.parseEther(amount);
    
    // Default gas limit for the bridge
    const minGasLimit = ethers.BigNumber.from('100000');
    
    let tx;
    if (assetType === 'ETH') {
      // Bridge ETH
      tx = await bridgeContract.bridgeETH(minGasLimit, {
        value: parsedAmount,
      });
    } else if (assetType === 'ERC20' && tokenAddress) {
      // For ERC20, we need to approve the bridge contract first
      const erc20Abi = [
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function symbol() view returns (string)',
        'function name() view returns (string)',
      ];
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        connectedWallet
      );
      
      // Approve the bridge to spend tokens
      const approveTx = await tokenContract.approve(bridgeAddress, parsedAmount);
      await approveTx.wait();
      
      // Bridge ERC20 tokens
      tx = await bridgeContract.bridgeERC20(tokenAddress, parsedAmount, minGasLimit);
    } else {
      throw new Error('Invalid asset type or missing token address for ERC20');
    }
    
    // Wait for transaction confirmation
    await tx.wait();
    
    return {
      success: true,
      transactionHash: tx.hash,
      sourceChain,
      destinationChain,
      assetType,
      tokenAddress: assetType === 'ERC20' ? tokenAddress : null,
      amount,
      from: wallet.address,
      status: 'initiated',
      message: 'Bridge transaction initiated. It may take some time to complete.',
    };
  } catch (error: unknown) {
    console.error('Error in bridgeAssets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to bridge assets: ${errorMessage}`);
  }
}

/**
 * Check the status of a bridge transaction
 * @param params The parameters for checking bridge status
 * @returns The status of the bridge transaction
 */
export async function bridgeStatus(params: BridgeStatusParams) {
  try {
    const { transactionHash, sourceChain } = params;
    
    // Initialize services based on source chain
    const rpcUrl = sourceChain === 'ethereum' 
      ? config.ethereum.mainnet 
      : config.rpc.mainnet;
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return {
        success: true,
        transactionHash,
        sourceChain,
        status: 'pending',
        message: 'Transaction is still pending',
      };
    }
    
    // Check if transaction was successful
    if (receipt.status === 0) {
      return {
        success: true,
        transactionHash,
        sourceChain,
        status: 'failed',
        message: 'Bridge transaction failed',
      };
    }
    
    // In a real implementation, you would check for specific events
    // and query the destination chain for message status
    
    // For this example, we'll assume the transaction is in progress
    return {
      success: true,
      transactionHash,
      sourceChain,
      destinationChain: sourceChain === 'ethereum' ? 'linea' : 'ethereum',
      status: 'in_progress',
      message: 'Bridge transaction is in progress. It may take some time to complete.',
      blockNumber: receipt.blockNumber,
      confirmations: await provider.getBlockNumber() - receipt.blockNumber,
    };
  } catch (error: unknown) {
    console.error('Error in bridgeStatus:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to check bridge status: ${errorMessage}`);
  }
}
