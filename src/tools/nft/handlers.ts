import {
  isAddress,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createWalletClient, // Kept for post-confirmation logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  http, // Kept for post-confirmation logic
  Abi,
  Address,
  Hex,
  PublicClient,
  // WalletClient, // Unused
  // TransactionReceipt, // Unused
  formatEther, // Added for fee formatting
  zeroAddress, // Used in detectNftStandard fallback
  // readContract, // Use client.readContract
  // writeContract, // Use client.writeContract
  // multicall, // Use client.multicall
} from 'viem';
import axios from 'axios';
import BlockchainService, { NetworkName } from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { ListNftsParams, TransferNftParams, NftMetadataParams } from './schemas.js';
import config from '../../config/index.js';

// --- ABIs (viem compatible) ---
const ERC721_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
  { name: 'tokenURI', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'transferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { name: 'safeTransferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] }, // Overload without data
  { name: 'safeTransferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] }, // Overload with data
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'tokenId', type: 'uint256' }], outputs: [] },
  { name: 'supportsInterface', type: 'function', stateMutability: 'view', inputs: [{ name: 'interfaceId', type: 'bytes4' }], outputs: [{ name: '', type: 'bool' }] }, // For standard detection
  { type: 'event', name: 'Transfer', inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: true, name: 'tokenId', type: 'uint256' }] },
] as const satisfies Abi;

const ERC1155_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOfBatch', type: 'function', stateMutability: 'view', inputs: [{ name: 'accounts', type: 'address[]' }, { name: 'ids', type: 'uint256[]' }], outputs: [{ name: '', type: 'uint256[]' }] },
  { name: 'uri', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }, // Optional in ERC1155
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }, // Optional in ERC1155
  { name: 'safeTransferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'id', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [] },
  { name: 'safeBatchTransferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'ids', type: 'uint256[]' }, { name: 'amounts', type: 'uint256[]' }, { name: 'data', type: 'bytes' }], outputs: [] },
  { name: 'setApprovalForAll', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] },
  { name: 'isApprovedForAll', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'operator', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'supportsInterface', type: 'function', stateMutability: 'view', inputs: [{ name: 'interfaceId', type: 'bytes4' }], outputs: [{ name: '', type: 'bool' }] }, // For standard detection
  { type: 'event', name: 'TransferSingle', inputs: [{ indexed: true, name: 'operator', type: 'address' }, { indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'id', type: 'uint256' }, { indexed: false, name: 'value', type: 'uint256' }] },
  { type: 'event', name: 'TransferBatch', inputs: [{ indexed: true, name: 'operator', type: 'address' }, { indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'ids', type: 'uint256[]' }, { indexed: false, name: 'values', type: 'uint256[]' }] },
] as const satisfies Abi;

// Interface IDs for ERC165 standard detection
const INTERFACE_IDS = {
    ERC721: '0x80ac58cd',
    ERC1155: '0xd9b67a26',
} as const;
// -----------------------------

/**
 * Get RPC URL based on network name - Helper function (Currently unused but kept for post-confirmation logic)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getRpcUrl(network: NetworkName): string {
    switch (network) {
        case 'ethereum': return config.rpc.ethereum;
        case 'testnet': return config.rpc.testnet;
        case 'mainnet':
        default: return config.rpc.mainnet || 'https://rpc.linea.build';
    }
}

/**
 * Detect NFT contract standard (ERC721 or ERC1155) using ERC165 supportsInterface
 * @param contractAddress Contract address to check
 * @param publicClient Viem PublicClient instance
 * @returns The detected standard or 'UNKNOWN'
 */
