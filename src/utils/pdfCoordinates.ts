import { Rect, NormalizedRect, PdfPoint, PdfRect } from '@/types';
import type { PageViewport } from '@/services/pdf/pdfConfig';

/**
 * Clamps a numeric value between a minimum and maximum bound.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts a pixel rectangle (CSS or canvas pixels) into a normalized rectangle
 * where all coordinates and dimensions are proportions between 0 and 1.
 *
 * All values are clamped to ensure they stay within [0, 1].
 *
 * @param rect Pixel rectangle (origin top-left)
 * @param bounds Container or viewport dimensions (width and height)
 */
export function normalizeRect(
  rect: Rect,
  bounds: { width: number; height: number },
): NormalizedRect {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const clampedX = clamp(rect.x, 0, bounds.width);
  const clampedY = clamp(rect.y, 0, bounds.height);
  const maxWidth = bounds.width - clampedX;
  const maxHeight = bounds.height - clampedY;

  const clampedWidth = clamp(rect.width, 0, maxWidth);
  const clampedHeight = clamp(rect.height, 0, maxHeight);

  return {
    x: clampedX / bounds.width,
    y: clampedY / bounds.height,
    width: clampedWidth / bounds.width,
    height: clampedHeight / bounds.height,
  };
}

/**
 * Converts a normalized rectangle [0, 1] back into pixel dimensions
 * relative to the provided bounds.
 *
 * @param normRect Normalized rectangle [0, 1]
 * @param bounds Container or viewport dimensions (width and height)
 */
export function denormalizeRect(
  normRect: NormalizedRect,
  bounds: { width: number; height: number },
): Rect {
  const x = clamp(normRect.x, 0, 1) * bounds.width;
  const y = clamp(normRect.y, 0, 1) * bounds.height;
  const width = clamp(normRect.width, 0, 1 - normRect.x) * bounds.width;
  const height = clamp(normRect.height, 0, 1 - normRect.y) * bounds.height;

  return { x, y, width, height };
}

/**
 * Converts a 2D point from rendered viewport coordinates (CSS pixels, top-left origin)
 * into standard PDF points (72 DPI, bottom-left origin).
 */
export function viewportPointToPdfPoint(
  point: { x: number; y: number },
  viewport: PageViewport,
): PdfPoint {
  const [pdfX, pdfY] = viewport.convertToPdfPoint(point.x, point.y);
  return { x: pdfX, y: pdfY };
}

/**
 * Converts a 2D point from standard PDF points (72 DPI, bottom-left origin)
 * into rendered viewport coordinates (CSS pixels, top-left origin).
 */
export function pdfPointToViewportPoint(
  point: PdfPoint,
  viewport: PageViewport,
): { x: number; y: number } {
  const [viewX, viewY] = viewport.convertToViewportPoint(point.x, point.y);
  return { x: viewX, y: viewY };
}

/**
 * Converts a rectangle in viewport space (top-left origin, CSS px)
 * to standard PDF point space (bottom-left origin, 72 pt).
 *
 * Properly handles page rotation and orientation inversion.
 */
export function viewportRectToPdfRect(
  rect: Rect,
  viewport: PageViewport,
): PdfRect {
  const [p1x, p1y] = viewport.convertToPdfPoint(rect.x, rect.y);
  const [p2x, p2y] = viewport.convertToPdfPoint(
    rect.x + rect.width,
    rect.y + rect.height,
  );

  const minX = Math.min(p1x, p2x);
  const minY = Math.min(p1y, p2y);
  const width = Math.abs(p1x - p2x);
  const height = Math.abs(p1y - p2y);

  return {
    x: minX,
    y: minY,
    width,
    height,
  };
}

/**
 * Converts a rectangle in PDF point space (bottom-left origin, 72 pt)
 * to rendered viewport space (top-left origin, CSS px).
 */
export function pdfRectToViewportRect(
  pdfRect: PdfRect,
  viewport: PageViewport,
): Rect {
  // Top-left in PDF coordinate space is (x, y + height)
  const [p1x, p1y] = viewport.convertToViewportPoint(
    pdfRect.x,
    pdfRect.y + pdfRect.height,
  );
  // Bottom-right in PDF coordinate space is (x + width, y)
  const [p2x, p2y] = viewport.convertToViewportPoint(
    pdfRect.x + pdfRect.width,
    pdfRect.y,
  );

  const minX = Math.min(p1x, p2x);
  const minY = Math.min(p1y, p2y);
  const width = Math.abs(p1x - p2x);
  const height = Math.abs(p1y - p2y);

  return {
    x: minX,
    y: minY,
    width,
    height,
  };
}

/**
 * Calculates rendered CSS pixel offset for an overlay page based on normalized
 * [0, 1] position and current rendered base page viewport bounds.
 *
 * Zoom-independent: scales linearly with viewport width and height.
 */
export function calculateOverlayViewportPosition(
  normPos: { x: number; y: number },
  baseBounds: { width: number; height: number },
): { x: number; y: number } {
  const clampedX = clamp(normPos.x, 0, 1);
  const clampedY = clamp(normPos.y, 0, 1);

  return {
    x: Math.round(clampedX * baseBounds.width),
    y: Math.round(clampedY * baseBounds.height),
  };
}

/**
 * Calculates the bounding box of an overlay page in standard PDF point space (72 DPI, bottom-left origin)
 * relative to the base document page dimensions.
 *
 * Converts top-left normalized browser coordinates to PDF standard coordinates:
 * - PDF X: proportional from left edge
 * - PDF Y: transformed from top-left browser origin to bottom-left PDF origin
 *
 * @param normPos Normalized position of overlay top-left [0, 1] relative to base page
 * @param overlayScale Scale multiplier for the overlay (1.0 = 100%)
 * @param basePdfSize Base document page size in PDF points (72 DPI)
 * @param overlayPdfSize Overlay document page size in PDF points (72 DPI)
 */
export function calculateOverlayPdfBounds(
  normPos: { x: number; y: number },
  overlayScale: number,
  basePdfSize: { width: number; height: number },
  overlayPdfSize: { width: number; height: number },
): PdfRect {
  const scaledWidth = overlayPdfSize.width * overlayScale;
  const scaledHeight = overlayPdfSize.height * overlayScale;

  const pdfX = clamp(normPos.x, 0, 1) * basePdfSize.width;
  // Browser Y: 0 is top; PDF Y: 0 is bottom.
  // PDF bottom-left Y = baseHeight - (topOffset) - overlayHeight
  const topOffset = clamp(normPos.y, 0, 1) * basePdfSize.height;
  const pdfY = basePdfSize.height - topOffset - scaledHeight;

  return {
    x: pdfX,
    y: pdfY,
    width: scaledWidth,
    height: scaledHeight,
  };
}
