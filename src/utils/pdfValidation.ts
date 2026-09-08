import {
  UploadedDocument,
  ValidationResult,
  PdfValidationOptions,
} from '@/types';

/** Default maximum PDF file size: 50 MB */
export const DEFAULT_MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

/** PDF standard header magic bytes: %PDF- */
const PDF_MAGIC_BYTES = '%PDF-';

/**
 * Formats a byte count into a human-readable string (e.g., "1.4 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / Math.pow(1024, index);
  // Single decimal place for KB and MB, no decimals for bytes
  const formatted = index === 0 ? Math.round(value) : value.toFixed(1);

  return `${formatted} ${units[index]}`;
}

/**
 * Creates an `UploadedDocument` domain object from a validated browser `File`.
 */
export function createUploadedDocument(file: File): UploadedDocument {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    formattedSize: formatFileSize(file.size),
    type: file.type || 'application/pdf',
    uploadedAt: Date.now(),
  };
}

/**
 * Pure asynchronous validator for PDF files in client-side browser memory.
 *
 * Validates:
 * 1. Non-empty file (size > 0)
 * 2. File size ceiling (memory guardrail)
 * 3. File extension (.pdf)
 * 4. Binary magic header inspection (%PDF-)
 */
export async function validatePdfFile(
  file: File,
  options?: PdfValidationOptions,
): Promise<ValidationResult> {
  const maxSize = options?.maxSizeBytes ?? DEFAULT_MAX_PDF_SIZE_BYTES;

  // 1. Empty file verification
  if (file.size === 0) {
    return {
      valid: false,
      error: {
        code: 'EMPTY_FILE',
        message: 'The file is empty (0 bytes).',
        fileName: file.name,
      },
    };
  }

  // 2. File size ceiling (memory guardrail)
  if (file.size > maxSize) {
    return {
      valid: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${formatFileSize(maxSize)}.`,
        fileName: file.name,
      },
    };
  }

  // 3. Extension verification (.pdf)
  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfExtension) {
    return {
      valid: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF documents (.pdf) are supported.',
        fileName: file.name,
      },
    };
  }

  // 4. Binary magic bytes header inspection (%PDF-)
  try {
    const slice = file.slice(0, 5);
    const buffer = await slice.arrayBuffer();
    const header = new TextDecoder('ascii').decode(buffer);

    if (!header.startsWith(PDF_MAGIC_BYTES)) {
      return {
        valid: false,
        error: {
          code: 'CORRUPTED_PDF',
          message:
            'File does not have a valid PDF header (%PDF-). It may be corrupted or a renamed non-PDF file.',
          fileName: file.name,
        },
      };
    }
  } catch {
    return {
      valid: false,
      error: {
        code: 'CORRUPTED_PDF',
        message:
          'Unable to read file contents. The file may be corrupted or inaccessible.',
        fileName: file.name,
      },
    };
  }

  return { valid: true };
}
