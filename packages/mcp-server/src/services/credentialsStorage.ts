/**
 * Credentials Storage Service
 * 
 * Handles persistent storage of login credentials (account and password)
 * Stores encrypted credentials in .env.credentials file
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredCredentials {
  account: string;
  password: string;
  partitionId: string;
  platformId?: string;
  roleTag?: string;
}

export class CredentialsStorageService {
  private credentialsFilePath: string;

  constructor() {
    // Store credentials file in the project root directory
    this.credentialsFilePath = path.join(__dirname, '..', '..', '.env.credentials');
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
   * Save login credentials to file
   */
  async saveCredentials(credentials: StoredCredentials): Promise<void> {
    try {
      const data = {
        VBMSAAS_ACCOUNT: this.encrypt(credentials.account),
        VBMSAAS_PASSWORD: this.encrypt(credentials.password),
        VBMSAAS_PARTITION_ID: this.encrypt(credentials.partitionId),
        VBMSAAS_PLATFORM_ID: credentials.platformId ? this.encrypt(credentials.platformId) : '',
        VBMSAAS_ROLE_TAG: credentials.roleTag ? this.encrypt(credentials.roleTag) : ''
      };

      const content = Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      await fs.promises.writeFile(this.credentialsFilePath, content, { 
        encoding: 'utf-8',
        mode: 0o600  // Only owner can read/write
      });

      console.log('[CredentialsStorage] ✅ Login credentials saved to:', this.credentialsFilePath);
      console.log('[CredentialsStorage] Account:', credentials.account);
      console.log('[CredentialsStorage] Partition ID:', credentials.partitionId);
    } catch (error) {
      console.error('[CredentialsStorage] ❌ Failed to save credentials:', error);
      throw error;
    }
  }

  /**
   * Load login credentials from file
   */
  async loadCredentials(): Promise<StoredCredentials | null> {
    try {
      if (!fs.existsSync(this.credentialsFilePath)) {
        console.log('[CredentialsStorage] No saved credentials found');
        return null;
      }

      const content = await fs.promises.readFile(this.credentialsFilePath, 'utf-8');
      const lines = content.split('\n');
      const data: Record<string, string> = {};

      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          data[key.trim()] = value.trim();
        }
      }

      if (!data.VBMSAAS_ACCOUNT || !data.VBMSAAS_PASSWORD || !data.VBMSAAS_PARTITION_ID) {
        console.log('[CredentialsStorage] ⚠️ Incomplete credentials data');
        return null;
      }

      const credentials: StoredCredentials = {
        account: this.decrypt(data.VBMSAAS_ACCOUNT),
        password: this.decrypt(data.VBMSAAS_PASSWORD),
        partitionId: this.decrypt(data.VBMSAAS_PARTITION_ID),
        platformId: data.VBMSAAS_PLATFORM_ID ? this.decrypt(data.VBMSAAS_PLATFORM_ID) : undefined,
        roleTag: data.VBMSAAS_ROLE_TAG ? this.decrypt(data.VBMSAAS_ROLE_TAG) : undefined
      };

      console.log('[CredentialsStorage] ✅ Login credentials loaded');
      console.log('[CredentialsStorage] Account:', credentials.account);
      console.log('[CredentialsStorage] Partition ID:', credentials.partitionId);

      return credentials;
    } catch (error) {
      console.error('[CredentialsStorage] ❌ Failed to load credentials:', error);
      return null;
    }
  }

  /**
   * Clear saved login credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      if (fs.existsSync(this.credentialsFilePath)) {
        await fs.promises.unlink(this.credentialsFilePath);
        console.log('[CredentialsStorage] ✅ Login credentials cleared');
      }
    } catch (error) {
      console.error('[CredentialsStorage] ❌ Failed to clear credentials:', error);
      throw error;
    }
  }

  /**
   * Check if credentials exist
   */
  hasCredentials(): boolean {
    return fs.existsSync(this.credentialsFilePath);
  }
}

