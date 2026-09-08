import React, { useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from '@/services/pdf';
import { usePdfPage } from '@/hooks';
import { NormalizedRect } from '@/types';
import { calculateUpdatedOverlayPosition } from '@/utils';
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
  /** Normalized top-left position [0, 1] relative to base document page */
  normalizedPosition?: { x: number; y: number };
  /** Rendered dimensions of the base document page canvas */
  baseDimensions?: { width: number; height: number };
  /** Callback invoked when overlay is repositioned */
  onPositionChange?: (pos: { x: number; y: number }) => void;
  /** Whether the overlay is draggable across the base document */
  isDraggable?: boolean;
  /** Whether this overlay is the currently active/selected overlay */
  isSelected?: boolean;
  /** Optional normalized crop rectangle [0, 1] relative to overlay page */
  cropRect?: NormalizedRect;
  /** Whether the user is actively adjusting/viewing crop mode */
  isCropping?: boolean;
  /** Callback invoked when crop rectangle is resized */
  onCropChange?: (cropRect: NormalizedRect) => void;
  /** Callback invoked when user requests deletion via Delete/Backspace */
  onDelete?: () => void;
  /** Additional CSS class names */
  className?: string;
}

interface DragState {
  startX: number;
  startY: number;
  initialNormPos: { x: number; y: number };
  pointerId: number;
}

/**
 * Renders an overlay PDF page directly on top of the base PDF document canvas.
 *
 * Positioned absolutely within the parent `.pdf-canvas-wrapper`, allowing the
 * overlay page to track base page scaling and viewport transformations.
 * Supports interactive dragging and positioning across the base page,
 * optional rectangular crop regions, and interactive crop framing.
 */
export const PdfOverlayLayer: React.FC<PdfOverlayLayerProps> = ({
  document,
  pageNumber,
  scale = 1.0,
  opacity = 0.75,
  rotation,
  position = { x: 0, y: 0 },
  normalizedPosition = { x: 0, y: 0 },
  baseDimensions,
  onPositionChange,
  isDraggable = true,
  isSelected = false,
  cropRect,
  isCropping = false,
  onCropChange,
  onDelete,
  className = '',
}) => {
  const { canvasRef, dimensions } = usePdfPage({
    document,
    pageNumber,
    scale,
    rotation,
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);

  const canDrag = isDraggable && !isCropping && Boolean(onPositionChange);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canDrag) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialNormPos: normalizedPosition,
        pointerId: e.pointerId,
      };

      setIsDragging(true);
    },
    [canDrag, normalizedPosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== e.pointerId || !baseDimensions) return;
      if (baseDimensions.width <= 0 || baseDimensions.height <= 0) return;

      const deltaX = (e.clientX - state.startX) / baseDimensions.width;
      const deltaY = (e.clientY - state.startY) / baseDimensions.height;

      const newPos = calculateUpdatedOverlayPosition({
        initialPosition: state.initialNormPos,
        deltaX,
        deltaY,
        overlayBounds: dimensions ?? undefined,
        baseBounds: baseDimensions,
      });

      onPositionChange?.(newPos);
    },
    [baseDimensions, dimensions, onPositionChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (state && state.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Safe fallback
        }
      }
      dragStateRef.current = null;
      setIsDragging(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete && !isCropping) {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
        return;
      }

      if (!canDrag || !onPositionChange) return;

      const step = e.shiftKey ? 0.05 : 0.01;
      let deltaX = 0;
      let deltaY = 0;

      switch (e.key) {
        case 'ArrowLeft':
          deltaX = -step;
          break;
        case 'ArrowRight':
          deltaX = step;
          break;
        case 'ArrowUp':
          deltaY = -step;
          break;
        case 'ArrowDown':
          deltaY = step;
          break;
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();

      const newPos = calculateUpdatedOverlayPosition({
        initialPosition: normalizedPosition,
        deltaX,
        deltaY,
        overlayBounds: dimensions ?? undefined,
        baseBounds: baseDimensions,
      });

      onPositionChange(newPos);
    },
    [baseDimensions, canDrag, dimensions, isCropping, normalizedPosition, onDelete, onPositionChange],
  );

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

  const posX = Math.round(normalizedPosition.x * 100);
  const posY = Math.round(normalizedPosition.y * 100);

  return (
    <div
      className={`pdf-overlay-layer ${canDrag ? 'is-draggable' : ''} ${isDragging ? 'is-dragging' : ''} ${isSelected ? 'is-selected' : ''} ${className}`.trim()}
      role="region"
      tabIndex={canDrag ? 0 : -1}
      aria-label={`Overlay page ${pageNumber}`}
      aria-roledescription={canDrag ? 'draggable overlay' : undefined}
      aria-description={canDrag ? `Position: ${posX}%, ${posY}%` : undefined}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        opacity,
        width: widthStyle,
        height: heightStyle,
        clipPath: clipPathStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
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
