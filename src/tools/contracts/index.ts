import { callContract, deployContract } from './handlers.js';
import { CallContractSchema, DeployContractSchema } from './schemas.js';

// Export all handlers
export { callContract, deployContract };

// Export all schemas
export { CallContractSchema, DeployContractSchema };

// Tool metadata for documentation (matching wallet structure)
export const toolMetadata = {
  callContract: {
    name: 'call-contract', // Optional: kebab-case name
    description: 'Call a function on a smart contract',
    example: 'Call the "balanceOf" function on contract 0x... with address 0x...', // Add example
  },
  deployContract: {
    name: 'deploy-contract', // Optional: kebab-case name
    description: 'Deploy a new smart contract to the Linea blockchain',
    example: 'Deploy contract with bytecode 0x... and ABI [...]', // Add example
  },
};
