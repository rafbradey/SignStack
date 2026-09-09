import { describe, it, expect } from 'vitest';
import {
  formatPdfErrorMessage,
  isRenderingCancelledError,
  isPasswordProtectedPdfError,
  isCorruptedPdfError,
} from './pdfErrorUtils';

describe('pdfErrorUtils', () => {
  describe('isRenderingCancelledError', () => {
    it('returns true for RenderingCancelledException objects', () => {
      expect(
        isRenderingCancelledError({ name: 'RenderingCancelledException' }),
      ).toBe(true);
    });

    it('returns false for other errors or primitives', () => {
      expect(isRenderingCancelledError(new Error('Boom'))).toBe(false);
      expect(isRenderingCancelledError(null)).toBe(false);
      expect(isRenderingCancelledError(undefined)).toBe(false);
      expect(isRenderingCancelledError('RenderingCancelledException')).toBe(false);
    });
  });

  describe('isPasswordProtectedPdfError', () => {
    it('detects PasswordException error name', () => {
      expect(isPasswordProtectedPdfError({ name: 'PasswordException' })).toBe(true);
    });

    it('detects password and encryption keywords in error messages', () => {
      expect(
        isPasswordProtectedPdfError(
          new Error('Password required or incorrect password'),
        ),
      ).toBe(true);
      expect(
        isPasswordProtectedPdfError(new Error('Document is encrypted')),
      ).toBe(true);
      expect(
        isPasswordProtectedPdfError('Unsupported standard security handler'),
      ).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isPasswordProtectedPdfError(new Error('File not found'))).toBe(false);
      expect(isPasswordProtectedPdfError(null)).toBe(false);
    });
  });

  describe('isCorruptedPdfError', () => {
    it('detects InvalidPDFException and FormatError', () => {
      expect(isCorruptedPdfError({ name: 'InvalidPDFException' })).toBe(true);
      expect(isCorruptedPdfError({ name: 'FormatError' })).toBe(true);
    });

    it('detects corruption keywords in error messages', () => {
      expect(isCorruptedPdfError(new Error('Bad Ffile format'))).toBe(true);
      expect(isCorruptedPdfError(new Error('Corrupted xref table'))).toBe(true);
      expect(isCorruptedPdfError(new Error('Missing startxref or trailer'))).toBe(
        true,
      );
      expect(isCorruptedPdfError('File was truncated before endstream')).toBe(
        true,
      );
    });

    it('returns false for unrelated errors', () => {
      expect(isCorruptedPdfError(new Error('Network error'))).toBe(false);
      expect(isCorruptedPdfError(null)).toBe(false);
    });
  });

  describe('formatPdfErrorMessage', () => {
    it('returns user-friendly guidance for password-protected PDFs', () => {
      const err = { name: 'PasswordException', message: 'Password required' };
      const msg = formatPdfErrorMessage(err);
      expect(msg).toContain('password-protected or encrypted');
    });

    it('returns user-friendly guidance for corrupted PDFs', () => {
      const err = { name: 'InvalidPDFException', message: 'Invalid PDF structure' };
      const msg = formatPdfErrorMessage(err);
      expect(msg).toContain('corrupted, incomplete, or contains malformed data');
    });

    it('returns user-friendly guidance for MissingPDFException', () => {
      const err = { name: 'MissingPDFException' };
      const msg = formatPdfErrorMessage(err);
      expect(msg).toBe('The requested PDF file could not be found or read.');
    });

    it('returns user-friendly guidance for memory allocation errors', () => {
      const err = new Error('Canvas memory allocation failed (out of memory)');
      const msg = formatPdfErrorMessage(err);
      expect(msg).toContain('Unable to allocate memory for rendering');
    });

    it('returns custom clean message if not technical stack trace', () => {
      const err = new Error('The document has 0 pages.');
      const msg = formatPdfErrorMessage(err);
      expect(msg).toBe('The document has 0 pages.');
    });

    it('falls back to default or provided fallback for unknown errors', () => {
      expect(formatPdfErrorMessage(null)).toContain('Unable to open this PDF');
      expect(formatPdfErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });
  });
});
