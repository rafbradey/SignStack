import { describe, it, expect } from 'vitest';
import { resizeCropRect } from './cropUtils';
import type { NormalizedRect } from '@/types';

describe('cropUtils - resizeCropRect', () => {
  const initialRect: NormalizedRect = {
    x: 0.2,
    y: 0.2,
    width: 0.5,
    height: 0.4,
  };

  describe('SE handle (bottom-right)', () => {
    it('increases width and height when dragged outward', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'se',
        deltaX: 0.1,
        deltaY: 0.15,
      });

      expect(result.x).toBe(0.2);
      expect(result.y).toBe(0.2);
      expect(result.width).toBeCloseTo(0.6);
      expect(result.height).toBeCloseTo(0.55);
    });

    it('clamps to right and bottom boundaries (1.0)', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'se',
        deltaX: 0.9,
        deltaY: 0.9,
      });

      expect(result.x).toBe(0.2);
      expect(result.y).toBe(0.2);
      expect(result.width).toBeCloseTo(0.8); // 1.0 - 0.2
      expect(result.height).toBeCloseTo(0.8); // 1.0 - 0.2
    });

    it('enforces minSize threshold when dragging inward past origin', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'se',
        deltaX: -0.6,
        deltaY: -0.5,
        minSize: 0.05,
      });

      expect(result.x).toBe(0.2);
      expect(result.y).toBe(0.2);
      expect(result.width).toBe(0.05);
      expect(result.height).toBe(0.05);
    });
  });

  describe('NW handle (top-left)', () => {
    it('adjusts x, y, width, and height when dragged outward', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'nw',
        deltaX: -0.1,
        deltaY: -0.1,
      });

      expect(result.x).toBeCloseTo(0.1);
      expect(result.y).toBeCloseTo(0.1);
      expect(result.width).toBeCloseTo(0.6);
      expect(result.height).toBeCloseTo(0.5);
    });

    it('clamps to top and left boundaries (0.0)', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'nw',
        deltaX: -0.5,
        deltaY: -0.5,
      });

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      // right was 0.7, bottom was 0.6
      expect(result.width).toBeCloseTo(0.7);
      expect(result.height).toBeCloseTo(0.6);
    });

    it('enforces minSize threshold when dragging inward past bottom-right corner', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'nw',
        deltaX: 0.6,
        deltaY: 0.6,
        minSize: 0.05,
      });

      // right is 0.7, bottom is 0.6
      expect(result.x).toBeCloseTo(0.65); // 0.7 - 0.05
      expect(result.y).toBeCloseTo(0.55); // 0.6 - 0.05
      expect(result.width).toBe(0.05);
      expect(result.height).toBe(0.05);
    });
  });

  describe('NE handle (top-right)', () => {
    it('alters y, width, and height correctly', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'ne',
        deltaX: 0.1,
        deltaY: -0.1,
      });

      expect(result.x).toBe(0.2);
      expect(result.y).toBeCloseTo(0.1);
      expect(result.width).toBeCloseTo(0.6);
      expect(result.height).toBeCloseTo(0.5);
    });

    it('clamps to 0 for top and 1 for right', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'ne',
        deltaX: 0.5,
        deltaY: -0.5,
      });

      expect(result.x).toBe(0.2);
      expect(result.y).toBe(0);
      expect(result.width).toBeCloseTo(0.8); // 1.0 - 0.2
      expect(result.height).toBeCloseTo(0.6); // bottom was 0.6
    });
  });

  describe('SW handle (bottom-left)', () => {
    it('alters x, width, and height correctly', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'sw',
        deltaX: -0.1,
        deltaY: 0.1,
      });

      expect(result.x).toBeCloseTo(0.1);
      expect(result.y).toBe(0.2);
      expect(result.width).toBeCloseTo(0.6);
      expect(result.height).toBeCloseTo(0.5);
    });

    it('clamps to 0 for left and 1 for bottom', () => {
      const result = resizeCropRect({
        initialRect,
        handle: 'sw',
        deltaX: -0.5,
        deltaY: 0.6,
      });

      expect(result.x).toBe(0);
      expect(result.y).toBe(0.2);
      expect(result.width).toBeCloseTo(0.7); // right was 0.7
      expect(result.height).toBeCloseTo(0.8); // 1.0 - 0.2
    });
  });
});
