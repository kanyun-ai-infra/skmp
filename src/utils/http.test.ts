import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpDownloadError } from './http.js';

describe('HttpDownloadError', () => {
  it('should create error with URL', () => {
    const error = new HttpDownloadError('https://example.com/file.tar.gz', 'Download failed');

    expect(error.name).toBe('HttpDownloadError');
    expect(error.url).toBe('https://example.com/file.tar.gz');
    expect(error.message).toBe('Download failed');
    expect(error.statusCode).toBeUndefined();
  });

  it('should create error with status code', () => {
    const error = new HttpDownloadError(
      'https://example.com/file.tar.gz',
      'HTTP 404: Not Found',
      404,
    );

    expect(error.statusCode).toBe(404);
  });

  it('should create error with original error', () => {
    const originalError = new Error('Network error');
    const error = new HttpDownloadError(
      'https://example.com/file.tar.gz',
      'Download failed',
      undefined,
      originalError,
    );

    expect(error.originalError).toBe(originalError);
  });
});

describe('HTTP utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reskill-http-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('downloadFile', () => {
    it('should throw HttpDownloadError for invalid URL', async () => {
      const { downloadFile } = await import('./http.js');
      const destPath = path.join(tempDir, 'test.tar.gz');

      await expect(downloadFile('https://invalid-host-that-does-not-exist.test/file.tar.gz', destPath))
        .rejects
        .toThrow(HttpDownloadError);
    });
  });

  describe('extractArchive', () => {
    it('should throw error for unsupported format', async () => {
      const { extractArchive } = await import('./http.js');
      const archivePath = path.join(tempDir, 'test.unknown');
      const destDir = path.join(tempDir, 'extracted');

      fs.writeFileSync(archivePath, 'test content');

      await expect(extractArchive(archivePath, destDir))
        .rejects
        .toThrow('Unable to detect archive format');
    });
  });
});
