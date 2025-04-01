import { verifyHuman } from './handlers.js';
import { VerifyHumanSchema } from './schemas.js';

/**
 * TODO: Implement additional Verax functionality
 * - getAttestations: Fetch attestations for an address from Verax registry
 * - checkAttestation: Check if an address has a specific attestation type
 * - These functions need proper contract integration with Verax protocol
 * - Current contract addresses are available in constants.ts
 */

// Tool metadata
export const toolMetadata = {
  verifyHuman: {
    description: 'Verify if an address is a verified human using Linea Verax attestations',
  },
  // TODO: Re-enable these commands once contract integration is fixed
  // getAttestations: {
  //   description: 'Get attestations for an address from Linea Verax',
  // },
  // checkAttestation: {
  //   description: 'Check if an address has a specific attestation type in Linea Verax',
  // },
};

// Export schemas and handler functions
export {
  VerifyHumanSchema,
  verifyHuman,
}; 