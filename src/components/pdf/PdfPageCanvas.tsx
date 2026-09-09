import React from 'react';
import type { PDFDocumentProxy } from '@/services/pdf';
import { usePdfPage } from '@/hooks';
import { Spinner, Alert } from '@/components/ui';
import { PageDimensions } from '@/types';
import './PdfPageCanvas.css';

export interface PdfPageCanvasProps {
  /** The loaded PDFDocumentProxy (or null if loading/not available) */
  document: PDFDocumentProxy | null;
  /** Page number to render (1-based index) */
  pageNumber: number;
  /** Zoom scale (e.g. 1.0 = 100%) */
  scale?: number;
  /** Optional accessible label override for the canvas container */
  ariaLabel?: string;
  /** Optional rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
  /** Additional CSS class names */
  className?: string;
  /** Callback fired when the rendered page dimensions or viewport change */
  onDimensionsChange?: (dimensions: PageDimensions) => void;
  /** Child layers to render over the PDF page (e.g. overlay canvas, crop boxes) */
  children?: React.ReactNode;
}

/**
 * Presentational component that renders a single PDF page to an HTML <canvas>.
 *
 * Driven by the `usePdfPage` hook:
 * - High-DPI rendering support
 * - Automatic cancellation of ongoing renders on page/zoom change
 * - Loading indicator during rasterization
 * - Graceful error display if page rendering fails
 */
export const PdfPageCanvas = React.memo<PdfPageCanvasProps>(function PdfPageCanvas({
  document,
  pageNumber,
  scale = 1.0,
  rotation,
  ariaLabel,
  className = '',
  onDimensionsChange,
  children,
}) {
  const { canvasRef, isLoading, error, dimensions } = usePdfPage({
    document,
    pageNumber,
    scale,
    rotation,
  });

  // Notify parent if dimensions change
  React.useEffect(() => {
    if (dimensions && onDimensionsChange) {
      onDimensionsChange(dimensions);
    }
  }, [dimensions, onDimensionsChange]);

  const widthStyle = dimensions ? `${dimensions.width}px` : undefined;
  const heightStyle = dimensions ? `${dimensions.height}px` : undefined;

  return (
    <div
      className={`pdf-canvas-wrapper ${className}`.trim()}
      role="region"
      aria-label={ariaLabel ?? `PDF page ${pageNumber}`}
      style={{
        width: widthStyle,
        height: heightStyle,
        minWidth: widthStyle,
        minHeight: heightStyle,
      }}
    >
      <canvas ref={canvasRef} className="pdf-page-canvas" aria-hidden="true" />

      {/* Overlaid layers (e.g. overlay PDF page canvas) */}
      {children}

      {/* Loading overlay during page fetch or rasterization */}
      {isLoading && (
        <div className="pdf-canvas-loading-overlay">
          <Spinner size="md" label={`Rendering page ${pageNumber}...`} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="pdf-canvas-error-overlay">
          <Alert variant="danger" title="Page Rendering Error">
            {error}
          </Alert>
        </div>
      )}
    </div>
  );
});

PdfPageCanvas.displayName = 'PdfPageCanvas';
