import {
  isAddress,
  parseEther,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createWalletClient, // Kept for post-confirmation logic
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  http, // Kept for post-confirmation logic
  Abi,
  Address,
  Hex,
  // decodeFunctionResult, // Unused
  // encodeFunctionData, // Unused
  // PublicClient, // Unused
  // WalletClient, // Unused
  TransactionReceipt, // Used in txDetails type
  AbiFunction,
  parseAbi, // Helper to parse string ABIs if needed
  formatEther, // Added for fee formatting
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PublicClient, // Needed for estimation & post-confirmation logic
  encodeDeployData, // Needed for deployment gas estimation
} from 'viem';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { CallContractParams, DeployContractParams } from './schemas.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '../../config/index.js'; // Kept for post-confirmation logic

/**
 * Find the ABI definition for a specific function name.
 * @param abi The contract ABI.
 * @param functionName The name of the function.
 * @returns The ABI item for the function.
 * @throws If the function is not found in the ABI.
 */
function findFunctionAbi(abi: Abi, functionName: string): AbiFunction {
    const functionAbi = abi.find(
        (item) => item.type === 'function' && item.name === functionName
    );
    if (!functionAbi) {
        throw new Error(`Function "${functionName}" not found in the provided ABI.`);
    }
    // We need to assert the type because .find returns Abi[number] | undefined
    return functionAbi as AbiFunction;
}

/**
 * Call a contract function using viem, with fee estimation for writes
 * @param params The parameters for calling a contract function
 * @returns The result of the function call or transaction details
 */
export async function callContract(params: CallContractParams): Promise<any> { // Return type needs to be flexible
  try {
    const { contractAddress, abi, functionName, params: functionParams = [], value } = params;

    // Validate address
    if (!isAddress(contractAddress)) {
        throw new Error('Invalid contract address provided.');
    }

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();

    // --- Robust ABI Parsing ---
    let contractAbi: Abi;
    if (typeof abi === 'string') {
        try {
            const parsedJson = JSON.parse(abi);
            if (Array.isArray(parsedJson)) {
                if (parsedJson.length === 0 || (typeof parsedJson[0] === 'object' && parsedJson[0] !== null && 'type' in parsedJson[0])) {
                    contractAbi = parsedJson as Abi;
                    console.log("Interpreted ABI string as JSON ABI array.");
                } else {
                    console.log("Parsed JSON string, but doesn't look like ABI. Trying human-readable parse.");
                    contractAbi = parseAbi(abi.split('\n'));
                }
            } else {
                console.log("Parsed JSON string is not an array. Trying human-readable parse.");
                contractAbi = parseAbi(abi.split('\n'));
            }
        } catch (_jsonError: any) {
            console.log("Failed to parse ABI string as JSON. Assuming human-readable format.");
            contractAbi = parseAbi(abi.split('\n'));
        }
    } else if (Array.isArray(abi)) {
        if (abi.every(item => typeof item === 'string')) {
             contractAbi = parseAbi(abi as readonly string[]);
             console.log("Interpreted ABI input as array of human-readable strings.");
        } else {
             throw new Error('Invalid ABI format: Array must contain only strings for human-readable format.');
        }
    } else {
        throw new Error('Invalid ABI format provided. Must be a JSON string, human-readable string(s), or an array of human-readable strings.');
    }
    if (!Array.isArray(contractAbi) || (contractAbi.length > 0 && typeof contractAbi[0] !== 'object')) {
        throw new Error('Failed to parse ABI into a valid viem Abi format.');
    }
    // --- End Robust ABI Parsing ---

    const functionAbi = findFunctionAbi(contractAbi, functionName);
    const isReadOnly = functionAbi.stateMutability === 'view' || functionAbi.stateMutability === 'pure';

    let result: any;
    // Use const as txDetails is only assigned once in the (currently commented out) post-confirmation block
    const txDetails: { transactionHash?: Hex, receipt?: TransactionReceipt, from?: Address, estimatedFee?: string } = {}; // Add estimatedFee

    if (isReadOnly) {
      // --- Read Operation ---
      console.log(`Reading from contract ${contractAddress}, function ${functionName}...`);
      result = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: functionName,
        args: functionParams,
      });
      console.log('Read operation successful.');
    } else {
      // --- Write Operation ---
      console.log(`Estimating gas for contract call: ${functionName}...`);
      const account = keyService.getDefaultAccount();
      const txValue = value ? parseEther(value) : undefined;

      // Estimate Gas
      let gasEstimate: bigint;
      let gasPrice: bigint;
      let estimatedFeeEther: string;
      try {
          gasEstimate = await publicClient.estimateContractGas({
              address: contractAddress,
              abi: contractAbi,
              functionName: functionName,
              args: functionParams,
              account,
              value: txValue,
          });
          gasPrice = await publicClient.getGasPrice();
          estimatedFeeEther = formatEther(gasEstimate * gasPrice);
          console.log(`Estimated Fee: ~${estimatedFeeEther} ETH`);
      } catch (estimationError: unknown) {
          console.error("Error estimating contract gas:", estimationError);
          throw new Error(`Failed to estimate gas fee: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
      }

      // Ask for Confirmation
      throw new Error(`CONFIRMATION_REQUIRED: Estimated fee for calling ${functionName} on ${contractAddress} is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);

      /*
      // --- Code to run *after* user confirms (Yes) ---
      const walletClient = createWalletClient({
        account,
        chain: blockchain.currentChain,
        transport: http(config.rpc.mainnet || 'https://rpc.linea.build'),
      });

      console.log(`Proceeding with contract call: ${functionName}...`);
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: functionName,
        args: functionParams,
        value: txValue,
        gas: gasEstimate, // Apply estimate
        gasPrice: gasPrice, // Apply price
      });
      console.log(`Transaction submitted: ${hash}. Waiting...`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Transaction confirmed. Status: ${receipt.status}`);

      if (receipt.status === 'reverted') {
           throw new Error(`Transaction failed (reverted). Hash: ${hash}`);
      }

      txDetails = {
          transactionHash: hash,
          receipt: receipt,
          from: account.address,
          estimatedFee: estimatedFeeEther
      };
      result = txDetails; // Result for write op is tx details
      // --- End Post-Confirmation Code ---
      */
    }

    return {
      success: true,
      contractAddress,
      functionName,
      isReadOnly,
      result: isReadOnly ? formatResult(result) : txDetails,
    };
  } catch (error: unknown) {
     // Re-throw confirmation request errors
    if (error instanceof Error && error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw error;
    }
    console.error('Error in callContract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    if (errorMessage.includes('Function') && errorMessage.includes('not found')) {
        throw new Error(`Failed to call contract: ${errorMessage}`);
    } else if (errorMessage.includes('Invalid contract address')) {
         throw new Error(`Failed to call contract: Invalid contract address format.`);
    } else if (errorMessage.includes('Transaction failed (reverted)')) {
         throw new Error(`Failed to call contract: Transaction reverted. Check parameters, permissions, or funds.`);
    }
    throw new Error(`Failed to call contract: ${errorMessage}`);
  }
}

