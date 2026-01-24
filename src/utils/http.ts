import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { ensureDir, remove } from './fs.js';

/**
 * Supported archive formats for HTTP downloads
 */
export type ArchiveFormat = 'tar.gz' | 'tgz' | 'zip' | 'tar';

/**
 * HTTP utilities for downloading and extracting skill archives
 */

/**
 * Custom error class for HTTP download failures
 */
export class HttpDownloadError extends Error {
  public readonly url: string;
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  constructor(url: string, message: string, statusCode?: number, originalError?: Error) {
    super(message);
    this.name = 'HttpDownloadError';
    this.url = url;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

/**
 * Download options
 */
export interface DownloadOptions {
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Download a file from HTTP/HTTPS URL
 *
 * @param url - URL to download from
 * @param destPath - Destination file path
 * @param options - Download options
 */
export async function downloadFile(
  url: string,
  destPath: string,
  options: DownloadOptions = {},
): Promise<void> {
  const { timeout = 60000, headers = {} } = options;

  // Ensure destination directory exists
  ensureDir(path.dirname(destPath));

  try {
    // Use native fetch for HTTP/HTTPS
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'reskill/1.0',
        ...headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new HttpDownloadError(
        url,
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
      );
    }

    // Stream response to file
    const fileStream = fs.createWriteStream(destPath);
    const body = response.body;

    if (!body) {
      throw new HttpDownloadError(url, 'Response body is empty');
    }

    // Convert Web ReadableStream to Node.js Readable
    const { Readable } = await import('node:stream');
    const nodeStream = Readable.fromWeb(body as import('stream/web').ReadableStream);

    await pipeline(nodeStream, fileStream);
  } catch (error) {
    // Clean up partial download
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    if (error instanceof HttpDownloadError) {
      throw error;
    }

    const err = error as Error;
    if (err.name === 'AbortError') {
      throw new HttpDownloadError(url, `Download timeout after ${timeout}ms`);
    }

    throw new HttpDownloadError(url, `Download failed: ${err.message}`, undefined, err);
  }
}

/**
 * Extract an archive to a directory
 *
 * @param archivePath - Path to the archive file
 * @param destDir - Destination directory
 * @param format - Archive format (auto-detected from extension if not provided)
 */
export async function extractArchive(
  archivePath: string,
  destDir: string,
  format?: ArchiveFormat,
): Promise<void> {
  // Auto-detect format from extension
  const detectedFormat = format || detectArchiveFormat(archivePath);

  if (!detectedFormat) {
    throw new Error(`Unable to detect archive format for: ${archivePath}`);
  }

  // Ensure destination directory exists
  ensureDir(destDir);

  switch (detectedFormat) {
    case 'tar.gz':
    case 'tgz':
    case 'tar':
      await extractTar(
        archivePath,
        destDir,
        detectedFormat === 'tar.gz' || detectedFormat === 'tgz',
      );
      break;
    case 'zip':
      await extractZip(archivePath, destDir);
      break;
    default:
      throw new Error(`Unsupported archive format: ${detectedFormat}`);
  }
}

/**
 * Extract tar archive using native tar command
 */
async function extractTar(archivePath: string, destDir: string, gzipped: boolean): Promise<void> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  const flags = gzipped ? '-xzf' : '-xf';

  try {
    // Extract to a temp directory first to handle single-folder archives
    const tempExtractDir = `${destDir}.extract-temp`;
    ensureDir(tempExtractDir);

    await execAsync(`tar ${flags} "${archivePath}" -C "${tempExtractDir}"`, {
      encoding: 'utf-8',
    });

    // Check if archive contains a single root directory
    const extractedItems = fs.readdirSync(tempExtractDir);

    if (extractedItems.length === 1) {
      const singleItem = path.join(tempExtractDir, extractedItems[0]);
      if (fs.statSync(singleItem).isDirectory()) {
        // Move contents of single directory to destination
        const contents = fs.readdirSync(singleItem);
        for (const item of contents) {
          const src = path.join(singleItem, item);
          const dest = path.join(destDir, item);
          fs.renameSync(src, dest);
        }
        remove(tempExtractDir);
        return;
      }
    }

    // Move all items to destination
    for (const item of extractedItems) {
      const src = path.join(tempExtractDir, item);
      const dest = path.join(destDir, item);
      fs.renameSync(src, dest);
    }
    remove(tempExtractDir);
  } catch (error) {
    throw new Error(`Failed to extract tar archive: ${(error as Error).message}`);
  }
}

/**
 * Extract zip archive using native unzip command or Node.js
 */
async function extractZip(archivePath: string, destDir: string): Promise<void> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    // Extract to a temp directory first
    const tempExtractDir = `${destDir}.extract-temp`;
    ensureDir(tempExtractDir);

    // Try using unzip command (available on most systems)
    await execAsync(`unzip -q "${archivePath}" -d "${tempExtractDir}"`, {
      encoding: 'utf-8',
    });

    // Check if archive contains a single root directory
    const extractedItems = fs.readdirSync(tempExtractDir);

    if (extractedItems.length === 1) {
      const singleItem = path.join(tempExtractDir, extractedItems[0]);
      if (fs.statSync(singleItem).isDirectory()) {
        // Move contents of single directory to destination
        const contents = fs.readdirSync(singleItem);
        for (const item of contents) {
          const src = path.join(singleItem, item);
          const dest = path.join(destDir, item);
          fs.renameSync(src, dest);
        }
        remove(tempExtractDir);
        return;
      }
    }

    // Move all items to destination
    for (const item of extractedItems) {
      const src = path.join(tempExtractDir, item);
      const dest = path.join(destDir, item);
      fs.renameSync(src, dest);
    }
    remove(tempExtractDir);
  } catch (error) {
    throw new Error(`Failed to extract zip archive: ${(error as Error).message}`);
  }
}

/**
 * Detect archive format from file path
 */
function detectArchiveFormat(filePath: string): ArchiveFormat | undefined {
  const lower = filePath.toLowerCase();

  if (lower.endsWith('.tar.gz')) return 'tar.gz';
  if (lower.endsWith('.tgz')) return 'tgz';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.tar')) return 'tar';

  return undefined;
}

/**
 * Download and extract an archive in one operation
 *
 * @param url - URL to download from
 * @param destDir - Destination directory for extracted contents
 * @param options - Download options
 * @returns Path to extracted contents
 */
export async function downloadAndExtract(
  url: string,
  destDir: string,
  options: DownloadOptions = {},
): Promise<string> {
  // Determine archive filename from URL
  const urlObj = new URL(url);
  const filename = path.basename(urlObj.pathname);

  // Detect format from original filename before adding .download suffix
  const format = detectArchiveFormat(filename);
  if (!format) {
    throw new Error(`Unable to detect archive format from URL: ${url}`);
  }

  const tempArchive = path.join(destDir, `../${filename}.download`);

  try {
    // Download archive
    await downloadFile(url, tempArchive, options);

    // Extract archive with explicit format
    await extractArchive(tempArchive, destDir, format);

    return destDir;
  } finally {
    // Clean up temp archive
    if (fs.existsSync(tempArchive)) {
      fs.unlinkSync(tempArchive);
    }
  }
}