async function detectNftStandard(contractAddress: Address, publicClient: PublicClient): Promise<'ERC721' | 'ERC1155' | 'UNKNOWN'> {
  try {
    // First check if it's in our verified collections (from config)
    const verifiedCollection = config.nft.verifiedCollections.find(
      collection => collection.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
    if (verifiedCollection) {
      console.log(`Detected standard ${verifiedCollection.standard} from verified list for ${contractAddress}`);
      return verifiedCollection.standard as 'ERC721' | 'ERC1155';
    }

    console.log(`Attempting ERC165 detection for ${contractAddress}...`);
    // Use multicall for efficiency
    const results = await publicClient.multicall({
        contracts: [
            { address: contractAddress, abi: ERC721_ABI, functionName: 'supportsInterface', args: [INTERFACE_IDS.ERC1155] }, // Check ERC1155 first
            { address: contractAddress, abi: ERC721_ABI, functionName: 'supportsInterface', args: [INTERFACE_IDS.ERC721] },
        ],
        allowFailure: true, // Allow individual calls to fail
    });

    const [supports1155Result, supports721Result] = results;

    if (supports1155Result.status === 'success' && supports1155Result.result === true) {
        console.log(`Detected standard ERC1155 via supportsInterface for ${contractAddress}`);
        return 'ERC1155';
    }
    if (supports721Result.status === 'success' && supports721Result.result === true) {
         console.log(`Detected standard ERC721 via supportsInterface for ${contractAddress}`);
        return 'ERC721';
    }

    console.warn(`ERC165 detection failed for ${contractAddress}. Falling back to method probing.`);

    // Fallback: Try calling a specific function (less reliable)
    try {
        await publicClient.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: 'ownerOf', args: [0n] });
        console.log(`Detected standard ERC721 via ownerOf call for ${contractAddress}`);
        return 'ERC721';
    } catch (_err721: any) {
        try {
            await publicClient.readContract({ address: contractAddress, abi: ERC1155_ABI, functionName: 'balanceOf', args: [zeroAddress, 0n] });
            console.log(`Detected standard ERC1155 via balanceOf call for ${contractAddress}`);
            return 'ERC1155';
        } catch (_err1155: any) {
            console.error(`Could not detect standard for ${contractAddress} via probing.`);
            return 'UNKNOWN';
        }
    }
  } catch (error) {
    console.error(`Error detecting NFT standard for ${contractAddress}:`, error);
    return 'UNKNOWN';
  }
}

/**
 * Get NFTs for address using Alchemy API
 * (No changes needed here as it uses axios, not ethers)
 */