/**
 * Deploy a contract using viem, with fee estimation and confirmation
 * @param params The parameters for deploying a contract
 * @returns The deployed contract details
 */
export async function deployContract(params: DeployContractParams): Promise<any> { // Return type needs to be flexible
  try {
    const { bytecode, abi, constructorArgs = [], value } = params;

     if (!bytecode || !bytecode.startsWith('0x')) {
         throw new Error('Invalid bytecode provided. Must be a hex string starting with 0x.');
     }

    // Initialize services
    const blockchain = new BlockchainService('mainnet'); // Assuming mainnet
    const publicClient = blockchain.client;
    const keyService = new KeyManagementService();

    // --- Robust ABI Parsing ---
    let contractAbi: Abi;
     if (typeof abi === 'string') {
         try {
             const parsedJson = JSON.parse(abi);
             if (Array.isArray(parsedJson)) {
                  if (parsedJson.length === 0 || (typeof parsedJson[0] === 'object' && parsedJson[0] !== null && 'type' in parsedJson[0])) {
                     contractAbi = parsedJson as Abi;
                     console.log("Interpreted ABI string as JSON ABI array for deployment.");
                 } else {
                      throw new Error('Parsed JSON string does not appear to be a valid ABI array.');
                 }
             } else {
                 throw new Error('Invalid ABI format for deployment: Expected a JSON string representing an array.');
             }
         } catch (_e: any) {
             throw new Error('Invalid ABI format for deployment: Failed to parse JSON string. Provide a valid JSON ABI array string.');
         }
     } else if (Array.isArray(abi)) {
          if (abi.every(item => typeof item === 'string')) {
              contractAbi = parseAbi(abi as readonly string[]);
              console.warn("Using human-readable ABI array for deployment. Ensure it includes the constructor if needed.");
         } else {
              throw new Error('Invalid ABI format: Array must contain only strings for human-readable format.');
         }
     } else {
         throw new Error('Invalid ABI format provided for deployment. Must be a JSON string array or an array of human-readable strings.');
     }
     if (!Array.isArray(contractAbi) || (contractAbi.length > 0 && typeof contractAbi[0] !== 'object')) {
        throw new Error('Failed to parse ABI into a valid viem Abi format for deployment.');
    }
    // --- End Robust ABI Parsing ---

    const account = keyService.getDefaultAccount();
    const deployValue = value ? parseEther(value) : undefined;

    // --- Estimate Gas Fee ---
    console.log(`Estimating gas for contract deployment...`);
    let gasEstimate: bigint;
    let gasPrice: bigint;
    let estimatedFeeEther: string;
    try {
        // Encode deployment data
        const deployData = encodeDeployData({
            abi: contractAbi,
            bytecode: bytecode as Hex,
            args: constructorArgs,
        });
        // Estimate gas using the encoded data
        gasEstimate = await publicClient.estimateGas({
            data: deployData,
            account,
            value: deployValue,
        });
        gasPrice = await publicClient.getGasPrice();
        estimatedFeeEther = formatEther(gasEstimate * gasPrice);
        console.log(`Estimated Fee: ~${estimatedFeeEther} ETH`);
    } catch (estimationError: unknown) {
        console.error("Error estimating deployment gas:", estimationError);
        throw new Error(`Failed to estimate gas fee for deployment: ${estimationError instanceof Error ? estimationError.message : 'Unknown error'}`);
    }
    // --- End Estimation ---

    // --- Ask for Confirmation ---
    throw new Error(`CONFIRMATION_REQUIRED: Estimated fee for deploying the contract is ~${estimatedFeeEther} ETH. Proceed? (Yes/No)`);
    // --- End Confirmation ---

    /*
    // --- Code to run *after* user confirms (Yes) ---
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(config.rpc.mainnet || 'https://rpc.linea.build'),
    });

    console.log(`Proceeding with contract deployment from ${account.address}...`);
    const hash = await walletClient.deployContract({
      abi: contractAbi,
      bytecode: bytecode as Hex,
      args: constructorArgs,
      value: deployValue,
      gas: gasEstimate, // Apply estimate
      gasPrice: gasPrice, // Apply price
    });
    console.log(`Deployment transaction submitted: ${hash}. Waiting...`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Contract deployment confirmed. Status: ${receipt.status}`);

    if (receipt.status === 'reverted') {
        throw new Error(`Contract deployment failed (reverted). Hash: ${hash}`);
    }
    if (!receipt.contractAddress) {
        throw new Error(`Contract deployment succeeded but no contract address found in receipt. Hash: ${hash}`);
    }
    console.log(`Contract deployed at address: ${receipt.contractAddress}`);

    return {
      success: true,
      contractAddress: receipt.contractAddress,
      transactionHash: hash,
      deployer: account.address,
      receipt: {
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      abi: abi, // Return original ABI
      estimatedFee: estimatedFeeEther, // Include estimate
    };
    // --- End Post-Confirmation Code ---
    */

  } catch (error: unknown) {
     // Re-throw confirmation request errors
    if (error instanceof Error && error.message.startsWith('CONFIRMATION_REQUIRED:')) {
        throw error;
    }
    console.error('Error in deployContract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
     if (errorMessage.includes('Invalid bytecode')) {
         throw new Error(`Failed to deploy contract: ${errorMessage}`);
     } else if (errorMessage.includes('Invalid ABI')) {
         throw new Error(`Failed to deploy contract: ${errorMessage}`);
     } else if (errorMessage.includes('insufficient funds')) {
         throw new Error(`Failed to deploy contract: Insufficient funds for deployment.`);
     } else if (errorMessage.includes('reverted')) {
         throw new Error(`Failed to deploy contract: Deployment transaction reverted.`);
     }
    throw new Error(`Failed to deploy contract: ${errorMessage}`);
  }
}

/**
 * Format the result of a contract call to be JSON-serializable, handling BigInts.
 * @param result The result to format
 * @returns The formatted result
 */
function formatResult(result: any): any {
  if (result === null || result === undefined) {
    return null;
  }

  // Handle BigInt
  if (typeof result === 'bigint') {
    return result.toString();
  }

  // Handle Arrays
  if (Array.isArray(result)) {
    return result.map(formatResult);
  }

  // Handle Objects (including structs returned from contracts)
  if (typeof result === 'object') {
    const formatted: Record<string, any> = {};
    for (const key in result) {
      // Include only string keys (ignore array indices if it's array-like)
      if (Object.prototype.hasOwnProperty.call(result, key) && isNaN(Number(key))) {
        formatted[key] = formatResult(result[key]);
      }
    }
    // If the object had numeric keys (like arrays), return the array map instead
    if (Object.keys(formatted).length === 0 && Array.isArray(result)) {
        return result.map(formatResult);
    }
    return formatted;
  }

  // Handle other primitives (string, number, boolean)
  return result;
}
