import React, { useRef, useState, useCallback, useEffect } from 'react';
import { NormalizedRect } from '@/types';
import { resizeCropRect, moveCropRect, CropHandle } from '@/utils';
import './CropSelectionBox.css';

export interface CropSelectionBoxProps {
  /** Normalized crop rectangle in range [0, 1] relative to overlay page */
  cropRect: NormalizedRect;
  /** Callback invoked when the user resizes or moves the crop region */
  onChange?: (cropRect: NormalizedRect) => void;
  /** Whether crop editing handles and outline are active */
  isEditing?: boolean;
  /** Additional CSS class names */
  className?: string;
}

interface ResizeDragState {
  handle: CropHandle;
  startX: number;
  startY: number;
  initialRect: NormalizedRect;
  containerWidth: number;
  containerHeight: number;
  pointerId: number;
}

interface MoveDragState {
  startX: number;
  startY: number;
  initialRect: NormalizedRect;
  containerWidth: number;
  containerHeight: number;
  pointerId: number;
}

/**
 * Visual crop selection frame rendered on top of an overlay PDF page.
 *
 * Displays:
 * - High-contrast selection boundary highlighting the cropped region
 * - Interactive corner resize handles (NW, NE, SE, SW)
 * - Draggable body for translating/moving the crop region across the page
 * - Semi-transparent scrim mask indicating portions outside the crop
 * - Dimension percentage badge
 */
