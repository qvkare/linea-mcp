# Linea-MCP

A Model Context Protocol (MCP) server that provides on-chain tools for AI applications to interact with the Linea blockchain.

[![npm version](https://img.shields.io/npm/v/linea-mcp.svg)](https://www.npmjs.com/package/linea-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Linea-MCP extends any MCP client's capabilities by providing tools to interact with the Linea blockchain, an Ethereum Layer 2 scaling solution using zero-knowledge proof technology. This server enables AI assistants like Claude and Cursor to perform blockchain operations through natural language requests.

### Key Features

- **Wallet Management**: Retrieve addresses and check balances
- **Token Operations**: Transfer ERC20 tokens and check balances
- **Smart Contract Interactions**: Deploy and interact with contracts
- **NFT Management**: List and transfer NFTs
- **Bridge Operations**: Bridge assets between Ethereum and Linea
- **DeFi Integrations**: Interact with DeFi protocols on Linea

## Current Status

The project is currently in development with the following components implemented:

- ✅ Core MCP server infrastructure
- ✅ Wallet management tools
- ✅ Token operations
- ✅ Contract interactions
- ✅ NFT management
- ✅ Bridge operations
- ✅ DeFi integrations

All tools are successfully discovered by the MCP server, but there may be compatibility issues with some MCP clients.

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Access to Linea RPC endpoints

### Installation

#### Option 1: Install as a global package (recommended for most users)

```bash
# Install globally
npm install -g linea-mcp

# Create a .env file in your current directory
cat > .env << EOL
# Network Configuration
LINEA_MAINNET_RPC_URL=https://rpc.linea.build
LINEA_TESTNET_RPC_URL=https://rpc.sepolia.linea.build
INFURA_API_KEY=your_infura_key
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY_ENCRYPTION_KEY=your_encryption_key
PORT=3000
NODE_ENV=development
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_infura_key
ETHEREUM_TESTNET_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
EOL

# Start the MCP server
linea-mcp
```

#### Option 2: Install from source (for development)

```bash
# Clone the repository
git clone https://github.com/qvkare/linea-mcp.git
cd linea-mcp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Start the MCP server
npm start
```

## Integration with MCP Clients

### Cursor

To integrate with Cursor:

1. Create or edit the Cursor MCP configuration file:
   - Windows: `%APPDATA%\Cursor\mcp.json`
   - macOS: `~/Library/Application Support/Cursor/mcp.json`
   - Linux: `~/.config/Cursor/mcp.json`

2. Add the following configuration:

```json
{
  "mcpServers": {
    "linea": {
      "command": "npx",
      "args": ["linea-mcp@latest"],
      "env": {
        "PORT": "3000",
        "LINEA_MAINNET_RPC_URL": "https://rpc.linea.build",
        "LINEA_TESTNET_RPC_URL": "https://rpc.sepolia.linea.build",
        "INFURA_API_KEY": "your_infura_key",
        "ALCHEMY_API_KEY": "your_alchemy_key",
        "PRIVATE_KEY_ENCRYPTION_KEY": "your_encryption_key",
        "NODE_ENV": "development",
        "ETHEREUM_RPC_URL": "https://mainnet.infura.io/v3/your_infura_key",
        "ETHEREUM_TESTNET_RPC_URL": "https://sepolia.infura.io/v3/your_infura_key"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Replace the API keys and encryption key with your own values.

### Claude Desktop

Claude Desktop integration is similar to Cursor integration:

1. Create or edit the Claude Desktop configuration file:
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add a similar configuration as shown for Cursor.

## Available Tools

The following tools are available:

### Wallet Tools
- `wallet_getAddress`: Retrieve a wallet address
- `wallet_listBalances`: List balances for a wallet
- `wallet_transferFunds`: Transfer funds to another address

### Token Tools
- `tokens_erc20Balance`: Check the balance of an ERC20 token
- `tokens_erc20Transfer`: Transfer ERC20 tokens

### Contract Tools
- `contracts_callContract`: Call a contract function
- `contracts_deployContract`: Deploy a smart contract

### NFT Tools
- `nft_listNfts`: List NFTs owned by an address
- `nft_transferNft`: Transfer an NFT

### Bridge Tools
- `bridge_bridgeAssets`: Bridge assets between Ethereum and Linea
- `bridge_bridgeStatus`: Check bridge transaction status

### DeFi Tools
- `defi_liquidityPools`: Get liquidity pool information
- `defi_swapTokens`: Swap tokens on DEXes

## Troubleshooting

### Common Issues

1. **"No tools available" in Cursor**:
   - Ensure your MCP configuration file is correctly formatted
   - Check that Node.js is installed and accessible from the path
   - Verify the full path to your project is correct
   - Use the full path to Node.js executable in the configuration

2. **"Client closed" error**:
   - Check the MCP server logs for errors
   - Ensure your environment variables are correctly set
   - Try restarting Cursor
   - Check if there are syntax errors in your configuration JSON

3. **Connection issues**:
   - Verify RPC endpoints are accessible
   - Check firewall settings

## Security Considerations

- This project handles sensitive blockchain operations
- Never share your private keys or seed phrases
- Use environment variables for sensitive configuration
- Always verify transactions before submitting
- Test extensively with testnet before using on mainnet

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.