import { ethers } from 'ethers';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { CallContractParams, DeployContractParams } from './schemas.js';

/**
 * Call a contract function
 * @param params The parameters for calling a contract function
 * @returns The result of the function call
 */
export async function callContract(params: CallContractParams) {
  try {
    const { contractAddress, abi, functionName, params: functionParams = [], value } = params;
    
    // Initialize services
    const blockchain = new BlockchainService('mainnet');
    const keyService = new KeyManagementService();
    
    // Normalize ABI format
    let normalizedAbi = abi;
    if (typeof abi === 'string') {
      // If ABI is a single function string, convert it to an array
      normalizedAbi = [abi];
    }
    
    // Create contract instance
    const contract = blockchain.createContract(contractAddress, normalizedAbi);
    
    // Check if the function is read-only or requires a transaction
    const fragment = contract.interface.getFunction(functionName);
    const isReadOnly = fragment.constant || fragment.stateMutability === 'view' || fragment.stateMutability === 'pure';
    
    let result;
    if (isReadOnly) {
      // For read-only functions, just call the function
      result = await contract[functionName](...functionParams);
    } else {
      // For state-changing functions, we need a signer
      const wallet = keyService.generateWallet();
      const connectedWallet = wallet.connect(blockchain.provider);
      const contractWithSigner = blockchain.createContractWithSigner(contractAddress, normalizedAbi, connectedWallet);
      
      // Prepare transaction options
      const options: { value?: ethers.BigNumber } = {};
      if (value) {
        options.value = ethers.utils.parseEther(value);
      }
      
      // Execute the transaction
      const tx = await contractWithSigner[functionName](...functionParams, options);
      await tx.wait();
      
      result = {
        transactionHash: tx.hash,
        from: wallet.address,
      };
    }
    
    return {
      success: true,
      contractAddress,
      functionName,
      result: formatResult(result),
    };
  } catch (error: unknown) {
    console.error('Error in callContract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to call contract: ${errorMessage}`);
  }
}

/**
 * Deploy a contract
 * @param params The parameters for deploying a contract
 * @returns The deployed contract details
 */
export async function deployContract(params: DeployContractParams) {
  try {
    const { bytecode, abi, constructorArgs = [], value } = params;
    
    // Initialize services
    const blockchain = new BlockchainService('mainnet');
    const keyService = new KeyManagementService();
    
    // Normalize ABI format
    let normalizedAbi = abi;
    if (typeof abi === 'string') {
      // If ABI is a single function string, convert it to an array
      normalizedAbi = [abi];
    }
    
    // Get a wallet for deployment
    const wallet = keyService.generateWallet();
    const connectedWallet = wallet.connect(blockchain.provider);
    
    // Create contract factory
    const factory = new ethers.ContractFactory(normalizedAbi, bytecode, connectedWallet);
    
    // Prepare deployment options
    const options: { value?: ethers.BigNumber } = {};
    if (value) {
      options.value = ethers.utils.parseEther(value);
    }
    
    // Deploy the contract
    const contract = await factory.deploy(...constructorArgs, options);
    await contract.deployed();
    
    return {
      success: true,
      contractAddress: contract.address,
      transactionHash: contract.deployTransaction.hash,
      deployer: wallet.address,
      abi,
    };
  } catch (error: unknown) {
    console.error('Error in deployContract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to deploy contract: ${errorMessage}`);
  }
}

/**
 * Format the result of a contract call to be JSON-serializable
 * @param result The result to format
 * @returns The formatted result
 */
function formatResult(result: any): any {
  if (result === null || result === undefined) {
    return null;
  }
  
  if (typeof result === 'object') {
    if (ethers.BigNumber.isBigNumber(result)) {
      return result.toString();
    }
    
    if (Array.isArray(result)) {
      return result.map(formatResult);
    }
    
    if (result._isBigNumber) {
      return result.toString();
    }
    
    // Handle objects
    const formatted: Record<string, any> = {};
    for (const key in result) {
      if (Object.prototype.hasOwnProperty.call(result, key) && isNaN(Number(key))) {
        formatted[key] = formatResult(result[key]);
      }
    }
    return formatted;
  }
  
  return result;
}
