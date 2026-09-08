import React, { useRef, useState, useCallback } from 'react';
import { NormalizedRect } from '@/types';
import { resizeCropRect, CropHandle } from '@/utils';
import './CropSelectionBox.css';

export interface CropSelectionBoxProps {
  /** Normalized crop rectangle in range [0, 1] relative to overlay page */
  cropRect: NormalizedRect;
  /** Callback invoked when the user resizes the crop region */
  onChange?: (cropRect: NormalizedRect) => void;
  /** Whether crop editing handles and outline are active */
  isEditing?: boolean;
  /** Additional CSS class names */
  className?: string;
}

interface DragState {
  handle: CropHandle;
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
 * - Semi-transparent scrim mask indicating portions outside the crop
 * - Dimension percentage badge
 */
export const CropSelectionBox: React.FC<CropSelectionBoxProps> = ({
  cropRect,
  onChange,
  isEditing = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [activeHandle, setActiveHandle] = useState<CropHandle | null>(null);

  const left = `${Math.round(cropRect.x * 10000) / 100}%`;
  const top = `${Math.round(cropRect.y * 10000) / 100}%`;
  const width = `${Math.round(cropRect.width * 10000) / 100}%`;
  const height = `${Math.round(cropRect.height * 10000) / 100}%`;

  const widthPct = Math.round(cropRect.width * 100);
  const heightPct = Math.round(cropRect.height * 100);

  const handlePointerDown = useCallback(
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

      dragStateRef.current = {
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

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;

      const deltaX = (e.clientX - state.startX) / state.containerWidth;
      const deltaY = (e.clientY - state.startY) / state.containerHeight;

      const nextRect = resizeCropRect({
        initialRect: state.initialRect,
        handle: state.handle,
        deltaX,
        deltaY,
      });

      onChange?.(nextRect);
    },
    [onChange],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
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
      setActiveHandle(null);
    }
  }, []);

  const handleKeyDown = useCallback(
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

  return (
    <div
      ref={containerRef}
      className={`crop-selection-container ${className}`.trim()}
    >
      <div
        className={`crop-selection-box ${isEditing ? 'is-editing' : ''}`}
        role="region"
        aria-label={`Crop selection: ${widthPct}% × ${heightPct}%`}
        style={{
          left,
          top,
          width,
          height,
        }}
      >
        {/* Corner accent resize handles */}
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop top-left handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-nw ${activeHandle === 'nw' ? 'is-active' : ''}`}
          onPointerDown={(e) => handlePointerDown(e, 'nw')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'nw')}
        />
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop top-right handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-ne ${activeHandle === 'ne' ? 'is-active' : ''}`}
          onPointerDown={(e) => handlePointerDown(e, 'ne')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'ne')}
        />
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop bottom-right handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-se ${activeHandle === 'se' ? 'is-active' : ''}`}
          onPointerDown={(e) => handlePointerDown(e, 'se')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'se')}
        />
        <span
          role="button"
          tabIndex={isEditing ? 0 : -1}
          aria-label="Resize crop bottom-left handle"
          aria-roledescription="resize handle"
          className={`crop-handle crop-handle-sw ${activeHandle === 'sw' ? 'is-active' : ''}`}
          onPointerDown={(e) => handlePointerDown(e, 'sw')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => handleKeyDown(e, 'sw')}
        />

        {/* Center label badge */}
        <span className="crop-box-badge">{`${widthPct}% × ${heightPct}%`}</span>
      </div>
    </div>
  );
};
