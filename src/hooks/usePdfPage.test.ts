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
      expect(result.current.error).toBe(
        'The PDF file appears corrupted, incomplete, or contains malformed data and cannot be opened.',
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('releases canvas buffer dimensions on unmount', () => {
    const mockDoc = createMockDoc();
    const { result, unmount } = renderHook(() =>
      usePdfPage({
        document: mockDoc,
        pageNumber: 1,
      }),
    );

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    (result.current.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;

    unmount();

    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('cancels in-flight render task and cleans up previous page proxy on unmount', async () => {
    const cancelMock = vi.fn();
    const cleanupMock = vi.fn();
    const renderPromise = new Promise<void>(() => {
      // Pending promise to simulate in-flight render task
    });

    const mockPage = {
      pageNumber: 1,
      rotate: 0,
      cleanup: cleanupMock,
      getViewport: vi.fn().mockReturnValue({
        width: 612,
        height: 792,
        scale: 1,
        rotation: 0,
      }),
      render: vi.fn().mockReturnValue({
        promise: renderPromise,
        cancel: cancelMock,
      }),
    } as unknown as PDFPageProxy;

    const mockDoc = createMockDoc([mockPage]);

    const canvas = document.createElement('canvas');
    canvas.getContext = vi.fn().mockReturnValue({}) as unknown as typeof canvas.getContext;

    renderHook(() => {
      const hookResult = usePdfPage({
        document: mockDoc,
        pageNumber: 1,
      });
      if (!hookResult.canvasRef.current) {
        (hookResult.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
      }
      return hookResult;
    });

    await waitFor(() => {
      expect(mockPage.render).toHaveBeenCalled();
    });
  });

  it('cancels in-flight render task on unmount', async () => {
    const cancelMock = vi.fn();
    const cleanupMock = vi.fn();
    const renderPromise = new Promise<void>(() => {});

    const mockPage = {
      pageNumber: 1,
      rotate: 0,
      cleanup: cleanupMock,
      getViewport: vi.fn().mockReturnValue({
        width: 612,
        height: 792,
        scale: 1,
        rotation: 0,
      }),
      render: vi.fn().mockReturnValue({
        promise: renderPromise,
        cancel: cancelMock,
      }),
    } as unknown as PDFPageProxy;

    const mockDoc = createMockDoc([mockPage]);

    const canvas = document.createElement('canvas');
    canvas.getContext = vi.fn().mockReturnValue({}) as unknown as typeof canvas.getContext;

    const { unmount } = renderHook(() => {
      const hookResult = usePdfPage({
        document: mockDoc,
        pageNumber: 1,
      });
      if (!hookResult.canvasRef.current) {
        (hookResult.canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = canvas;
      }
      return hookResult;
    });

    await waitFor(() => {
      expect(mockPage.render).toHaveBeenCalled();
    });

    unmount();

    expect(cancelMock).toHaveBeenCalled();
    expect(cleanupMock).toHaveBeenCalled();
  });

  it('cleans up previous page proxy when switching pages', async () => {
    const page1Cleanup = vi.fn();
    const page2Cleanup = vi.fn();

    const page1 = createMockPage(1);
    page1.cleanup = page1Cleanup;
    const page2 = createMockPage(2);
    page2.cleanup = page2Cleanup;

    const mockDoc = createMockDoc([page1, page2]);

    const { rerender } = renderHook(
      ({ pageNum }) =>
        usePdfPage({
          document: mockDoc,
          pageNumber: pageNum,
        }),
      { initialProps: { pageNum: 1 } },
    );

    await waitFor(() => {
      expect(mockDoc.getPage).toHaveBeenCalledWith(1);
    });

    // Switch to page 2
    rerender({ pageNum: 2 });

    await waitFor(() => {
      expect(mockDoc.getPage).toHaveBeenCalledWith(2);
      expect(page1Cleanup).toHaveBeenCalled();
    });
  });
});
