import { ethers } from 'ethers';
import axios from 'axios';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { ListNftsParams, TransferNftParams, NftMetadataParams } from './schemas.js';
import config from '../../config/index.js';

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

// ERC1155 ABI (minimal for NFT operations)
const ERC1155_ABI = [
  // Read-only functions
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function uri(uint256 id) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  
  // Authenticated functions
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  
  // Events
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
];

/**
 * Detect NFT contract standard (ERC721 or ERC1155)
 * @param contractAddress Contract address to check 
 * @param blockchain Blockchain service instance
 * @returns The detected standard or 'UNKNOWN'
 */
async function detectNftStandard(contractAddress: string, blockchain: BlockchainService): Promise<'ERC721' | 'ERC1155' | 'UNKNOWN'> {
  try {
    // First check if it's in our verified collections
    const verifiedCollection = config.nft.verifiedCollections.find(
      collection => collection.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
    
    if (verifiedCollection) {
      return verifiedCollection.standard as 'ERC721' | 'ERC1155';
    }
    
    // Try to detect by calling contract methods
    const contract = new ethers.Contract(
      contractAddress,
      [...ERC721_ABI, ...ERC1155_ABI],
      blockchain.provider
    );
    
    try {
      // Try ERC721 method
      await contract.ownerOf(0);
      return 'ERC721';
    } catch (err721) {
      try {
        // Try ERC1155 method
        await contract.balanceOf(ethers.constants.AddressZero, 0);
        return 'ERC1155';
      } catch (err1155) {
        return 'UNKNOWN';
      }
    }
  } catch (error) {
    console.error('Error detecting NFT standard:', error);
    return 'UNKNOWN';
  }
}

/**
 * Get NFTs for address using Alchemy API
 * @param address Owner address
 * @param options Additional options like limit and cursor
 * @returns NFT list and pagination info
 */
async function getNftsFromAlchemy(address: string, options: {
  limit?: number;
  cursor?: string;
  contractAddresses?: string[];
  standard?: 'ERC721' | 'ERC1155' | 'ALL';
}) {
  try {
    if (!config.apiKeys.alchemy) {
      throw new Error('Alchemy API key not configured');
    }
    
    const apiUrl = `${config.nft.alchemy.apiUrl}${config.apiKeys.alchemy}${config.nft.alchemy.endpoints.getNFTs}`;
    
    const params: any = {
      owner: address,
      pageSize: options.limit || config.nft.batchSize,
      chain: 'LINEA-MAINNET',
      excludeFilters: [],
    };
    
    if (options.cursor) {
      params.pageKey = options.cursor;
    }
    
    if (options.contractAddresses && options.contractAddresses.length > 0) {
      params.contractAddresses = options.contractAddresses;
    }
    
    if (options.standard && options.standard !== 'ALL') {
      params.tokenType = options.standard;
    }
    
    const response = await axios.get(apiUrl, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching NFTs from Alchemy:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Alchemy API error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
    }
    throw error;
  }
}

/**
 * List NFTs owned by an address
 * @param params The parameters for listing NFTs
 * @returns The NFTs owned by the address
 */
export async function listNfts(params: ListNftsParams) {
  try {
    const { contractAddress, tokenId, standard, limit, cursor } = params;
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
    
    // If a specific NFT is requested by contract address and token ID
    if (contractAddress && tokenId) {
      // Detect contract type if not specified
      const nftStandard = params.standard && params.standard !== 'ALL' 
        ? params.standard 
        : await detectNftStandard(contractAddress, blockchain);
      
      if (nftStandard === 'UNKNOWN') {
        return {
          success: false,
          address,
          nfts: [],
          message: `Could not detect NFT standard for contract ${contractAddress}`,
        };
      }
      
      if (nftStandard === 'ERC721') {
        const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, blockchain.provider);
        
        try {
          // Check if the address owns this NFT
          const owner = await nftContract.ownerOf(tokenId);
          const isOwner = owner.toLowerCase() === address.toLowerCase();
          
          if (isOwner) {
            // Get NFT details
            const [name, symbol, tokenURI] = await Promise.all([
              nftContract.name().catch(() => 'Unknown'),
              nftContract.symbol().catch(() => 'NFT'),
              nftContract.tokenURI(tokenId).catch(() => ''),
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
                  standard: 'ERC721',
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
            success: false,
            address,
            nfts: [],
            message: `Error fetching ERC721 NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else if (nftStandard === 'ERC1155') {
        const nftContract = new ethers.Contract(contractAddress, ERC1155_ABI, blockchain.provider);
        
        try {
          // Check if the address owns this token
          const balance = await nftContract.balanceOf(address, tokenId);
          
          if (balance.gt(0)) {
            // Get NFT details
            const [name, symbol, uri] = await Promise.all([
              nftContract.name().catch(() => 'Unknown'),
              nftContract.symbol().catch(() => 'NFT'),
              nftContract.uri(tokenId).catch(() => ''),
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
                  tokenURI: uri,
                  owner: address,
                  balance: balance.toString(),
                  standard: 'ERC1155',
                },
              ],
            };
          } else {
            return {
              success: true,
              address,
              nfts: [],
              message: `Address does not own ERC1155 token with ID ${tokenId} in contract ${contractAddress}`,
            };
          }
        } catch (error: unknown) {
          return {
            success: false,
            address,
            nfts: [],
            message: `Error fetching ERC1155 NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    }
    
    // If no specific NFT is requested, use Alchemy API to get all NFTs
    try {
      if (!config.apiKeys.alchemy) {
        return {
          success: false,
          address,
          nfts: [],
          message: 'Alchemy API key not configured. Please add an Alchemy API key to list all NFTs.',
        };
      }
      
      const contractAddresses = contractAddress ? [contractAddress] : undefined;
      const alchemyNfts = await getNftsFromAlchemy(address, {
        limit,
        cursor,
        contractAddresses,
        standard: standard as 'ERC721' | 'ERC1155' | 'ALL',
      });
      
      return {
        success: true,
        address,
        nfts: alchemyNfts.ownedNfts.map((nft: any) => ({
          contractAddress: nft.contract.address,
          tokenId: nft.tokenId,
          name: nft.title || nft.contract.name || 'Unknown',
          symbol: nft.contract.symbol || 'NFT',
          tokenURI: nft.tokenUri?.raw || '',
          standard: nft.tokenType,
          balance: nft.balance || '1',
          metadata: nft.raw?.metadata || null,
          owner: address,
          media: nft.media,
        })),
        pageKey: alchemyNfts.pageKey,
        totalCount: alchemyNfts.totalCount,
      };
    } catch (error: unknown) {
      if (config.nft.enabled) {
        return {
          success: false,
          address,
          nfts: [],
          message: `Error fetching NFTs from indexer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      } else {
        return {
          success: true,
          address,
          nfts: [],
          message: 'NFT indexing is disabled. Enable NFT indexing to list all NFTs.',
        };
      }
    }
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
    const { contractAddress, tokenId, destination, amount, data, standard } = params;
    
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
    
    // Detect contract type if not specified
    const nftStandard = standard || await detectNftStandard(contractAddress, blockchain);
    
    if (nftStandard === 'UNKNOWN') {
      throw new Error(`Could not detect NFT standard for contract ${contractAddress}`);
    }
    
    if (nftStandard === 'ERC721') {
      // Create NFT contract instance with signer
      const nftContract = new ethers.Contract(
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
        nftContract.name().catch(() => 'Unknown'),
        nftContract.symbol().catch(() => 'NFT'),
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
        standard: 'ERC721',
      };
    } else if (nftStandard === 'ERC1155') {
      // Create NFT contract instance with signer
      const nftContract = new ethers.Contract(
        contractAddress,
        ERC1155_ABI,
        connectedWallet
      );
      
      // Check if the wallet owns the token
      const balance = await nftContract.balanceOf(wallet.address, tokenId);
      if (balance.lt(ethers.BigNumber.from(amount || '1'))) {
        throw new Error(`Wallet does not own enough tokens with ID ${tokenId}. Available: ${balance.toString()}, Requested: ${amount || '1'}`);
      }
      
      // Execute the transfer
      const tx = await nftContract.safeTransferFrom(
        wallet.address,
        destination,
        tokenId,
        amount || '1',
        data || '0x'
      );
      await tx.wait();
      
      // Get NFT details
      const [name, symbol] = await Promise.all([
        nftContract.name().catch(() => 'Unknown'),
        nftContract.symbol().catch(() => 'NFT'),
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
        amount: amount || '1',
        standard: 'ERC1155',
      };
    }
    
    throw new Error(`Unsupported NFT standard: ${nftStandard}`);
  } catch (error: unknown) {
    console.error('Error in transferNft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to transfer NFT: ${errorMessage}`);
  }
}

/**
 * Get NFT metadata
 * @param params The parameters for retrieving NFT metadata
 * @returns The NFT metadata
 */
export async function getNftMetadata(params: NftMetadataParams) {
  try {
    const { contractAddress, tokenId, standard } = params;
    const blockchain = new BlockchainService('mainnet');
    
    // First try to get metadata from Alchemy
    if (config.apiKeys.alchemy) {
      try {
        const apiUrl = `${config.nft.alchemy.apiUrl}${config.apiKeys.alchemy}${config.nft.alchemy.endpoints.getNFTMetadata}`;
        const response = await axios.get(apiUrl, {
          params: {
            contractAddress,
            tokenId,
            tokenType: standard || 'ERC721', // Default to ERC721 if not specified
            refreshCache: false,
            chain: 'LINEA-MAINNET'
          }
        });
        
        return {
          success: true,
          contractAddress,
          tokenId,
          metadata: response.data,
          standard: response.data.tokenType || standard || 'ERC721',
        };
      } catch (alchemyError) {
        console.warn('Failed to get metadata from Alchemy, falling back to contract calls:', alchemyError);
      }
    }
    
    // If Alchemy fails or is not configured, fall back to contract calls
    const nftStandard = standard || await detectNftStandard(contractAddress, blockchain);
    
    if (nftStandard === 'UNKNOWN') {
      throw new Error(`Could not detect NFT standard for contract ${contractAddress}`);
    }
    
    if (nftStandard === 'ERC721') {
      const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, blockchain.provider);
      const [name, symbol, tokenURI] = await Promise.all([
        nftContract.name().catch(() => 'Unknown'),
        nftContract.symbol().catch(() => 'NFT'),
        nftContract.tokenURI(tokenId).catch(() => ''),
      ]);
      
      // Try to fetch metadata from tokenURI if it's valid
      let metadata = null;
      if (tokenURI && (tokenURI.startsWith('http') || tokenURI.startsWith('ipfs'))) {
        try {
          let metadataUrl = tokenURI;
          if (tokenURI.startsWith('ipfs://')) {
            metadataUrl = `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '')}`;
          }
          const metadataResponse = await axios.get(metadataUrl);
          metadata = metadataResponse.data;
        } catch (metadataError) {
          console.warn('Failed to fetch metadata from tokenURI:', metadataError);
        }
      }
      
      return {
        success: true,
        contractAddress,
        tokenId,
        name,
        symbol,
        tokenURI,
        metadata,
        standard: 'ERC721',
      };
    } else if (nftStandard === 'ERC1155') {
      const nftContract = new ethers.Contract(contractAddress, ERC1155_ABI, blockchain.provider);
      const [name, symbol, uri] = await Promise.all([
        nftContract.name().catch(() => 'Unknown'),
        nftContract.symbol().catch(() => 'NFT'),
        nftContract.uri(tokenId).catch(() => ''),
      ]);
      
      // Try to fetch metadata from uri if it's valid
      let metadata = null;
      if (uri && (uri.startsWith('http') || uri.startsWith('ipfs'))) {
        try {
          let metadataUrl = uri;
          // Handle ERC1155 URI template with {id}
          if (metadataUrl.includes('{id}')) {
            const hexTokenId = ethers.BigNumber.from(tokenId).toHexString().slice(2).padStart(64, '0');
            metadataUrl = metadataUrl.replace('{id}', hexTokenId);
          }
          
          if (metadataUrl.startsWith('ipfs://')) {
            metadataUrl = `https://ipfs.io/ipfs/${metadataUrl.replace('ipfs://', '')}`;
          }
          
          const metadataResponse = await axios.get(metadataUrl);
          metadata = metadataResponse.data;
        } catch (metadataError) {
          console.warn('Failed to fetch metadata from uri:', metadataError);
        }
      }
      
      return {
        success: true,
        contractAddress,
        tokenId,
        name,
        symbol,
        tokenURI: uri,
        metadata,
        standard: 'ERC1155',
      };
    }
    
    throw new Error(`Unsupported NFT standard: ${nftStandard}`);
  } catch (error: unknown) {
    console.error('Error in getNftMetadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get NFT metadata: ${errorMessage}`);
  }
}
