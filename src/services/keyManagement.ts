import { ethers } from 'ethers';
import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Service for managing cryptographic keys and wallets
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
      console.warn('No encryption key provided, using a random one for demonstration');
      this.encryptionKey = crypto.randomBytes(32).toString('hex');
    }
  }
  
  /**
   * Generate a new random wallet
   * @returns A new Wallet instance
   */
  generateWallet(): ethers.Wallet {
    return ethers.Wallet.createRandom();
  }
  
  /**
   * Get the default wallet from environment variable
   * @returns The default wallet or a random one if not configured
   */
  getDefaultWallet(): ethers.Wallet {
    // Check for private key from env var first, then from config
    const privateKey = this.defaultPrivateKey || config.wallet?.privateKey;
    
    console.log('Checking for wallet private key...');
    console.log('Private key from env exists:', !!this.defaultPrivateKey);
    console.log('Private key from config exists:', !!config.wallet?.privateKey);
    
    if (privateKey) {
      try {
        // Check if it's a mnemonic phrase (has spaces, likely 12 or 24 words)
        if (privateKey.includes(' ')) {
          console.log('Detected mnemonic phrase, creating wallet from mnemonic');
          try {
            // Create wallet from mnemonic (ethers.js v5 syntax)
            const path = "m/44'/60'/0'/0/0"; // Standard Ethereum path
            const wallet = ethers.Wallet.fromMnemonic(privateKey, path);
            console.log('Successfully created wallet from mnemonic with address:', wallet.address);
            return wallet;
          } catch (mnemonicError) {
            console.error('Error creating wallet from mnemonic:', mnemonicError);
            throw new Error('Invalid mnemonic phrase provided');
          }
        }
        
        // Otherwise, treat as a regular private key (hex string)
        console.log('Treating input as raw private key');
        const wallet = new ethers.Wallet(privateKey);
        console.log('Successfully created wallet from private key with address:', wallet.address);
        return wallet;
      } catch (error) {
        console.error('Error creating wallet:', error);
        console.warn('Invalid private key or mnemonic in environment variables, using a random wallet');
        const randomWallet = this.generateWallet();
        console.log('Created random wallet with address:', randomWallet.address);
        return randomWallet;
      }
    }
    console.warn('No private key provided in environment variables, using a random wallet');
    const randomWallet = this.generateWallet();
    console.log('Created random wallet with address:', randomWallet.address);
    return randomWallet;
  }
  
  /**
   * Create a wallet from a private key
   * @param privateKey The private key to create the wallet from
   * @returns A Wallet instance
   */
  createWalletFromPrivateKey(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey);
  }
  
  /**
   * Encrypt a private key for secure storage
   * @param privateKey The private key to encrypt
   * @returns The encrypted private key
   */
  encryptPrivateKey(privateKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-ctr',
      Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32)),
      iv
    );
    
    const encryptedKey = Buffer.concat([
      cipher.update(privateKey, 'utf8'),
      cipher.final(),
    ]);
    
    return `${iv.toString('hex')}:${encryptedKey.toString('hex')}`;
  }
  
  /**
   * Decrypt a stored private key
   * @param encryptedKey The encrypted private key
   * @returns The decrypted private key
   */
  decryptPrivateKey(encryptedKey: string): string {
    const [ivHex, encryptedKeyHex] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedKeyBuffer = Buffer.from(encryptedKeyHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-ctr',
      Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32)),
      iv
    );
    
    const decryptedKey = Buffer.concat([
      decipher.update(encryptedKeyBuffer),
      decipher.final(),
    ]);
    
    return decryptedKey.toString('utf8');
  }
  
  /**
   * Create a wallet from an encrypted private key
   * @param encryptedKey The encrypted private key
   * @returns A Wallet instance
   */
  createWalletFromEncryptedKey(encryptedKey: string): ethers.Wallet {
    const privateKey = this.decryptPrivateKey(encryptedKey);
    return this.createWalletFromPrivateKey(privateKey);
  }
  
  /**
   * Generate a secure encryption key
   * @returns A new random encryption key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export default KeyManagementService;
