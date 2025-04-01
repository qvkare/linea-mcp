import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Network configuration
  rpc: {
    mainnet: process.env.LINEA_MAINNET_RPC_URL || 'https://rpc.linea.build',
    testnet: process.env.LINEA_TESTNET_RPC_URL || 'https://rpc.sepolia.linea.build',
    ethereum: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
  },
  
  // Ethereum configuration for bridge operations
  ethereum: {
    mainnet: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    testnet: process.env.ETHEREUM_TESTNET_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  },
  
  // API keys
  apiKeys: {
    infura: process.env.INFURA_API_KEY || '',
    alchemy: process.env.ALCHEMY_API_KEY || '',
  },
  
  // Security settings
  security: {
    privateKeyEncryptionKey: process.env.PRIVATE_KEY_ENCRYPTION_KEY || '',
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Bridge configuration
  bridge: {
    lineaBridgeAddress: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35', // Linea mainnet bridge address
    ethereumBridgeAddress: '0xB191E3d98C5A08A5D5917E6Cd7a604E8F479D801', // Linea testnet bridge address
  },
  
  // Gas settings
  gas: {
    maxFeePerGas: '50000000000', // 50 gwei
    maxPriorityFeePerGas: '1500000000', // 1.5 gwei
  },
  
  // ENS configuration
  ens: {
    enabled: true,
    // Ethereum (L1) contract addresses
    ethereum: {
      registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // Official ENS Registry
      resolver: '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41', // Public Resolver 2
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY', // Ethereum Mainnet
    },
    // Linea-specific ENS configuration
    linea: {
      tld: 'linea',
      format: '{name}.linea.eth',
      registry: '0x6E258c8A3A3e5e85FEd39BF5D936add0AbcBE90A', // Linea ENS Registry
      resolver: '0xec5B648618481dF6d6FfA72B6ca3AaCC36dF7c9d', // Linea ENS Resolver
      gateway: 'https://linea-ccip-gateway.linea.build', // Production CCIP gateway URL
      queryEndpoint: 'https://linea-ccip-gateway.linea.build/gateway', // Gateway query endpoint
      rpcUrl: 'https://rpc.linea.build', // Linea Mainnet
      // Format hints for various ENS related operations
      formatHints: {
        // These are examples of how ENS names might be formatted
        standard: '{name}.linea.eth', // Standard format with .eth suffix
        bare: '{name}.linea',         // Bare format without .eth
        ethereum: '{name}.eth',       // If Linea ENS also controls name.eth
        subdomains: '{subdomain}.{name}.linea.eth' // For subdomains
      }
    }
  },
  
  // Proof of Humanity configuration
  poh: {
    contractAddress: '0xC5E9ddeF8fF5B90a1b6Bd7e749f999Da6D02fb30',
    enabled: true,
    apiUrl: 'https://linea-xp-poh-api.linea.build',
  },

  // NFT Indexing Service configuration
  nft: {
    enabled: true,
    // Use Alchemy's NFT API for indexing and metadata 
    alchemy: {
      apiUrl: 'https://linea-mainnet.g.alchemy.com/nft/v3/',
      apiKey: process.env.ALCHEMY_API_KEY || '',
      endpoints: {
        getNFTs: '/getNFTsForOwner',
        getContractMetadata: '/getContractMetadata',
        getNFTMetadata: '/getNFTMetadata'
      }
    },
    // Popular/verified NFT collections on Linea
    verifiedCollections: [
      {
        name: 'Linea Voyage',
        contractAddress: '0x8B4E565E11A6dfd5ea9227b69B2D3984DD85B36B',
        standard: 'ERC721'
      },
      {
        name: 'Linea PFP',
        contractAddress: '0xFF6D00A095273b5B0B3F03E27AC085FB7417b0E5',
        standard: 'ERC721'
      },
      {
        name: 'Linea XPNFT',
        contractAddress: '0xd10E34eAC260d5f5AdE7F83D685FE10f2D34B7F0',
        standard: 'ERC1155'
      }
    ],
    // Batch size for API requests
    batchSize: 50
  }
};

export default config;