export const CropSelectionBox = React.memo<CropSelectionBoxProps>(function CropSelectionBox({
  cropRect,
  onChange,
  isEditing = true,
  className = '',
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeDragStateRef = useRef<ResizeDragState | null>(null);
  const moveDragStateRef = useRef<MoveDragState | null>(null);
  const resizeRafIdRef = useRef<number | null>(null);
  const pendingResizeRectRef = useRef<NormalizedRect | null>(null);
  const moveRafIdRef = useRef<number | null>(null);
  const pendingMoveRectRef = useRef<NormalizedRect | null>(null);
  const [activeHandle, setActiveHandle] = useState<CropHandle | null>(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);

  useEffect(() => {
    return () => {
      if (resizeRafIdRef.current !== null) {
        cancelAnimationFrame(resizeRafIdRef.current);
      }
      if (moveRafIdRef.current !== null) {
        cancelAnimationFrame(moveRafIdRef.current);
      }
    };
  }, []);

  const left = `${Math.round(cropRect.x * 10000) / 100}%`;
  const top = `${Math.round(cropRect.y * 10000) / 100}%`;
  const width = `${Math.round(cropRect.width * 10000) / 100}%`;
  const height = `${Math.round(cropRect.height * 10000) / 100}%`;

  const widthPct = Math.round(cropRect.width * 100);
  const heightPct = Math.round(cropRect.height * 100);

  // --------------------------------------------------------------------------
  // Resize interaction handlers
  // --------------------------------------------------------------------------
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>, handle: CropHandle) => {
      if (!isEditing) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback for environments where setPointerCapture may not be available
      }

      resizeDragStateRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        initialRect: cropRect,
        containerWidth: rect.width,
        containerHeight: rect.height,
        pointerId: e.pointerId,
      };

      setActiveHandle(handle);
    },
    [cropRect, isEditing],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const state = resizeDragStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;

      const deltaX = (e.clientX - state.startX) / state.containerWidth;
      const deltaY = (e.clientY - state.startY) / state.containerHeight;

      const nextRect = resizeCropRect({
        initialRect: state.initialRect,
        handle: state.handle,
        deltaX,
        deltaY,
      });

      pendingResizeRectRef.current = nextRect;

      if (resizeRafIdRef.current === null) {
        resizeRafIdRef.current = requestAnimationFrame(() => {
          resizeRafIdRef.current = null;
          if (pendingResizeRectRef.current && onChange) {
            onChange(pendingResizeRectRef.current);
          }
        });
      }
    },
    [onChange],
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const state = resizeDragStateRef.current;
      if (state && state.pointerId === e.pointerId) {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // Safe fallback
          }
        }
        resizeDragStateRef.current = null;
        setActiveHandle(null);

        if (resizeRafIdRef.current !== null) {
          cancelAnimationFrame(resizeRafIdRef.current);
          resizeRafIdRef.current = null;
        }

        if (pendingResizeRectRef.current && onChange) {
          onChange(pendingResizeRectRef.current);
          pendingResizeRectRef.current = null;
        }
      }
    },
    [onChange],
  );

  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>, handle: CropHandle) => {
      if (!isEditing || !onChange) return;

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
      const nextRect = resizeCropRect({
        initialRect: cropRect,
        handle,
        deltaX,
        deltaY,
      });

      onChange(nextRect);
    },
    [cropRect, isEditing, onChange],
  );

  // --------------------------------------------------------------------------
  // Move interaction handlers
  // --------------------------------------------------------------------------
  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isEditing) return;
      if (e.target !== e.currentTarget) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }

      moveDragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialRect: cropRect,
        containerWidth: rect.width,
        containerHeight: rect.height,
        pointerId: e.pointerId,
      };

      setIsDraggingBox(true);
    },
    [cropRect, isEditing],
  );

  const handleBoxPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = moveDragStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;

      const deltaX = (e.clientX - state.startX) / state.containerWidth;
      const deltaY = (e.clientY - state.startY) / state.containerHeight;

      const nextRect = moveCropRect({
        initialRect: state.initialRect,
        deltaX,
        deltaY,
      });

      pendingMoveRectRef.current = nextRect;

      if (moveRafIdRef.current === null) {
        moveRafIdRef.current = requestAnimationFrame(() => {
          moveRafIdRef.current = null;
          if (pendingMoveRectRef.current && onChange) {
            onChange(pendingMoveRectRef.current);
          }
        });
      }
    },
    [onChange],
  );

  const handleBoxPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = moveDragStateRef.current;
      if (state && state.pointerId === e.pointerId) {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // Safe fallback
          }
        }
        moveDragStateRef.current = null;
        setIsDraggingBox(false);

        if (moveRafIdRef.current !== null) {
          cancelAnimationFrame(moveRafIdRef.current);
          moveRafIdRef.current = null;
        }

        if (pendingMoveRectRef.current && onChange) {
          onChange(pendingMoveRectRef.current);
          pendingMoveRectRef.current = null;
        }
      }
    },
    [onChange],
  );

  const handleBoxKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditing || !onChange) return;
      if (e.target !== e.currentTarget) return;

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
      const nextRect = moveCropRect({
        initialRect: cropRect,
        deltaX,
        deltaY,
      });

      onChange(nextRect);
    },
    [cropRect, isEditing, onChange],
  );

  return (
    <div
      ref={containerRef}
      className={`crop-selection-container ${className}`.trim()}
    >
      <div
        className={`crop-selection-box ${isEditing ? 'is-editing' : ''} ${isDraggingBox ? 'is-dragging' : ''}`.trim()}
        role="region"
        tabIndex={isEditing ? 0 : -1}
        aria-label={`Crop selection: ${widthPct}% × ${heightPct}%`}
        aria-roledescription="movable crop box"
        style={{
          left,
          top,
          width,
          height,
        }}
        onPointerDown={handleBoxPointerDown}
        onPointerMove={handleBoxPointerMove}
        onPointerUp={handleBoxPointerUp}
        onPointerCancel={handleBoxPointerUp}
        onKeyDown={handleBoxKeyDown}
      >
        {/* Corner accent resize handles */}
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop top-left handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-nw ${activeHandle === 'nw' ? 'is-active' : ''}`}
          onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          onKeyDown={(e) => handleResizeKeyDown(e, 'nw')}
        />
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop top-right handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-ne ${activeHandle === 'ne' ? 'is-active' : ''}`}
          onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          onKeyDown={(e) => handleResizeKeyDown(e, 'ne')}
        />
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop bottom-right handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-se ${activeHandle === 'se' ? 'is-active' : ''}`}
          onPointerDown={(e) => handleResizePointerDown(e, 'se')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          onKeyDown={(e) => handleResizeKeyDown(e, 'se')}
        />
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop bottom-left handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-sw ${activeHandle === 'sw' ? 'is-active' : ''}`}
          onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          onKeyDown={(e) => handleResizeKeyDown(e, 'sw')}
        />

        {/* Center label badge */}
        <span className="crop-box-badge">{`${widthPct}% × ${heightPct}%`}</span>
      </div>
    </div>
  );
});

CropSelectionBox.displayName = 'CropSelectionBox';
