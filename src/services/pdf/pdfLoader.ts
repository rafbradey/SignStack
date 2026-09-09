import { pdfjsLib, PDFDocumentProxy } from './pdfConfig';
import { formatPdfErrorMessage } from '@/utils/pdfErrorUtils';

/**
 * In-memory cache of parsed PDF documents keyed by document identifier.
 *
 * Prevents redundant file reading and parsing when switching pages
 * or rendering the same document in multiple workspace panes.
 */
const documentCache = new Map<string, PDFDocumentProxy>();

/**
 * Loads a PDF document from a browser `File` object.
 *
 * If a `docId` is provided and the document has already been loaded,
 * the cached `PDFDocumentProxy` is returned immediately.
 *
 * @param file The browser File to load
 * @param docId Optional stable document ID for caching
 * @returns Promise resolving to the PDFDocumentProxy
 */
export async function loadPdfDocument(
  file: File,
  docId?: string,
): Promise<PDFDocumentProxy> {
  if (docId && documentCache.has(docId)) {
    return documentCache.get(docId)!;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  let pdfDoc: PDFDocumentProxy;
  try {
    pdfDoc = await loadingTask.promise;
  } catch (error) {
    const friendlyMessage = formatPdfErrorMessage(
      error,
      `Failed to load PDF document "${file.name}". The file may be damaged or invalid.`,
    );
    throw new Error(friendlyMessage, { cause: error });
  }

  if (docId) {
    documentCache.set(docId, pdfDoc);
  }

  return pdfDoc;
}

/**
 * Retrieves a previously loaded PDF document from the in-memory cache.
 */
export function getCachedPdfDocument(
  docId: string,
): PDFDocumentProxy | undefined {
  return documentCache.get(docId);
}

/**
 * Cleans up and destroys a cached PDF document proxy, releasing worker and canvas resources.
 */
export async function destroyPdfDocument(docId: string): Promise<void> {
  const doc = documentCache.get(docId);
  if (doc) {
    documentCache.delete(docId);
    try {
      await doc.cleanup();
      await doc.loadingTask?.destroy();
    } catch {
      // Ignore errors during destruction
    }
  }
}

/**
 * Clears and destroys all cached PDF documents in memory.
 */
export async function clearPdfCache(): Promise<void> {
  const docs = Array.from(documentCache.values());
  documentCache.clear();
  await Promise.all(
    docs.map(async (doc) => {
      try {
        await doc.cleanup();
        await doc.loadingTask?.destroy();
      } catch {
        // Ignore errors during destruction
      }
    }),
  );
}

/**
 * Helper to inspect the total page count of a PDF file.
 */
export async function getPdfPageCount(
  file: File,
  docId?: string,
): Promise<number> {
  const doc = await loadPdfDocument(file, docId);
  return doc.numPages;
}
