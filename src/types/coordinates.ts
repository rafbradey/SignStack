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

/**
 * Configuration and transform state for placing an overlay PDF page onto a base document.
 */
export interface OverlayConfig {
  /**
   * Normalized position offset (origin top-left of base document) in range [0, 1].
   * Zoom-independent: at any zoom level, the position remains fixed relative to the base page.
   */
  position: {
    x: number;
    y: number;
  };
  /**
   * Scale factor multiplier of the overlay relative to the base document (1.0 = 100%).
   */
  scale: number;
  /**
   * Opacity level of the overlay [0, 1]. 0 = completely transparent, 1 = fully opaque.
   */
  opacity: number;
  /**
   * Page rotation in degrees (0, 90, 180, 270).
   */
  rotation: number;
}

/**
 * Overlay instance associated with a specific Main Document page.
 *
 * Represents: Main Document + Main Page + Overlay Document + Overlay Page + Overlay Properties.
 */
export interface PageOverlay {
  /** Unique stable identifier for this overlay instance */
  id: string;
  /** Destination document ID */
  mainDocumentId: string;
  /** Destination 1-based page number */
  mainPageNumber: number;
  /** Source overlay document ID */
  overlayDocumentId: string;
  /** Source overlay 1-based page number */
  overlayPageNumber: number;
  /** Normalized top-left position [0, 1] relative to base document page */
  position: {
    x: number;
    y: number;
  };
  /** Scale factor multiplier (1.0 = 100%) */
  scale: number;
  /** Opacity [0, 1] (default: 0.75) */
  opacity: number;
  /** Page rotation in degrees (0, 90, 180, 270) */
  rotation: number;
  /** Optional crop region in normalized coordinates [0, 1] relative to overlay page */
  cropRect?: NormalizedRect;
}

