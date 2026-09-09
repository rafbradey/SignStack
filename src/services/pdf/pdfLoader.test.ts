import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPdfDocument,
  getCachedPdfDocument,
  destroyPdfDocument,
  clearPdfCache,
  getPdfPageCount,
  getDocumentCacheSize,
  MAX_DOCUMENT_CACHE_SIZE,
} from './pdfLoader';
import { pdfjsLib, PDFDocumentProxy } from './pdfConfig';

// Mock pdfjsLib.getDocument
vi.mock('./pdfConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pdfConfig')>();
  return {
    ...actual,
    pdfjsLib: {
      ...actual.pdfjsLib,
      getDocument: vi.fn(),
    },
  };
});

function createMockPdfDocument(numPages = 3): PDFDocumentProxy {
  return {
    numPages,
    cleanup: vi.fn().mockResolvedValue(undefined),
    loadingTask: {
      destroy: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as PDFDocumentProxy;
}

type LoadingTaskReturn = ReturnType<typeof pdfjsLib.getDocument>;

describe('pdfLoader service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearPdfCache();
  });

  it('loads and caches a PDF document when docId is provided', async () => {
    const mockDoc = createMockPdfDocument(5);
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(mockDoc),
    } as unknown as LoadingTaskReturn);

    const file = new File(['%PDF-1.4 sample content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const doc1 = await loadPdfDocument(file, 'doc-123');
    expect(doc1).toBe(mockDoc);
    expect(pdfjsLib.getDocument).toHaveBeenCalledTimes(1);

    // Second call with same docId returns cached instance without re-calling getDocument
    const doc2 = await loadPdfDocument(file, 'doc-123');
    expect(doc2).toBe(mockDoc);
    expect(pdfjsLib.getDocument).toHaveBeenCalledTimes(1);

    expect(getCachedPdfDocument('doc-123')).toBe(mockDoc);
  });

  it('destroys and evicts cached document', async () => {
    const mockDoc = createMockPdfDocument(2);
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(mockDoc),
    } as unknown as LoadingTaskReturn);

    const file = new File(['%PDF-1.4'], 'test.pdf', {
      type: 'application/pdf',
    });

    await loadPdfDocument(file, 'doc-to-destroy');
    expect(getCachedPdfDocument('doc-to-destroy')).toBeDefined();

    await destroyPdfDocument('doc-to-destroy');
    expect(mockDoc.cleanup).toHaveBeenCalled();
    expect(mockDoc.loadingTask.destroy).toHaveBeenCalled();
    expect(getCachedPdfDocument('doc-to-destroy')).toBeUndefined();
  });

  it('clears all cached documents on clearPdfCache', async () => {
    const docA = createMockPdfDocument(1);
    const docB = createMockPdfDocument(4);

    vi.mocked(pdfjsLib.getDocument)
      .mockReturnValueOnce({
        promise: Promise.resolve(docA),
      } as unknown as LoadingTaskReturn)
      .mockReturnValueOnce({
        promise: Promise.resolve(docB),
      } as unknown as LoadingTaskReturn);

    const file = new File(['%PDF-1.4'], 'doc.pdf', {
      type: 'application/pdf',
    });

    await loadPdfDocument(file, 'a');
    await loadPdfDocument(file, 'b');

    expect(getCachedPdfDocument('a')).toBe(docA);
    expect(getCachedPdfDocument('b')).toBe(docB);

    await clearPdfCache();

    expect(docA.cleanup).toHaveBeenCalled();
    expect(docB.cleanup).toHaveBeenCalled();
    expect(getCachedPdfDocument('a')).toBeUndefined();
    expect(getCachedPdfDocument('b')).toBeUndefined();
    expect(getDocumentCacheSize()).toBe(0);
  });

  it('evicts the least recently used document when exceeding MAX_DOCUMENT_CACHE_SIZE', async () => {
    // Load MAX_DOCUMENT_CACHE_SIZE documents
    const docs: PDFDocumentProxy[] = [];
    for (let i = 0; i < MAX_DOCUMENT_CACHE_SIZE; i++) {
      const mockDoc = createMockPdfDocument(i + 1);
      docs.push(mockDoc);
      vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
        promise: Promise.resolve(mockDoc),
      } as unknown as LoadingTaskReturn);

      const file = new File(['%PDF-1.4'], `doc-${i}.pdf`, { type: 'application/pdf' });
      await loadPdfDocument(file, `doc-${i}`);
    }

    expect(getDocumentCacheSize()).toBe(MAX_DOCUMENT_CACHE_SIZE);
    expect(getCachedPdfDocument('doc-0')).toBe(docs[0]);

    // Access doc-0 to mark it recently used (now doc-1 is the oldest)
    getCachedPdfDocument('doc-0');

    // Add 11th document
    const eleventhDoc = createMockPdfDocument(11);
    vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
      promise: Promise.resolve(eleventhDoc),
    } as unknown as LoadingTaskReturn);

    const file11 = new File(['%PDF-1.4'], 'doc-10.pdf', { type: 'application/pdf' });
    await loadPdfDocument(file11, 'doc-10');

    // Total size should stay at MAX_DOCUMENT_CACHE_SIZE
    expect(getDocumentCacheSize()).toBe(MAX_DOCUMENT_CACHE_SIZE);
    // doc-1 should have been evicted and cleaned up
    expect(docs[1].cleanup).toHaveBeenCalled();
    expect(getCachedPdfDocument('doc-1')).toBeUndefined();
    // doc-0 and doc-10 should still be cached
    expect(getCachedPdfDocument('doc-0')).toBe(docs[0]);
    expect(getCachedPdfDocument('doc-10')).toBe(eleventhDoc);
  });

  it('getPdfPageCount returns the document page count', async () => {
    const mockDoc = createMockPdfDocument(7);
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve(mockDoc),
    } as unknown as LoadingTaskReturn);

    const file = new File(['%PDF-1.4'], 'multipage.pdf', {
      type: 'application/pdf',
    });

    const count = await getPdfPageCount(file, 'page-count-test');
    expect(count).toBe(7);
  });

  it('normalizes password-protected PDF errors with actionable guidance', async () => {
    const passwordError = {
      name: 'PasswordException',
      message: 'Password required',
    };
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.reject(passwordError),
    } as unknown as LoadingTaskReturn);

    const file = new File(['%PDF-1.4 encrypted'], 'locked.pdf', {
      type: 'application/pdf',
    });

    await expect(loadPdfDocument(file, 'locked-doc')).rejects.toThrow(
      'This PDF is password-protected or encrypted. Please remove the password before uploading.',
    );
  });

  it('normalizes corrupted PDF structure errors with friendly guidance', async () => {
    const corruptError = {
      name: 'InvalidPDFException',
      message: 'Corrupted xref table',
    };
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.reject(corruptError),
    } as unknown as LoadingTaskReturn);

    const file = new File(['%PDF-1.4 broken'], 'broken.pdf', {
      type: 'application/pdf',
    });

    await expect(loadPdfDocument(file, 'broken-doc')).rejects.toThrow(
      'The PDF file appears corrupted, incomplete, or contains malformed data and cannot be opened.',
    );
  });
});
