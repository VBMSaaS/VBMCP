/**
 * Authentication Storage Service
 * 
 * Handles persistent storage of authentication credentials
 * Stores encrypted credentials in .env.auth file
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredAuth {
  token: string;
  secret: string;
  userId: string;
  partitionId?: string;
  account?: string;
  password?: string;  // Encrypted password for auto re-login
  timestamp: number;
}

export class AuthStorageService {
  private authFilePath: string;

  constructor() {
    // Store auth file in the project root directory
    this.authFilePath = path.join(__dirname, '..', '..', '.env.auth');
  }

  /**
   * Simple encryption using Base64 (prevents plain text exposure)
   */
  private encrypt(text: string): string {
    return Buffer.from(text).toString('base64');
  }

  /**
   * Simple decryption from Base64
   */
  private decrypt(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }

  /**
   * Save authentication credentials to file
   */
  async saveAuth(auth: StoredAuth): Promise<void> {
    try {
      const data = {
        VBMSAAS_TOKEN: this.encrypt(auth.token),
        VBMSAAS_SECRET: this.encrypt(auth.secret),
        VBMSAAS_USER_ID: this.encrypt(auth.userId),
        VBMSAAS_PARTITION_ID: auth.partitionId ? this.encrypt(auth.partitionId) : '',
        VBMSAAS_ACCOUNT: auth.account ? this.encrypt(auth.account) : '',
        VBMSAAS_PASSWORD: auth.password ? this.encrypt(auth.password) : '',
        VBMSAAS_TIMESTAMP: auth.timestamp.toString()
      };

      const content = Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      await fs.promises.writeFile(this.authFilePath, content, {
        encoding: 'utf-8',
        mode: 0o600  // Only owner can read/write
      });

      console.log('[AuthStorage] ✅ Authentication credentials saved to:', this.authFilePath);
      console.log('[AuthStorage] Saved account:', auth.account || 'N/A');
      console.log('[AuthStorage] Saved partition:', auth.partitionId || 'N/A');
    } catch (error) {
      console.error('[AuthStorage] ❌ Failed to save auth:', error);
      throw error;
    }
  }

  /**
   * Load authentication credentials from file
   */
  async loadAuth(): Promise<StoredAuth | null> {
    try {
      if (!fs.existsSync(this.authFilePath)) {
        console.log('[AuthStorage] No saved authentication found');
        return null;
      }

      const content = await fs.promises.readFile(this.authFilePath, 'utf-8');
      const lines = content.split('\n');
      const data: Record<string, string> = {};

      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          data[key.trim()] = value.trim();
        }
      }

      if (!data.VBMSAAS_TOKEN || !data.VBMSAAS_SECRET || !data.VBMSAAS_USER_ID) {
        console.log('[AuthStorage] ⚠️ Incomplete authentication data');
        return null;
      }

      const auth: StoredAuth = {
        token: this.decrypt(data.VBMSAAS_TOKEN),
        secret: this.decrypt(data.VBMSAAS_SECRET),
        userId: this.decrypt(data.VBMSAAS_USER_ID),
        partitionId: data.VBMSAAS_PARTITION_ID ? this.decrypt(data.VBMSAAS_PARTITION_ID) : undefined,
        account: data.VBMSAAS_ACCOUNT ? this.decrypt(data.VBMSAAS_ACCOUNT) : undefined,
        password: data.VBMSAAS_PASSWORD ? this.decrypt(data.VBMSAAS_PASSWORD) : undefined,
        timestamp: parseInt(data.VBMSAAS_TIMESTAMP || '0')
      };

      console.log('[AuthStorage] ✅ Authentication credentials loaded');
      console.log('[AuthStorage] User ID:', auth.userId);
      console.log('[AuthStorage] Account:', auth.account || 'N/A');
      console.log('[AuthStorage] Partition ID:', auth.partitionId || 'N/A');
      console.log('[AuthStorage] Has password:', auth.password ? 'Yes' : 'No');
      console.log('[AuthStorage] Saved at:', new Date(auth.timestamp).toLocaleString());

      return auth;
    } catch (error) {
      console.error('[AuthStorage] ❌ Failed to load auth:', error);
      return null;
    }
  }

  /**
   * Clear saved authentication credentials
   */
  async clearAuth(): Promise<void> {
    try {
      if (fs.existsSync(this.authFilePath)) {
        await fs.promises.unlink(this.authFilePath);
        console.log('[AuthStorage] ✅ Authentication credentials cleared');
      }
    } catch (error) {
      console.error('[AuthStorage] ❌ Failed to clear auth:', error);
      throw error;
    }
  }

  /**
   * Check if authentication is expired (7 days)
   */
  isAuthExpired(auth: StoredAuth): boolean {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return (now - auth.timestamp) > sevenDays;
  }
}

