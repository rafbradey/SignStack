import { NormalizedRect } from '@/types';
import { clamp } from './pdfCoordinates';

export type CropHandle = 'nw' | 'ne' | 'se' | 'sw';

export interface ResizeCropOptions {
  /** Initial rectangle before the drag began */
  initialRect: NormalizedRect;
  /** Which handle is being dragged */
  handle: CropHandle;
  /** Normalized horizontal delta (pixel delta / rendered width) */
  deltaX: number;
  /** Normalized vertical delta (pixel delta / rendered height) */
  deltaY: number;
  /** Minimum normalized dimension allowed for width and height (default: 0.05) */
  minSize?: number;
}

/**
 * Calculates a new NormalizedRect when dragging a corner resize handle.
 *
 * Ensures:
 * - Coordinates never exceed [0, 1] page bounds
 * - Width and height never drop below minSize
 * - The rectangle never inverts or flips
 */
export function resizeCropRect({
  initialRect,
  handle,
  deltaX,
  deltaY,
  minSize = 0.05,
}: ResizeCropOptions): NormalizedRect {
  let { x, y, width, height } = initialRect;
  const right = x + width;
  const bottom = y + height;

  switch (handle) {
    case 'se': {
      // Dragging bottom-right: alters width and height
      const targetRight = clamp(right + deltaX, x + minSize, 1);
      const targetBottom = clamp(bottom + deltaY, y + minSize, 1);
      width = targetRight - x;
      height = targetBottom - y;
      break;
    }
    case 'sw': {
      // Dragging bottom-left: alters x, width, and height
      const targetLeft = clamp(x + deltaX, 0, right - minSize);
      const targetBottom = clamp(bottom + deltaY, y + minSize, 1);
      x = targetLeft;
      width = right - targetLeft;
      height = targetBottom - y;
      break;
    }
    case 'ne': {
      // Dragging top-right: alters y, width, and height
      const targetRight = clamp(right + deltaX, x + minSize, 1);
      const targetTop = clamp(y + deltaY, 0, bottom - minSize);
      y = targetTop;
      width = targetRight - x;
      height = bottom - targetTop;
      break;
    }
    case 'nw': {
      // Dragging top-left: alters x, y, width, and height
      const targetLeft = clamp(x + deltaX, 0, right - minSize);
      const targetTop = clamp(y + deltaY, 0, bottom - minSize);
      x = targetLeft;
      y = targetTop;
      width = right - targetLeft;
      height = bottom - targetTop;
      break;
    }
  }

  // Round to 4 decimal places to prevent floating-point precision noise
  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
    width: Math.round(width * 10000) / 10000,
    height: Math.round(height * 10000) / 10000,
  };
}
