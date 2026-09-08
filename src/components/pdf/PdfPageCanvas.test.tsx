import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PdfPageCanvas } from './PdfPageCanvas';
import type { PDFDocumentProxy, PDFPageProxy } from '@/services/pdf';

function createMockPage(pageNumber = 1): PDFPageProxy {
  return {
    pageNumber,
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
}

function createMockDoc(): PDFDocumentProxy {
  const mockPage = createMockPage(1);
  return {
    numPages: 1,
    getPage: vi.fn().mockResolvedValue(mockPage),
    cleanup: vi.fn(),
    loadingTask: { destroy: vi.fn() },
  } as unknown as PDFDocumentProxy;
}

describe('PdfPageCanvas component', () => {
  it('renders wrapper with accessible region role and label', () => {
    render(<PdfPageCanvas document={null} pageNumber={1} />);

    const region = screen.getByRole('region', { name: /pdf page 1/i });
    expect(region).toBeDefined();
  });

  it('renders canvas element within the wrapper', () => {
    const { container } = render(
      <PdfPageCanvas document={null} pageNumber={1} />,
    );

    const canvas = container.querySelector('canvas.pdf-page-canvas');
    expect(canvas).toBeDefined();
  });

  it('calls onDimensionsChange when dimensions are calculated', async () => {
    const mockDoc = createMockDoc();
    const handleDimensions = vi.fn();

    render(
      <PdfPageCanvas
        document={mockDoc}
        pageNumber={1}
        onDimensionsChange={handleDimensions}
      />,
    );

    await waitFor(() => {
      expect(handleDimensions).toHaveBeenCalledWith({
        width: 612,
        height: 792,
        scale: 1,
        rotation: 0,
      });
    });
  });
});
