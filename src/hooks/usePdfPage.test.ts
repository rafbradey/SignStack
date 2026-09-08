import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePdfPage } from './usePdfPage';
import type { PDFDocumentProxy, PDFPageProxy } from '@/services/pdf';

function createMockPage(pageNumber = 1): PDFPageProxy {
  return {
    pageNumber,
    rotate: 0,
    cleanup: vi.fn(),
    getViewport: vi.fn().mockReturnValue({
      width: 612,
      height: 792,
      scale: 1,
      rotation: 0,
    }),
    render: vi.fn().mockReturnValue({
      promise: Promise.resolve(),
      cancel: vi.fn(),
    }),
  } as unknown as PDFPageProxy;
}

function createMockDoc(pages: PDFPageProxy[] = []): PDFDocumentProxy {
  return {
    numPages: pages.length || 1,
    getPage: vi.fn().mockImplementation((num: number) => {
      const page = pages[num - 1] || createMockPage(num);
      return Promise.resolve(page);
    }),
    cleanup: vi.fn(),
    loadingTask: { destroy: vi.fn() },
  } as unknown as PDFDocumentProxy;
}

describe('usePdfPage hook', () => {
  it('returns initial state when document is null', () => {
    const { result } = renderHook(() =>
      usePdfPage({
        document: null,
        pageNumber: 1,
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.dimensions).toBeNull();
    expect(result.current.viewport).toBeNull();
    expect(result.current.page).toBeNull();
  });

  it('handles invalid pageNumber gracefully', () => {
    const mockDoc = createMockDoc();
    const { result } = renderHook(() =>
      usePdfPage({
        document: mockDoc,
        pageNumber: 99, // out of range
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.dimensions).toBeNull();
  });

  it('fetches page and calculates dimensions for valid document', async () => {
    const mockPage = createMockPage(1);
    const mockDoc = createMockDoc([mockPage]);

    const { result } = renderHook(() =>
      usePdfPage({
        document: mockDoc,
        pageNumber: 1,
        scale: 1.5,
      }),
    );

    await waitFor(() => {
      expect(mockDoc.getPage).toHaveBeenCalledWith(1);
      expect(result.current.dimensions).toEqual({
        width: 612,
        height: 792,
        scale: 1.5,
        rotation: 0,
      });
    });

    expect(result.current.page).toBe(mockPage);
    expect(result.current.error).toBeNull();
  });

  it('handles getPage failure with user-friendly error message', async () => {
    const mockDoc = {
      numPages: 1,
      getPage: vi.fn().mockRejectedValue(new Error('Corrupted page stream')),
    } as unknown as PDFDocumentProxy;

    const { result } = renderHook(() =>
      usePdfPage({
        document: mockDoc,
        pageNumber: 1,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Corrupted page stream');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
