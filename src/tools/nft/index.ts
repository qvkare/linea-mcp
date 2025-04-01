import { listNfts, transferNft, getNftMetadata } from './handlers.js';
import { ListNftsSchema, TransferNftSchema, NftMetadataSchema } from './schemas.js';

// Export all handlers
export { listNfts, transferNft, getNftMetadata };

// Export all schemas
export { ListNftsSchema, TransferNftSchema, NftMetadataSchema };

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  listNfts: {
    name: 'list-nfts', // Optional: kebab-case name
    description: 'List NFTs owned by an address (supports ERC721 and ERC1155)',
    example: 'List NFTs for address 0x1234... or List ERC1155 NFTs owned by 0x5678...', 
  },
  transferNft: {
    name: 'transfer-nft', // Optional: kebab-case name
    description: 'Transfer an NFT to another address (supports ERC721 and ERC1155)',
    example: 'Transfer NFT with token ID 123 from contract 0x... to address 0x... with amount 2', 
  },
  getNftMetadata: {
    name: 'get-nft-metadata',
    description: 'Get detailed metadata for a specific NFT (supports ERC721 and ERC1155)',
    example: 'Get metadata for NFT with token ID 123 from contract 0x...',
  }
};
