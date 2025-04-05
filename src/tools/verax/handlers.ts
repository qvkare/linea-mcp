import { isAddress } from 'viem'; // Import viem's isAddress
import { VerifyHumanParams } from './schemas.js';
import { POH_API_URL } from './constants.js';
import axios from 'axios';

/**
 * TODO: Re-implement Blockchain Contract Interaction Functions
 * 
 * The following functions need to be re-implemented with proper contract interaction:
 * 
 * 1. getAttestations - To fetch all attestations for an address from Verax registry
 *    - Needs proper contract call to attestationRegistry.getAttestationsBySubject
 *    - Requires proper error handling and data type management
 * 
 * 2. checkAttestation - To verify if an address has a specific attestation type
 *    - Needs proper contract call to attestationRegistry.getAttestationsBySchema
 *    - Requires filtering logic for validating active attestations
 * 
 * For implementation details, refer to Verax documentation at: https://docs.ver.ax/
 */

/**
 * Verify if an address is a verified human using Linea POH API
 * @param params The parameters for verifying humanity
 * @returns Whether the address is verified as human
 */
export async function verifyHuman(params: VerifyHumanParams) {
  try {
    const { address } = params;

    // Validate address using viem
    if (!isAddress(address)) {
      throw new Error('Invalid address format provided.');
    }
    
    // Query the Linea POH API directly
    try {
      const response = await axios.get(`${POH_API_URL}/poh/${address}`);
      const pohData = response.data;
      
      // The POH API returns an object with a 'poh' field that indicates 
      // whether the address is verified as human
      const isVerifiedHuman = pohData.poh === true;
      
      // Collect any validation information for reference
      const validatedAttestations = Array.isArray(pohData.attestations) 
        ? pohData.attestations.filter((att: any) => att.validated === true) 
        : [];
      
      return {
        success: true,
        address,
        isVerifiedHuman,
        message: isVerifiedHuman
          ? `Address ${address} is verified as human on Linea's POH system`
          : `Address ${address} is not verified as human on Linea's POH system`,
        validatedAttestations: validatedAttestations.length,
        isFlagged: pohData.isFlagged || false
      };
    } catch (apiError: any) {
      // If the API call fails, handle the error
      console.error('Error calling POH API:', apiError);
      
      if (apiError.response && apiError.response.status === 400 && 
          apiError.response.data && apiError.response.data.message &&
          apiError.response.data.message.includes('is invalid')) {
        throw new Error(`Invalid address format: ${address}`);
      }
      
      throw new Error(`Failed to verify humanity through POH API: ${apiError.message}`);
    }
  } catch (error: unknown) {
    console.error('Error in verifyHuman:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to verify humanity: ${errorMessage}`);
  }
}
