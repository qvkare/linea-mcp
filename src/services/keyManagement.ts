import {
  generatePrivateKey,
  privateKeyToAccount,
  mnemonicToAccount,
  PrivateKeyAccount,
  HDAccount,
} from 'viem/accounts';
import crypto from 'crypto';
import config from '../config/index.js';

// Define a union type for the account types we might return
type SupportedAccount = PrivateKeyAccount | HDAccount;

/**
 * Service for managing cryptographic keys and accounts using viem
 */
class KeyManagementService {
  private encryptionKey: string;
  private defaultPrivateKey: string | undefined;

  /**
   * Create a new KeyManagementService instance
   */
  constructor() {
    this.encryptionKey = config.security.privateKeyEncryptionKey || '';
    this.defaultPrivateKey = process.env.WALLET_PRIVATE_KEY;

    // For demonstration purposes, if no key is provided, generate a random one
    if (!this.encryptionKey) {
      console.warn(
        'No encryption key provided, using a random one for demonstration'
      );
      this.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
  }

  /**
   * Generate a new random private key account
   * @returns A new PrivateKeyAccount instance
   */
  generateAccount(): PrivateKeyAccount {
    const privateKey = generatePrivateKey();
    return privateKeyToAccount(privateKey);
  }

  /**
   * Get the default account from environment variable or config
   * @returns The default account (PrivateKeyAccount or HDAccount) or a random one if not configured
   */
  getDefaultAccount(): SupportedAccount {
    // Check for private key or mnemonic from env var first, then from config
    const privateKeyOrMnemonic =
      this.defaultPrivateKey || config.wallet?.privateKey;

    console.log('Checking for wallet private key or mnemonic...');
    console.log(
      'Private key/mnemonic from env exists:',
      !!this.defaultPrivateKey
    );
    console.log(
      'Private key/mnemonic from config exists:',
      !!config.wallet?.privateKey
    );

    if (privateKeyOrMnemonic) {
      try {
        // Check if it's a mnemonic phrase (has spaces, likely 12 or 24 words)
        if (privateKeyOrMnemonic.includes(' ')) {
          console.log(
            'Detected mnemonic phrase, creating account from mnemonic'
          );
          try {
            // Create account from mnemonic (viem syntax)
            // Default path is m/44'/60'/0'/0/0 which matches ethers default
            const account = mnemonicToAccount(privateKeyOrMnemonic);
            console.log(
              'Successfully created account from mnemonic with address:',
              account.address
            );
            return account;
          } catch (mnemonicError) {
            console.error('Error creating account from mnemonic:', mnemonicError);
            throw new Error('Invalid mnemonic phrase provided');
          }
        }

        // Otherwise, treat as a regular private key (hex string)
        // Ensure it starts with 0x for viem
        const formattedPrivateKey = privateKeyOrMnemonic.startsWith('0x')
          ? (privateKeyOrMnemonic as `0x${string}`)
          : (`0x${privateKeyOrMnemonic}` as `0x${string}`);

        console.log('Treating input as raw private key');
        const account = privateKeyToAccount(formattedPrivateKey);
        console.log(
          'Successfully created account from private key with address:',
          account.address
        );
        return account;
      } catch (error) {
        console.error('Error creating account:', error);
        console.warn(
          'Invalid private key or mnemonic in environment variables, using a random account'
        );
        const randomAccount = this.generateAccount();
        console.log(
          'Created random account with address:',
          randomAccount.address
        );
        return randomAccount;
      }
    }
    console.warn(
      'No private key or mnemonic provided in environment variables, using a random account'
    );
    const randomAccount = this.generateAccount();
    console.log('Created random account with address:', randomAccount.address);
    return randomAccount;
  }

  /**
   * Create an account from a private key
   * @param privateKey The private key (hex string, optionally starting with 0x)
   * @returns A PrivateKeyAccount instance
   */
  createAccountFromPrivateKey(privateKey: string): PrivateKeyAccount {
     // Ensure it starts with 0x for viem
     const formattedPrivateKey = privateKey.startsWith('0x')
       ? (privateKey as `0x${string}`)
       : (`0x${privateKey}` as `0x${string}`);
    return privateKeyToAccount(formattedPrivateKey);
  }

  /**
   * Encrypt a private key for secure storage
   * @param privateKey The private key to encrypt (should be hex string)
   * @returns The encrypted private key string (iv:encryptedKey)
   */
  encryptPrivateKey(privateKey: string): string {
     // Ensure input is hex before encrypting
     const keyToEncrypt = privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-ctr',
      Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32)), // Ensure key is 32 bytes
      iv
    );

    const encryptedKey = Buffer.concat([
      cipher.update(keyToEncrypt, 'hex'), // Assuming private key is hex
      cipher.final(),
    ]);

    return `${iv.toString('hex')}:${encryptedKey.toString('hex')}`;
  }

  /**
   * Decrypt a stored private key
   * @param encryptedKey The encrypted private key string (iv:encryptedKey)
   * @returns The decrypted private key (hex string, without 0x prefix)
   */
  decryptPrivateKey(encryptedKey: string): string {
    const parts = encryptedKey.split(':');
    if (parts.length !== 2) {
        throw new Error("Invalid encrypted key format. Expected 'iv:encryptedKey'.");
    }
    const [ivHex, encryptedKeyHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedKeyBuffer = Buffer.from(encryptedKeyHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-ctr',
      Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32)), // Ensure key is 32 bytes
      iv
    );

    const decryptedKey = Buffer.concat([
      decipher.update(encryptedKeyBuffer),
      decipher.final(),
    ]);

    // Return as hex string, which is what viem expects
    return decryptedKey.toString('hex');
  }

  /**
   * Create an account from an encrypted private key
   * @param encryptedKey The encrypted private key string
   * @returns A PrivateKeyAccount instance
   */
  createAccountFromEncryptedKey(encryptedKey: string): PrivateKeyAccount {
    const privateKey = this.decryptPrivateKey(encryptedKey);
    // Add the '0x' prefix back for viem
    return this.createAccountFromPrivateKey(`0x${privateKey}`);
  }

  /**
   * Generate a secure encryption key
   * @returns A new random encryption key (hex string)
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export default KeyManagementService;
// Export the account type for use in other modules
export type { SupportedAccount };
