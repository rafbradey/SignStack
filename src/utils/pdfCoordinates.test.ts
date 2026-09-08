import { describe, it, expect } from 'vitest';
import {
  clamp,
  normalizeRect,
  denormalizeRect,
  viewportPointToPdfPoint,
  pdfPointToViewportPoint,
  viewportRectToPdfRect,
  pdfRectToViewportRect,
  calculateOverlayViewportPosition,
  calculateOverlayPdfBounds,
  calculateUpdatedOverlayPosition,
} from './pdfCoordinates';
import type { PageViewport } from '@/services/pdf';

/**
 * Creates a mock PageViewport for unit testing coordinate transformations.
 * Simulates a standard 612 x 792 pt (US Letter) page at 1.0 scale (72 DPI).
 *
 * In standard PDF (unrotated):
 * Viewport (0, 0) top-left -> PDF (0, 792) top-left
 * Viewport (612, 792) bottom-right -> PDF (612, 0) bottom-right
 */
function createMockViewport(
  width = 612,
  height = 792,
  scale = 1.0,
  rotation = 0,
): PageViewport {
  return {
    width: width * scale,
    height: height * scale,
    scale,
    rotation,
    convertToPdfPoint: (x: number, y: number) => {
      // Top-left in viewport (0, 0) maps to (0, height) in PDF
      const pdfX = x / scale;
      const pdfY = height - y / scale;
      return [pdfX, pdfY];
    },
    convertToViewportPoint: (x: number, y: number) => {
      // (0, height) in PDF maps to (0, 0) in viewport
      const viewX = x * scale;
      const viewY = (height - y) * scale;
      return [viewX, viewY];
    },
  } as unknown as PageViewport;
}

