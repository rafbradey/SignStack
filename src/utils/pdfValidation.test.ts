import { describe, it, expect } from 'vitest';
import {
  validatePdfFile,
  formatFileSize,
  createUploadedDocument,
  resolveUniqueFilename,
} from './pdfValidation';

describe('formatFileSize', () => {
  it('formats 0 bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats bytes, kilobytes, and megabytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1048576 * 2.5)).toBe('2.5 MB');
  });
});

describe('resolveUniqueFilename', () => {
  it('returns original filename if no collision exists', () => {
    const existing = new Set(['invoice.pdf', 'report.pdf']);
    expect(resolveUniqueFilename('contract.pdf', existing)).toBe(
      'contract.pdf',
    );
  });

  it('appends (1) for a single collision', () => {
    const existing = new Set(['contract.pdf']);
    expect(resolveUniqueFilename('contract.pdf', existing)).toBe(
      'contract (1).pdf',
    );
  });

  it('increments counter sequentially when multiple collisions exist', () => {
    const existing = new Set([
      'contract.pdf',
      'contract (1).pdf',
      'contract (2).pdf',
    ]);
    expect(resolveUniqueFilename('contract.pdf', existing)).toBe(
      'contract (3).pdf',
    );
  });

  it('works when passed an array instead of a Set', () => {
    const existing = ['doc.pdf'];
    expect(resolveUniqueFilename('doc.pdf', existing)).toBe('doc (1).pdf');
  });

  it('preserves file extension with multiple dots', () => {
    const existing = new Set(['archive.backup.pdf']);
    expect(resolveUniqueFilename('archive.backup.pdf', existing)).toBe(
      'archive.backup (1).pdf',
    );
  });

  it('handles filenames without extensions', () => {
    const existing = new Set(['README']);
    expect(resolveUniqueFilename('README', existing)).toBe('README (1)');
  });
});

describe('createUploadedDocument', () => {
  it('creates an UploadedDocument with unique ID and formatted size', () => {
    const file = new File(['%PDF-1.7 dummy content'], 'sample.pdf', {
      type: 'application/pdf',
    });
    const doc = createUploadedDocument(file);

    expect(doc.id).toBeDefined();
    expect(typeof doc.id).toBe('string');
    expect(doc.name).toBe('sample.pdf');
    expect(doc.size).toBe(file.size);
    expect(doc.formattedSize).toBe(formatFileSize(file.size));
    expect(doc.type).toBe('application/pdf');
    expect(doc.file).toBe(file);
    expect(doc.uploadedAt).toBeGreaterThan(0);
  });

  it('uses customName when provided', () => {
    const file = new File(['%PDF-1.7 dummy content'], 'original.pdf', {
      type: 'application/pdf',
    });
    const doc = createUploadedDocument(file, 'original (1).pdf');

    expect(doc.name).toBe('original (1).pdf');
    expect(doc.file.name).toBe('original.pdf');
  });
});

describe('validatePdfFile', () => {
  it('accepts a valid PDF file with standard %PDF- header', async () => {
    const validFile = new File(
      ['%PDF-1.4\n%âãÏÓ\n1 0 obj...'],
      'document.pdf',
      {
        type: 'application/pdf',
      },
    );

    const result = await validatePdfFile(validFile);
    expect(result.valid).toBe(true);
    if (result.valid) {
      // TypeScript type narrowing check
      expect(result).not.toHaveProperty('error');
    }
  });

  it('rejects an empty 0-byte file', async () => {
    const emptyFile = new File([], 'empty.pdf', {
      type: 'application/pdf',
    });

    const result = await validatePdfFile(emptyFile);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe('EMPTY_FILE');
      expect(result.error.fileName).toBe('empty.pdf');
    }
  });

  it('rejects a file with a non-pdf extension', async () => {
    const textFile = new File(['Some text content'], 'notes.txt', {
      type: 'text/plain',
    });

    const result = await validatePdfFile(textFile);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe('INVALID_FILE_TYPE');
      expect(result.error.fileName).toBe('notes.txt');
    }
  });

  it('rejects a renamed non-PDF file lacking %PDF- magic bytes', async () => {
    // File has .pdf extension but binary header is an image or text
    const fakePdf = new File(['GIF89a\x01\x00\x01\x00'], 'malicious.pdf', {
      type: 'application/pdf',
    });

    const result = await validatePdfFile(fakePdf);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe('CORRUPTED_PDF');
      expect(result.error.fileName).toBe('malicious.pdf');
    }
  });

  it('rejects a file exceeding the maximum size limit', async () => {
    // Create a mock large file with a custom 1KB ceiling
    const largeContent = '%PDF-' + 'a'.repeat(2048);
    const largeFile = new File([largeContent], 'heavy.pdf', {
      type: 'application/pdf',
    });

    const result = await validatePdfFile(largeFile, { maxSizeBytes: 1024 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error.code).toBe('FILE_TOO_LARGE');
      expect(result.error.fileName).toBe('heavy.pdf');
    }
  });
});
