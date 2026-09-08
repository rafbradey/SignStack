import React from 'react';
import type { PDFDocumentProxy } from '@/services/pdf';
import { usePdfPage } from '@/hooks';
import { NormalizedRect } from '@/types';
import { CropSelectionBox } from './CropSelectionBox';
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
  /** Optional normalized crop rectangle [0, 1] relative to overlay page */
  cropRect?: NormalizedRect;
  /** Whether the user is actively adjusting/viewing crop mode */
  isCropping?: boolean;
  /** Callback invoked when crop rectangle is resized */
  onCropChange?: (cropRect: NormalizedRect) => void;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Renders an overlay PDF page directly on top of the base PDF document canvas.
 *
 * Positioned absolutely within the parent `.pdf-canvas-wrapper`, allowing the
 * overlay page to track base page scaling and viewport transformations.
 * Supports optional rectangular crop regions and interactive crop framing.
 */
export const PdfOverlayLayer: React.FC<PdfOverlayLayerProps> = ({
  document,
  pageNumber,
  scale = 1.0,
  opacity = 0.75,
  rotation,
  position = { x: 0, y: 0 },
  cropRect,
  isCropping = false,
  onCropChange,
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

  // Clip the rendered overlay when cropRect is present and not in interactive crop editing mode
  const formatPct = (val: number) => `${Math.round(val * 10000) / 100}%`;
  const clipPathStyle =
    cropRect && !isCropping
      ? `inset(${formatPct(cropRect.y)} ${formatPct(1 - (cropRect.x + cropRect.width))} ${formatPct(1 - (cropRect.y + cropRect.height))} ${formatPct(cropRect.x)})`
      : undefined;

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
        clipPath: clipPathStyle,
      }}
    >
      <canvas
        ref={canvasRef}
        className="pdf-overlay-canvas"
        aria-hidden="true"
      />

      {/* Render visual crop frame during active crop mode */}
      {cropRect && isCropping && (
        <CropSelectionBox
          cropRect={cropRect}
          isEditing={true}
          onChange={onCropChange}
        />
      )}
    </div>
  );
};

