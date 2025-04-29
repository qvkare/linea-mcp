import {
  createWalletClient,
  http,
  parseEther,
  Abi,
  Address,
  Hex,
   
  PublicClient, // Needed for estimation & post-confirmation logic
  WalletClient,
  // TransactionReceipt, // Unused
  encodeFunctionData, // Needed for ETH bridging via sendTransaction
  isAddress,
  parseUnits, // Add missing import
  formatEther, // Added for fee formatting
  formatUnits, // Added for allowance formatting
  decodeEventLog, // Import decodeEventLog
 } from 'viem';
 import KeyManagementService /*, { SupportedAccount } */ from '../../services/keyManagement.js'; // Removed unused SupportedAccount
 import BlockchainService, { NetworkName } from '../../services/blockchain.js';
 import { BridgeAssetsParams, BridgeStatusParams, ClaimFundsParams } from './schemas.js';
import config from '../../config/index.js';

// --- ABIs (viem compatible) ---
const L1_BRIDGE_MESSAGE_SERVICE_ABI = [
  // Initiate L1 -> L2 (Used for ETH and ERC20, fee and value are adjusted)
  { name: 'sendMessage', type: 'function', stateMutability: 'payable', inputs: [{name: 'to', type: 'address'}, {name: 'fee', type: 'uint256'}, {name: 'deadline', type: 'uint256'}, {name: 'calldata', type: 'bytes'}], outputs: [] },
  // Complete L2 -> L1 (Manual Claim)
  { name: 'claimMessage', type: 'function', stateMutability: 'nonpayable', inputs: [{name: 'from', type: 'address'}, {name: 'to', type: 'address'}, {name: 'fee', type: 'uint256'}, {name: 'value', type: 'uint256'}, {name: 'nonce', type: 'uint256'}, {name: 'message', type: 'bytes'}, {name: 'proof', type: 'bytes32[]'}], outputs: [] },
  // Estimate fee for sending a message
  { name: 'estimateFee', type: 'function', stateMutability: 'view', inputs: [{name: 'to', type: 'address'}, {name: 'deadline', type: 'uint256'}, {name: 'calldata', type: 'bytes'}], outputs: [{name: '', type: 'uint256'}] },
  // Events (for status tracking)
  { name: 'MessageSent', type: 'event', anonymous: false, inputs: [{indexed: true, name: 'messageHash', type: 'bytes32'}, {indexed: true, name: 'from', type: 'address'}, {indexed: true, name: 'to', type: 'address'}, {indexed: false, name: 'fee', type: 'uint256'}, {indexed: false, name: 'value', type: 'uint256'}, {indexed: false, name: 'nonce', type: 'uint256'}, {indexed: false, name: 'calldata', type: 'bytes'}] },
  { name: 'MessageClaimed', type: 'event', anonymous: false, inputs: [{indexed: true, name: 'messageHash', type: 'bytes32'}] },
  // Check the status of a message hash (Claim status)
  { name: 'messageStatus', type: 'function', stateMutability: 'view', inputs: [{name: 'messageHash', type: 'bytes32'}], outputs: [{name: '', type: 'uint8'}] }, // Returns status enum (e.g., 0: NON_EXISTENT, 1: PENDING, 2: CLAIMABLE, 3: CLAIMED, 4: FAILED)
] as const satisfies Abi;

const L2_BRIDGE_MESSAGE_SERVICE_ABI = [
  // Initiate L2 -> L1
  { name: 'sendMessage', type: 'function', stateMutability: 'payable', inputs: [{name: 'to', type: 'address'}, {name: 'fee', type: 'uint256'}, {name: 'deadline', type: 'uint256'}, {name: 'calldata', type: 'bytes'}], outputs: [] },
  // Estimate fee for sending a message
  { name: 'estimateFee', type: 'function', stateMutability: 'view', inputs: [{name: 'to', type: 'address'}, {name: 'deadline', type: 'uint256'}, {name: 'calldata', type: 'bytes'}], outputs: [{name: '', type: 'uint256'}] },
  // Events
  { name: 'MessageSent', type: 'event', anonymous: false, inputs: [{indexed: true, name: 'messageHash', type: 'bytes32'}, {indexed: true, name: 'from', type: 'address'}, {indexed: true, name: 'to', type: 'address'}, {indexed: false, name: 'fee', type: 'uint256'}, {indexed: false, name: 'value', type: 'uint256'}, {indexed: false, name: 'nonce', type: 'uint256'}, {indexed: false, name: 'calldata', type: 'bytes'}] },
] as const satisfies Abi;

const CCTP_TOKEN_MESSENGER_ABI = [
  // Initiate on source chain
  { name: 'depositForBurn', type: 'function', stateMutability: 'payable', inputs: [{name: 'amount', type: 'uint256'}, {name: 'destinationDomain', type: 'uint32'}, {name: 'mintRecipient', type: 'bytes32'}, {name: 'burnToken', type: 'address'}], outputs: [{type: 'uint64', name: 'nonce'}] },
  // Complete on destination chain (Called by Circle relay, event/status important for manual claim)
  { name: 'receiveMessage', type: 'function', stateMutability: 'nonpayable', inputs: [{name: 'message', type: 'bytes'}, {name: 'attestation', type: 'bytes'}], outputs: [{type: 'bool', name: 'success'}] },
  // Events
  { name: 'DepositForBurn', type: 'event', anonymous: false, inputs: [{indexed: true, name: 'nonce', type: 'uint64'}, {indexed: true, name: 'burnToken', type: 'address'}, {indexed: false, name: 'amount', type: 'uint256'}, {indexed: true, name: 'depositor', type: 'address'}, {indexed: false, name: 'mintRecipient', type: 'bytes32'}, {indexed: false, name: 'destinationDomain', type: 'uint32'}, {indexed: false, name: 'destinationTokenMessenger', type: 'bytes32'}, {indexed: false, name: 'destinationCaller', type: 'bytes32'}] },
  { name: 'MessageReceived', type: 'event', anonymous: false, inputs: [{indexed: true, name: 'caller', type: 'address'}, {indexed: false, name: 'sourceDomain', type: 'uint32'}, {indexed: true, name: 'nonce', type: 'uint64'}, {indexed: false, name: 'sender', type: 'bytes32'}, {indexed: false, name: 'messageBody', type: 'bytes'}] },
] as const satisfies Abi;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const satisfies Abi;

