/**
 * Coordinate and Geometry Types for SignStack
 *
 * Provides domain models for 2D rectangles, normalized coordinates,
 * PDF points (72 DPI, bottom-left origin), and viewport dimensions.
 */

/**
 * Rectangular region in 2D pixel space (e.g. CSS pixels or canvas pixels).
 * Origin (0, 0) is top-left.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Normalized rectangular region where all values are proportions between 0 and 1.
 * Zoom-independent and scale-independent.
 * Origin (0, 0) is top-left.
 */
export interface NormalizedRect {
  /** Horizontal position as a proportion of page width [0, 1] */
  x: number;
  /** Vertical position as a proportion of page height [0, 1] */
  y: number;
  /** Width as a proportion of page width [0, 1] */
  width: number;
  /** Height as a proportion of page height [0, 1] */
  height: number;
}

/**
 * Point in standard PDF point space (72 points per inch).
 * Standard PDF origin (0, 0) is bottom-left.
 */
export interface PdfPoint {
  x: number;
  y: number;
}

/**
 * Rectangular region in standard PDF point space (72 points per inch).
 * Standard PDF origin (0, 0) is bottom-left.
 */
export interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Dimensions and transformation metrics for a rendered PDF page viewport.
 */
export interface PageDimensions {
  /** Viewport width in CSS pixels at the rendered scale */
  width: number;
  /** Viewport height in CSS pixels at the rendered scale */
  height: number;
  /** Current zoom/scale factor applied (e.g. 1.0 = 100%) */
  scale: number;
  /** Page rotation in degrees (0, 90, 180, 270) */
  rotation: number;
}
