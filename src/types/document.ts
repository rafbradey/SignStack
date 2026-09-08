/**
 * Document Domain Types for SignStack
 *
 * Represents uploaded PDF documents and validation results in client memory.
 * Privacy-first: The underlying browser `File` is maintained in-memory
 * and never sent over the network.
 */

export interface UploadedDocument {
  /** Unique stable document identifier (UUID v4) */
  id: string;
  /** The native browser File reference stored in client memory */
  file: File;
  /** Original file name (e.g. "Contract_Final.pdf") */
  name: string;
  /** File size in bytes */
  size: number;
  /** Human-readable formatted size (e.g. "1.2 MB") */
  formattedSize: string;
  /** MIME type reported by the browser (e.g. "application/pdf") */
  type: string;
  /** Client upload timestamp in milliseconds */
  uploadedAt: number;
  /** Optional page count, populated in Phase 4 when parsed by PDF engine */
  pageCount?: number;
}

export type ValidationErrorCode =
  'EMPTY_FILE' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'CORRUPTED_PDF';

export interface ValidationError {
  /** Structured machine-readable error code */
  code: ValidationErrorCode;
  /** User-friendly error message suitable for UI display */
  message: string;
  /** File name associated with the validation error */
  fileName: string;
}

export interface ValidationSuccess {
  valid: true;
}

export interface ValidationFailure {
  valid: false;
  error: ValidationError;
}

/**
 * Discriminated union for validation results.
 * When `result.valid` is false, TypeScript guarantees `result.error` is present.
 */
export type ValidationResult = ValidationSuccess | ValidationFailure;

export interface PdfValidationOptions {
  /** Maximum allowable file size in bytes (default: 50 MB) */
  maxSizeBytes?: number;
}
