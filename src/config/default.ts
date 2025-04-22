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
  
  // Wallet settings
  wallet: {
    privateKey: process.env.WALLET_PRIVATE_KEY || '',
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
  },
  
  // Linea Native (ETH) Bridge Message Service
  nativeBridge: {
    mainnet: {
      l1: process.env.LINEA_MAINNET_L1_MESSAGE_SERVICE_ADDRESS || '0xd19d4B5d358258f05D7B411E21A1460D11B0876F', // Ethereum Mainnet Message Service
      l2: process.env.LINEA_MAINNET_L2_MESSAGE_SERVICE_ADDRESS || '0x508Ca82Df566dCD1B0DE8296e70a96332cD644ec', // Linea Mainnet Message Service
    },
    testnet: { // Sepolia
      l1: process.env.LINEA_TESTNET_L1_MESSAGE_SERVICE_ADDRESS || '0xB218f8A4Bc925Fa04799c1673395683DE5A5a710', // L1 Sepolia Message Service Proxy
      l2: process.env.LINEA_TESTNET_L2_MESSAGE_SERVICE_ADDRESS || '0x9aAb7C593Db317461786BB046327746F9F230688', // L2 Linea Sepolia Message Service Proxy
    }
  },

  // Linea Canonical Token Bridge
  tokenBridge: {
    mainnet: {
      l1: process.env.LINEA_MAINNET_L1_TOKEN_BRIDGE_ADDRESS || '0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319', // Ethereum Mainnet Token Bridge
      l2: process.env.LINEA_MAINNET_L2_TOKEN_BRIDGE_ADDRESS || '0x3154Cf16ccdb4C6d922629664174b904d80F2C35', // Linea Mainnet Token Bridge
    },
    testnet: { // Sepolia
      l1: process.env.LINEA_TESTNET_L1_TOKEN_BRIDGE_ADDRESS || '0x5188eB235a603E64580fB028E42E3058700b4522', // Ethereum Sepolia Token Bridge
      l2: process.env.LINEA_TESTNET_L2_TOKEN_BRIDGE_ADDRESS || '0x76469E812F0e9d9D629d7Afb8e46Ee93C8C45151', // Linea Sepolia Token Bridge
    }
  },

  // Circle CCTP (USDC Bridging - Token Messengers)
  cctp: {
    mainnet: {
      ethereum: process.env.CCTP_MAINNET_ETH_ADDRESS || '0x150f94B44927F078737562f0fcF3265bD8C64524',
      linea: process.env.CCTP_MAINNET_LINEA_ADDRESS || '0xd013313AbF21783660d94A5E9a8C5cA779b2543C',
    },
    testnet: { // Sepolia
      ethereum: process.env.CCTP_TESTNET_ETH_ADDRESS || '0x7865fAfC2db2093669d96c055F8e0ff10794554C',
      linea: process.env.CCTP_TESTNET_LINEA_ADDRESS || '0x1682Ae6375F8E9B1e138A4f131a913549836BF9',
    }
  },

  /*
  // Bridge configuration (Old - Using Message Services now)
  bridge: {
    lineaBridgeAddress: '0x3154Cf16ccdb4C6d922629664174b904d80F2C35', // Linea mainnet bridge address
    ethereumBridgeAddress: '0xB191E3d98C5A08A5D5917E6Cd7a604E8F479D801', // Linea testnet bridge address
  },
  */
  
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
  },

  // DeFi configuration (Add this section)
  defi: {
    // SyncSwap Linea Mainnet Addresses
    syncswap: {
      router: '0x80e38291e06339d10AAB483C65695D004dBD5C69',
      classicFactory: '0xf2eEe3FE3F320f5565169129f21AE350f6A5411b',
      masterChef: '0x10C55144a167C1B46Ff153A1f94691494aC51b5C',
    },
    // TODO: Replace placeholders with actual Linea DEX addresses
    routerAddress: process.env.DEX_ROUTER_ADDRESS || '0x1111111111111111111111111111111111111111', // Example placeholder
    factoryAddress: process.env.DEX_FACTORY_ADDRESS || '0x2222222222222222222222222222222222222222', // Example placeholder
    wethAddress: process.env.WETH_ADDRESS || '0x3333333333333333333333333333333333333333', // Example placeholder (Linea WETH is often different)
  },
};

export default config;
