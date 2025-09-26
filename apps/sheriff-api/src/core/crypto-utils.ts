/**
 * Crypto Utilities
 * Functions for hashing and checksumming
 */
import * as crypto from 'crypto';

/**
 * Generates MD5 hash from input string for ID generation.
 *
 * @param input - String to hash
 * @returns Hexadecimal MD5 hash string
 */
export function hashId(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Computes MD5 checksum for content verification.
 *
 * @param content - Content string to checksum
 * @returns Hexadecimal MD5 checksum string
 */
export function computeChecksum(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

