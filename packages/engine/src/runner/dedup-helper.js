/**
 * Artifact SHA-256 Deduplication & Storage Manager
 * 
 * Computes SHA-256 cryptographic hashes for downloaded invoices/files,
 * guarantees zero duplicates, and handles safe local target storage.
 * 
 * Zero external dependencies — uses Node.js crypto, fs, and path.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compute SHA-256 hash of a buffer, string, or file path
 * @param {Buffer|string} input 
 * @returns {string} Hexadecimal SHA-256 checksum
 */
function computeSha256(input) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(input)) {
    hash.update(input);
  } else if (typeof input === 'string') {
    if (fs.existsSync(input)) {
      const stat = fs.statSync(input);
      if (stat.isFile()) {
        const fileBuffer = fs.readFileSync(input);
        hash.update(fileBuffer);
        return hash.digest('hex');
      }
    }
    hash.update(input, 'utf8');
  } else {
    throw new TypeError('Expected Buffer or string for computeSha256');
  }
  return hash.digest('hex');
}

/**
 * Compute SHA-256 hash and size of an existing file
 * @param {string} filePath 
 * @returns {{ hash: string, sizeBytes: number }}
 */
function getFileChecksum(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const stat = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  return {
    hash,
    sizeBytes: stat.size,
  };
}

class ArtifactTracker {
  /**
   * @param {Object} [options]
   * @param {Iterable<string>} [options.existingHashes] - Initial set of previously known SHA-256 hashes
   */
  constructor(options = {}) {
    this.seenHashes = new Set(options.existingHashes || []);
  }

  /**
   * Check if hash is already known
   * @param {string} hash 
   * @returns {boolean}
   */
  hasHash(hash) {
    return this.seenHashes.has(hash);
  }

  /**
   * Record a hash in the tracker
   * @param {string} hash 
   */
  recordHash(hash) {
    if (hash) {
      this.seenHashes.add(hash);
    }
  }

  /**
   * Clear all tracked hashes
   */
  clear() {
    this.seenHashes.clear();
  }

  /**
   * Process a downloaded file, deduplicate against seen hashes, and save to target folder.
   * Zero duplicates guarantee: returns isDuplicate = true if hash already exists in this run.
   * 
   * @param {string} sourcePath - Path to source downloaded file
   * @param {string} targetDir - Target destination directory
   * @param {string} [customName] - Optional custom filename
   * @returns {{ isDuplicate: boolean, hash: string, sizeBytes: number, targetPath: string, fileName: string }}
   */
  processAndSaveArtifact(sourcePath, targetDir, customName = null) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    const { hash, sizeBytes } = getFileChecksum(sourcePath);
    const baseName = customName || path.basename(sourcePath);

    // Duplicate detection: check if this SHA-256 hash was already processed
    if (this.seenHashes.has(hash)) {
      return {
        isDuplicate: true,
        hash,
        sizeBytes,
        targetPath: sourcePath,
        fileName: baseName,
      };
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let targetPath = path.join(targetDir, baseName);

    // Handle filename collision with a different file hash
    if (fs.existsSync(targetPath)) {
      const existing = getFileChecksum(targetPath);
      if (existing.hash === hash) {
        // Exact same file already at destination
        this.seenHashes.add(hash);
        return {
          isDuplicate: false,
          hash,
          sizeBytes,
          targetPath,
          fileName: path.basename(targetPath),
        };
      } else {
        // Name collision with different content: add short hash suffix to filename
        const ext = path.extname(baseName);
        const nameWithoutExt = path.basename(baseName, ext);
        const uniqueName = `${nameWithoutExt}_${hash.substring(0, 8)}${ext}`;
        targetPath = path.join(targetDir, uniqueName);
      }
    }

    // Copy file to target location
    fs.copyFileSync(sourcePath, targetPath);
    this.seenHashes.add(hash);

    return {
      isDuplicate: false,
      hash,
      sizeBytes,
      targetPath,
      fileName: path.basename(targetPath),
    };
  }

  /**
   * Scan a directory for completed downloaded files (ignoring temporary files)
   * @param {string} dirPath 
   * @returns {Array<{ filePath: string, fileName: string, hash: string, sizeBytes: number }>}
   */
  scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    const entries = fs.readdirSync(dirPath);
    const results = [];

    for (const entry of entries) {
      // Ignore Chrome download in-progress temp files
      if (entry.endsWith('.crdownload') || entry.endsWith('.tmp') || entry.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(dirPath, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const { hash, sizeBytes } = getFileChecksum(fullPath);
          results.push({
            filePath: fullPath,
            fileName: entry,
            hash,
            sizeBytes,
          });
        }
      } catch {
        // Ignore unreadable or transient files
      }
    }

    return results;
  }
}

module.exports = {
  computeSha256,
  getFileChecksum,
  ArtifactTracker,
};
