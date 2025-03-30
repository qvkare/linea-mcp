import { listNfts, transferNft } from './handlers.js';
import { ListNftsSchema, TransferNftSchema } from './schemas.js';

// Export all handlers
export { listNfts, transferNft };

// Export all schemas
export { ListNftsSchema, TransferNftSchema };

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  listNfts: {
    name: 'list-nfts', // Optional: kebab-case name
    description: 'List NFTs owned by an address',
    example: 'List NFTs for address 0x...', // Add example
  },
  transferNft: {
    name: 'transfer-nft', // Optional: kebab-case name
    description: 'Transfer an NFT to another address',
    example: 'Transfer NFT with token ID 123 from contract 0x... to address 0x...', // Add example
  },
};
