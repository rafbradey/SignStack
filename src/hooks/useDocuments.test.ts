import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocuments, arrayMove } from './useDocuments';
import { destroyPdfDocument, clearPdfCache } from '@/services/pdf';

vi.mock('@/services/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/pdf')>();
  return {
    ...actual,
    destroyPdfDocument: vi.fn(),
    clearPdfCache: vi.fn(),
  };
});

function createMockPdf(name: string, content = '%PDF-1.4 sample'): File {
  return new File([content], name, { type: 'application/pdf' });
}

function createMockNonPdf(name: string, content = 'Plain text'): File {
  return new File([content], name, { type: 'text/plain' });
}

describe('arrayMove', () => {
  it('moves an item forward in an array', () => {
    const list = ['A', 'B', 'C', 'D'];
    expect(arrayMove(list, 0, 2)).toEqual(['B', 'C', 'A', 'D']);
  });

  it('moves an item backward in an array', () => {
    const list = ['A', 'B', 'C', 'D'];
    expect(arrayMove(list, 3, 1)).toEqual(['A', 'D', 'B', 'C']);
  });

  it('returns an identical copy when indices are out of bounds or equal', () => {
    const list = ['A', 'B', 'C'];
    expect(arrayMove(list, -1, 1)).toEqual(['A', 'B', 'C']);
    expect(arrayMove(list, 0, 5)).toEqual(['A', 'B', 'C']);
    expect(arrayMove(list, 1, 1)).toEqual(['A', 'B', 'C']);
  });
});