// --- Canonical Token Bridge ABI (Simplified) ---
const _TOKEN_BRIDGE_ABI = [
  // Example function on L1/L2 Token Bridge to handle deposits received via message
  { name: 'depositERC20', type: 'function', stateMutability: 'nonpayable', inputs: [{name: 'token', type: 'address'},{name: 'recipient', type: 'address'},{name: 'amount', type: 'uint256'}], outputs: [] },
  // Add other relevant functions like finalizeDeposit, withdraw, etc. as needed
] as const satisfies Abi;

// -----------------------------

// --- Helper Functions ---

type LayerType = 'l1' | 'l2';
type NetworkEnv = 'mainnet' | 'testnet';

/**
 * Get the layer type (l1 or l2) based on the network name.
 */
function getLayerType(network: NetworkName): LayerType {
    return network === 'ethereum' ? 'l1' : 'l2';
}

/**
 * Get the network environment (mainnet or testnet) for config lookup.
 */
function getNetworkEnv(network: NetworkName): NetworkEnv {
    // Assuming 'ethereum' maps to mainnet L1, 'mainnet' to mainnet L2, 'testnet' to testnet L2
    // Adjust if 'ethereum' needs to distinguish between mainnet/testnet L1
    return (network === 'ethereum' || network === 'mainnet') ? 'mainnet' : 'testnet';
}

/**
 * Get the appropriate Message Service contract address and ABI based on the source network.
 * Also returns the corresponding Token Bridge address for the destination network.
 */
function getBridgeConfig(sourceNetwork: NetworkName, destinationNetwork: NetworkName): { 
    messageServiceAddress: Address; 
    messageServiceAbi: Abi; 
    destinationTokenBridgeAddress: Address; 
} {
    const sourceLayer = getLayerType(sourceNetwork);
    const _destinationLayer = getLayerType(destinationNetwork);
    const networkEnv = getNetworkEnv(sourceNetwork);
    const destinationNetworkEnv = getNetworkEnv(destinationNetwork);

    if (sourceLayer === 'l1') {
        const address = config.nativeBridge[networkEnv].l1;
        if (!isAddress(address)) throw new Error(`L1 Message Service address for ${networkEnv} is not configured or invalid.`);
        const destTokenBridge = config.tokenBridge[destinationNetworkEnv].l2;
        if (!isAddress(destTokenBridge)) throw new Error(`L2 Token Bridge address for ${destinationNetworkEnv} is not configured or invalid.`);
        return { 
            messageServiceAddress: address as Address, 
            messageServiceAbi: L1_BRIDGE_MESSAGE_SERVICE_ABI, 
            destinationTokenBridgeAddress: destTokenBridge as Address
        }; 
    } else { // sourceLayer === 'l2'
        const address = config.nativeBridge[networkEnv].l2;
        if (!isAddress(address)) throw new Error(`L2 Message Service address for ${networkEnv} is not configured or invalid.`);
        const destTokenBridge = config.tokenBridge[destinationNetworkEnv].l1;
        if (!isAddress(destTokenBridge)) throw new Error(`L1 Token Bridge address for ${destinationNetworkEnv} is not configured or invalid.`);
        return { 
            messageServiceAddress: address as Address, 
            messageServiceAbi: L2_BRIDGE_MESSAGE_SERVICE_ABI, 
            destinationTokenBridgeAddress: destTokenBridge as Address 
        }; 
    }
}

/**
 * Fetch ERC20 token decimals.
 */
async function getTokenDecimals(publicClient: PublicClient, tokenAddress: Address): Promise<number> {
    try {
        const decimals = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'decimals',
        });
        return Number(decimals);
    } catch (_error) {
        console.error(`Error fetching decimals for token ${tokenAddress}:`, _error);
        throw new Error(`Could not fetch decimals for token ${tokenAddress}. Ensure it's a valid ERC20 contract.`);
    }
}

/**
 * Get RPC URL based on network name - Helper function (Currently unused but kept for post-confirmation logic)
 */
 
function getRpcUrl(network: NetworkName): string {
    switch (network) {
        case 'ethereum': return config.rpc.ethereum;
        case 'testnet': return config.rpc.testnet;
        case 'mainnet':
        default: return config.rpc.mainnet || 'https://rpc.linea.build';
    }
}

/**
 * Bridge assets between Ethereum and Linea using viem, with fee estimation and confirmation
 * @param params The parameters for bridging assets
 * @returns The transaction details or an abort message
 */
