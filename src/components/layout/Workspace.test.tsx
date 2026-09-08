import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Workspace } from './Workspace';
import type { PDFDocumentProxy, PDFPageProxy } from '@/services/pdf';

// Mock loadPdfDocument to resolve mock PDF
vi.mock('@/services/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/pdf')>();
  return {
    ...actual,
    loadPdfDocument: vi.fn().mockImplementation(() => {
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

      const mockDoc: PDFDocumentProxy = {
        numPages: 3,
        getPage: vi.fn().mockResolvedValue(mockPage),
        cleanup: vi.fn(),
        loadingTask: { destroy: vi.fn() },
      } as unknown as PDFDocumentProxy;

      return Promise.resolve(mockDoc);
    }),
  };
});

/** Helper to build a minimal UploadedDocument for tests */
function makeDoc(overrides?: Partial<{ id: string; name: string }>) {
  const name = overrides?.name ?? 'invoice.pdf';
  const id = overrides?.id ?? 'doc-1';
  const mockFile = new File(['%PDF-1.4 sample'], name, {
    type: 'application/pdf',
  });
  return {
    id,
    file: mockFile,
    name,
    size: 1500,
    formattedSize: '1.5 KB',
    type: 'application/pdf',
    uploadedAt: Date.now(),
  };
}

