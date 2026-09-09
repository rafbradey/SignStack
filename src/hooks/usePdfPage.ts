import { useState, useEffect, useRef } from 'react';
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  PageViewport,
  RenderTask,
} from '@/services/pdf';
import { PageDimensions } from '@/types';
import { formatPdfErrorMessage, isRenderingCancelledError } from '@/utils';

export interface UsePdfPageOptions {
  /** The loaded PDFDocumentProxy, or null if not yet loaded */
  document: PDFDocumentProxy | null;
  /** 1-based page number to render */
  pageNumber: number;
  /** Zoom scale (e.g. 1.0 = 100%) */
  scale?: number;
  /** Optional rotation override in degrees (0, 90, 180, 270) */
  rotation?: number;
}

export interface UsePdfPageReturn {
  /** Ref to bind to the HTML <canvas> element */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Whether the page is currently being loaded or rendered */
  isLoading: boolean;
  /** Human-readable error message if rendering failed */
  error: string | null;
  /** Dimensions of the rendered page in CSS pixels */
  dimensions: PageDimensions | null;
  /** Active PDF.js PageViewport for coordinate calculations */
  viewport: PageViewport | null;
  /** Raw PDFPageProxy instance */
  page: PDFPageProxy | null;
}

interface RenderedPageState {
  isLoading: boolean;
  error: string | null;
  dimensions: PageDimensions | null;
  viewport: PageViewport | null;
  page: PDFPageProxy | null;
}

const INITIAL_PAGE_STATE: RenderedPageState = {
  isLoading: false,
  error: null,
  dimensions: null,
  viewport: null,
  page: null,
};

/**
 * Custom React hook for rendering a PDF page onto an HTML <canvas>.
 *
 * Responsibilities:
 * - Fetches the page proxy from the document
 * - Computes viewport dimensions for the requested scale/rotation
 * - Handles High-DPI (devicePixelRatio) scaling for crisp output
 * - Cancels ongoing render tasks on rapid page/zoom changes to prevent tearing
 * - Manages loading and error states
 */
export function usePdfPage({
  document,
  pageNumber,
  scale = 1.0,
  rotation,
}: UsePdfPageOptions): UsePdfPageReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pageState, setPageState] =
    useState<RenderedPageState>(INITIAL_PAGE_STATE);

  // Store active render task to cancel when dependencies change
  const activeRenderTaskRef = useRef<RenderTask | null>(null);
  const activePageRef = useRef<PDFPageProxy | null>(null);

  const isValidPage = Boolean(
    document && pageNumber >= 1 && pageNumber <= document.numPages,
  );

  useEffect(() => {
    let isCancelled = false;

    if (!isValidPage || !document) {
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // Expected cancellation
        }
        activeRenderTaskRef.current = null;
      }
      if (activePageRef.current) {
        activePageRef.current.cleanup();
        activePageRef.current = null;
      }
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
      return;
    }

    async function renderPage() {
      // Cancel previous in-flight render task if any
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // Expected cancellation
        }
        activeRenderTaskRef.current = null;
      }

      // Cleanup previous page proxy if switching pages
      if (activePageRef.current) {
        activePageRef.current.cleanup();
        activePageRef.current = null;
      }

      setPageState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const pageProxy = await document!.getPage(pageNumber);
        if (isCancelled) {
          pageProxy.cleanup();
          return;
        }

        activePageRef.current = pageProxy;

        const pageRotation =
          rotation !== undefined ? rotation : pageProxy.rotate;
        const pageViewport = pageProxy.getViewport({
          scale,
          rotation: pageRotation,
        });

        if (isCancelled) return;

        const pageDims: PageDimensions = {
          width: pageViewport.width,
          height: pageViewport.height,
          scale,
          rotation: pageRotation,
        };

        const canvas = canvasRef.current;
        const context = canvas?.getContext?.('2d') ?? null;

        // In environments without 2D canvas context (e.g. jsdom testing), record dimensions and finish
        if (!canvas || !context) {
          setPageState({
            isLoading: false,
            error: null,
            dimensions: pageDims,
            viewport: pageViewport,
            page: pageProxy,
          });
          return;
        }

        // Support high-DPI displays (Retina/4K)
        const dpr =
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(pageViewport.width * dpr);
        canvas.height = Math.floor(pageViewport.height * dpr);
        canvas.style.width = `${Math.floor(pageViewport.width)}px`;
        canvas.style.height = `${Math.floor(pageViewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;

        const renderTask = pageProxy.render({
          canvas,
          canvasContext: context,
          viewport: pageViewport,
          transform,
        });

        activeRenderTaskRef.current = renderTask;

        await renderTask.promise;

        if (!isCancelled) {
          activeRenderTaskRef.current = null;
          setPageState({
            isLoading: false,
            error: null,
            dimensions: pageDims,
            viewport: pageViewport,
            page: pageProxy,
          });
        }
      } catch (err: unknown) {
        if (isCancelled) return;

        // Ignore intentional cancellations
        if (!isRenderingCancelledError(err)) {
          const message = formatPdfErrorMessage(
            err,
            'Failed to render PDF page.',
          );
          setPageState((prev) => ({
            ...prev,
            isLoading: false,
            error: message,
          }));
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // Expected cancellation
        }
        activeRenderTaskRef.current = null;
      }
      if (activePageRef.current) {
        activePageRef.current.cleanup();
        activePageRef.current = null;
      }
    };
  }, [document, pageNumber, scale, rotation, isValidPage]);

  // Release GPU canvas backing store buffer when hook unmounts completely
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, []);

  // When invalid, derive null state without triggering cascading render effect
  if (!isValidPage) {
    return {
      canvasRef,
      isLoading: false,
      error: null,
      dimensions: null,
      viewport: null,
      page: null,
    };
  }

  return {
    canvasRef,
    isLoading: pageState.isLoading,
    error: pageState.error,
    dimensions: pageState.dimensions,
    viewport: pageState.viewport,
    page: pageState.page,
  };
}