export async function bridgeAssets(params: BridgeAssetsParams): Promise<any> {
  // İmplementasyon burada...
  // Eski bridgeNativeAssets implementasyonu
  try {
    const { sourceChain, destinationChain, assetType, tokenAddress, amount } = params;

    // Specific handling for USDC
    if (assetType === 'ERC20' && tokenAddress && 
        // USDC token address condition - this should be added to config
        // This is a placeholder. Real implementation should check if the token is USDC
        tokenAddress.toLowerCase() === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'.toLowerCase()) {
      return bridgeUsdc(params);
    }

    // Validate chains
    if (sourceChain === destinationChain) {
      throw new Error('Source and destination chains must be different.');
    }
    if (!['ethereum', 'mainnet', 'testnet'].includes(sourceChain) ||
        !['ethereum', 'mainnet', 'testnet'].includes(destinationChain)) {
        throw new Error('Invalid source or destination chain specified.');
    }

    // Initialize services for the source chain
    const sourceNetwork = sourceChain as NetworkName;
    const blockchain = new BlockchainService(sourceNetwork);
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();

    // Create Wallet Client for sending transactions
    const walletClient: WalletClient = createWalletClient({
        account,
        chain: blockchain.currentChain,
        transport: http(getRpcUrl(sourceNetwork))
    });

    // --- Determine bridge direction and get Message Service config ---
    const sourceLayer = getLayerType(sourceNetwork);
    const destinationLayer = getLayerType(destinationChain as NetworkName);
    const { messageServiceAddress, messageServiceAbi, destinationTokenBridgeAddress } = getBridgeConfig(sourceNetwork, destinationChain as NetworkName);
    console.log(`Bridging from ${sourceNetwork} (${sourceLayer}) to ${destinationChain} (${destinationLayer}) via ${messageServiceAddress}`);
    // ------------------------------------------------------------------

    const _minGasLimit = 100000n; // Use bigint
    let txHash: Hex | undefined; // Transaction hash after sending
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let _estimatedFeeEther: string;

    // Common sendMessage parameters
    const recipient = account.address; // Default to sender, parameterize if needed
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    let messagingFee: bigint;

    let transactionValue = 0n; // Value to send with sendMessage call (ETH amount + fees)
    let messageCalldata: Hex = '0x'; // Calldata for the message

    if (assetType === 'ETH') {
      // TODO: Confirm if calldata should be non-empty for ETH transfers
      messageCalldata = '0x'; // Assuming empty calldata for direct ETH reception

      // Estimate messaging fee first
      try {
          console.log('Estimating messaging fee...');
          messagingFee = await publicClient.readContract({
              address: messageServiceAddress,
              abi: messageServiceAbi,
              functionName: 'estimateFee',
              args: [destinationTokenBridgeAddress, deadline, messageCalldata] // Target is Token Bridge for consistency?
          }) as bigint;
          console.log(`Estimated Messaging Fee: ${formatEther(messagingFee)} ETH`);
      } catch (_feeError: unknown) {
          console.error("Error estimating messaging fee:", _feeError);
          throw new Error(`Failed to estimate messaging fee: ${_feeError instanceof Error ? _feeError.message : 'Unknown error'}`);
      }

      const parsedValue = parseEther(amount);

      // For ETH L1->L2: value is sent with the message
      // For ETH L2->L1: value is sent, and anti-DDOS fee is added
      transactionValue = parsedValue + messagingFee; // Base value + message fee
      if (sourceLayer === 'l2') {
          const antiDdosFee = parseEther('0.001'); // Add Anti-DDOS fee for L2->L1 ETH bridge
          transactionValue += antiDdosFee;
          console.log(`Adding 0.001 ETH Anti-DDOS fee for L2->L1 ETH bridge.`);
      }

      const sendMessageData = encodeFunctionData({
          abi: messageServiceAbi, // Use the correct ABI
          functionName: 'sendMessage',
          args: [destinationTokenBridgeAddress, messagingFee, deadline, messageCalldata] // Send message TO the destination Token Bridge
      });

      // --- Estimate Gas Fee (ETH Bridge) ---
      console.log(`Estimating gas for bridging ${amount} ETH to ${destinationChain}...`);
      try {
          gasEstimate = await publicClient.estimateGas({
              account,
              to: messageServiceAddress, // Use message service address
              value: transactionValue, // Send ETH amount + messaging fee (+ anti-DDOS if L2->L1)
              data: sendMessageData,
          });
          gasPrice = await publicClient.getGasPrice();
          _estimatedFeeEther = formatEther(gasEstimate * gasPrice);
      } catch (_estimationError: unknown) {
          console.error("Error estimating ETH bridge gas:", _estimationError);
          throw new Error(`Failed to estimate gas fee: ${_estimationError instanceof Error ? _estimationError.message : 'Unknown error'}`);
      }
      // --- End Estimation ---

      // --- Ask for Confirmation (ETH Bridge - MCP Style) ---
      // Confirmation should be handled before calling this function
      // Proceed with sending...
      // --- End Confirmation --- 

      // Send transaction
      console.log(`Sending transaction...`);
      txHash = await walletClient.writeContract({
          chain: blockchain.currentChain,
          account: account,
          address: messageServiceAddress,
          abi: messageServiceAbi,
          functionName: 'sendMessage',
          args: [destinationTokenBridgeAddress, messagingFee, deadline, messageCalldata],
          value: transactionValue,
          gas: gasEstimate,
          gasPrice: gasPrice,
      });

      // Wait for transaction confirmation and return result
      console.log(`Bridge transaction submitted: ${txHash}. Waiting for confirmation...`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log(`Bridge transaction confirmed on ${sourceChain}. Status: ${receipt.status}`);

      return {
        success: true,
        transactionHash: txHash,
        sourceChain,
        destinationChain,
        recipient,
        assetType,
        tokenAddress: null, // ETH has no token address
        amount,
        from: account.address,
        status: 'initiated_on_source',
        receipt: {
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status,
        },
        message: `Bridge transaction initiated on ${sourceChain}. Monitor destination chain for completion.`,
      };

    } else if (assetType === 'ERC20' && tokenAddress) {
        if (!isAddress(tokenAddress)) {
            throw new Error('Invalid token address provided for ERC20 bridge.');
        }
        const tokenAddressHex = tokenAddress as Address;

        // Fetch token decimals dynamically
        console.log(`Fetching decimals for token ${tokenAddressHex}...`);
        const decimals = await getTokenDecimals(publicClient, tokenAddressHex);
        console.log(`Token decimals: ${decimals}`);

        const parsedAmount = parseUnits(amount, decimals);

        // --- Estimate Gas Fee (Approval) ---
        // Approval is needed for the Message Service contract to handle the token
        console.log(`Checking allowance and estimating gas for approving Message Service contract ${messageServiceAddress} to spend ${amount} ${tokenAddressHex}...`);
        let approveGasEstimate: bigint | undefined;
        let approveGasPrice: bigint | undefined;
        let approveEstimatedFeeEther: string | undefined;

        // Check current allowance first
        const currentAllowance = await publicClient.readContract({
            address: tokenAddressHex,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [account.address, messageServiceAddress]
        });

        let _approvalNeeded = false;
        if (currentAllowance < parsedAmount) {
            _approvalNeeded = true;
            console.log(`Approval needed. Current allowance: ${formatUnits(currentAllowance, decimals)}, Required: ${amount}`);
            try {
                approveGasEstimate = await publicClient.estimateContractGas({
                    address: tokenAddressHex,
                    abi: ERC20_ABI, // Use correct ABI
                    functionName: 'approve',
                    args: [messageServiceAddress, parsedAmount], // Approve the Message Service contract
                    account,
                });
                approveGasPrice = await publicClient.getGasPrice(); // Assign value inside try
                approveEstimatedFeeEther = formatEther(approveGasEstimate * approveGasPrice); // Assign value inside try
                console.log(`Approval Estimated Fee: ~${approveEstimatedFeeEther} ETH`);

                // Confirmation for approval should be handled before calling this function
                // Proceed with sending...
            } catch (_error: unknown) {
                // Re-throw confirmation request if it was the cause
                if (typeof _error === 'object' && _error !== null && 'code' in _error && _error.code === 'APPROVAL_CONFIRMATION_REQUIRED') {
                    throw _error;
                }
                // Otherwise, throw a generic estimation error
                console.error("Error estimating approval gas:", _error);
                throw new Error(`Failed to estimate gas fee for approval: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
            }
        } else {
            console.log(`Sufficient allowance already granted: ${formatUnits(currentAllowance, decimals)}`);
        }
        // --- End Estimation (Approval) ---

        // --- Ask for Confirmation (Approval) ---
        if (_approvalNeeded) {
            console.log(`Proceeding with token approval...`);
            const approveTxHash = await walletClient.writeContract({
                chain: blockchain.currentChain,
                account: account,
                address: tokenAddressHex,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [messageServiceAddress, parsedAmount],
                gas: approveGasEstimate, // Use estimated gas
                gasPrice: approveGasPrice, // Use estimated gas price
            });
            console.log(`Approval transaction submitted: ${approveTxHash}. Waiting for confirmation...`);
            try {
                const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
                if (approveReceipt.status === 'reverted') {
                    console.error('Approval transaction failed:', approveReceipt);
                    throw new Error(`Token approval failed (reverted). Hash: ${approveTxHash}`);
                }
                console.log('Token approval successful.');
            } catch (_waitError: unknown) {
                 console.error('Error waiting for approval confirmation:', _waitError);
                 throw new Error(`Failed to confirm approval transaction: ${_waitError instanceof Error ? _waitError.message : 'Unknown error'}`);
            }
        }
        // --- End Confirmation (Approval) ---

        // --- Prepare sendMessage for ERC20 ---
        // Calldata for the destination Token Bridge's depositERC20 function (already prepared)
        try {
            // Encode the calldata for depositERC20 on the destination token bridge
            messageCalldata = encodeFunctionData({
                abi: _TOKEN_BRIDGE_ABI,
                functionName: 'depositERC20',
                args: [tokenAddressHex, account.address, parsedAmount]
            });
            console.log(`Prepared ERC20 bridge calldata for depositERC20 function`);
        } catch (_encodeError: unknown) {
            console.error("Error encoding ERC20 bridge calldata:", _encodeError);
            throw new Error(`Failed to prepare bridge data: ${_encodeError instanceof Error ? _encodeError.message : 'Unknown error'}`);
        }

        // Estimate messaging fee based on the ERC20 calldata
         try {
             console.log('Estimating messaging fee for ERC20 bridge...');
             messagingFee = await publicClient.readContract({
                 address: messageServiceAddress,
                 abi: messageServiceAbi,
                 functionName: 'estimateFee',
                 args: [destinationTokenBridgeAddress, deadline, messageCalldata] // Target is Token Bridge
             }) as bigint;
             console.log(`Estimated Messaging Fee: ${formatEther(messagingFee)} ETH`);
         } catch (_feeError: unknown) {
             console.error("Error estimating messaging fee:", _feeError);
             throw new Error(`Failed to estimate messaging fee: ${_feeError instanceof Error ? _feeError.message : 'Unknown error'}`);
         }

        // For ERC20, the token amount is NOT sent in msg.value
        // It's encoded in the calldata for the target contract to handle.
        transactionValue = messagingFee; // Only pay messaging fee
        if (sourceLayer === 'l2') {
            const antiDdosFee = parseEther('0.001'); // Add Anti-DDOS fee for L2->L1 ERC20 bridge
            transactionValue += antiDdosFee;
            console.log(`Adding 0.001 ETH Anti-DDOS fee for L2->L1 ERC20 bridge.`);
        }

        // --- Estimate Gas Fee (Bridge ERC20) ---
        console.log(`Estimating gas for bridging ${amount} of token ${tokenAddress}...`);
        let bridgeGasEstimate: bigint | undefined;
        let bridgeGasPrice: bigint | undefined;
        let bridgeEstimatedFeeEther: string | undefined;
        try {
            bridgeGasEstimate = await publicClient.estimateContractGas({
                address: messageServiceAddress,
                abi: messageServiceAbi,
                functionName: 'sendMessage',
                args: [destinationTokenBridgeAddress, messagingFee, deadline, messageCalldata],
                value: transactionValue, // Only messaging fee (+ anti-DDOS if L2->L1)
                account,
            });
            bridgeGasPrice = await publicClient.getGasPrice(); // Re-fetch or reuse approveGasPrice
            bridgeEstimatedFeeEther = formatEther(bridgeGasEstimate * bridgeGasPrice); // Use correct variables
            console.log(`Bridge Estimated Fee: ~${bridgeEstimatedFeeEther} ETH`);
        } catch (_estimationError: unknown) {
            console.error("Error estimating bridgeERC20 gas:", _estimationError);
            // Cast to any to bypass persistent TS error, then access message
            const errorMsg = (_estimationError as any)?.message || 'Unknown error';
            throw new Error(`Failed to estimate gas fee for bridge transaction: ${errorMsg}`);
        }
        // --- End Estimation (Bridge ERC20) ---

        // --- Ask for Confirmation (Bridge ERC20) ---
        // Confirmation should be handled before calling this function
        // Proceed with sending...
        // --- End Confirmation (Bridge ERC20) ---

        // Send transaction
        console.log(`Sending transaction...`);
        txHash = await walletClient.writeContract({
            chain: blockchain.currentChain,
            account: account,
            address: messageServiceAddress,
            abi: messageServiceAbi,
            functionName: 'sendMessage',
            args: [destinationTokenBridgeAddress, messagingFee, deadline, messageCalldata],
            value: transactionValue,
            gas: bridgeGasEstimate, // Use correct estimated gas
            gasPrice: bridgeGasPrice, // Use correct estimated gas price
        });

        // Wait for transaction confirmation and return result
        console.log(`Bridge transaction submitted: ${txHash}. Waiting for confirmation...`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(`Bridge transaction confirmed on ${sourceChain}. Status: ${receipt.status}`);

        return {
          success: true,
          transactionHash: txHash,
          sourceChain,
          destinationChain,
          recipient,
          assetType,
          tokenAddress: tokenAddressHex,
          amount,
          from: account.address,
          status: 'initiated_on_source',
          receipt: {
              blockNumber: receipt.blockNumber.toString(),
              gasUsed: receipt.gasUsed.toString(),
              status: receipt.status,
          },
          message: `Bridge transaction initiated on ${sourceChain}. Monitor destination chain for completion.`,
        };

    } else {
      throw new Error('Invalid asset type or missing token address for ERC20.');
    }

  } catch (_error: unknown) {
    // Handle MCP style confirmation errors if they bubble up (though they shouldn't reach here now)
    if (typeof _error === 'object' && _error !== null && 'code' in _error && (_error.code === 'APPROVAL_CONFIRMATION_REQUIRED' || _error.code === 'BRIDGE_CONFIRMATION_REQUIRED')) {
         console.warn('Confirmation error reached main catch block:', _error);
         throw _error; // Re-throw to be handled by the caller
    }
    console.error('Error in bridgeAssets:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
     if (errorMessage.includes('insufficient funds')) {
         throw new Error(`Failed to bridge assets: Insufficient funds for transaction.`);
     } else if (errorMessage.includes('reverted')) {
          throw new Error(`Failed to bridge assets: Transaction reverted. Check parameters, approval, or funds.`);
     }
    throw new Error(`Failed to bridge assets: ${errorMessage}`);
  }
}

/**
 * Bridge USDC using CCTP protocol
 * @param params The parameters for bridging USDC
 * @returns The transaction details or an abort message
 */
export async function bridgeUsdc(params: BridgeAssetsParams): Promise<any> {
  try {
    const { sourceChain, destinationChain, tokenAddress, amount } = params;
    
    if (!tokenAddress) {
      throw new Error('Token address is required for USDC bridging');
    }

    // Validate chains
    if (sourceChain === destinationChain) {
      throw new Error('Source and destination chains must be different.');
    }
    
    // Initialize services for the source chain
    const sourceNetwork = sourceChain as NetworkName;
    const blockchain = new BlockchainService(sourceNetwork);
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();

    console.log(`Preparing to bridge USDC from ${sourceChain} to ${destinationChain} using CCTP protocol...`);
    
    // Create Wallet Client for sending transactions
    const walletClient: WalletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(getRpcUrl(sourceNetwork))
    });

    // Fetch token decimals dynamically
    console.log(`Fetching decimals for USDC ${tokenAddress}...`);
    const decimals = await getTokenDecimals(publicClient, tokenAddress as Address);
    console.log(`USDC decimals: ${decimals}`);

    const parsedAmount = parseUnits(amount, decimals);
    
    // Get CCTP token messenger address from config
    const networkEnv = getNetworkEnv(sourceNetwork);
    const cctpMessengerAddress = sourceNetwork === 'ethereum' 
      ? config.cctp[networkEnv].ethereum
      : config.cctp[networkEnv].linea;
    
    if (!isAddress(cctpMessengerAddress)) {
      throw new Error(`CCTP Token Messenger address is invalid or not configured for ${sourceNetwork}.`);
    }

    // Determine destination domain based on destination chain
    // These domain IDs are specific to CCTP and need to be configured
    const destinationDomain = destinationChain === 'ethereum' ? 0 : 1; // Example values, adjust based on actual CCTP domains
    
    // Convert recipient address to bytes32 format as required by CCTP
    const mintRecipient = account.address.padStart(66, '0x000000000000000000000000');
    
    // Check and approve token allowance for CCTP messenger if needed
    console.log(`Checking USDC allowance for CCTP Token Messenger...`);
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, cctpMessengerAddress as Address]
    });

    let _approvalNeeded = false;
    if (currentAllowance < parsedAmount) {
      _approvalNeeded = true;
      console.log(`Approval needed for USDC. Current: ${formatUnits(currentAllowance, decimals)}, Required: ${amount}`);
      
      // Estimate gas for approval
      const approveGasEstimate = await publicClient.estimateContractGas({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [cctpMessengerAddress as Address, parsedAmount],
        account,
      });
      
      const approveGasPrice = await publicClient.getGasPrice();
      const approveEstimatedFeeEther = formatEther(approveGasEstimate * approveGasPrice);
      console.log(`USDC Approval Estimated Fee: ~${approveEstimatedFeeEther} ETH`);
      
      // Submit approval transaction
      console.log(`Approving USDC for CCTP...`);
      const approveTxHash = await walletClient.writeContract({
        chain: blockchain.currentChain,
        account,
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [cctpMessengerAddress as Address, parsedAmount],
        gas: approveGasEstimate,
        gasPrice: approveGasPrice,
      });
      
      console.log(`USDC approval transaction submitted: ${approveTxHash}. Waiting for confirmation...`);
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      
      if (approveReceipt.status === 'reverted') {
        throw new Error(`USDC approval failed (reverted). Hash: ${approveTxHash}`);
      }
      console.log('USDC approval successful.');
    } else {
      console.log(`Sufficient USDC allowance already granted: ${formatUnits(currentAllowance, decimals)}`);
    }
    
    // Estimate gas for depositForBurn transaction
    console.log(`Estimating gas for CCTP bridge transaction...`);
    const bridgeGasEstimate = await publicClient.estimateContractGas({
      address: cctpMessengerAddress as Address,
      abi: CCTP_TOKEN_MESSENGER_ABI,
      functionName: 'depositForBurn',
      args: [parsedAmount, destinationDomain, mintRecipient as `0x${string}`, tokenAddress as Address],
      account,
    });
    
    const bridgeGasPrice = await publicClient.getGasPrice();
    const bridgeEstimatedFeeEther = formatEther(bridgeGasEstimate * bridgeGasPrice);
    console.log(`CCTP Bridge Estimated Fee: ~${bridgeEstimatedFeeEther} ETH`);
    
    // Submit CCTP bridge transaction
    console.log(`Submitting CCTP bridge transaction...`);
    const txHash = await walletClient.writeContract({
      chain: blockchain.currentChain,
      account,
      address: cctpMessengerAddress as Address,
      abi: CCTP_TOKEN_MESSENGER_ABI,
      functionName: 'depositForBurn',
      args: [parsedAmount, destinationDomain, mintRecipient as `0x${string}`, tokenAddress as Address],
      gas: bridgeGasEstimate,
      gasPrice: bridgeGasPrice,
    });
    
    console.log(`CCTP bridge transaction submitted: ${txHash}. Waiting for confirmation...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    if (receipt.status === 'reverted') {
      throw new Error(`CCTP bridge transaction failed (reverted). Hash: ${txHash}`);
    }
    
    // Extract nonce from receipt logs if available
    let nonce: string | null = null;
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === (cctpMessengerAddress as string).toLowerCase()) {
          const decodedLog = decodeEventLog({
            abi: CCTP_TOKEN_MESSENGER_ABI,
            data: log.data,
            topics: log.topics
          });
          
          if (decodedLog.eventName === 'DepositForBurn' && decodedLog.args.nonce) {
            nonce = decodedLog.args.nonce.toString();
            break;
          }
        }
      } catch (_e) { /* Ignore decoding errors */ }
    }
    
    console.log(`CCTP bridge transaction confirmed. Nonce: ${nonce || 'Unknown'}`);
    
    return {
      success: true,
      transactionHash: txHash,
      sourceChain,
      destinationChain,
      assetType: 'USDC',
      tokenAddress: tokenAddress as Address,
      amount,
      from: account.address,
      recipient: account.address,
      status: 'initiated_on_source',
      // CCTP typically requires manual claiming on both L1->L2 and L2->L1 directions
      claimType: 'manual',
      cctpNonce: nonce,
      receipt: {
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      },
      message: `USDC bridge initiated via CCTP. Monitor destination chain for completion. Typically completes in ~20 minutes.`,
    };
  } catch (_error: unknown) {
    console.error('Error in bridgeUsdc:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
    throw new Error(`Failed to bridge USDC: ${errorMessage}`);
  }
}

/**
 * Automatic claim helper for bridged funds
 * This attempts to send a claim transaction with a higher gas price to incentivize quick processing
 * @param params The parameters for automatic claiming
 * @returns The result of the automatic claim transaction
 */
export async function autoClaimFunds(params: ClaimFundsParams): Promise<any> {
  try {
    // Use a higher gas price multiplier for auto-claiming
    const GAS_PRICE_MULTIPLIER = 1.2; // 20% higher than current gas price
    
    // We'll use most of the same logic as manual claiming
    const { messageHash, sourceChain, messageDetails, proof } = params;
    
    if (!messageHash || !sourceChain || !messageDetails) {
      throw new Error('Missing required parameters for auto-claiming funds');
    }
    
    const sourceNetwork = sourceChain as NetworkName;
    const sourceLayer = getLayerType(sourceNetwork);
    
    // Claim always happens on L1
    if (sourceLayer !== 'l2') {
      throw new Error('Auto-claim operation is only applicable for L2->L1 transfers');
    }
    
    // Get L1 information (destination for an L2->L1 transfer)
    const destinationNetwork: NetworkName = 'ethereum';
    const networkEnv = getNetworkEnv(sourceNetwork);
    const l1MessageServiceAddress = config.nativeBridge[networkEnv].l1;
    
    if (!isAddress(l1MessageServiceAddress)) {
      throw new Error(`L1 Message Service address for ${networkEnv} is not configured or invalid.`);
    }
    
    console.log(`Auto-claim: Preparing to claim message ${messageHash} on Ethereum L1...`);
    
    // Initialize services for the destination (L1) chain
    const l1Blockchain = new BlockchainService(destinationNetwork);
    const l1PublicClient = l1Blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();
    
    // Create Wallet Client for sending the claim transaction
    const walletClient: WalletClient = createWalletClient({
      account,
      chain: l1Blockchain.currentChain,
      transport: http(getRpcUrl(destinationNetwork))
    });
    
    // Extract message details
    const { from, to, fee, value, nonce, calldata } = messageDetails;
    
    // Check if message is actually claimable
    console.log('Auto-claim: Verifying claim status before proceeding...');
    const messageStatusCode = await l1PublicClient.readContract({
      address: l1MessageServiceAddress as Address,
      abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
      functionName: 'messageStatus',
      args: [messageHash as Hex]
    }) as number;
    
    if (messageStatusCode !== 2) {
      const statusMap = {
        0: 'NON_EXISTENT',
        1: 'PENDING',
        2: 'CLAIMABLE',
        3: 'CLAIMED',
        4: 'FAILED'
      };
      const statusText = statusMap[messageStatusCode as keyof typeof statusMap] || 'UNKNOWN';
      throw new Error(`Message is not in CLAIMABLE state for auto-claim. Current status: ${statusText} (${messageStatusCode})`);
    }
    
    console.log('Auto-claim: Message is confirmed as CLAIMABLE. Proceeding with auto-claim transaction...');
    
    // Calculate postman fee based on gas estimates
    // Formula from docs: target layer gas price * (gas estimated + gas limit surplus) * margin
    const gasEstimated = 100000n;
    const gasLimitSurplus = 6000n;
    const margin = 2n;
    
    const currentGasPrice = await l1PublicClient.getGasPrice();
    const boostedGasPrice = BigInt(Math.floor(Number(currentGasPrice) * GAS_PRICE_MULTIPLIER));
    
    const postmanFee = boostedGasPrice * (gasEstimated + gasLimitSurplus) * margin;
    console.log(`Auto-claim: Calculated postman fee: ${formatEther(postmanFee)} ETH`);
    
    // Estimate gas for the claim transaction with boosted gas price
    console.log('Auto-claim: Estimating gas for auto-claim transaction...');
    const gasEstimate = await l1PublicClient.estimateContractGas({
      address: l1MessageServiceAddress as Address,
      abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
      functionName: 'claimMessage',
      args: [from as Address, to as Address, BigInt(fee), BigInt(value), BigInt(nonce), calldata as Hex, proof as Hex[]],
      account,
    });
    
    const estimatedFeeEther = formatEther(gasEstimate * boostedGasPrice);
    console.log(`Auto-claim: Estimated Fee (with boost): ~${estimatedFeeEther} ETH`);
    
    // Send the auto-claim transaction with boosted gas price
    console.log('Auto-claim: Sending auto-claim transaction...');
    const txHash = await walletClient.writeContract({
      chain: l1Blockchain.currentChain,
      account,
      address: l1MessageServiceAddress as Address,
      abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
      functionName: 'claimMessage',
      args: [from as Address, to as Address, BigInt(fee), BigInt(value), BigInt(nonce), calldata as Hex, proof as Hex[]],
      gas: gasEstimate,
      gasPrice: boostedGasPrice,
    });
    
    // Wait for transaction confirmation
    console.log(`Auto-claim: Transaction submitted: ${txHash}. Waiting for confirmation...`);
    const receipt = await l1PublicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Auto-claim: Transaction confirmed on ${destinationNetwork}. Status: ${receipt.status}`);
    
    // Look for MessageClaimed event in logs
    let messageClaimedEvent = null;
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === (l1MessageServiceAddress as string).toLowerCase()) {
          const decodedLog = decodeEventLog({ 
            abi: L1_BRIDGE_MESSAGE_SERVICE_ABI, 
            data: log.data, 
            topics: log.topics 
          });
          
          if (decodedLog.eventName === 'MessageClaimed' && 
              decodedLog.args.messageHash?.toLowerCase() === messageHash.toLowerCase()) {
            messageClaimedEvent = decodedLog;
            break;
          }
        }
      } catch (_e) { /* Ignore decoding errors */ }
    }
    
    // Return auto-claim result
    return {
      success: receipt.status === 'success',
      transactionHash: txHash,
      messageHash,
      sourceChain,
      destinationChain: destinationNetwork,
      claimEvent: messageClaimedEvent,
      claimType: 'automatic',
      postmanFee: formatEther(postmanFee),
      status: receipt.status === 'success' ? 'auto_claimed' : 'auto_claim_failed',
      message: receipt.status === 'success' 
        ? 'Funds successfully auto-claimed on destination chain' 
        : 'Auto-claim transaction failed on destination chain',
      receipt: {
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      }
    };
  } catch (_error: unknown) {
    console.error('Error in autoClaimFunds:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
    throw new Error(`Failed to auto-claim funds: ${errorMessage}`);
  }
}

/**
 * Check the status of a bridge transaction using viem
 * @param params The parameters for checking bridge status
 * @returns The status of the bridge transaction
 */
export async function bridgeStatus(params: BridgeStatusParams): Promise<any> {
  try {
    const { transactionHash, sourceChain } = params;

    // Validate source chain
    if (!['ethereum', 'mainnet', 'testnet'].includes(sourceChain)) {
        throw new Error('Invalid source chain specified.');
    }
    const sourceNetwork = sourceChain as NetworkName;
    const sourceLayer = getLayerType(sourceNetwork);

    // Determine destination chain (where the message needs to be claimed/status checked)
    // Status checking and claiming always happens on L1
    const destinationNetwork: NetworkName = (sourceLayer === 'l2') ? 'ethereum' : 'mainnet'; // Adjust if testnets need specific mapping
    const _destinationChainId = (getNetworkEnv(destinationNetwork) === 'mainnet') ? 1 : 5; // Example: 1 for Ethereum Mainnet, 5 for Goerli/Sepolia (adjust based on actual testnet)

    // Initialize services for the source chain
    const blockchain = new BlockchainService(sourceNetwork);
    const publicClient = blockchain.client;

    console.log(`Checking status for transaction ${transactionHash} on ${sourceChain}...`);

    // Get transaction receipt on the source chain
    const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash as Hex });

    if (!receipt) {
      // Check if transaction is just pending
       const tx = await publicClient.getTransaction({ hash: transactionHash as Hex });
       const status = tx ? 'pending_source' : 'not_found_source';
       const message = tx ? 'Transaction is pending confirmation on source chain.' : 'Transaction not found on source chain.';
      return {
        success: true,
        transactionHash,
        sourceChain,
        status: status,
        message: message,
      };
    }

    // Check if transaction failed on the source chain
    if (receipt.status === 'reverted') {
      return {
        success: true,
        transactionHash,
        sourceChain,
        status: 'failed_on_source',
        message: `Bridge transaction failed (reverted) on source chain. Hash: ${transactionHash}`,
        receipt: receipt, // Include full receipt for debugging
      };
    }

    // Transaction succeeded on source chain. Find the MessageSent event.
    console.log('Transaction confirmed on source. Parsing logs for MessageSent event...');
    const { messageServiceAddress: sourceMessageServiceAddr, messageServiceAbi: sourceMessageServiceAbi } = getBridgeConfig(sourceNetwork, destinationNetwork);
    let messageSentLog: any = null;

    for (const log of receipt.logs) {
        try {
            // Check if the log address matches the source message service address
            if (log.address.toLowerCase() === sourceMessageServiceAddr.toLowerCase()) {
                const decodedLog = decodeEventLog({ abi: sourceMessageServiceAbi, data: log.data, topics: log.topics });
                if (decodedLog.eventName === 'MessageSent') {
                    messageSentLog = decodedLog;
                    break;
                }
            }
        } catch (_e) { /* Ignore decoding errors for other events */ }
    }

    if (!messageSentLog) {
        console.error('MessageSent event not found in transaction logs:', receipt.logs);
        throw new Error('Could not find MessageSent event for the bridge transaction.');
    }

    const messageHash = messageSentLog.args.messageHash as Hex;
    console.log(`Found MessageSent event with hash: ${messageHash}`);

    // Now check the status on the destination (L1) chain
    const destNetworkEnv = getNetworkEnv(destinationNetwork);
    const l1MessageServiceAddress = config.nativeBridge[destNetworkEnv].l1 as Address;
    const l1Blockchain = new BlockchainService(destinationNetwork); // Connect to destination L1
    const l1PublicClient = l1Blockchain.client;

    console.log(`Checking message status on ${destinationNetwork} (L1) contract ${l1MessageServiceAddress}...`);
    let messageStatusCode: number;
    try {
        messageStatusCode = await l1PublicClient.readContract({
            address: l1MessageServiceAddress,
            abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
            functionName: 'messageStatus',
            args: [messageHash]
        }) as number;
    } catch (_statusError: unknown) {
         console.error('Error fetching message status on L1:', _statusError);
         throw new Error(`Failed to fetch message status on destination chain: ${_statusError instanceof Error ? _statusError.message : 'Unknown error'}`);
    }

    // Interpret the status code (assuming 0: NON_EXISTENT, 1: PENDING, 2: CLAIMABLE, 3: CLAIMED, 4: FAILED - VERIFY THESE!)
    let finalStatus: string;
    let finalMessage: string;
    let claimData: any = null;

    switch (messageStatusCode) {
        case 0: // NON_EXISTENT
            finalStatus = 'unknown';
            finalMessage = 'Message hash not found on destination chain. Potential issue or delay.';
            break;
        case 1: // PENDING
            finalStatus = 'pending_destination';
            finalMessage = 'Message received by destination chain, pending processing.';
            break;
        case 2: // CLAIMABLE
            finalStatus = 'ready_to_claim';
            finalMessage = 'Message is ready to be claimed manually on the destination chain.';
             // Prepare data needed for claimFunds
            claimData = {
                messageHash: messageHash,
                sourceChain: sourceChain,
                destinationChain: destinationNetwork,
                messageDetails: {
                    from: messageSentLog.args.from,
                    to: messageSentLog.args.to,
                    fee: messageSentLog.args.fee,
                    value: messageSentLog.args.value,
                    nonce: messageSentLog.args.nonce,
                    calldata: messageSentLog.args.calldata
                },
                proof: [] // Placeholder for required Merkle proof
            };
            break;
        case 3: // CLAIMED
            finalStatus = 'completed';
            finalMessage = 'Message successfully claimed on the destination chain.';
            break;
        case 4: // FAILED
            finalStatus = 'failed_destination';
            finalMessage = 'Message processing failed on the destination chain.';
            break;
        default:
            finalStatus = 'unknown';
            finalMessage = `Unknown message status code received from contract: ${messageStatusCode}`;
            break;
    }

    return {
        success: true,
        transactionHash,
        messageHash,
        sourceChain,
        destinationChain: destinationNetwork,
        status: finalStatus,
        message: finalMessage,
        claimData: claimData, // Include claim data if ready_to_claim
        sourceReceipt: receipt // Include source receipt
    };
  } catch (_error: unknown) {
    console.error('Error in bridgeStatus:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
    throw new Error(`Failed to check bridge status: ${errorMessage}`);
  }
}

/**
 * Claim bridged funds that are ready to be claimed on the destination chain
 * @param params The parameters for claiming funds
 * @returns The result of the claim transaction
 */
export async function claimFunds(params: ClaimFundsParams): Promise<any> {
  try {
    const { messageHash, sourceChain, messageDetails, proof } = params;
    
    if (!messageHash || !sourceChain || !messageDetails) {
      throw new Error('Missing required parameters for claiming funds');
    }
    
    const sourceNetwork = sourceChain as NetworkName;
    const sourceLayer = getLayerType(sourceNetwork);
    
    // Claim always happens on L1
    if (sourceLayer !== 'l2') {
      throw new Error('Claim operation is only applicable for L2->L1 transfers');
    }
    
    // Get L1 information (destination for an L2->L1 transfer)
    const destinationNetwork: NetworkName = 'ethereum';
    const networkEnv = getNetworkEnv(sourceNetwork);
    const l1MessageServiceAddress = config.nativeBridge[networkEnv].l1;
    
    if (!isAddress(l1MessageServiceAddress)) {
      throw new Error(`L1 Message Service address for ${networkEnv} is not configured or invalid.`);
    }
    
    console.log(`Preparing to claim message ${messageHash} on Ethereum L1 via ${l1MessageServiceAddress}...`);
    
    // Initialize services for the destination (L1) chain
    const l1Blockchain = new BlockchainService(destinationNetwork);
    const l1PublicClient = l1Blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();
    
    // Create Wallet Client for sending the claim transaction
    const walletClient: WalletClient = createWalletClient({
      account,
      chain: l1Blockchain.currentChain,
      transport: http(getRpcUrl(destinationNetwork))
    });
    
    // Extract message details
    const { from, to, fee, value, nonce, calldata } = messageDetails;
    
    // Check if message is actually claimable
    console.log('Verifying claim status before proceeding...');
    try {
      const messageStatusCode = await l1PublicClient.readContract({
        address: l1MessageServiceAddress as Address,
        abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
        functionName: 'messageStatus',
        args: [messageHash as Hex]
      }) as number;
      
      if (messageStatusCode !== 2) {
        const statusMap = {
          0: 'NON_EXISTENT',
          1: 'PENDING',
          2: 'CLAIMABLE',
          3: 'CLAIMED',
          4: 'FAILED'
        };
        const statusText = statusMap[messageStatusCode as keyof typeof statusMap] || 'UNKNOWN';
        throw new Error(`Message is not in CLAIMABLE state. Current status: ${statusText} (${messageStatusCode})`);
      }
      
      console.log('Message is confirmed as CLAIMABLE. Proceeding with claim transaction...');
    } catch (_statusError: unknown) {
      console.error('Error verifying message status:', _statusError);
      throw new Error(`Failed to verify message status before claiming: ${_statusError instanceof Error ? _statusError.message : 'Unknown error'}`);
    }
    
    // Estimate gas for the claim transaction
    let gasEstimate: bigint;
    let gasPrice: bigint;
    
    try {
      console.log('Estimating gas for claim transaction...');
      gasEstimate = await l1PublicClient.estimateContractGas({
        address: l1MessageServiceAddress as Address,
        abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
        functionName: 'claimMessage',
        args: [from as Address, to as Address, BigInt(fee), BigInt(value), BigInt(nonce), calldata as Hex, proof as Hex[]],
        account,
      });
      
      gasPrice = await l1PublicClient.getGasPrice();
      const estimatedFeeEther = formatEther(gasEstimate * gasPrice);
      console.log(`Claim Estimated Fee: ~${estimatedFeeEther} ETH`);
    } catch (_estimationError: unknown) {
      console.error("Error estimating claim gas:", _estimationError);
      throw new Error(`Failed to estimate gas fee for claim: ${_estimationError instanceof Error ? _estimationError.message : 'Unknown error'}`);
    }
    
    // Send the claim transaction
    console.log('Sending claim transaction...');
    const txHash = await walletClient.writeContract({
      chain: l1Blockchain.currentChain,
      account: account,
      address: l1MessageServiceAddress as Address,
      abi: L1_BRIDGE_MESSAGE_SERVICE_ABI,
      functionName: 'claimMessage',
      args: [from as Address, to as Address, BigInt(fee), BigInt(value), BigInt(nonce), calldata as Hex, proof as Hex[]],
      gas: gasEstimate,
      gasPrice: gasPrice,
    });
    
    // Wait for transaction confirmation and return result
    console.log(`Claim transaction submitted: ${txHash}. Waiting for confirmation...`);
    const receipt = await l1PublicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Claim transaction confirmed on ${destinationNetwork}. Status: ${receipt.status}`);
    
    // Look for MessageClaimed event in logs
    let messageClaimedEvent = null;
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === (l1MessageServiceAddress as string).toLowerCase()) {
          const decodedLog = decodeEventLog({ 
            abi: L1_BRIDGE_MESSAGE_SERVICE_ABI, 
            data: log.data, 
            topics: log.topics 
          });
          
          if (decodedLog.eventName === 'MessageClaimed' && 
              decodedLog.args.messageHash?.toLowerCase() === messageHash.toLowerCase()) {
            messageClaimedEvent = decodedLog;
            break;
          }
        }
      } catch (_e) { /* Ignore decoding errors for other events */ }
    }
    
    // Return claim result
    return {
      success: receipt.status === 'success',
      transactionHash: txHash,
      messageHash,
      sourceChain,
      destinationChain: destinationNetwork,
      claimEvent: messageClaimedEvent,
      status: receipt.status === 'success' ? 'claimed' : 'claim_failed',
      message: receipt.status === 'success' 
        ? 'Funds successfully claimed on destination chain' 
        : 'Claim transaction failed on destination chain',
      receipt: {
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      }
    };
    
  } catch (_error: unknown) {
    console.error('Error in claimFunds:', _error);
    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error occurred';
    throw new Error(`Failed to claim funds: ${errorMessage}`);
  }
}