describe('useDocuments', () => {
  it('initializes with empty state and idle processing flag', () => {
    const { result } = renderHook(() => useDocuments());

    expect(result.current.documents).toEqual([]);
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });

  it('adds valid PDF files and updates documents', async () => {
    const { result } = renderHook(() => useDocuments());

    const file1 = createMockPdf('doc1.pdf');
    const file2 = createMockPdf('doc2.pdf');

    let addResult:
      Awaited<ReturnType<typeof result.current.addFiles>> | undefined;
    await act(async () => {
      addResult = await result.current.addFiles([file1, file2]);
    });

    expect(result.current.documents).toHaveLength(2);
    expect(result.current.documents[0].name).toBe('doc1.pdf');
    expect(result.current.documents[1].name).toBe('doc2.pdf');
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.isProcessing).toBe(false);

    expect(addResult?.added).toHaveLength(2);
    expect(addResult?.errors).toHaveLength(0);
  });

  it('handles empty file input gracefully', async () => {
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      const res = await result.current.addFiles([]);
      expect(res.added).toEqual([]);
      expect(res.errors).toEqual([]);
    });

    expect(result.current.documents).toEqual([]);
    expect(result.current.validationErrors).toEqual([]);
  });

  it('rejects invalid files and populates validationErrors without adding documents', async () => {
    const { result } = renderHook(() => useDocuments());

    const invalidFile = createMockNonPdf('notes.txt');

    await act(async () => {
      const res = await result.current.addFiles([invalidFile]);
      expect(res.added).toHaveLength(0);
      expect(res.errors).toHaveLength(1);
    });

    expect(result.current.documents).toEqual([]);
    expect(result.current.validationErrors).toHaveLength(1);
    expect(result.current.validationErrors[0].code).toBe('INVALID_FILE_TYPE');
    expect(result.current.validationErrors[0].fileName).toBe('notes.txt');
  });

  it('processes mixed batches: adds valid PDFs and captures errors for invalid files', async () => {
    const { result } = renderHook(() => useDocuments());

    const validPdf = createMockPdf('contract.pdf');
    const invalidFile = createMockNonPdf('image.png');
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    const corruptedFile = new File(['NOTAPDF'], 'corrupted.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      const res = await result.current.addFiles([
        validPdf,
        invalidFile,
        emptyFile,
        corruptedFile,
      ]);
      expect(res.added).toHaveLength(1);
      expect(res.errors).toHaveLength(3);
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0].name).toBe('contract.pdf');
    expect(result.current.validationErrors).toHaveLength(3);
    expect(result.current.validationErrors.map((e) => e.fileName)).toEqual([
      'image.png',
      'empty.pdf',
      'corrupted.pdf',
    ]);
  });

  it('disambiguates duplicate filenames within the same batch and across multiple batches', async () => {
    const { result } = renderHook(() => useDocuments());

    // Batch 1: Two files with the same name
    const file1 = createMockPdf('document.pdf');
    const file2 = createMockPdf('document.pdf');

    await act(async () => {
      await result.current.addFiles([file1, file2]);
    });

    expect(result.current.documents).toHaveLength(2);
    expect(result.current.documents[0].name).toBe('document.pdf');
    expect(result.current.documents[1].name).toBe('document (1).pdf');

    // Batch 2: Another file with the same name
    const file3 = createMockPdf('document.pdf');

    await act(async () => {
      await result.current.addFiles([file3]);
    });

    expect(result.current.documents).toHaveLength(3);
    expect(result.current.documents[2].name).toBe('document (2).pdf');
  });

  it('removes a document by id', async () => {
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.addFiles([
        createMockPdf('first.pdf'),
        createMockPdf('second.pdf'),
      ]);
    });

    expect(result.current.documents).toHaveLength(2);
    const idToRemove = result.current.documents[0].id;

    act(() => {
      result.current.removeDocument(idToRemove);
    });

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0].name).toBe('second.pdf');
    expect(destroyPdfDocument).toHaveBeenCalledWith(idToRemove);
  });

  it('reorders documents using start and end indices', async () => {
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.addFiles([
        createMockPdf('a.pdf'),
        createMockPdf('b.pdf'),
        createMockPdf('c.pdf'),
      ]);
    });

    expect(result.current.documents.map((d) => d.name)).toEqual([
      'a.pdf',
      'b.pdf',
      'c.pdf',
    ]);

    act(() => {
      result.current.reorderDocuments(0, 2);
    });

    expect(result.current.documents.map((d) => d.name)).toEqual([
      'b.pdf',
      'c.pdf',
      'a.pdf',
    ]);
  });

  it('moves a document up or down one position', async () => {
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.addFiles([
        createMockPdf('alpha.pdf'),
        createMockPdf('beta.pdf'),
      ]);
    });

    const alphaId = result.current.documents[0].id;
    const betaId = result.current.documents[1].id;

    // Move alpha down
    act(() => {
      result.current.moveDocument(alphaId, 'down');
    });
    expect(result.current.documents.map((d) => d.name)).toEqual([
      'beta.pdf',
      'alpha.pdf',
    ]);

    // Move alpha down again (already at bottom, should be no-op)
    act(() => {
      result.current.moveDocument(alphaId, 'down');
    });
    expect(result.current.documents.map((d) => d.name)).toEqual([
      'beta.pdf',
      'alpha.pdf',
    ]);

    // Move beta up (already at top, should be no-op)
    act(() => {
      result.current.moveDocument(betaId, 'up');
    });
    expect(result.current.documents.map((d) => d.name)).toEqual([
      'beta.pdf',
      'alpha.pdf',
    ]);

    // Move alpha up
    act(() => {
      result.current.moveDocument(alphaId, 'up');
    });
    expect(result.current.documents.map((d) => d.name)).toEqual([
      'alpha.pdf',
      'beta.pdf',
    ]);
  });

  it('clears all documents when clearDocuments is called', async () => {
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.addFiles([createMockPdf('test.pdf')]);
    });

    expect(result.current.documents).toHaveLength(1);

    act(() => {
      result.current.clearDocuments();
    });

    expect(result.current.documents).toEqual([]);
    expect(clearPdfCache).toHaveBeenCalled();
  });

  it('clears and dismisses validation errors', async () => {
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.addFiles([
        createMockNonPdf('err1.txt'),
        createMockNonPdf('err2.txt'),
      ]);
    });

    expect(result.current.validationErrors).toHaveLength(2);

    // Dismiss first error
    act(() => {
      result.current.dismissError(0);
    });
    expect(result.current.validationErrors).toHaveLength(1);
    expect(result.current.validationErrors[0].fileName).toBe('err2.txt');

    // Clear all remaining errors
    act(() => {
      result.current.clearErrors();
    });
    expect(result.current.validationErrors).toEqual([]);
  });
});
