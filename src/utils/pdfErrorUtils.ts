/**
 * PDF Engine Error Handling & Normalization Utilities
 *
 * Translates low-level or cryptic PDF.js / browser errors (such as
 * PasswordException, InvalidPDFException, FormatError) into human-readable,
 * actionable error messages for UI alerts.
 */

/**
 * Checks whether an error is an intentional rendering cancellation.
 * (e.g. user rapidly switched pages or zoomed, which is expected and should not alert).
 */
export function isRenderingCancelledError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (
    'name' in error &&
    (error as { name: string }).name === 'RenderingCancelledException'
  );
}

/**
 * Checks whether an error was caused by a password-protected / encrypted PDF.
 */
export function isPasswordProtectedPdfError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object' && 'name' in error) {
    if ((error as { name: string }).name === 'PasswordException') {
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  return (
    message.includes('password') ||
    message.includes('encrypt') ||
    message.includes('security handler')
  );
}

/**
 * Checks whether an error indicates corrupt or malformed PDF structure.
 */
export function isCorruptedPdfError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object' && 'name' in error) {
    const name = (error as { name: string }).name;
    if (name === 'InvalidPDFException' || name === 'FormatError') {
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  return (
    message.includes('invalid pdf') ||
    message.includes('corrupt') ||
    message.includes('bad ffile') ||
    message.includes('xref') ||
    message.includes('trailer') ||
    message.includes('missing endstream') ||
    message.includes('truncated')
  );
}

/**
 * Normalizes low-level engine errors into clear, user-friendly messages.
 *
 * @param error The caught error or exception
 * @param fallback Optional fallback message if no specific pattern matches
 */
export function formatPdfErrorMessage(
  error: unknown,
  fallback = 'Unable to open this PDF. The file may be damaged or in an unsupported format.',
): string {
  if (!error) {
    return fallback;
  }

  if (isPasswordProtectedPdfError(error)) {
    return 'This PDF is password-protected or encrypted. Please remove the password before uploading.';
  }

  if (isCorruptedPdfError(error)) {
    return 'The PDF file appears corrupted, incomplete, or contains malformed data and cannot be opened.';
  }

  if (typeof error === 'object' && 'name' in error) {
    const name = (error as { name: string }).name;
    if (name === 'MissingPDFException') {
      return 'The requested PDF file could not be found or read.';
    }
    if (name === 'UnexpectedResponseException') {
      return 'An unexpected response occurred while loading the PDF file.';
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('out of memory') || msg.includes('canvas memory')) {
      return 'Unable to allocate memory for rendering. The PDF page may be too large for browser memory.';
    }
    if (msg.includes('network') || msg.includes('failed to fetch')) {
      return 'Failed to read the PDF file from browser storage.';
    }

    // If message is clean and not a code stack trace, return it
    if (
      error.message &&
      !error.message.includes('stack') &&
      error.message.length < 150
    ) {
      return error.message;
    }
  }

  return fallback;
}
