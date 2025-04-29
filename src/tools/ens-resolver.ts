import { createPublicClient, http } from 'viem';
import { linea, lineaSepolia } from 'viem/chains';

/**
 * Resolve an ENS name to its address on Linea
 * @param ensName The ENS name to resolve (e.g. 'user.linea')
 * @param testnet Whether to use Linea Sepolia testnet (default: false)
 * @returns The resolved address or null if not found
 */
export async function resolveENSName(ensName: string, testnet = false): Promise<string | null> {
  try {
    // Create a client for the appropriate network
    const client = createPublicClient({
      chain: testnet ? lineaSepolia : linea,
      transport: http(),
    });

    // Resolve ENS name to address
    const address = await client.getEnsAddress({
      name: ensName,
    });

    return address;
  } catch (_error: any) {
    console.error('Error resolving ENS name:', _error);
    return null;
  }
}

/**
 * Lookup ENS name for an address on Linea
 * @param address The Ethereum address to lookup
 * @param testnet Whether to use Linea Sepolia testnet (default: false)
 * @returns The ENS name or null if not found
 */
export async function lookupENSAddress(address: string, testnet = false): Promise<string | null> {
  try {
    // Create a client for the appropriate network
    const client = createPublicClient({
      chain: testnet ? lineaSepolia : linea,
      transport: http(),
    });

    // Lookup address to get ENS name
    const name = await client.getEnsName({
      address: address as `0x${string}`,
    });

    return name;
  } catch (_error: any) {
    console.error('Error looking up ENS address:', _error);
    return null;
  }
}

/**
 * Check if an ENS name is available on Linea
 * @param ensName The ENS name to check
 * @param testnet Whether to use Linea Sepolia testnet (default: false)
 * @returns True if available, false if already registered
 */
export async function checkENSNameAvailability(ensName: string, testnet = false): Promise<boolean> {
  const address = await resolveENSName(ensName, testnet);
  return address === null;
}

/**
 * Get ENS avatar for a name
 * @param ensName The ENS name to get avatar for
 * @param testnet Whether to use Linea Sepolia testnet (default: false)
 * @returns The avatar URL or null if not set
 */
export async function getENSAvatar(ensName: string, testnet = false): Promise<string | null> {
  try {
    // Create a client for the appropriate network
    const client = createPublicClient({
      chain: testnet ? lineaSepolia : linea,
      transport: http(),
    });

    // Get ENS avatar
    const avatar = await client.getEnsAvatar({
      name: ensName,
    });

    return avatar;
  } catch (_error: any) {
    console.error('Error getting ENS avatar:', _error);
    return null;
  }
}

/**
 * Get multiple ENS records for a name
 * @param ensName The ENS name to get records for
 * @param testnet Whether to use Linea Sepolia testnet (default: false)
 * @returns An object with the ENS records
 */
export async function getENSRecords(
  ensName: string, 
  records: string[], 
  testnet = false
): Promise<Record<string, string | null>> {
  try {
    // Create a client for the appropriate network
    const client = createPublicClient({
      chain: testnet ? lineaSepolia : linea,
      transport: http(),
    });

    // Get ENS records
    const result: Record<string, string | null> = {};
    
    for (const record of records) {
      try {
        const value = await client.getEnsText({
          name: ensName,
          key: record,
        });
        result[record] = value;
      } catch (_err: any) {
        result[record] = null;
      }
    }

    return result;
  } catch (_error: any) {
    console.error('Error getting ENS records:', _error);
    return {};
  }
} 