/**
 * TODO: Contract Integration Implementation
 * 
 * Verax contract integration for getAttestations and checkAttestation functions
 * needs to be fixed. Current implementation has the following issues:
 * 
 * 1. Contract interaction needs better error handling
 * 2. May require proper ABI typing for returned data
 * 3. Possible network connection issues with contract calls
 * 4. May need updated contract methods according to latest Verax protocol
 * 
 * Current verifyHuman function works because it uses the POH API directly
 * without blockchain contract interaction.
 * 
 * Note: Verax contract addresses have been updated to the latest versions as of March 2025.
 */

// Verax contract addresses on Linea
export const VERAX_MAINNET = {
  router: '0x4d3a380A03f3a18A5dC44b01119839D8674a552E',
  attestationRegistry: '0x3de3893aa4Cdea029e84e75223a152FD08315138',
  schemaRegistry: '0x0f95dCec4c7a93F2637eb13b655F2223ea036B59',
  moduleRegistry: '0xf851513A732996F22542226341748f3C9978438f',
  portalRegistry: '0xd5d61e4ECDf6d46A63BfdC262af92544DFc19083',
  attestationReader: '0x40871e247CF6b8fd8794c9c56bB5c2b8a4FA3B6c',
};

// Verax contract addresses on Linea Sepolia (testnet) (placeholders)
export const VERAX_TESTNET = {
  router: '0xAfA952790492DDeB474012cEA12ba34B788ab39F',
  attestationRegistry: '0xDaf3C3632327343f7df0Baad2dc9144fa4e1001F',
  schemaRegistry: '0x90b8542d7288a83EC887229A7C727989C3b56209',
  moduleRegistry: '0x3C443B9f0c8ed3A3270De7A4815487BA3223C2Fa',
  portalRegistry: '0xF35fe79104e157703dbCC3Baa72a81A99591744D',
  attestationReader: '0x0000000000000000000000000000000000000000', // Update when available
};

// Minimal ABIs for Verax contracts
export const ATTESTATION_REGISTRY_ABI = [
  'function getAttestationsBySubject(address subject, uint256 offset, uint256 limit) view returns (tuple(bytes32 id, bytes32 schemaId, address subject, address attester, uint64 time, bytes32 expirationTime, bytes32 revocationTime, bytes data, string schemaString)[])',
  'function getAttestationsBySchema(bytes32 schemaId, uint256 offset, uint256 limit) view returns (tuple(bytes32 id, bytes32 schemaId, address subject, address attester, uint64 time, bytes32 expirationTime, bytes32 revocationTime, bytes data, string schemaString)[])',
  'function getAttestationById(bytes32 id) view returns (tuple(bytes32 id, bytes32 schemaId, address subject, address attester, uint64 time, bytes32 expirationTime, bytes32 revocationTime, bytes data, string schemaString))',
];

export const SCHEMA_REGISTRY_ABI = [
  'function getSchema(bytes32 uid) view returns (tuple(bytes32 id, address creator, bool revocable, string schema))',
  'function getSchemaIds() view returns (bytes32[])',
];

// POH API URLs
export const POH_API_URL = 'https://linea-xp-poh-api.linea.build';

// Predefined schema IDs for POH-like attestations
export const POH_SCHEMA_ID = '0x9b55f74e966b7ea1c0b6159d5641709b493a9906ed371aac9c5ce9179446c99b';
export const KYC_SCHEMA_ID = '0x23c02cb944a3e08265faaa66dc27baf76cf61f0f7beba2a0dd7c7a5763ac3c50'; 