describe('pdfCoordinates utilities', () => {
  describe('clamp', () => {
    it('returns value when within bounds', () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it('clamps to min when value is smaller', () => {
      expect(clamp(-10, 0, 100)).toBe(0);
    });

    it('clamps to max when value is larger', () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });

  describe('normalizeRect', () => {
    it('normalizes pixel coordinates to [0, 1] relative to bounds', () => {
      const rect = { x: 100, y: 200, width: 300, height: 400 };
      const bounds = { width: 1000, height: 1000 };

      const normalized = normalizeRect(rect, bounds);
      expect(normalized).toEqual({
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      });
    });

    it('clamps rect when position is negative or exceeds bounds', () => {
      const rect = { x: -50, y: -20, width: 800, height: 900 };
      const bounds = { width: 500, height: 500 };

      const normalized = normalizeRect(rect, bounds);
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
      expect(normalized.width).toBe(1);
      expect(normalized.height).toBe(1);
    });

    it('handles zero or negative bounds safely', () => {
      const rect = { x: 10, y: 10, width: 100, height: 100 };
      expect(normalizeRect(rect, { width: 0, height: 0 })).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    });
  });

  describe('denormalizeRect', () => {
    it('scales normalized coordinates back to pixel dimensions', () => {
      const normRect = { x: 0.25, y: 0.5, width: 0.5, height: 0.25 };
      const bounds = { width: 800, height: 600 };

      const denormalized = denormalizeRect(normRect, bounds);
      expect(denormalized).toEqual({
        x: 200,
        y: 300,
        width: 400,
        height: 150,
      });
    });

    it('roundtrips between normalizeRect and denormalizeRect accurately', () => {
      const bounds = { width: 1024, height: 768 };
      const original = { x: 120, y: 80, width: 400, height: 300 };

      const normalized = normalizeRect(original, bounds);
      const restored = denormalizeRect(normalized, bounds);

      expect(restored.x).toBeCloseTo(original.x);
      expect(restored.y).toBeCloseTo(original.y);
      expect(restored.width).toBeCloseTo(original.width);
      expect(restored.height).toBeCloseTo(original.height);
    });
  });

  describe('viewport and PDF point conversions', () => {
    const viewport = createMockViewport(600, 800, 1.0);

    it('converts viewport point to PDF point', () => {
      const vpPoint = { x: 100, y: 200 };
      const pdfPoint = viewportPointToPdfPoint(vpPoint, viewport);
      expect(pdfPoint).toEqual({ x: 100, y: 600 });
    });

    it('converts PDF point to viewport point', () => {
      const pdfPoint = { x: 100, y: 600 };
      const vpPoint = pdfPointToViewportPoint(pdfPoint, viewport);
      expect(vpPoint).toEqual({ x: 100, y: 200 });
    });
  });

  describe('viewport and PDF rect conversions', () => {
    const viewport = createMockViewport(600, 800, 1.0);

    it('converts viewport rectangle to PDF bounding box', () => {
      const viewRect = { x: 50, y: 100, width: 200, height: 150 };
      const pdfRect = viewportRectToPdfRect(viewRect, viewport);

      // p1(50, 100) -> PDF (50, 700) [top-left]
      // p2(250, 250) -> PDF (250, 550) [bottom-right]
      // minX = 50, minY = 550, width = 200, height = 150
      expect(pdfRect).toEqual({
        x: 50,
        y: 550,
        width: 200,
        height: 150,
      });
    });

    it('converts PDF bounding box back to viewport rectangle', () => {
      const pdfRect = { x: 50, y: 550, width: 200, height: 150 };
      const viewRect = pdfRectToViewportRect(pdfRect, viewport);

      expect(viewRect).toEqual({
        x: 50,
        y: 100,
        width: 200,
        height: 150,
      });
    });
  });

  describe('calculateOverlayViewportPosition', () => {
    it('calculates pixel position from normalized coordinates', () => {
      const pos = { x: 0.25, y: 0.5 };
      const baseBounds = { width: 600, height: 800 };

      const result = calculateOverlayViewportPosition(pos, baseBounds);
      expect(result).toEqual({ x: 150, y: 400 });
    });

    it('clamps normalized position to [0, 1] range', () => {
      const pos = { x: -0.5, y: 1.5 };
      const baseBounds = { width: 500, height: 1000 };

      const result = calculateOverlayViewportPosition(pos, baseBounds);
      expect(result).toEqual({ x: 0, y: 1000 });
    });
  });

  describe('calculateOverlayPdfBounds', () => {
    it('calculates correct PDF point bounds taking into account bottom-left origin', () => {
      const normPos = { x: 0.1, y: 0.2 }; // 10% from left, 20% from top
      const overlayScale = 1.0;
      const basePdfSize = { width: 612, height: 792 };
      const overlayPdfSize = { width: 300, height: 200 };

      const result = calculateOverlayPdfBounds(
        normPos,
        overlayScale,
        basePdfSize,
        overlayPdfSize,
      );

      // pdfX = 0.1 * 612 = 61.2
      expect(result.x).toBeCloseTo(61.2);
      // topOffset = 0.2 * 792 = 158.4
      // pdfY = 792 - 158.4 - 200 = 433.6
      expect(result.y).toBeCloseTo(433.6);
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });

    it('scales overlay dimensions with scale factor', () => {
      const normPos = { x: 0, y: 0 };
      const overlayScale = 0.5;
      const basePdfSize = { width: 612, height: 792 };
      const overlayPdfSize = { width: 400, height: 300 };

      const result = calculateOverlayPdfBounds(
        normPos,
        overlayScale,
        basePdfSize,
        overlayPdfSize,
      );

      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      // At (0, 0) top-left: pdfY = 792 - 0 - 150 = 642
      expect(result.y).toBe(642);
    });
  });

  describe('calculateUpdatedOverlayPosition', () => {
    it('translates normalized position with deltas', () => {
      const result = calculateUpdatedOverlayPosition({
        initialPosition: { x: 0.1, y: 0.2 },
        deltaX: 0.05,
        deltaY: 0.1,
      });

      expect(result.x).toBeCloseTo(0.15);
      expect(result.y).toBeCloseTo(0.3);
    });

    it('clamps to [0, 1] when bounds are omitted', () => {
      const result = calculateUpdatedOverlayPosition({
        initialPosition: { x: 0.1, y: 0.2 },
        deltaX: -0.5,
        deltaY: 1.5,
      });

      expect(result.x).toBe(0);
      expect(result.y).toBe(1);
    });

    it('clamps within page bounds taking overlay dimensions into account', () => {
      // Base page: 1000 x 800
      // Overlay: 200 x 160 -> normWidth = 0.2, normHeight = 0.2
      // Max X = 1 - 0.2 = 0.8
      // Max Y = 1 - 0.2 = 0.8
      const result = calculateUpdatedOverlayPosition({
        initialPosition: { x: 0.7, y: 0.7 },
        deltaX: 0.5,
        deltaY: 0.5,
        overlayBounds: { width: 200, height: 160 },
        baseBounds: { width: 1000, height: 800 },
      });

      expect(result.x).toBeCloseTo(0.8);
      expect(result.y).toBeCloseTo(0.8);
    });

    it('clamps to top-left (0, 0) when dragging negative with bounds', () => {
      const result = calculateUpdatedOverlayPosition({
        initialPosition: { x: 0.2, y: 0.2 },
        deltaX: -0.5,
        deltaY: -0.5,
        overlayBounds: { width: 200, height: 160 },
        baseBounds: { width: 1000, height: 800 },
      });

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('allows translating full-size overlays (normWidth >= 1) across base canvas [0, 1]', () => {
      const result = calculateUpdatedOverlayPosition({
        initialPosition: { x: 0, y: 0 },
        deltaX: 0.1,
        deltaY: 0.2,
        overlayBounds: { width: 1000, height: 800 },
        baseBounds: { width: 1000, height: 800 },
      });

      expect(result.x).toBeCloseTo(0.1);
      expect(result.y).toBeCloseTo(0.2);
    });
  });
});
