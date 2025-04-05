import {
  isAddress,
  parseEther,
  createWalletClient,
  http,
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
} from 'viem';
import BlockchainService from '../../services/blockchain.js';
import KeyManagementService from '../../services/keyManagement.js';
import { CallContractParams, DeployContractParams } from './schemas.js';
import config from '../../config/index.js'; // Import config for RPC URL

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
 * Call a contract function using viem
 * @param params The parameters for calling a contract function
 * @returns The result of the function call or transaction details
 */
export async function callContract(params: CallContractParams) {
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
            // Attempt to parse as JSON ABI array first
            const parsedJson = JSON.parse(abi);
            if (Array.isArray(parsedJson)) {
                // Basic validation: check if items look like ABI items (have 'type')
                if (parsedJson.length === 0 || (typeof parsedJson[0] === 'object' && parsedJson[0] !== null && 'type' in parsedJson[0])) {
                    contractAbi = parsedJson as Abi; // Assume valid JSON ABI
                    console.log("Interpreted ABI string as JSON ABI array.");
                } else {
                    // If it parses as JSON but doesn't look like an ABI, try parsing as human-readable
                    console.log("Parsed JSON string, but doesn't look like ABI. Trying human-readable parse.");
                    contractAbi = parseAbi(abi.split('\n')); // Split potentially multi-line string
                }
            } else {
                // Parsed as JSON but not an array, treat as human-readable
                console.log("Parsed JSON string is not an array. Trying human-readable parse.");
                contractAbi = parseAbi(abi.split('\n'));
            }
        } catch (jsonError) {
            // If JSON parsing fails, assume it's human-readable ABI string(s)
            console.log("Failed to parse ABI string as JSON. Assuming human-readable format.");
            contractAbi = parseAbi(abi.split('\n')); // parseAbi handles string arrays
        }
    } else if (Array.isArray(abi)) {
        // Assume it's an array of human-readable strings
        console.log("Interpreted ABI input as array of human-readable strings.");
        // Ensure elements are strings before passing to parseAbi
        if (abi.every(item => typeof item === 'string')) {
             contractAbi = parseAbi(abi as readonly string[]); // Cast to readonly string[] for parseAbi
        } else {
             throw new Error('Invalid ABI format: Array must contain only strings for human-readable format.');
        }
    } else {
        throw new Error('Invalid ABI format provided. Must be a JSON string, human-readable string(s), or an array of human-readable strings.');
    }

    // Add a final check
    if (!Array.isArray(contractAbi) || (contractAbi.length > 0 && typeof contractAbi[0] !== 'object')) {
        throw new Error('Failed to parse ABI into a valid viem Abi format.');
    }
    // --- End Robust ABI Parsing ---

    // Find the function definition in the ABI
    const functionAbi = findFunctionAbi(contractAbi, functionName);

    // Determine if it's a read or write operation based on stateMutability
    const isReadOnly = functionAbi.stateMutability === 'view' || functionAbi.stateMutability === 'pure';

    let result: any;
    let txDetails: { transactionHash?: Hex, receipt?: TransactionReceipt, from?: Address } = {};

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
      console.log(`Writing to contract ${contractAddress}, function ${functionName}...`);
      const account = keyService.getDefaultAccount();

      // Create WalletClient
      const walletClient = createWalletClient({
        account,
        chain: blockchain.currentChain,
        transport: http(config.rpc.mainnet || 'https://rpc.linea.build'),
      });

      // Prepare transaction options (value)
      const txValue = value ? parseEther(value) : undefined;

      // Execute the transaction
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: functionName,
        args: functionParams,
        value: txValue,
      });
      console.log(`Transaction submitted with hash: ${hash}. Waiting for confirmation...`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`Transaction confirmed. Status: ${receipt.status}`);

       if (receipt.status === 'reverted') {
           throw new Error(`Transaction failed (reverted). Hash: ${hash}`);
       }

      txDetails = {
          transactionHash: hash,
          receipt: receipt,
          from: account.address
      };
      // For write operations, the primary "result" is the transaction hash/receipt
      result = txDetails;
    }

    return {
      success: true,
      contractAddress,
      functionName,
      isReadOnly,
      // Format the result if it wasn't a write operation, otherwise return tx details
      result: isReadOnly ? formatResult(result) : txDetails,
    };
  } catch (error: unknown) {
    console.error('Error in callContract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    // Add more specific error handling
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
 * Deploy a contract using viem
 * @param params The parameters for deploying a contract
 * @returns The deployed contract details
 */
export async function deployContract(params: DeployContractParams) {
  try {
    const { bytecode, abi, constructorArgs = [], value } = params;

     // Validate bytecode
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
             // For deployment, we strongly prefer a JSON ABI string
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
         } catch (e) {
             throw new Error('Invalid ABI format for deployment: Failed to parse JSON string. Provide a valid JSON ABI array string.');
         }
     } else if (Array.isArray(abi)) {
         // Allow human-readable array for deployment, though less common
         console.warn("Using human-readable ABI array for deployment. Ensure it includes the constructor if needed.");
          if (abi.every(item => typeof item === 'string')) {
              contractAbi = parseAbi(abi as readonly string[]);
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


    // Get deployer account
    const account = keyService.getDefaultAccount();

    // Create WalletClient
    const walletClient = createWalletClient({
      account,
      chain: blockchain.currentChain,
      transport: http(config.rpc.mainnet || 'https://rpc.linea.build'),
    });

    // Prepare deployment options
    const deployValue = value ? parseEther(value) : undefined;

    console.log(`Deploying contract with bytecode from ${account.address}...`);

    // Deploy the contract
    const hash = await walletClient.deployContract({
      abi: contractAbi,
      bytecode: bytecode as Hex, // Assert Hex type
      args: constructorArgs,
      value: deployValue,
    });

    console.log(`Deployment transaction submitted: ${hash}. Waiting for confirmation...`);

    // Wait for the transaction to be mined
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
      receipt: { // Include receipt details
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
      },
      // Return the original ABI provided
      abi: abi,
    };
  } catch (error: unknown) {
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
