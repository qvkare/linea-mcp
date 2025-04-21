# Linea MCP Tools

This document contains a detailed list of all tools provided by the Linea MCP server and examples of their usage.

## Wallet Tools

### wallet_getAddress
Used to retrieve the wallet address.

**Parameters:** 
- `random_string` - Dummy parameter (not required)

**Example Usage:**
```
"Show my wallet address."
```

### wallet_listBalances
Used to list token balances at an address.

**Parameters:**
- `address` - Optional, the address to check balances for

**Example Usage:**
```
"Show my wallet balance."
"Show the balance of address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

### wallet_transferFunds
Used to transfer funds from one address to another.

**Parameters:**
- `destination` - Recipient address
- `amount` - Amount to transfer
- `assetId` (optional) - ID of the asset to transfer, defaults to ETH

**Example Usage:**
```
"Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

## Token Tools

### tokens_erc20Balance
Used to check the balance of an ERC20 token.

**Parameters:**
- `tokenAddress` - Token contract address
- `address` (optional) - Address to check balance for

**Example Usage:**
```
"Show my USDC balance."
"Show the 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 token balance for address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

### tokens_erc20Transfer
Used to transfer ERC20 tokens.

**Parameters:**
- `tokenAddress` - Token contract address
- `destination` - Recipient address
- `amount` - Amount to transfer

**Example Usage:**
```
"Send 10 USDC to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

## Contract Tools

### contracts_callContract
Used to call a smart contract function.

**Parameters:**
- `contractAddress` - Smart contract address
- `abi` - Contract ABI
- `functionName` - Name of the function to call
- `params` (optional) - Function parameters
- `value` (optional) - Amount of ETH to send with the function

**Example Usage:**
```
"Call the balanceOf function of the contract at 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

### contracts_deployContract
Used to deploy a new smart contract.

**Parameters:**
- `bytecode` - Contract bytecode
- `abi` - Contract ABI
- `constructorArgs` (optional) - Constructor arguments
- `value` (optional) - Amount of ETH to send to the constructor

**Example Usage:**
```
"Deploy a simple ERC20 token."
```

## NFT Tools

### nft_listNfts
Used to list NFTs owned by an address.

**Parameters:**
- `address` (optional) - Address to list NFTs for
- `contractAddress` (optional) - Contract address for a specific NFT collection
- `tokenId` (optional) - Token ID for a specific NFT
- `standard` (optional) - NFT standard (ERC721, ERC1155, or ALL)
- `limit` (optional) - Maximum number of results
- `cursor` (optional) - Cursor for pagination

**Example Usage:**
```
"Show my NFTs."
"Show the ERC721 NFTs for address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

### nft_transferNft
Used to transfer an NFT.

**Parameters:**
- `contractAddress` - NFT contract address
- `tokenId` - Token ID of the NFT to transfer
- `destination` - Recipient address
- `standard` (optional) - NFT standard (ERC721 or ERC1155)
- `amount` (optional) - Amount to transfer for ERC1155
- `data` (optional) - Additional data to send with the transfer

**Example Usage:**
```
"Send my NFT with ID 123 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

## Bridge Tools

### bridge_bridgeAssets
Used to bridge assets between Ethereum and Linea.

**Parameters:**
- `sourceChain` - Source blockchain ("ethereum" or "linea")
- `destinationChain` - Destination blockchain ("ethereum" or "linea")
- `assetType` - Asset type ("ETH" or "ERC20")
- `amount` - Amount to bridge
- `tokenAddress` (optional) - ERC20 token address

**Example Usage:**
```
"Bridge 1 ETH from Ethereum to Linea."
"Bridge 100 USDC from Linea to Ethereum."
```

### bridge_bridgeStatus
Used to check the status of a bridge transaction.

**Parameters:**
- `transactionHash` - Hash of the bridge transaction
- `sourceChain` - Source blockchain ("ethereum" or "linea")

**Example Usage:**
```
"Check the bridge status of transaction hash 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

## DeFi Tools

### defi_liquidityPools
Used to get information about liquidity pools.

**Parameters:**
- `poolAddress` (optional) - Pool address
- `tokenA` (optional) - First token address
- `tokenB` (optional) - Second token address

**Example Usage:**
```
"Show the ETH/USDC liquidity pool."
```

### defi_swapTokens
Used to swap tokens on DEXes.

**Parameters:**
- `fromToken` - Token address to swap from
- `toToken` - Token address to swap to
- `amount` - Amount to swap
- `slippageTolerance` (optional) - Slippage tolerance percentage

**Example Usage:**
```
"Convert 0.1 ETH to USDC."
```

### defi_stakeLpTokens
Used to stake SyncSwap LP tokens in a MasterChef farm.

**Parameters:**
- `amount` - Amount of LP tokens to stake
- `poolId` - ID of the farm pool

**Example Usage:**
```
"Stake 5 ETH/USDC LP tokens in pool ID 0."
```

### defi_unstakeLpTokens
Used to unstake SyncSwap LP tokens from a MasterChef farm.

**Parameters:**
- `amount` - Amount of LP tokens to unstake
- `poolId` - ID of the farm pool

**Example Usage:**
```
"Unstake 2 ETH/USDC LP tokens from pool ID 0."
```

### defi_getYieldInfo
Used to get yield information for a user from a SyncSwap farm.

**Parameters:**
- `userAddress` - User address
- `poolId` - ID of the farm pool

**Example Usage:**
```
"Show my yield information for pool ID 0."
```

## ENS Tools

### ens_resolveName
Used to resolve an ENS name to an address.

**Parameters:**
- `name` - ENS name to resolve
- `testnet` (optional) - Set to true to use Linea Sepolia testnet

**Example Usage:**
```
"Resolve example.linea.eth."
```

### ens_lookupAddress
Used to lookup an ENS name for an address.

**Parameters:**
- `address` - Ethereum address to lookup
- `testnet` (optional) - Set to true to use Linea Sepolia testnet

**Example Usage:**
```
"Find the ENS name for address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
```

### ens_checkNameAvailability
Used to check if an ENS name is available.

**Parameters:**
- `name` - ENS name to check
- `testnet` (optional) - Set to true to use Linea Sepolia testnet

**Example Usage:**
```
"Check if example.linea.eth is available."
```

### ens_getRecords
Used to get records for an ENS name.

**Parameters:**
- `name` - ENS name
- `records` - List of record keys to retrieve
- `testnet` (optional) - Set to true to use Linea Sepolia testnet

**Example Usage:**
```
"Show the email and twitter records for example.linea.eth."
```

## Verax Tools

### verax_verifyHuman
Used to verify if an address is a verified human using Linea Verax attestations.

**Parameters:**
- `address` - Address to verify

**Example Usage:**
```
"Check if address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e is verified as human."
```

## Transaction Tools

### transactions_getTransactionStatus
Used to get the status and details of a transaction.

**Parameters:**
- `transactionHash` - Transaction hash
- `network` (optional) - Network (mainnet, testnet, or ethereum)

**Example Usage:**
```
"Check the status of transaction hash 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
``` 