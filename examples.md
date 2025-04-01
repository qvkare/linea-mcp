# Linea MCP Examples

This document provides detailed examples of how to interact with Linea MCP tools through AI assistants like Claude and Cursor.

## Table of Contents
- [Wallet Operations](#wallet-operations)
- [Token Operations](#token-operations)
- [Smart Contract Interactions](#smart-contract-interactions)
- [NFT Management](#nft-management)
- [Bridge Operations](#bridge-operations)
- [DeFi Operations](#defi-operations)
- [Proof of Humanity](#proof-of-humanity)
- [Linea ENS](#linea-ens)

## Wallet Operations

### Getting Wallet Address
```plaintext
User: "What's my wallet address?"
Assistant: Let me retrieve your wallet address.
Result: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

### Checking Balances
```plaintext
User: "Show me my wallet balances"
Assistant: I'll check your wallet balances across different tokens.
Result:
- ETH: 1.5 ETH
- USDC: 100 USDC
- LINK: 50 LINK
```

### Transferring Funds
```plaintext
User: "Send 0.1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
Assistant: I'll help you transfer ETH.
Steps:
1. Confirming the amount and destination
2. Estimating gas fees
3. Executing transfer
Result: Transaction hash: 0x123...abc
```

## Token Operations

### ERC20 Token Transfer
```plaintext
User: "Transfer 50 USDC to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
Assistant: I'll help you transfer USDC.
Steps:
1. Checking USDC balance
2. Approving transfer
3. Executing transfer
Result: Transaction successful
```

### Checking Token Balance
```plaintext
User: "What's my USDC balance?"
Assistant: Let me check your USDC balance.
Result: 150 USDC
```

## Smart Contract Interactions

### Deploying a Contract
```plaintext
User: "Deploy a simple ERC20 token contract"
Assistant: I'll help you deploy an ERC20 contract.
Steps:
1. Compiling contract
2. Estimating deployment cost
3. Deploying contract
Result: Contract deployed at 0x789...def
```

### Calling Contract Functions
```plaintext
User: "Call balanceOf for address 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on token contract 0x789...def"
Assistant: I'll call the balanceOf function.
Result: Balance: 1000 tokens
```

## NFT Management

### Listing NFTs
```plaintext
User: "Show my NFT collection"
Assistant: I'll list all NFTs in your wallet.
Result:
1. CryptoPunk #1234
2. Bored Ape #5678
3. Art Block #9012
```

### Transferring NFTs
```plaintext
User: "Transfer my Bored Ape #5678 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
Assistant: I'll help transfer your NFT.
Steps:
1. Verifying ownership
2. Approving transfer
3. Executing transfer
Result: NFT transferred successfully
```

## Bridge Operations

### Bridging Assets to Linea
```plaintext
User: "Bridge 1 ETH from Ethereum to Linea"
Assistant: I'll help you bridge ETH to Linea.
Steps:
1. Initiating bridge transaction
2. Confirming on Ethereum
3. Waiting for confirmation on Linea
Result: Assets bridged successfully
```

### Checking Bridge Status
```plaintext
User: "Check status of my recent bridge transaction"
Assistant: I'll check your bridge transaction status.
Result: Transaction completed. Assets available on Linea
```

## DeFi Operations

### Checking Liquidity Pools
```plaintext
User: "Show available liquidity pools for ETH/USDC"
Assistant: I'll check the liquidity pools.
Result:
- Pool Size: 1M USDC
- Current APY: 5.2%
- Total Value Locked: $2.5M
```

### Token Swaps
```plaintext
User: "Swap 100 USDC for ETH"
Assistant: I'll help you swap USDC for ETH.
Steps:
1. Checking exchange rate
2. Calculating slippage
3. Executing swap
Result: Received 0.05 ETH
```

## Proof of Humanity

### Checking PoH Status
```plaintext
User: "Verify my PoH registration status"
Assistant: I'll check your PoH status.
Result: Verified since 2024-03-15
```

### Vouching Information
```plaintext
User: "Show my vouching history"
Assistant: I'll retrieve your vouching history.
Result:
- Vouched for: 3 addresses
- Received vouches: 5
- Next available vouch: 2024-04-15
```

## Linea ENS

### Resolving ENS Names
```plaintext
User: "Resolve name.linea.eth"
Assistant: I'll resolve this Linea ENS name.
Result: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

### Looking Up ENS Names
```plaintext
User: "Look up ENS for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
Assistant: I'll look up the ENS name for this address.
Result: name.linea.eth
```

## Advanced Examples

### Multi-step Operations
```plaintext
User: "Buy 100 USDC worth of ETH and bridge it to Linea"
Assistant: I'll help you with this multi-step operation.
Steps:
1. Swapping USDC for ETH
2. Initiating bridge transaction
3. Confirming completion
Result: ETH successfully bridged to Linea
```

### Complex Contract Interactions
```plaintext
User: "Stake 100 tokens in the farming contract and claim rewards"
Assistant: I'll help you stake and claim rewards.
Steps:
1. Approving token spend
2. Staking tokens
3. Claiming available rewards
Result: Staked 100 tokens and claimed 5 reward tokens
``` 