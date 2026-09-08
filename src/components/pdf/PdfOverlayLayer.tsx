import React from 'react';
import type { PDFDocumentProxy } from '@/services/pdf';
import { usePdfPage } from '@/hooks';
import './PdfOverlayLayer.css';

export interface PdfOverlayLayerProps {
  /** The loaded overlay PDFDocumentProxy */
  document: PDFDocumentProxy | null;
  /** Page number of the overlay document to render (1-based index) */
  pageNumber: number;
  /** Zoom scale matching the base document canvas viewport */
  scale?: number;
  /** Opacity of the overlay page [0, 1] (default: 0.75 for visual stacking) */
  opacity?: number;
  /** Optional rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
  /** Position offset relative to base page top-left origin in CSS pixels */
  position?: { x: number; y: number };
  /** Additional CSS class names */
  className?: string;
}

/**
 * Renders an overlay PDF page directly on top of the base PDF document canvas.
 *
 * Positioned absolutely within the parent `.pdf-canvas-wrapper`, allowing the
 * overlay page to track base page scaling and viewport transformations.
 */
export const PdfOverlayLayer: React.FC<PdfOverlayLayerProps> = ({
  document,
  pageNumber,
  scale = 1.0,
  opacity = 0.75,
  rotation,
  position = { x: 0, y: 0 },
  className = '',
}) => {
  const { canvasRef, dimensions } = usePdfPage({
    document,
    pageNumber,
    scale,
    rotation,
  });

  if (!document) {
    return null;
  }

  const widthStyle = dimensions ? `${dimensions.width}px` : undefined;
  const heightStyle = dimensions ? `${dimensions.height}px` : undefined;

  return (
    <div
      className={`pdf-overlay-layer ${className}`.trim()}
      role="region"
      aria-label={`Overlay page ${pageNumber}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        opacity,
        width: widthStyle,
        height: heightStyle,
      }}
    >
      <canvas
        ref={canvasRef}
        className="pdf-overlay-canvas"
        aria-hidden="true"
      />
    </div>
  );
};