async function getNftsFromAlchemy(address: string, options: {
  limit?: number;
  cursor?: string;
  contractAddresses?: string[];
  standard?: 'ERC721' | 'ERC1155' | 'ALL';
}) {
  // ... (Keep existing Alchemy logic) ...
   try {
    if (!config.apiKeys.alchemy) {
      throw new Error('Alchemy API key not configured');
    }

    const apiUrl = `${config.nft.alchemy.apiUrl}${config.apiKeys.alchemy}${config.nft.alchemy.endpoints.getNFTs}`;

    const params: any = {
      owner: address,
      pageSize: options.limit || config.nft.batchSize,
      // chain: 'LINEA-MAINNET', // Alchemy might infer chain from API key/URL
      excludeFilters: [],
      withMetadata: true, // Request metadata
    };

    if (options.cursor) {
      params.pageKey = options.cursor;
    }

    if (options.contractAddresses && options.contractAddresses.length > 0) {
      params.contractAddresses = options.contractAddresses;
    }

    // Alchemy uses 'tokenType' for standard filtering
    if (options.standard && options.standard !== 'ALL') {
      params.tokenType = options.standard;
    }

    console.log(`Fetching NFTs from Alchemy for ${address} with params:`, params);
    const response = await axios.get(apiUrl, { params });
    console.log(`Alchemy response received. Total count: ${response.data?.totalCount}, Page key: ${response.data?.pageKey}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching NFTs from Alchemy:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Alchemy API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * List NFTs owned by an address using viem
 * @param params The parameters for listing NFTs
 * @returns The NFTs owned by the address
 */
export async function listNfts(params: ListNftsParams) {
  try {
    const { contractAddress, tokenId, standard, limit, cursor } = params;
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    let ownerAddress: Address;

    // Get owner address
    if (!params.address) {
      const keyService = new KeyManagementService();
      const account = keyService.getDefaultAccount();
      ownerAddress = account.address;
      console.warn(`No address provided, using default account address: ${ownerAddress}`);
    } else if (isAddress(params.address)) {
      ownerAddress = params.address;
    } else {
        throw new Error('Invalid owner address provided.');
    }

    // --- Case 1: Specific NFT requested (contractAddress + tokenId) ---
    if (contractAddress && tokenId) {
        if (!isAddress(contractAddress)) throw new Error("Invalid contract address provided.");
        const tokenIdBigInt = BigInt(tokenId); // Convert tokenId to BigInt

        // Detect standard if not provided
        const nftStandard = standard && standard !== 'ALL'
            ? standard
            : await detectNftStandard(contractAddress, publicClient);

        if (nftStandard === 'UNKNOWN') {
            return { success: false, address: ownerAddress, nfts: [], message: `Could not detect NFT standard for contract ${contractAddress}` };
        }

        try {
            if (nftStandard === 'ERC721') {
                const owner = await publicClient.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: 'ownerOf', args: [tokenIdBigInt] });
                const isOwner = owner.toLowerCase() === ownerAddress.toLowerCase();

                if (isOwner) {
                    const [name, symbol, tokenURI] = await publicClient.multicall({ contracts: [
                        { address: contractAddress, abi: ERC721_ABI, functionName: 'name' },
                        { address: contractAddress, abi: ERC721_ABI, functionName: 'symbol' },
                        { address: contractAddress, abi: ERC721_ABI, functionName: 'tokenURI', args: [tokenIdBigInt] },
                    ], allowFailure: true }).then(res => [res[0].result ?? 'Unknown', res[1].result ?? 'NFT', res[2].result ?? '']);

                    return { success: true, address: ownerAddress, nfts: [{ contractAddress, tokenId, name, symbol, tokenURI, owner: ownerAddress, standard: 'ERC721' }] };
                } else {
                    return { success: true, address: ownerAddress, nfts: [], message: `Address does not own ERC721 NFT ID ${tokenId} in contract ${contractAddress}` };
                }
            } else { // ERC1155
                const balance = await publicClient.readContract({ address: contractAddress, abi: ERC1155_ABI, functionName: 'balanceOf', args: [ownerAddress, tokenIdBigInt] });

                if (balance > 0n) {
                     const [name, symbol, uri] = await publicClient.multicall({ contracts: [
                        { address: contractAddress, abi: ERC1155_ABI, functionName: 'name' },
                        { address: contractAddress, abi: ERC1155_ABI, functionName: 'symbol' },
                        { address: contractAddress, abi: ERC1155_ABI, functionName: 'uri', args: [tokenIdBigInt] },
                    ], allowFailure: true }).then(res => [res[0].result ?? 'Unknown', res[1].result ?? 'NFT', res[2].result ?? '']);

                    return { success: true, address: ownerAddress, nfts: [{ contractAddress, tokenId, name, symbol, tokenURI: uri, owner: ownerAddress, balance: balance.toString(), standard: 'ERC1155' }] };
                } else {
                    return { success: true, address: ownerAddress, nfts: [], message: `Address does not own ERC1155 NFT ID ${tokenId} in contract ${contractAddress}` };
                }
            }
        } catch (error: unknown) {
             console.error(`Error fetching specific ${nftStandard} NFT:`, error);
             return { success: false, address: ownerAddress, nfts: [], message: `Error fetching ${nftStandard} NFT: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    // --- Case 2: List NFTs (using Alchemy API) ---
    if (!config.nft.enabled) {
        return { success: true, address: ownerAddress, nfts: [], message: 'NFT indexing (via Alchemy) is disabled in config.' };
    }
    if (!config.apiKeys.alchemy) {
        return { success: false, address: ownerAddress, nfts: [], message: 'Alchemy API key not configured. Cannot list all NFTs.' };
    }

    try {
      const contractAddresses = contractAddress ? [contractAddress] : undefined;
      const alchemyData = await getNftsFromAlchemy(ownerAddress, {
        limit,
        cursor,
        contractAddresses,
        standard: standard as 'ERC721' | 'ERC1155' | 'ALL', // Pass standard if provided
      });

      // Map Alchemy response to desired format
      const mappedNfts = alchemyData.ownedNfts.map((nft: any) => ({
          contractAddress: nft.contract.address,
          tokenId: nft.tokenId,
          name: nft.title || nft.contract.name || 'Unknown',
          symbol: nft.contract.symbol || 'NFT',
          tokenURI: nft.tokenUri?.raw || '',
          standard: nft.tokenType, // Alchemy provides this
          balance: nft.balance || (nft.tokenType === 'ERC721' ? '1' : '0'), // Default balance
          metadata: nft.raw?.metadata || nft.metadata || null, // Use raw.metadata or metadata
          owner: ownerAddress,
          media: nft.media || null, // Include media if available
      }));

      return {
        success: true,
        address: ownerAddress,
        nfts: mappedNfts,
        pageKey: alchemyData.pageKey, // For pagination
        totalCount: alchemyData.totalCount,
      };
    } catch (error: unknown) {
      console.error('Error fetching NFTs from Alchemy in listNfts:', error);
      return { success: false, address: ownerAddress, nfts: [], message: `Error fetching NFTs from indexer: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }

  } catch (error: unknown) {
    console.error('Error in listNfts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to list NFTs: ${errorMessage}`);
  }
}

/**
 * Transfer an NFT to another address using viem, with fee estimation and confirmation
 * @param params The parameters for transferring an NFT
 * @returns The transaction details or an abort message
 */
export async function transferNft(params: TransferNftParams): Promise<any> { // Return type needs to be flexible
  try {
    const { contractAddress, tokenId, destination, amount = '1', data = '0x', standard } = params; // Default amount 1 for ERC1155

    // Validate addresses
    if (!isAddress(contractAddress)) throw new Error('Invalid contract address');
    if (!isAddress(destination)) throw new Error('Invalid destination address');

    const tokenIdBigInt = BigInt(tokenId);
    const amountBigInt = BigInt(amount);

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();
    const account = keyService.getDefaultAccount();

    // Detect standard if not provided
    const nftStandard = standard || await detectNftStandard(contractAddress, publicClient);
    if (nftStandard === 'UNKNOWN') {
      throw new Error(`Could not detect NFT standard for contract ${contractAddress}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let txHash: Hex; // Kept for post-confirmation logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const name = 'Unknown'; // Use const, kept for post-confirmation logic
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const symbol = 'NFT'; // Use const, kept for post-confirmation logic
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let estimatedFeeEther: string;
    let transferArgs: any[];
    let transferAbi: Abi;

    if (nftStandard === 'ERC721') {
        console.log(`Estimating gas for transferring ERC721 ${contractAddress} token ${tokenId}...`);
        // Optional: Check ownership first (read operation)
        try {
            const owner = await publicClient.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: 'ownerOf', args: [tokenIdBigInt] });
            if (owner.toLowerCase() !== account.address.toLowerCase()) {
                throw new Error(`Account ${account.address} does not own ERC721 token ID ${tokenId}`);
            }
        } catch (ownerError) {
             throw new Error(`Failed to verify ownership for ERC721 token ID ${tokenId}: ${ownerError instanceof Error ? ownerError.message : ownerError}`);
        }
        transferArgs = [account.address, destination, tokenIdBigInt];
        transferAbi = ERC721_ABI;

    } else { // ERC1155
        console.log(`Estimating gas for transferring ${amount} of ERC1155 ${contractAddress} token ${tokenId}...`);
         // Optional: Check balance first (read operation)
         try {
            const balance = await publicClient.readContract({ address: contractAddress, abi: ERC1155_ABI, functionName: 'balanceOf', args: [account.address, tokenIdBigInt] });
            if (balance < amountBigInt) {
                 throw new Error(`Insufficient balance for ERC1155 token ID ${tokenId}. Have: ${balance}, Need: ${amountBigInt}`);
            }
        } catch (balanceError) {
             throw new Error(`Failed to verify balance for ERC1155 token ID ${tokenId}: ${balanceError instanceof Error ? balanceError.message : balanceError}`);
        }
        transferArgs = [account.address, destination, tokenIdBigInt, amountBigInt, data as Hex];
        transferAbi = ERC1155_ABI;
    }

     // --- Estimate Gas Fee ---
     try {
        gasEstimate = await publicClient.estimateContractGas({
            address: contractAddress,
            abi: transferAbi, // Use correct ABI based on standard
            functionName: 'safeTransferFrom',
            args: transferArgs,
            account,
        });
        gasPrice = await publicClient.getGasPrice();
        estimatedFeeEther = formatEther(gasEstimate * gasPrice);
        console.log(`Estimated Fee: ~${estimatedFeeEther} ETH`);
    } catch (estimationError: unknown) {
        console.error("Error estimating NFT transfer gas:", estimationError);
        throw new Error(`Failed to estimate gas fee for NFT transfer: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
    }
    // --- End Estimation ---

    // --- Ask for Confirmation ---
    const nftDescription = nftStandard === 'ERC721' ? `NFT ID ${tokenId}` : `${amount} of NFT ID ${tokenId}`;
    throw new Error(`CONFIRMATION_REQUIRED: Estimated fee to transfer ${nftDescription} from ${contractAddress} to ${destination} is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);
    // --- End Confirmation ---


    /*
    // --- Code to run *after* user confirms (Yes) ---
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(getRpcUrl('mainnet')),
    });

    console.log(`Proceeding with NFT transfer...`);
    txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: transferAbi,
        functionName: 'safeTransferFrom',
        args: transferArgs,
        gas: gasEstimate,
        gasPrice: gasPrice,
    });

    console.log(`Transfer transaction submitted: ${txHash}. Waiting for confirmation...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Transfer confirmed. Status: ${receipt.status}`);

    if (receipt.status === 'reverted') {
        throw new Error(`NFT transfer failed (reverted). Hash: ${txHash}`);
    }

     // Get name/symbol (best effort) after transfer
     [name, symbol] = await publicClient.multicall({ contracts: [
        { address: contractAddress, abi: transferAbi, functionName: 'name' },
        { address: contractAddress, abi: transferAbi, functionName: 'symbol' },
     ], allowFailure: true }).then(res => [res[0].result ?? 'Unknown', res[1].result ?? 'NFT']);


    return {
      success: true,
      transactionHash: txHash,
      receipt: {
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      from: account.address,
      to: destination,
      contractAddress,
      tokenId,
      name,
      symbol,
      amount: nftStandard === 'ERC1155' ? amount : undefined,
      standard: nftStandard,
      estimatedFee: estimatedFeeEther, // Include estimate
    };
    // --- End Post-Confirmation Code ---
    */

  } catch (error: unknown) {
     // Re-throw confirmation request errors
    if (error instanceof Error && error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw error;
    }
    console.error('Error in transferNft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     if (errorMessage.includes('reverted')) {
         throw new Error(`Failed to transfer NFT: Transaction reverted. Check ownership, approval, or parameters.`);
     }
    throw new Error(`Failed to transfer NFT: ${errorMessage}`);
  }
}

/**
 * Get NFT metadata using viem (fallback) and Alchemy
 * @param params The parameters for retrieving NFT metadata
 * @returns The NFT metadata
 */
export async function getNftMetadata(params: NftMetadataParams) {
  try {
    const { contractAddress, tokenId, standard } = params;
     if (!isAddress(contractAddress)) throw new Error("Invalid contract address provided.");
     const tokenIdBigInt = BigInt(tokenId);

    // --- Try Alchemy First ---
    if (config.nft.enabled && config.apiKeys.alchemy) {
      try {
        const apiUrl = `${config.nft.alchemy.apiUrl}${config.apiKeys.alchemy}${config.nft.alchemy.endpoints.getNFTMetadata}`;
        console.log(`Fetching metadata from Alchemy for ${contractAddress} / ${tokenId}...`);
        const response = await axios.get(apiUrl, {
          params: {
            contractAddress,
            tokenId,
            tokenType: standard || undefined, // Let Alchemy detect if not specified
            refreshCache: 'false', // Use string 'false'
            // chain: 'LINEA-MAINNET' // Often inferred
          }
        });

        // Check if Alchemy returned meaningful data
        if (response.data && (response.data.title || response.data.metadata || response.data.tokenUri)) {
             console.log("Successfully fetched metadata from Alchemy.");
             return {
                success: true,
                source: 'alchemy',
                contractAddress,
                tokenId,
                metadata: response.data.raw?.metadata || response.data.metadata || null, // Prefer raw metadata
                standard: response.data.tokenType || standard || 'UNKNOWN', // Use Alchemy's detected type
                name: response.data.title || response.data.contract?.name || 'Unknown',
                symbol: response.data.contract?.symbol || 'NFT',
                tokenURI: response.data.tokenUri?.raw || null,
                media: response.data.media || null, // Include media if available
            };
        } else {
             console.warn("Alchemy response lacked expected metadata fields, falling back to contract calls.");
        }
      } catch (alchemyError: any) {
        console.warn(`Failed to get metadata from Alchemy (Status: ${alchemyError.response?.status}), falling back to contract calls:`, alchemyError.message);
      }
    } else {
         console.log("Alchemy NFT API not configured or disabled, using contract calls for metadata.");
    }
    // --- End Alchemy Attempt ---


    // --- Fallback to Contract Calls ---
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;

    const nftStandard = standard || await detectNftStandard(contractAddress, publicClient);
    if (nftStandard === 'UNKNOWN') {
      throw new Error(`Could not detect NFT standard for contract ${contractAddress}`);
    }

    let name = 'Unknown'; // Type inferred
    let symbol = 'NFT'; // Type inferred
    let tokenURI: string | null = null;

    try {
        if (nftStandard === 'ERC721') {
            [name, symbol, tokenURI] = await publicClient.multicall({ contracts: [
                { address: contractAddress, abi: ERC721_ABI, functionName: 'name' },
                { address: contractAddress, abi: ERC721_ABI, functionName: 'symbol' },
                { address: contractAddress, abi: ERC721_ABI, functionName: 'tokenURI', args: [tokenIdBigInt] },
            ], allowFailure: true }).then(res => [res[0].result ?? 'Unknown', res[1].result ?? 'NFT', res[2].result ?? null]);
        } else { // ERC1155
             [name, symbol, tokenURI] = await publicClient.multicall({ contracts: [
                { address: contractAddress, abi: ERC1155_ABI, functionName: 'name' }, // Optional in 1155
                { address: contractAddress, abi: ERC1155_ABI, functionName: 'symbol' }, // Optional in 1155
                { address: contractAddress, abi: ERC1155_ABI, functionName: 'uri', args: [tokenIdBigInt] },
            ], allowFailure: true }).then(res => [res[0].result ?? 'Unknown', res[1].result ?? 'NFT', res[2].result ?? null]);
        }
    } catch (readError) {
         console.error("Error reading basic metadata from contract:", readError);
         // Proceed even if basic reads fail, maybe tokenURI is still fetchable if read individually
         if (!tokenURI && nftStandard === 'ERC721') {
             try { tokenURI = await publicClient.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: 'tokenURI', args: [tokenIdBigInt] }); } catch { /* ignore */ }
         } else if (!tokenURI && nftStandard === 'ERC1155') {
              try { tokenURI = await publicClient.readContract({ address: contractAddress, abi: ERC1155_ABI, functionName: 'uri', args: [tokenIdBigInt] }); } catch { /* ignore */ }
         }
    }


    // Try to fetch metadata from tokenURI if available
    let metadata = null;
    if (tokenURI && (tokenURI.startsWith('http') || tokenURI.startsWith('ipfs') || tokenURI.startsWith('data:application/json'))) {
      try {
        let metadataUrl = tokenURI;
        // Handle IPFS URIs
        if (metadataUrl.startsWith('ipfs://')) {
          const cid = metadataUrl.replace('ipfs://', '');
          // Use a public gateway - replace with preferred one if needed
          metadataUrl = `https://ipfs.io/ipfs/${cid}`;
        }

        // Handle ERC1155 URI template {id}
        if (nftStandard === 'ERC1155' && metadataUrl.includes('{id}')) {
            // Pad token ID to 64 hex chars, lowercase, no 0x prefix
            const hexTokenId = tokenIdBigInt.toString(16).padStart(64, '0');
            metadataUrl = metadataUrl.replace('{id}', hexTokenId);
        }

        console.log(`Fetching metadata from resolved URI: ${metadataUrl}`);

        if (metadataUrl.startsWith('data:application/json')) {
             // Handle base64 encoded JSON data URI
             const base64Data = metadataUrl.split(',')[1];
             metadata = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));
             console.log("Successfully parsed metadata from data URI.");
        } else {
            // Fetch from HTTP(S) or IPFS gateway
            const metadataResponse = await axios.get(metadataUrl, { timeout: 5000 }); // Add timeout
            metadata = metadataResponse.data;
            console.log("Successfully fetched metadata from external URI.");
        }

      } catch (metadataError: any) {
        console.warn(`Failed to fetch or parse metadata from URI (${tokenURI}):`, metadataError.message);
      }
    } else if (tokenURI) {
         console.warn(`Token URI format not recognized or fetchable: ${tokenURI}`);
    } else {
         console.warn(`No token URI found for ${contractAddress} / ${tokenId}`);
    }

    return {
      success: true,
      source: 'contract_fallback',
      contractAddress,
      tokenId,
      metadata, // May be null if fetching failed
      standard: nftStandard,
      name,
      symbol,
      tokenURI, // The raw URI from the contract
    };

  } catch (error: unknown) {
    console.error('Error in getNftMetadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get NFT metadata: ${errorMessage}`);
  }
}
