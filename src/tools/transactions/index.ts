import { GetTransactionStatusSchema } from './schemas.js';
import { getTransactionStatus } from './handlers.js';

// Export schema and handler
export {
  // Schema
  GetTransactionStatusSchema,

  // Handler
  getTransactionStatus,
};

// Define tool metadata (optional, but good practice)
export const toolMetadata = {
  getTransactionStatus: {
    name: 'transactions_getStatus', // Consistent naming with other tools
    description: 'Get the status and details of a blockchain transaction by its hash.',
    example: 'Get status for transaction 0x...',
  },
};
