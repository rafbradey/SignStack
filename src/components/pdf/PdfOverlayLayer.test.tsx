import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PdfOverlayLayer } from './PdfOverlayLayer';
import type { PDFDocumentProxy, PDFPageProxy } from '@/services/pdf';

// Mock loadPdfDocument / usePdfPage dependencies
vi.mock('@/services/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/pdf')>();
  return {
    ...actual,
    loadPdfDocument: vi.fn(),
  };
});

function createMockDoc(
  baseWidth = 612,
  baseHeight = 792,
): PDFDocumentProxy {
  const mockPage: PDFPageProxy = {
    pageNumber: 1,
    rotate: 0,
    cleanup: vi.fn(),
    getViewport: vi
      .fn()
      .mockImplementation(({ scale = 1 }: { scale?: number } = {}) => ({
        width: baseWidth * scale,
        height: baseHeight * scale,
        scale,
        rotation: 0,
      })),
    render: vi.fn().mockReturnValue({
      promise: Promise.resolve(),
      cancel: vi.fn(),
    }),
  } as unknown as PDFPageProxy;

  return {
    numPages: 2,
    getPage: vi.fn().mockResolvedValue(mockPage),
    cleanup: vi.fn(),
    loadingTask: { destroy: vi.fn() },
  } as unknown as PDFDocumentProxy;
}

