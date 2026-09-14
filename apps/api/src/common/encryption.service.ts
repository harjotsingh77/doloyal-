import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_VERSION_PREFIX = 'v1:';
const KEY_DERIVATION_SALT = 'doloyal-encryption-salt-2024';

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, KEY_DERIVATION_SALT, 32);
}

function parseEncrypted(encryptedText: string): { version: string; iv: Buffer; authTag: Buffer; ciphertext: string } | null {
  if (!encryptedText) return null;
  if (!encryptedText.startsWith(KEY_VERSION_PREFIX)) {
    // Legacy format (no version prefix): iv:authTag:ciphertext
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    return {
      version: 'v0',
      iv: Buffer.from(parts[0], 'hex'),
      authTag: Buffer.from(parts[1], 'hex'),
      ciphertext: parts[2],
    };
  }
  const parts = encryptedText.slice(KEY_VERSION_PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  return {
    version: 'v1',
    iv: Buffer.from(parts[0], 'hex'),
    authTag: Buffer.from(parts[1], 'hex'),
    ciphertext: parts[2],
  };
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly currentKey: Buffer;
  private readonly previousKeys: Buffer[] = [];

  constructor(private readonly config: ConfigService) {
    const primarySecret =
      this.config.get<string>('ENCRYPTION_KEY') || this.config.get<string>('JWT_SECRET');
    if (!primarySecret && process.env.NODE_ENV === 'production') {
      // Encrypting OAuth tokens/API keys under a publicly-known default would
      // be equivalent to storing them in plaintext. Refuse instead.
      this.logger.error('ENCRYPTION_KEY (or JWT_SECRET) must be set in production.');
      throw new Error('ENCRYPTION_KEY must be configured in production');
    }
    const resolvedPrimary = primarySecret || 'doloyal-encryption-key-dev-only';
    this.currentKey = deriveKey(resolvedPrimary);

    // Support key rotation: previous keys can decrypt old data.
    const prevSecrets = this.config.get<string>('ENCRYPTION_PREVIOUS_KEYS');
    if (prevSecrets) {
      for (const secret of prevSecrets.split(',').map(s => s.trim()).filter(Boolean)) {
        this.previousKeys.push(deriveKey(secret));
      }
    }

    // Tokens may have been encrypted under JWT_SECRET or the historical
    // dev default before ENCRYPTION_KEY was introduced. Always try those
    // as fallbacks so reconnect is not required after a key split.
    const migrationSecrets = [
      this.config.get<string>('JWT_SECRET'),
      'doloyal-encryption-key-dev-only',
      'doloyal-jwt-secret-dev',
    ];
    for (const secret of migrationSecrets) {
      if (!secret || secret === resolvedPrimary) continue;
      this.previousKeys.push(deriveKey(secret));
    }
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.currentKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${KEY_VERSION_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parsed = parseEncrypted(encryptedText);
    if (!parsed) {
      throw new Error('Invalid encrypted data format');
    }

    const current = this.tryDecrypt(parsed, this.currentKey);
    if (current !== null) return current;

    // Try previous keys (for rotation)
    for (const key of this.previousKeys) {
      const result = this.tryDecrypt(parsed, key);
      if (result) {
        this.logger.log(`Decrypted using rotated key (version: ${parsed.version})`);
        return result;
      }
    }

    throw new Error('Failed to decrypt: invalid key or corrupted data');
  }

  private tryDecrypt(parsed: ReturnType<typeof parseEncrypted>, key: Buffer): string | null {
    if (!parsed) return null;
    try {
      const decipher = createDecipheriv(ALGORITHM, key, parsed.iv);
      decipher.setAuthTag(parsed.authTag);
      let decrypted = decipher.update(parsed.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  /** Constant-time comparison to prevent timing attacks */
  secureCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
