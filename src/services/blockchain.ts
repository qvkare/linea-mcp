import { ethers } from 'ethers';
import config from '../config/index.js'; // Add .js extension

/**
 * Service for interacting with the Linea blockchain
 */
class BlockchainService {
  private _provider: ethers.providers.JsonRpcProvider;
  private network: 'mainnet' | 'testnet' | 'ethereum';
  
  /**
   * Create a new BlockchainService instance
   * @param network The network to connect to (mainnet, testnet, or ethereum)
   */
  constructor(network: 'mainnet' | 'testnet' | 'ethereum' = 'mainnet') {
    this.network = network;
    let rpcUrl: string;
    
    switch (network) {
      case 'ethereum':
        rpcUrl = config.rpc.ethereum;
        break;
      case 'testnet':
        rpcUrl = config.rpc.testnet;
        break;
      case 'mainnet':
      default:
        rpcUrl = config.rpc.mainnet;
        break;
    }
    
    this._provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }
  
  /**
   * Get the current provider
   * @returns The JsonRpcProvider instance
   */
  get provider(): ethers.providers.JsonRpcProvider {
    return this._provider;
  }
  
  /**
   * Get the current network
   * @returns The network name (mainnet, testnet, or ethereum)
   */
  get currentNetwork(): string {
    return this.network;
  }
  
  /**
   * Get the current block number
   * @returns A promise that resolves to the current block number
   */
  async getBlockNumber(): Promise<number> {
    return this._provider.getBlockNumber();
  }
  
  /**
   * Get the balance of an address
   * @param address The address to check the balance of
   * @returns A promise that resolves to the balance in ETH
   */
  async getBalance(address: string): Promise<string> {
    const balance = await this._provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }
  
  /**
   * Get a transaction by its hash
   * @param txHash The transaction hash
   * @returns A promise that resolves to the transaction details
   */
  async getTransaction(txHash: string): Promise<ethers.providers.TransactionResponse> {
    return this._provider.getTransaction(txHash);
  }
  
  /**
   * Get a transaction receipt by its hash
   * @param txHash The transaction hash
   * @returns A promise that resolves to the transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.providers.TransactionReceipt | null> {
    return this._provider.getTransactionReceipt(txHash);
  }
  
  /**
   * Create a contract instance
   * @param address The contract address
   * @param abi The contract ABI
   * @returns A Contract instance
   */
  createContract(address: string, abi: ethers.ContractInterface): ethers.Contract {
    return new ethers.Contract(address, abi, this._provider);
  }
  
  /**
   * Create a contract instance with a signer
   * @param address The contract address
   * @param abi The contract ABI
   * @param wallet The wallet to use as a signer
   * @returns A Contract instance with a signer
   */
  createContractWithSigner(
    address: string, 
    abi: ethers.ContractInterface, 
    wallet: ethers.Wallet
  ): ethers.Contract {
    return new ethers.Contract(address, abi, wallet.connect(this._provider));
  }
  
  /**
   * Estimate gas for a transaction
   * @param transaction The transaction to estimate gas for
   * @returns A promise that resolves to the gas estimate
   */
  async estimateGas(transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber> {
    return this._provider.estimateGas(transaction);
  }
  
  /**
   * Get the current gas price
   * @returns A promise that resolves to the current gas price
   */
  async getGasPrice(): Promise<ethers.BigNumber> {
    return this._provider.getGasPrice();
  }
}

export default BlockchainService;
