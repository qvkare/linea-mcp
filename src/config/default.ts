import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Network configuration
  rpc: {
    mainnet: process.env.LINEA_MAINNET_RPC_URL || 'https://rpc.linea.build',
    testnet: process.env.LINEA_TESTNET_RPC_URL || 'https://rpc.sepolia.linea.build',
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
};

export default config;
