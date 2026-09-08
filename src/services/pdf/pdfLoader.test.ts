import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPdfDocument,
  getCachedPdfDocument,
  destroyPdfDocument,
  clearPdfCache,
  getPdfPageCount,
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
});
