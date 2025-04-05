import {
  createPublicClient,
  http,
  formatEther,
  getContract,
  PublicClient,
  Chain,
  Address,
  Hex,
  Transaction,
  TransactionReceipt,
  EstimateGasParameters,
  Abi,
  GetContractReturnType,
 } from 'viem';
 import { linea, lineaSepolia, mainnet } from 'viem/chains';
 import config from '../config/index.js';
 // import { SupportedAccount } from './keyManagement.js'; // Removed unused import
 
 type NetworkName = 'mainnet' | 'testnet' | 'ethereum';

/**
 * Service for interacting with blockchains using viem's PublicClient
 */
class BlockchainService {
  private _client: PublicClient;
  private network: NetworkName;
  private chain: Chain;

  /**
   * Create a new BlockchainService instance
   * @param network The network to connect to (mainnet, testnet, or ethereum)
   */
  constructor(network: NetworkName = 'mainnet') {
    this.network = network;
    let rpcUrl: string;
    let chain: Chain;

    switch (network) {
      case 'ethereum':
        rpcUrl = config.rpc.ethereum;
        chain = mainnet;
        break;
      case 'testnet':
        rpcUrl = config.rpc.testnet;
        chain = lineaSepolia;
        break;
      case 'mainnet':
      default:
        // Ensure mainnet RPC is defined in config, fallback if necessary
        rpcUrl = config.rpc.mainnet || 'https://rpc.linea.build';
        chain = linea;
        break;
    }

    if (!rpcUrl) {
        throw new Error(`RPC URL for network "${network}" is not configured.`);
    }

    this.chain = chain;
    this._client = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });
  }

  /**
   * Get the current viem PublicClient instance
   * @returns The PublicClient instance
   */
  get client(): PublicClient {
    return this._client;
  }

   /**
   * Get the current viem Chain object
   * @returns The Chain object
   */
   get currentChain(): Chain {
    return this.chain;
  }

  /**
   * Get the current network name
   * @returns The network name (mainnet, testnet, or ethereum)
   */
  get currentNetwork(): NetworkName {
    return this.network;
  }

  /**
   * Get the current block number
   * @returns A promise that resolves to the current block number (bigint)
   */
  async getBlockNumber(): Promise<bigint> {
    return this._client.getBlockNumber();
  }

  /**
   * Get the balance of an address
   * @param address The address (0x...) to check the balance of
   * @returns A promise that resolves to the balance formatted as an Ether string
   */
  async getBalance(address: Address): Promise<string> {
    const balance = await this._client.getBalance({ address });
    return formatEther(balance);
  }

  /**
   * Get a transaction by its hash
   * @param txHash The transaction hash (0x...)
   * @returns A promise that resolves to the transaction details or null if not found
   */
  async getTransaction(txHash: Hex): Promise<Transaction | null> {
    return this._client.getTransaction({ hash: txHash });
  }

  /**
   * Get a transaction receipt by its hash
   * @param txHash The transaction hash (0x...)
   * @returns A promise that resolves to the transaction receipt or null if not found/mined
   */
  async getTransactionReceipt(txHash: Hex): Promise<TransactionReceipt | null> {
    return this._client.getTransactionReceipt({ hash: txHash });
  }

  /**
   * Create a read-only contract instance
   * @param address The contract address (0x...)
   * @param abi The contract ABI
   * @returns A viem Contract instance for read operations
   */
  createContract(
    address: Address,
    abi: Abi // Explicitly require Abi type
  ): GetContractReturnType<Abi, PublicClient> { // Use Abi in return type
    return getContract({
      address,
      abi: abi, // Pass the Abi directly
      client: { public: this._client }, // Use client property name expected by getContract
    }) as any; // Cast to any to bypass the persistent type error
  }

  /**
   * Estimate gas for a transaction
   * @param transaction The transaction parameters (matching viem's EstimateGasParameters)
   * @returns A promise that resolves to the gas estimate (bigint)
   */
  async estimateGas(transaction: EstimateGasParameters): Promise<bigint> {
    // Account needs to be passed for estimateGas
    if (!transaction.account) {
        // If no account is provided, we might need to fetch the default one
        // or throw an error, depending on expected usage.
        // For now, let's throw, as estimating gas usually requires a sender context.
        throw new Error("Account is required for gas estimation.");
    }
    return this._client.estimateGas(transaction);
  }

  /**
   * Get the current gas price
   * @returns A promise that resolves to the current gas price (bigint)
   */
  async getGasPrice(): Promise<bigint> {
    return this._client.getGasPrice();
  }
}

export default BlockchainService;
export type { NetworkName }; // Export network name type
