import { ethers } from 'ethers';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { ListNftsParams, TransferNftParams } from './schemas.js';

// ERC721 ABI (minimal for NFT operations)
const ERC721_ABI = [
  // Read-only functions
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  
  // Authenticated functions
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

/**
 * List NFTs owned by an address
 * @param params The parameters for listing NFTs
 * @returns The NFTs owned by the address
 */
export async function listNfts(params: ListNftsParams) {
  try {
    const { contractAddress, tokenId } = params;
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
    
    // If a specific NFT is requested
    if (contractAddress && tokenId) {
      const nftContract = blockchain.createContract(contractAddress, ERC721_ABI);
      
      try {
        // Check if the address owns this NFT
        const owner = await nftContract.ownerOf(tokenId);
        const isOwner = owner.toLowerCase() === address.toLowerCase();
        
        if (isOwner) {
          // Get NFT details
          const [name, symbol, tokenURI] = await Promise.all([
            nftContract.name(),
            nftContract.symbol(),
            nftContract.tokenURI(tokenId),
          ]);
          
          return {
            success: true,
            address,
            nfts: [
              {
                contractAddress,
                tokenId,
                name,
                symbol,
                tokenURI,
                owner: address,
              },
            ],
          };
        } else {
          return {
            success: true,
            address,
            nfts: [],
            message: `Address does not own NFT with ID ${tokenId} in contract ${contractAddress}`,
          };
        }
      } catch (error: unknown) {
        return {
          success: true,
          address,
          nfts: [],
          message: `Error fetching NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }
    
    // In a real implementation, you would query an indexer or marketplace API
    // to get all NFTs owned by the address
    // For this example, we'll return a placeholder response
    return {
      success: true,
      address,
      nfts: [],
      message: 'To list all NFTs, you would need to integrate with an NFT indexer service',
    };
  } catch (error: unknown) {
    console.error('Error in listNfts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to list NFTs: ${errorMessage}`);
  }
}

/**
 * Transfer an NFT to another address
 * @param params The parameters for transferring an NFT
 * @returns The transaction details
 */
export async function transferNft(params: TransferNftParams) {
  try {
    const { contractAddress, tokenId, destination } = params;
    
    // Validate destination address
    if (!ethers.utils.isAddress(destination)) {
      throw new Error('Invalid destination address');
    }
    
    // Initialize services
    const blockchain = new BlockchainService('mainnet');
    const keyService = new KeyManagementService();
    
    // In a real implementation, you would retrieve the user's wallet
    // Here, we're generating a new one for demonstration purposes
    const wallet = keyService.generateWallet();
    const connectedWallet = wallet.connect(blockchain.provider);
    
    // Create NFT contract instance with signer
    const nftContract = blockchain.createContractWithSigner(
      contractAddress,
      ERC721_ABI,
      connectedWallet
    );
    
    // Check if the wallet owns the NFT
    const owner = await nftContract.ownerOf(tokenId);
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Wallet does not own NFT with ID ${tokenId}`);
    }
    
    // Execute the transfer (using safeTransferFrom for better compatibility)
    const tx = await nftContract.safeTransferFrom(wallet.address, destination, tokenId);
    await tx.wait();
    
    // Get NFT details
    const [name, symbol] = await Promise.all([
      nftContract.name(),
      nftContract.symbol(),
    ]);
    
    return {
      success: true,
      transactionHash: tx.hash,
      from: wallet.address,
      to: destination,
      contractAddress,
      tokenId,
      name,
      symbol,
    };
  } catch (error: unknown) {
    console.error('Error in transferNft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to transfer NFT: ${errorMessage}`);
  }
}