describe('PdfOverlayLayer component', () => {
  it('returns null when document is null', () => {
    const { container } = render(
      <PdfOverlayLayer document={null} pageNumber={1} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders overlay layer with accessible aria-label', () => {
    const doc = createMockDoc();
    render(<PdfOverlayLayer document={doc} pageNumber={1} opacity={0.8} />);

    const region = screen.getByRole('region', { name: 'Overlay page 1' });
    expect(region).toBeDefined();
    expect(region.style.opacity).toBe('0.8');
  });

  it('applies position transform to overlay container', () => {
    const doc = createMockDoc();
    render(
      <PdfOverlayLayer
        document={doc}
        pageNumber={2}
        position={{ x: 50, y: 100 }}
      />,
    );

    const region = screen.getByRole('region', { name: 'Overlay page 2' });
    expect(region.style.transform).toBe('translate(50px, 100px)');
  });

  it('applies scale multiplier and preserves aspect ratio', async () => {
    const doc = createMockDoc(612, 792);
    const { rerender } = render(
      <PdfOverlayLayer document={doc} pageNumber={1} scale={1.0} />,
    );

    const region = screen.getByRole('region', { name: 'Overlay page 1' });
    await waitFor(() => {
      expect(region.style.width).toBe('612px');
      expect(region.style.height).toBe('792px');
    });

    // Scale to 50%
    rerender(<PdfOverlayLayer document={doc} pageNumber={1} scale={0.5} />);
    await waitFor(() => {
      expect(region.style.width).toBe('306px');
      expect(region.style.height).toBe('396px');
    });
    // Aspect ratio remains 612/792 = 306/396
    expect(306 / 396).toBeCloseTo(612 / 792, 4);

    // Scale to 150%
    rerender(<PdfOverlayLayer document={doc} pageNumber={1} scale={1.5} />);
    await waitFor(() => {
      expect(region.style.width).toBe('918px');
      expect(region.style.height).toBe('1188px');
    });
    expect(918 / 1188).toBeCloseTo(612 / 792, 4);
  });

  it('renders A4 and landscape overlay dimensions preserving intrinsic aspect ratio', async () => {
    // A4 document (595.28 x 841.89)
    const a4Doc = createMockDoc(595.28, 841.89);
    const { rerender } = render(
      <PdfOverlayLayer document={a4Doc} pageNumber={1} scale={1.0} />,
    );
    const a4Region = screen.getByRole('region', { name: 'Overlay page 1' });
    await waitFor(() => {
      expect(parseFloat(a4Region.style.width)).toBeCloseTo(595.28, 1);
      expect(parseFloat(a4Region.style.height)).toBeCloseTo(841.89, 1);
    });

    // Landscape document (792 x 612)
    const landscapeDoc = createMockDoc(792, 612);
    rerender(
      <PdfOverlayLayer document={landscapeDoc} pageNumber={1} scale={1.0} />,
    );
    const landRegion = screen.getByRole('region', { name: 'Overlay page 1' });
    await waitFor(() => {
      expect(landRegion.style.width).toBe('792px');
      expect(landRegion.style.height).toBe('612px');
    });
    expect(792 > 612).toBe(true); // wider than tall
  });

  it('applies clip-path when cropRect is defined and not in active crop editing mode', () => {
    const doc = createMockDoc();
    const cropRect = { x: 0.1, y: 0.2, width: 0.6, height: 0.5 };
    render(
      <PdfOverlayLayer
        document={doc}
        pageNumber={1}
        cropRect={cropRect}
        isCropping={false}
      />,
    );

    const region = screen.getByRole('region', { name: 'Overlay page 1' });
    // top = 20%, right = (1 - 0.7)*100% = 30%, bottom = (1 - 0.7)*100% = 30%, left = 10%
    expect(region.style.clipPath).toBe('inset(20% 30% 30% 10%)');
  });

  it('renders CropSelectionBox when isCropping is true and cropRect is defined', () => {
    const doc = createMockDoc();
    const cropRect = { x: 0.1, y: 0.2, width: 0.6, height: 0.5 };
    render(
      <PdfOverlayLayer
        document={doc}
        pageNumber={1}
        cropRect={cropRect}
        isCropping={true}
      />,
    );

    // Should NOT clip the overlay container during active cropping so user can see full context
    const region = screen.getByRole('region', { name: 'Overlay page 1' });
    expect(region.style.clipPath).toBe('');

    // Should render CropSelectionBox
    const cropBox = screen.getByRole('region', {
      name: 'Crop selection: 60% × 50%',
    });
    expect(cropBox).toBeDefined();
  });

  describe('Overlay dragging and keyboard positioning (Task 7.4)', () => {
    it('supports pointer drag to translate overlay position across base document', async () => {
      const doc = createMockDoc(300, 300);
      const onPositionChange = vi.fn();
      const baseDimensions = { width: 1000, height: 1000 };

      render(
        <PdfOverlayLayer
          document={doc}
          pageNumber={1}
          baseDimensions={baseDimensions}
          normalizedPosition={{ x: 0.1, y: 0.1 }}
          isDraggable={true}
          onPositionChange={onPositionChange}
        />,
      );

      const region = screen.getByRole('region', { name: 'Overlay page 1' });
      expect(region.classList.contains('is-draggable')).toBe(true);

      region.setPointerCapture = vi.fn();
      region.releasePointerCapture = vi.fn();

      // Start drag at (100, 100)
      fireEvent.pointerDown(region, {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
      });

      // Move by +50px X, +100px Y on a 1000x1000 base canvas (+0.05 X, +0.10 Y)
      fireEvent.pointerMove(region, {
        clientX: 150,
        clientY: 200,
        pointerId: 1,
      });

      await waitFor(() => {
        expect(onPositionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            x: expect.closeTo(0.15, 2),
            y: expect.closeTo(0.2, 2),
          }),
        );
      });

      // Finish drag
      fireEvent.pointerUp(region, {
        clientX: 150,
        clientY: 200,
        pointerId: 1,
      });
    });

    it('supports keyboard arrow keys to nudge position', () => {
      const doc = createMockDoc(300, 300);
      const onPositionChange = vi.fn();
      const baseDimensions = { width: 1000, height: 1000 };

      render(
        <PdfOverlayLayer
          document={doc}
          pageNumber={1}
          baseDimensions={baseDimensions}
          normalizedPosition={{ x: 0.2, y: 0.2 }}
          isDraggable={true}
          onPositionChange={onPositionChange}
        />,
      );

      const region = screen.getByRole('region', { name: 'Overlay page 1' });

      // ArrowRight nudges x by +0.01 (1%)
      fireEvent.keyDown(region, { key: 'ArrowRight' });
      expect(onPositionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.closeTo(0.21, 2),
          y: expect.closeTo(0.2, 2),
        }),
      );

      // Shift+ArrowDown nudges y by +0.05 (5%)
      fireEvent.keyDown(region, { key: 'ArrowDown', shiftKey: true });
      expect(onPositionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.closeTo(0.2, 2),
          y: expect.closeTo(0.25, 2),
        }),
      );
    });

    it('disables dragging when isCropping is true', () => {
      const doc = createMockDoc(300, 300);
      const onPositionChange = vi.fn();
      const baseDimensions = { width: 1000, height: 1000 };

      render(
        <PdfOverlayLayer
          document={doc}
          pageNumber={1}
          baseDimensions={baseDimensions}
          normalizedPosition={{ x: 0.1, y: 0.1 }}
          cropRect={{ x: 0, y: 0, width: 1, height: 1 }}
          isCropping={true}
          isDraggable={true}
          onPositionChange={onPositionChange}
        />,
      );

      const region = screen.getByRole('region', { name: 'Overlay page 1' });
      expect(region.classList.contains('is-draggable')).toBe(false);

      fireEvent.pointerDown(region, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(region, { clientX: 150, clientY: 150, pointerId: 1 });

      expect(onPositionChange).not.toHaveBeenCalled();
    });

    it('triggers onDelete when Delete or Backspace key is pressed and not in crop mode', () => {
      const doc = createMockDoc(300, 300);
      const onDelete = vi.fn();

      const { rerender } = render(
        <PdfOverlayLayer
          document={doc}
          pageNumber={1}
          isDraggable={true}
          onDelete={onDelete}
        />,
      );

      const region = screen.getByRole('region', { name: 'Overlay page 1' });

      // Delete key
      fireEvent.keyDown(region, { key: 'Delete' });
      expect(onDelete).toHaveBeenCalledTimes(1);

      // Backspace key
      fireEvent.keyDown(region, { key: 'Backspace' });
      expect(onDelete).toHaveBeenCalledTimes(2);

      // Should NOT trigger onDelete if in crop mode
      rerender(
        <PdfOverlayLayer
          document={doc}
          pageNumber={1}
          isCropping={true}
          isDraggable={true}
          onDelete={onDelete}
        />,
      );

      fireEvent.keyDown(region, { key: 'Delete' });
      expect(onDelete).toHaveBeenCalledTimes(2);
    });
  });
});
