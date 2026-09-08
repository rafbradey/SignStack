import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function createMockDoc(): PDFDocumentProxy {
  const mockPage: PDFPageProxy = {
    pageNumber: 1,
    rotate: 0,
    cleanup: vi.fn(),
    getViewport: vi.fn().mockReturnValue({
      width: 612,
      height: 792,
      scale: 1,
      rotation: 0,
    }),
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
});