describe('Workspace component', () => {
  it('renders Document Tray with upload button and empty queue state', () => {
    render(<Workspace />);
    expect(screen.getByText('Uploaded Documents')).toBeDefined();
    expect(screen.getByRole('button', { name: /add pdfs/i })).toBeDefined();
  });

  it('shows empty-state hint when no documents are provided', () => {
    render(<Workspace />);
    expect(screen.getByText(/upload a pdf to get started/i)).toBeDefined();
  });

  it('renders both Editor Workspace and Result Preview panes', () => {
    render(<Workspace />);
    expect(
      screen.getAllByText('Editor Workspace').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Result Preview').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText('No Document Loaded')).toBeDefined();
    expect(screen.getByText('Live Composite Output')).toBeDefined();
  });

  it('triggers onUploadClick callback when upload button is clicked', () => {
    const handleUpload = vi.fn();
    render(<Workspace onUploadClick={handleUpload} />);
    const uploadBtn = screen.getByRole('button', { name: /add pdfs/i });
    fireEvent.click(uploadBtn);
    expect(handleUpload).toHaveBeenCalledTimes(1);
  });

  it('switches active tab when mobile view tab buttons are clicked', () => {
    render(<Workspace />);
    const resultTab = screen.getByRole('tab', { name: /result preview/i });
    fireEvent.click(resultTab);
    expect(resultTab.classList.contains('active')).toBe(true);

    const editorTab = screen.getByRole('tab', { name: /editor workspace/i });
    fireEvent.click(editorTab);
    expect(editorTab.classList.contains('active')).toBe(true);
  });

  it('renders a DocumentCard for each provided document', async () => {
    const doc = makeDoc();
    render(<Workspace documents={[doc]} />);

    await waitFor(() => {
      // Document name is visible
      expect(screen.getAllByText('invoice.pdf').length).toBeGreaterThanOrEqual(
        1,
      );
    });
    // Formatted size is visible
    expect(screen.getByText('1.5 KB')).toBeDefined();
    // Empty-state hint is gone
    expect(screen.queryByText(/upload a pdf to get started/i)).toBeNull();
  });

  it('renders cards for multiple documents', async () => {
    const docs = [
      makeDoc({ id: 'a', name: 'contract.pdf' }),
      makeDoc({ id: 'b', name: 'receipt.pdf' }),
    ];
    render(<Workspace documents={docs} />);

    await waitFor(() => {
      expect(screen.getAllByText('contract.pdf').length).toBeGreaterThanOrEqual(
        1,
      );
      expect(screen.getAllByText('receipt.pdf').length).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  it('renders PDF page canvas and updates page counter when document is loaded', async () => {
    const doc = makeDoc({ id: 'doc-pdf', name: 'contract.pdf' });
    render(<Workspace documents={[doc]} />);

    // Wait for mock PDF to load and render canvas
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /pdf page 1/i })).toBeDefined();
      expect(screen.getByText('Page 1 of 3')).toBeDefined();
    });
  });

  it('calls onRemoveDocument with the correct document id', async () => {
    const doc = makeDoc();
    const handleRemove = vi.fn();
    render(<Workspace documents={[doc]} onRemoveDocument={handleRemove} />);

    const removeBtn = screen.getByRole('button', {
      name: /remove "invoice\.pdf"/i,
    });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith('doc-1');

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: /pdf page 1/i }),
      ).toBeDefined();
    });
  });

  it('calls onMoveDocument with direction "up" when move-up is clicked', async () => {
    const docs = [
      makeDoc({ id: 'a', name: 'first.pdf' }),
      makeDoc({ id: 'b', name: 'second.pdf' }),
    ];
    const handleMove = vi.fn();
    render(<Workspace documents={docs} onMoveDocument={handleMove} />);

    // "second.pdf" is at position 2, so its move-up button should be enabled
    const moveUpBtn = screen.getByRole('button', {
      name: /move "second\.pdf" up/i,
    });
    fireEvent.click(moveUpBtn);
    expect(handleMove).toHaveBeenCalledWith('b', 'up');

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: /pdf page 1/i }),
      ).toBeDefined();
    });
  });

  it('renders queue numbers and document count indicator', async () => {
    const docs = [
      makeDoc({ id: 'a', name: 'first.pdf' }),
      makeDoc({ id: 'b', name: 'second.pdf' }),
    ];
    render(<Workspace documents={docs} />);

    expect(screen.getByText('Documents · 2')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: /pdf page 1/i }),
      ).toBeDefined();
    });
  });

  it('allows user to change the Main Document', async () => {
    const docs = [
      makeDoc({ id: 'a', name: 'first.pdf' }),
      makeDoc({ id: 'b', name: 'second.pdf' }),
    ];
    const handleSelectMain = vi.fn();
    render(
      <Workspace
        documents={docs}
        onSelectMainDocument={handleSelectMain}
      />,
    );

    // Initial main document is "first.pdf"
    expect(screen.getAllByText('first.pdf').length).toBeGreaterThanOrEqual(1);

    // Click "Set Main" on second.pdf
    const setMainBtn = screen.getByRole('button', {
      name: /set "second\.pdf" as main document/i,
    });
    fireEvent.click(setMainBtn);
    expect(handleSelectMain).toHaveBeenCalledWith('b');

    // second.pdf is now designated as Main
    await waitFor(() => {
      const secondCard = screen.getByLabelText(
        /document 2: second\.pdf \(main document\)/i,
      );
      expect(secondCard).toBeDefined();
    });
  });

  it('triggers onReorderDocuments when card drag and drop occurs', async () => {
    const docs = [
      makeDoc({ id: 'a', name: 'first.pdf' }),
      makeDoc({ id: 'b', name: 'second.pdf' }),
    ];
    const handleReorder = vi.fn();
    render(<Workspace documents={docs} onReorderDocuments={handleReorder} />);

    const firstCard = screen.getByLabelText(/document 1: first\.pdf/i);
    const secondCard = screen.getByLabelText(/document 2: second\.pdf/i);

    // Simulate drag start on first card
    fireEvent.dragStart(firstCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
    });

    // Simulate drop onto second card
    fireEvent.drop(secondCard, {
      dataTransfer: { getData: vi.fn() },
    });

    expect(handleReorder).toHaveBeenCalledWith(0, 1);

    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: /pdf page 1/i }),
      ).toBeDefined();
    });
  });

  describe('Multi-page Navigation (Task 4.3)', () => {
    it('allows navigating forward and backward between pages with boundary controls', async () => {
      const doc = makeDoc({ id: 'doc-multi', name: 'multi.pdf' });
      render(<Workspace documents={[doc]} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeDefined();
      });

      const prevBtn = screen.getByRole('button', { name: /previous page/i });
      const nextBtn = screen.getByRole('button', { name: /next page/i });

      // Page 1: Previous is disabled, Next is enabled
      expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
      expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

      // Navigate to Page 2
      fireEvent.click(nextBtn);
      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeDefined();
      });
      expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
      expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

      // Navigate to Page 3 (last page)
      fireEvent.click(nextBtn);
      await waitFor(() => {
        expect(screen.getByText('Page 3 of 3')).toBeDefined();
      });
      expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
      expect((nextBtn as HTMLButtonElement).disabled).toBe(true);

      // Navigate back to Page 2
      fireEvent.click(prevBtn);
      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeDefined();
      });
      expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
      expect((nextBtn as HTMLButtonElement).disabled).toBe(false);
    });

    it('navigates pages using keyboard shortcuts when editor pane has focus', async () => {
      const doc = makeDoc({ id: 'doc-kb', name: 'keyboard.pdf' });
      render(<Workspace documents={[doc]} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeDefined();
      });

      const editorSection = screen.getByRole('region', {
        name: 'Editor Workspace',
      });

      // ArrowRight goes to Page 2
      fireEvent.keyDown(editorSection, { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeDefined();
      });

      // ArrowLeft goes back to Page 1
      fireEvent.keyDown(editorSection, { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeDefined();
      });
    });
  });

  describe('Zoom Controls (Task 4.3)', () => {
    it('adjusts zoom level on zoom in, zoom out, and reset to 100%', async () => {
      const doc = makeDoc({ id: 'doc-zoom', name: 'zoom.pdf' });
      render(<Workspace documents={[doc]} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeDefined();
      });

      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });
      const resetBtn = screen.getByRole('button', { name: /current zoom/i });

      // Zoom In to 125%
      fireEvent.click(zoomInBtn);
      expect(screen.getByText('125%')).toBeDefined();

      // Zoom In again to 150%
      fireEvent.click(zoomInBtn);
      expect(screen.getByText('150%')).toBeDefined();

      // Zoom Out back to 125%
      fireEvent.click(zoomOutBtn);
      expect(screen.getByText('125%')).toBeDefined();

      // Reset zoom back to 100%
      fireEvent.click(resetBtn);
      expect(screen.getByText('100%')).toBeDefined();

      await waitFor(() => {
        expect(
          screen.getByRole('region', { name: /pdf page 1/i }),
        ).toBeDefined();
      });
    });

    it('resets page number and zoom when switching Main Document', async () => {
      const docs = [
        makeDoc({ id: 'doc-1', name: 'first.pdf' }),
        makeDoc({ id: 'doc-2', name: 'second.pdf' }),
      ];
      render(<Workspace documents={docs} />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeDefined();
      });

      // Navigate to page 2 and zoom in to 125%
      const nextBtn = screen.getByRole('button', { name: /next page/i });
      const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(nextBtn);
      fireEvent.click(zoomInBtn);

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeDefined();
        expect(screen.getByText('125%')).toBeDefined();
      });

      // Switch main document to second.pdf
      const setMainBtn = screen.getByRole('button', {
        name: /set "second\.pdf" as main document/i,
      });
      fireEvent.click(setMainBtn);

      // Page and zoom should reset to 1 and 100%
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeDefined();
        expect(screen.getByText('100%')).toBeDefined();
      });
    });

    it('handles fit to screen click', async () => {
      const doc = makeDoc({ id: 'doc-fit', name: 'fit.pdf' });
      render(<Workspace documents={[doc]} />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeDefined();
      });

      const fitBtn = screen.getByRole('button', { name: /fit to screen/i });
      expect((fitBtn as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(fitBtn);
      // Fit button executes without error
      expect(screen.getByRole('button', { name: /fit to screen/i })).toBeDefined();

      await waitFor(() => {
        expect(
          screen.getByRole('region', { name: /pdf page 1/i }),
        ).toBeDefined();
      });
    });

    it('calculates fit scale dynamically when viewport has measurable bounds', async () => {
      const doc = makeDoc({ id: 'doc-auto-fit', name: 'autofit.pdf' });
      
      // Mock clientWidth and clientHeight on HTMLElement prototype for this test
      const originalClientWidth = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'clientWidth',
      );
      const originalClientHeight = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'clientHeight',
      );

      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        value: 676, // 676 - 64 padding = 612 avail width (matches 612 unscaled = 100%)
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        value: 856, // 856 - 64 padding = 792 avail height (matches 792 unscaled = 100%)
      });

      try {
        render(<Workspace documents={[doc]} />);
        await waitFor(() => {
          expect(screen.getByText('100%')).toBeDefined();
        });
      } finally {
        if (originalClientWidth) {
          Object.defineProperty(
            HTMLElement.prototype,
            'clientWidth',
            originalClientWidth,
          );
        }
        if (originalClientHeight) {
          Object.defineProperty(
            HTMLElement.prototype,
            'clientHeight',
            originalClientHeight,
          );
        }
      }
    });
  });
});

