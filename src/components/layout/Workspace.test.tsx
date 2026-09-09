import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Workspace } from './Workspace';
import type { PDFDocumentProxy, PDFPageProxy } from '@/services/pdf';

// Mock loadPdfDocument to resolve mock PDF
vi.mock('@/services/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/pdf')>();
  return {
    ...actual,
    loadPdfDocument: vi.fn().mockImplementation((file?: File) => {
      const fileName = file?.name?.toLowerCase() ?? '';
      const isLandscape = fileName.includes('landscape');
      const isA4 = fileName.includes('a4');
      const baseWidth = isLandscape ? 792 : isA4 ? 595.28 : 612;
      const baseHeight = isLandscape ? 612 : isA4 ? 841.89 : 792;

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
        expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
      });

      const zoomInBtn = screen.getByRole('button', { name: /^zoom in$/i });
      const zoomOutBtn = screen.getByRole('button', { name: /^zoom out$/i });
      const resetBtn = screen.getByRole('button', { name: /current zoom/i });

      // Zoom In to 125%
      fireEvent.click(zoomInBtn);
      expect(screen.getByLabelText(/current zoom: 125%/i)).toBeDefined();

      // Zoom In again to 150%
      fireEvent.click(zoomInBtn);
      expect(screen.getByLabelText(/current zoom: 150%/i)).toBeDefined();

      // Zoom Out back to 125%
      fireEvent.click(zoomOutBtn);
      expect(screen.getByLabelText(/current zoom: 125%/i)).toBeDefined();

      // Reset zoom back to 100%
      fireEvent.click(resetBtn);
      expect(screen.getByLabelText(/current zoom: 100%/i)).toBeDefined();

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
      const nextBtn = screen.getByRole('button', { name: /^next page$/i });
      const zoomInBtn = screen.getByRole('button', { name: /^zoom in$/i });
      fireEvent.click(nextBtn);
      fireEvent.click(zoomInBtn);

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3')).toBeDefined();
        expect(screen.getByLabelText(/current zoom: 125%/i)).toBeDefined();
      });

      // Switch main document to second.pdf
      const setMainBtn = screen.getByRole('button', {
        name: /set "second\.pdf" as main document/i,
      });
      fireEvent.click(setMainBtn);

      // Page and zoom should reset to 1 and 100%
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeDefined();
        expect(screen.getByLabelText(/current zoom: 100%/i)).toBeDefined();
      });
    });

    it('handles fit to screen click', async () => {
      const doc = makeDoc({ id: 'doc-fit', name: 'fit.pdf' });
      render(<Workspace documents={[doc]} />);

      await waitFor(() => {
        expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
      });

      const fitBtn = screen.getByRole('button', { name: /^fit to screen$/i });
      expect((fitBtn as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(fitBtn);
      // Fit button executes without error
      expect(screen.getByRole('button', { name: /^fit to screen$/i })).toBeDefined();

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
          expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
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

  describe('overlay document selection', () => {
    it('shows overlay selector with non-main documents as options', async () => {
      const doc1 = makeDoc({ id: 'doc-main', name: 'main.pdf' });
      const doc2 = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

      render(<Workspace documents={[doc1, doc2]} />);

      const select = screen.getByLabelText(
        'Select overlay document',
      ) as HTMLSelectElement;
      expect(select).toBeDefined();

      // The main document (doc1, first in list) should NOT appear as an option
      const options = Array.from(select.querySelectorAll('option'));
      const optionValues = options.map((o) => o.value);
      expect(optionValues).not.toContain('doc-main');
      expect(optionValues).toContain('doc-overlay');
    });

    it('disables overlay selector when fewer than 2 documents', () => {
      const doc1 = makeDoc({ id: 'doc-1', name: 'solo.pdf' });
      render(<Workspace documents={[doc1]} />);

      const select = screen.getByLabelText(
        'Select overlay document',
      ) as HTMLSelectElement;
      expect(select.disabled).toBe(true);
    });

    it('shows overlay page controls after selecting an overlay document', async () => {
      const doc1 = makeDoc({ id: 'doc-main', name: 'main.pdf' });
      const doc2 = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

      render(<Workspace documents={[doc1, doc2]} />);

      const select = screen.getByLabelText(
        'Select overlay document',
      ) as HTMLSelectElement;

      fireEvent.change(select, { target: { value: 'doc-overlay' } });

      // Wait for the overlay PDF to load and page controls to appear
      await waitFor(() => {
        expect(screen.getByLabelText('Previous overlay page')).toBeDefined();
        expect(screen.getByLabelText('Next overlay page')).toBeDefined();
      });
    });

    it('clears overlay selection when the overlay document is removed', async () => {
      const doc1 = makeDoc({ id: 'doc-main', name: 'main.pdf' });
      const doc2 = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

      const { rerender } = render(
        <Workspace documents={[doc1, doc2]} />,
      );

      // Select the overlay document
      const select = screen.getByLabelText(
        'Select overlay document',
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'doc-overlay' } });

      // Wait for overlay to load
      await waitFor(() => {
        expect(screen.getByLabelText('Previous overlay page')).toBeDefined();
      });

      // Remove the overlay document by rerendering with only the main doc
      rerender(<Workspace documents={[doc1]} />);

      // The selector should be disabled (only 1 doc) and page controls should be gone
      await waitFor(() => {
        const updatedSelect = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        expect(updatedSelect.disabled).toBe(true);
      });
    });

    it('renders overlay page layer when an overlay document is selected', async () => {
      const doc1 = makeDoc({ id: 'doc-main', name: 'main.pdf' });
      const doc2 = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

      render(<Workspace documents={[doc1, doc2]} />);

      const select = screen.getByLabelText(
        'Select overlay document',
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'doc-overlay' } });

      await waitFor(() => {
        expect(
          screen.getByRole('region', { name: 'Overlay page 1' }),
        ).toBeDefined();
      });
    });

    it('adjusts overlay opacity via opacity slider', async () => {
      const doc1 = makeDoc({ id: 'doc-main', name: 'main.pdf' });
      const doc2 = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

      render(<Workspace documents={[doc1, doc2]} />);

      const select = screen.getByLabelText(
        'Select overlay document',
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'doc-overlay' } });

      await waitFor(() => {
        expect(screen.getByLabelText('Overlay opacity')).toBeDefined();
      });

      const slider = screen.getByLabelText('Overlay opacity') as HTMLInputElement;
      expect(slider.value).toBe('75');

      fireEvent.change(slider, { target: { value: '50' } });

      expect(slider.value).toBe('50');
      expect(screen.getByText('50%')).toBeDefined();

      const overlayRegion = screen.getByRole('region', {
        name: 'Overlay page 1',
      });
      expect(overlayRegion.style.opacity).toBe('0.5');
    });

    describe('Page-Specific Overlay Association', () => {
      it('associates overlays with specific Main Document pages and supports multiple overlays per page', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'Contract.pdf' });
        const docOverlay1 = makeDoc({ id: 'doc-sig', name: 'Signature.pdf' });
        const docOverlay2 = makeDoc({ id: 'doc-stamp', name: 'Stamp.pdf' });

        render(<Workspace documents={[docMain, docOverlay1, docOverlay2]} />);

        // 1. Add an overlay to Main Page 1 (Signature.pdf)
        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-sig' } });

        await waitFor(() => {
          expect(
            screen.getByRole('region', { name: 'Overlay page 1' }),
          ).toBeDefined();
        });

        // Set opacity for this overlay on Page 1 to 50%
        const opacitySlider = screen.getByLabelText(
          'Overlay opacity',
        ) as HTMLInputElement;
        fireEvent.change(opacitySlider, { target: { value: '50' } });
        expect(opacitySlider.value).toBe('50');

        // 2. Navigate to Main Page 2 → overlay is absent
        const nextPageBtn = screen.getByLabelText('Next page');
        fireEvent.click(nextPageBtn);

        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });
        expect(
          screen.queryByRole('region', { name: 'Overlay page 1' }),
        ).toBeNull();
        expect(select.value).toBe('');

        // 3. Return to Main Page 1 → overlay returns with preserved opacity
        const prevPageBtn = screen.getByLabelText('Previous page');
        fireEvent.click(prevPageBtn);

        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });
        const returnedOverlay = screen.getByRole('region', {
          name: 'Overlay page 1',
        });
        expect(returnedOverlay).toBeDefined();
        expect(returnedOverlay.style.opacity).toBe('0.5');

        // 4. Add a different overlay to Main Page 2 (Stamp.pdf)
        fireEvent.click(nextPageBtn);
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });
        fireEvent.change(select, { target: { value: 'doc-stamp' } });
        await waitFor(() => {
          expect(
            screen.getByRole('region', { name: 'Overlay page 1' }),
          ).toBeDefined();
        });

        // Change Stamp.pdf overlay page to page 2 (mockDoc has 3 pages)
        const nextOverlayPageBtn = screen.getByLabelText('Next overlay page');
        fireEvent.click(nextOverlayPageBtn);
        await waitFor(() => {
          expect(screen.getByText('2/3')).toBeDefined();
        });

        // 5. Navigate between pages → each overlay appears only on its assigned page
        fireEvent.click(prevPageBtn); // back to Page 1
        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });
        // On Page 1, Signature overlay (p. 1) is active and opacity is 50%
        expect(
          screen.getByRole('region', { name: 'Overlay page 1' }).style.opacity,
        ).toBe('0.5');
        expect(screen.getByText('1/3')).toBeDefined();

        fireEvent.click(nextPageBtn); // to Page 2
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });
        // On Page 2, Stamp overlay (p. 2) is visible
        expect(
          screen.getByRole('region', { name: 'Overlay page 2' }),
        ).toBeDefined();
        expect(screen.getByText('2/3')).toBeDefined();

        // 6. Navigate back and forth to confirm persistence across pages
        fireEvent.click(prevPageBtn); // back to Page 1
        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });
        expect(
          screen.getByRole('region', { name: 'Overlay page 1' }).style.opacity,
        ).toBe('0.5');

        fireEvent.click(nextPageBtn); // to Page 2
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });
        expect(
          screen.getByRole('region', { name: 'Overlay page 2' }),
        ).toBeDefined();
      });
    });

    describe('Overlay Scaling & Dimension Handling', () => {
      it('defaults to 100% scale and allows adjusting between 25% and 200%', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByLabelText('Overlay scale')).toBeDefined();
        });

        const scaleSlider = screen.getByLabelText(
          'Overlay scale',
        ) as HTMLInputElement;
        const scaleVal = document.querySelector('.overlay-scale-value');
        expect(scaleSlider.value).toBe('100');
        expect(scaleVal?.textContent).toBe('100%');

        // Adjust scale to 50%
        fireEvent.change(scaleSlider, { target: { value: '50' } });
        expect(scaleSlider.value).toBe('50');
        expect(scaleVal?.textContent).toBe('50%');

        // Adjust scale to 150%
        fireEvent.change(scaleSlider, { target: { value: '150' } });
        expect(scaleSlider.value).toBe('150');
        expect(scaleVal?.textContent).toBe('150%');
      });

      it('preserves overlay aspect ratio and scales dimensions without distortion', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(
            screen.getByRole('region', { name: 'Overlay page 1' }),
          ).toBeDefined();
        });

        const overlayRegion = screen.getByRole('region', {
          name: 'Overlay page 1',
        });

        // Wait for async usePdfPage to resolve dimensions
        await waitFor(() => {
          expect(overlayRegion.style.width).toBeTruthy();
        });

        const initialWidth = parseFloat(overlayRegion.style.width);
        const initialHeight = parseFloat(overlayRegion.style.height);

        // Adjust scale to 50%
        const scaleSlider = screen.getByLabelText('Overlay scale');
        fireEvent.change(scaleSlider, { target: { value: '50' } });

        await waitFor(() => {
          const scaledWidth = parseFloat(overlayRegion.style.width);
          const scaledHeight = parseFloat(overlayRegion.style.height);
          expect(scaledWidth).toBeCloseTo(initialWidth * 0.5, 0);
          expect(scaledHeight).toBeCloseTo(initialHeight * 0.5, 0);
          // Aspect ratio remains unchanged
          expect(scaledWidth / scaledHeight).toBeCloseTo(
            initialWidth / initialHeight,
            3,
          );
        });
      });

      it('handles page dimension differences (A4 overlay and landscape overlay) correctly', async () => {
        const docMain = makeDoc({ id: 'doc-letter', name: 'letter-main.pdf' });
        const docA4 = makeDoc({ id: 'doc-a4', name: 'a4-overlay.pdf' });
        const docLandscape = makeDoc({
          id: 'doc-land',
          name: 'landscape-overlay.pdf',
        });

        render(<Workspace documents={[docMain, docA4, docLandscape]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;

        // 1. Select A4 overlay
        fireEvent.change(select, { target: { value: 'doc-a4' } });

        await waitFor(() => {
          const region = screen.getByRole('region', { name: 'Overlay page 1' });
          expect(parseFloat(region.style.width)).toBeCloseTo(595.28, 0);
          expect(parseFloat(region.style.height)).toBeCloseTo(841.89, 0);
        });

        // 2. Select Landscape overlay
        fireEvent.change(select, { target: { value: 'doc-land' } });

        await waitFor(() => {
          const region = screen.getByRole('region', { name: 'Overlay page 1' });
          expect(parseFloat(region.style.width)).toBeCloseTo(792, 0);
          expect(parseFloat(region.style.height)).toBeCloseTo(612, 0);
        });
      });

      it('maintains independent scale values per overlay across page navigation and layer switching', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay1 = makeDoc({ id: 'doc-sig', name: 'sig.pdf' });
        const docOverlay2 = makeDoc({ id: 'doc-stamp', name: 'stamp.pdf' });

        render(<Workspace documents={[docMain, docOverlay1, docOverlay2]} />);

        // Page 1: Add overlay 1 and set scale to 50%
        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-sig' } });

        await waitFor(() => {
          expect(screen.getByLabelText('Overlay scale')).toBeDefined();
        });

        const scaleSlider = screen.getByLabelText(
          'Overlay scale',
        ) as HTMLInputElement;
        fireEvent.change(scaleSlider, { target: { value: '50' } });
        expect(scaleSlider.value).toBe('50');

        // Navigate to Page 2
        const nextPageBtn = screen.getByLabelText('Next page');
        fireEvent.click(nextPageBtn);
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });

        // Add overlay on Page 2 with 150% scale
        fireEvent.change(select, { target: { value: 'doc-stamp' } });
        await waitFor(() => {
          expect(screen.getByLabelText('Overlay scale')).toBeDefined();
        });
        fireEvent.change(screen.getByLabelText('Overlay scale'), {
          target: { value: '150' },
        });
        expect(
          (screen.getByLabelText('Overlay scale') as HTMLInputElement).value,
        ).toBe('150');

        // Navigate back to Page 1
        const prevPageBtn = screen.getByLabelText('Previous page');
        fireEvent.click(prevPageBtn);
        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });

        // Overlay on Page 1 retained its 50% scale
        expect(
          (screen.getByLabelText('Overlay scale') as HTMLInputElement).value,
        ).toBe('50');

        // Navigate back to Page 2
        fireEvent.click(nextPageBtn);
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });
        // Overlay on Page 2 retained its 150% scale
        expect(
          (screen.getByLabelText('Overlay scale') as HTMLInputElement).value,
        ).toBe('150');
      });

      it('adjusts opacity and scale using - and + stepper buttons', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByLabelText('Increase opacity')).toBeDefined();
        });

        // Opacity defaults to 75% -> click + to increase to 80%
        const incOpacityBtn = screen.getByLabelText('Increase opacity');
        fireEvent.click(incOpacityBtn);
        expect(
          document.querySelector('.overlay-opacity-value')?.textContent,
        ).toBe('80%');

        // Click - twice to decrease to 70%
        const decOpacityBtn = screen.getByLabelText('Decrease opacity');
        fireEvent.click(decOpacityBtn);
        fireEvent.click(decOpacityBtn);
        expect(
          document.querySelector('.overlay-opacity-value')?.textContent,
        ).toBe('70%');

        // Scale defaults to 100% -> click + to increase to 105%
        const incScaleBtn = screen.getByLabelText('Increase scale');
        fireEvent.click(incScaleBtn);
        expect(
          document.querySelector('.overlay-scale-value')?.textContent,
        ).toBe('105%');

        // Click - twice to decrease to 95%
        const decScaleBtn = screen.getByLabelText('Decrease scale');
        fireEvent.click(decScaleBtn);
        fireEvent.click(decScaleBtn);
        expect(
          document.querySelector('.overlay-scale-value')?.textContent,
        ).toBe('95%');
      });

      it('toggles crop mode and renders visual crop selection box with default region', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
        });

        // Crop selection box should not be visible before clicking Crop
        expect(screen.queryByRole('region', { name: /crop selection/i })).toBeNull();

        // Click Crop overlay to enter crop editing mode
        const cropBtn = screen.getByRole('button', { name: /crop overlay/i });
        fireEvent.click(cropBtn);

        // Crop selection box should now be rendered with default 60% x 60% region
        await waitFor(() => {
          expect(
            screen.getByRole('region', {
              name: 'Crop selection: 60% × 60%',
            }),
          ).toBeDefined();
        });
        // Button changes to "Done cropping"
        expect(screen.getByRole('button', { name: /done cropping/i })).toBeDefined();
        // Reset crop button should now be available
        expect(screen.getByRole('button', { name: /reset crop/i })).toBeDefined();

        // Click Done cropping to exit crop editing mode
        const doneBtn = screen.getByRole('button', { name: /done cropping/i });
        fireEvent.click(doneBtn);
        expect(screen.queryByRole('region', { name: /crop selection/i })).toBeNull();
        expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
      });

      it('resets crop region when Reset crop button is clicked', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
        });

        // Toggle crop on
        fireEvent.click(screen.getByRole('button', { name: /crop overlay/i }));
        expect(screen.getByRole('button', { name: /reset crop/i })).toBeDefined();

        // Click Reset crop
        fireEvent.click(screen.getByRole('button', { name: /reset crop/i }));

        // Crop box is cleared and isCropping is reset
        expect(screen.queryByRole('region', { name: /crop selection/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /reset crop/i })).toBeNull();
        expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
      });

      it('preserves crop region per-overlay across page changes', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        // Select overlay for Page 1
        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
        });

        // Set crop on Page 1
        fireEvent.click(screen.getByRole('button', { name: /crop overlay/i }));
        expect(
          screen.getByRole('region', {
            name: 'Crop selection: 60% × 60%',
          }),
        ).toBeDefined();

        // Navigate to Page 2
        const nextPageBtn = screen.getByRole('button', { name: /next page/i });
        fireEvent.click(nextPageBtn);
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
        });

        // Page 2 has no overlay selected yet -> Reset crop button should not exist
        expect(screen.queryByRole('button', { name: /reset crop/i })).toBeNull();

        // Navigate back to Page 1
        const prevPageBtn = screen.getByRole('button', { name: /previous page/i });
        fireEvent.click(prevPageBtn);
        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });

        // Overlay on Page 1 retained its cropRect so Reset crop is available
        expect(screen.getByRole('button', { name: /reset crop/i })).toBeDefined();
      });

      it('resizes overlay crop rectangle via handles and applies updated clip on exit', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
        });

        // Click Crop overlay
        fireEvent.click(screen.getByRole('button', { name: /crop overlay/i }));

        await waitFor(() => {
          expect(
            screen.getByRole('region', {
              name: 'Crop selection: 60% × 60%',
            }),
          ).toBeDefined();
        });

        // Focus on SE handle and resize width via Shift+ArrowRight (+5%)
        const seHandle = screen.getByRole('button', {
          name: 'Resize crop bottom-right handle',
        });
        fireEvent.keyDown(seHandle, { key: 'ArrowRight', shiftKey: true });

        // Badge should update to 65% x 60%
        await waitFor(() => {
          expect(
            screen.getByRole('region', {
              name: 'Crop selection: 65% × 60%',
            }),
          ).toBeDefined();
        });

        // Resize height via Shift+ArrowDown (+5%)
        const updatedSeHandle = screen.getByRole('button', {
          name: 'Resize crop bottom-right handle',
        });
        fireEvent.keyDown(updatedSeHandle, { key: 'ArrowDown', shiftKey: true });

        // Badge should update to 65% x 65%
        await waitFor(() => {
          expect(
            screen.getByRole('region', {
              name: 'Crop selection: 65% × 65%',
            }),
          ).toBeDefined();
        });

        // Exit crop mode
        fireEvent.click(screen.getByRole('button', { name: /done cropping/i }));

        // Overlay region should now have updated clip-path:
        // x: 0.2, y: 0.2, width: 0.65, height: 0.65
        // top: 20%, right: 15%, bottom: 15%, left: 20%
        const overlayRegion = screen.getByRole('region', { name: 'Overlay page 1' });
        expect(overlayRegion.style.clipPath).toBe('inset(20% 15% 15% 20%)');
      });

      it('moves overlay crop rectangle across page and applies updated clip on exit', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
        });

        // Click Crop overlay
        fireEvent.click(screen.getByRole('button', { name: /crop overlay/i }));

        await waitFor(() => {
          expect(
            screen.getByRole('region', {
              name: 'Crop selection: 60% × 60%',
            }),
          ).toBeDefined();
        });

        const cropBox = screen.getByRole('region', {
          name: 'Crop selection: 60% × 60%',
        });

        // Move right (+5%) and down (+5%) via Shift+Arrow keys
        fireEvent.keyDown(cropBox, { key: 'ArrowRight', shiftKey: true });
        fireEvent.keyDown(cropBox, { key: 'ArrowDown', shiftKey: true });

        // Exit crop mode
        fireEvent.click(screen.getByRole('button', { name: /done cropping/i }));

        // Initial rect: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 }
        // After move: { x: 0.25, y: 0.25, width: 0.6, height: 0.6 }
        // top: 25%, right: (1 - 0.85) = 15%, bottom: (1 - 0.85) = 15%, left: 25%
        const overlayRegion = screen.getByRole('region', { name: 'Overlay page 1' });
        expect(overlayRegion.style.clipPath).toBe('inset(25% 15% 15% 25%)');
      });

      describe('Overlay Positioning & Translation (Task 7.4)', () => {
        it('supports keyboard nudging to move overlay and updates transform position', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

          render(<Workspace documents={[docMain, docOverlay]} />);

          const select = screen.getByLabelText(
            'Select overlay document',
          ) as HTMLSelectElement;
          fireEvent.change(select, { target: { value: 'doc-overlay' } });

          await waitFor(() => {
            expect(screen.getByRole('region', { name: 'Overlay page 1' })).toBeDefined();
          });

          const overlayRegion = screen.getByRole('region', { name: 'Overlay page 1' });
          await waitFor(() => {
            expect(overlayRegion.style.width).toBe('612px');
          });

          expect(overlayRegion.classList.contains('is-draggable')).toBe(true);

          // ArrowRight nudges by +0.01
          fireEvent.keyDown(overlayRegion, { key: 'ArrowRight' });

          // Reset position button should appear once moved
          await waitFor(() => {
            expect(
              screen.getByRole('button', { name: /reset overlay position/i }),
            ).toBeDefined();
          });

          // Clicking Reset position button returns overlay to (0, 0)
          const resetBtn = screen.getByRole('button', { name: /reset overlay position/i });
          fireEvent.click(resetBtn);

          // Once reset to (0, 0), the reset button is hidden
          expect(
            screen.queryByRole('button', { name: /reset overlay position/i }),
          ).toBeNull();
        });

        it('supports pointer dragging to translate overlay across document', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

          render(<Workspace documents={[docMain, docOverlay]} />);

          const select = screen.getByLabelText(
            'Select overlay document',
          ) as HTMLSelectElement;
          fireEvent.change(select, { target: { value: 'doc-overlay' } });

          await waitFor(() => {
            expect(screen.getByRole('region', { name: 'Overlay page 1' })).toBeDefined();
          });

          const overlayRegion = screen.getByRole('region', { name: 'Overlay page 1' });
          await waitFor(() => {
            expect(overlayRegion.style.width).toBe('612px');
          });

          overlayRegion.setPointerCapture = vi.fn();
          overlayRegion.releasePointerCapture = vi.fn();

          fireEvent.pointerDown(overlayRegion, { clientX: 100, clientY: 100, pointerId: 1 });
          fireEvent.pointerMove(overlayRegion, { clientX: 150, clientY: 150, pointerId: 1 });
          fireEvent.pointerUp(overlayRegion, { clientX: 150, clientY: 150, pointerId: 1 });

          // Expect Reset position button to be present
          await waitFor(() => {
            expect(
              screen.getByRole('button', { name: /reset overlay position/i }),
            ).toBeDefined();
          });
        });
      });

      describe('Viewport Pan & Precision Editor Polish (Task 7.5)', () => {
        it('toggles is-space-pressed class on viewport when Space key is pressed and released', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          render(<Workspace documents={[docMain]} />);

          await waitFor(() => {
            expect(screen.getByRole('region', { name: 'PDF page 1' })).toBeDefined();
          });

          const viewport = screen.getByRole('region', { name: 'PDF page 1' }).parentElement!;
          expect(viewport.classList.contains('is-space-pressed')).toBe(false);

          // Space down
          fireEvent.keyDown(window, { key: ' ' });
          expect(viewport.classList.contains('is-space-pressed')).toBe(true);

          // Space up
          fireEvent.keyUp(window, { key: ' ' });
          expect(viewport.classList.contains('is-space-pressed')).toBe(false);
        });

        it('pans the viewport when Spacebar is held and user drags with pointer', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          render(<Workspace documents={[docMain]} />);

          await waitFor(() => {
            expect(screen.getByRole('region', { name: 'PDF page 1' })).toBeDefined();
          });

          const viewport = screen.getByRole('region', { name: 'PDF page 1' }).parentElement!;
          viewport.setPointerCapture = vi.fn();
          viewport.releasePointerCapture = vi.fn();
          viewport.scrollLeft = 100;
          viewport.scrollTop = 100;

          // Press Space
          fireEvent.keyDown(window, { key: ' ' });

          // Start drag at (200, 200)
          fireEvent.pointerDown(viewport, { clientX: 200, clientY: 200, pointerId: 1, button: 0 });
          expect(viewport.classList.contains('is-panning')).toBe(true);

          // Drag by -50px X, -30px Y (moves viewport scroll by +50px X, +30px Y)
          fireEvent.pointerMove(viewport, { clientX: 150, clientY: 170, pointerId: 1 });
          expect(viewport.scrollLeft).toBe(150);
          expect(viewport.scrollTop).toBe(130);

          // Release drag
          fireEvent.pointerUp(viewport, { clientX: 150, clientY: 170, pointerId: 1 });
          expect(viewport.classList.contains('is-panning')).toBe(false);
        });

        it('pans the viewport with middle-mouse click drag without needing Spacebar', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          render(<Workspace documents={[docMain]} />);

          await waitFor(() => {
            expect(screen.getByRole('region', { name: 'PDF page 1' })).toBeDefined();
          });

          const viewport = screen.getByRole('region', { name: 'PDF page 1' }).parentElement!;
          viewport.setPointerCapture = vi.fn();
          viewport.releasePointerCapture = vi.fn();
          viewport.scrollLeft = 50;
          viewport.scrollTop = 50;

          // Middle mouse button is button: 1
          fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100, pointerId: 2, button: 1 });
          expect(viewport.classList.contains('is-panning')).toBe(true);

          // Drag to (80, 70) -> dx = -20, dy = -30
          fireEvent.pointerMove(viewport, { clientX: 80, clientY: 70, pointerId: 2 });
          expect(viewport.scrollLeft).toBe(70);
          expect(viewport.scrollTop).toBe(80);

          fireEvent.pointerUp(viewport, { clientX: 80, clientY: 70, pointerId: 2 });
          expect(viewport.classList.contains('is-panning')).toBe(false);
        });

        it('exits active crop mode when Escape key is pressed', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

          render(<Workspace documents={[docMain, docOverlay]} />);

          const select = screen.getByLabelText(
            'Select overlay document',
          ) as HTMLSelectElement;
          fireEvent.change(select, { target: { value: 'doc-overlay' } });

          await waitFor(() => {
            expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
          });

          // Enter crop mode
          fireEvent.click(screen.getByRole('button', { name: /crop overlay/i }));

          await waitFor(() => {
            expect(screen.getByRole('button', { name: /done cropping/i })).toBeDefined();
          });

          // Press Escape globally
          fireEvent.keyDown(window, { key: 'Escape' });

          // Should exit crop mode
          await waitFor(() => {
            expect(screen.getByRole('button', { name: /crop overlay/i })).toBeDefined();
          });
        });

        it('removes overlay when Delete key is pressed on focused overlay', async () => {
          const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
          const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

          render(<Workspace documents={[docMain, docOverlay]} />);

          const select = screen.getByLabelText(
            'Select overlay document',
          ) as HTMLSelectElement;
          fireEvent.change(select, { target: { value: 'doc-overlay' } });

          await waitFor(() => {
            expect(screen.getByRole('region', { name: 'Overlay page 1' })).toBeDefined();
          });

          const overlayRegion = screen.getByRole('region', { name: 'Overlay page 1' });

          // Press Delete on overlay
          fireEvent.keyDown(overlayRegion, { key: 'Delete' });

          // Overlay should now be removed
          await waitFor(() => {
            expect(screen.queryByRole('region', { name: 'Overlay page 1' })).toBeNull();
          });
        });
      });
    });

    describe('Result Preview Synchronization (Phase 8: Task 8.1)', () => {
      it('renders clean composite preview canvas and overlay in Result Preview pane', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        // Both editor overlay and result preview overlay should be rendered
        await waitFor(() => {
          expect(screen.getByRole('region', { name: 'Overlay page 1' })).toBeDefined();
          expect(
            screen.getByRole('region', { name: /result preview overlay page 1/i }),
          ).toBeDefined();
        });

        const previewOverlay = screen.getByRole('region', {
          name: /result preview overlay page 1/i,
        });
        // Result preview overlay must NOT be draggable or have editing cursor
        expect(previewOverlay.classList.contains('is-draggable')).toBe(false);
        expect(previewOverlay.getAttribute('tabIndex')).toBe('-1');

        // Result preview footer should display dynamic overlay count
        expect(screen.getByText('Output: Page 1 • 1 Overlay')).toBeDefined();
      });

      it('synchronizes opacity, scale, and crop with Result Preview without showing handles', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const docOverlay = makeDoc({ id: 'doc-overlay', name: 'overlay.pdf' });

        render(<Workspace documents={[docMain, docOverlay]} />);

        const select = screen.getByLabelText(
          'Select overlay document',
        ) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'doc-overlay' } });

        await waitFor(() => {
          expect(
            screen.getByRole('region', { name: /result preview overlay page 1/i }),
          ).toBeDefined();
        });

        // Adjust opacity slider to 50%
        const opacitySlider = screen.getByLabelText('Overlay opacity');
        fireEvent.change(opacitySlider, { target: { value: '50' } });

        const previewOverlay = screen.getByRole('region', {
          name: /result preview overlay page 1/i,
        });
        expect(previewOverlay.style.opacity).toBe('0.5');

        // Enter crop mode
        fireEvent.click(screen.getByRole('button', { name: /crop overlay/i }));

        // Crop handles should appear in Editor pane, but NEVER in Result Preview
        const cropHandles = screen.getAllByRole('button', { name: /resize crop/i });
        expect(cropHandles.length).toBe(4); // Only the 4 corner handles on the editor box

        // Preview overlay has no crop handles inside it
        expect(previewOverlay.querySelector('.crop-selection-box')).toBeNull();
      });
    });

    describe('Synchronized Preview Controls & View Modes (Phase 8: Task 8.2)', () => {
      it('renders view controls, page navigation, and live badge in Result Preview', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        render(<Workspace documents={[docMain]} />);

        // Live status badge
        expect(screen.getByText('Live Composite')).toBeDefined();

        // Preview view controls toolbar
        expect(
          screen.getByRole('toolbar', { name: /result preview view controls/i }),
        ).toBeDefined();

        // Preview page navigation
        expect(screen.getByRole('button', { name: /previous preview page/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /next preview page/i })).toBeDefined();

        // Preview zoom controls
        expect(screen.getByRole('button', { name: /preview zoom in/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /preview zoom out/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /fit preview to screen/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /sync preview zoom with editor/i })).toBeDefined();
      });

      it('synchronizes page navigation between Editor and Result Preview', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        render(<Workspace documents={[docMain]} />);

        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });

        // Click next page in Result Preview
        const previewNextBtn = screen.getByRole('button', { name: /next preview page/i });
        fireEvent.click(previewNextBtn);

        // Both Editor and Result Preview indicators should update to Page 2
        await waitFor(() => {
          expect(screen.getByText('Page 2 of 3')).toBeDefined();
          expect(screen.getByLabelText('Preview page 2 of 3')).toBeDefined();
        });
      });

      it('adjusts preview zoom independently without modifying editor zoom', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        render(<Workspace documents={[docMain]} />);

        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });

        // Editor starts at 100%
        expect(screen.getByLabelText(/Current zoom: 100%/i)).toBeDefined();

        // Zoom in on Result Preview
        const previewZoomInBtn = screen.getByRole('button', { name: /preview zoom in/i });
        fireEvent.click(previewZoomInBtn);

        // Preview zoom updates to 125%
        await waitFor(() => {
          expect(screen.getByLabelText(/Current preview zoom: 125%/i)).toBeDefined();
        });

        // Editor zoom should still be 100%
        expect(screen.getByLabelText(/Current zoom: 100%/i)).toBeDefined();
        expect(screen.getByText(/Custom Zoom • 100% Client-Side/i)).toBeDefined();
      });

      it('toggles Sync mode to synchronize preview zoom with editor zoom', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        render(<Workspace documents={[docMain]} />);

        await waitFor(() => {
          expect(screen.getByText('Page 1 of 3')).toBeDefined();
        });

        // Click Sync button in Result Preview
        const syncBtn = screen.getByRole('button', { name: /sync preview zoom with editor/i });
        fireEvent.click(syncBtn);

        // Preview zoom now syncs with Editor (which is at 100%)
        await waitFor(() => {
          expect(screen.getByLabelText(/current preview zoom: 100%/i)).toBeDefined();
          expect(screen.getByText(/Synced with Editor • 100% Client-Side/i)).toBeDefined();
        });

        // Click Fit to Page button to switch back to Auto-Fit
        const fitBtn = screen.getByRole('button', { name: /fit preview to screen/i });
        fireEvent.click(fitBtn);

        await waitFor(() => {
          expect(screen.getByText(/Auto-Fit • 100% Client-Side/i)).toBeDefined();
        });
      });
    });

    describe('Maximized Preview Mode & Layout Toggles (Phase 8: Task 8.3)', () => {
      it('renders maximize preview toggle button in Result Preview toolbar', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        render(<Workspace documents={[docMain]} />);

        const maxBtn = screen.getByRole('button', { name: /maximize preview/i });
        expect(maxBtn).toBeDefined();
        expect(maxBtn.getAttribute('title')).toContain('Maximize preview (full workspace)');
      });

      it('toggles maximized preview mode and expands Result Preview', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const { container } = render(<Workspace documents={[docMain]} />);

        const panes = container.querySelector('.workspace-panes');
        expect(panes?.classList.contains('preview-maximized')).toBe(false);

        const maxBtn = screen.getByRole('button', { name: /maximize preview/i });
        fireEvent.click(maxBtn);

        // Panes grid now has preview-maximized class
        expect(panes?.classList.contains('preview-maximized')).toBe(true);

        // Result Preview header displays Maximized badge
        expect(screen.getByText('Maximized')).toBeDefined();

        // Footer indicates Maximized state
        expect(screen.getByText(/• Maximized • 100% Client-Side/i)).toBeDefined();

        // Button label updates to exit
        const restoreBtn = screen.getByRole('button', { name: /exit maximized preview/i });
        expect(restoreBtn).toBeDefined();
        expect(restoreBtn.textContent).toContain('Restore');
      });

      it('restores split workspace when clicking Restore button in maximized mode', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const { container } = render(<Workspace documents={[docMain]} />);

        const panes = container.querySelector('.workspace-panes');

        // Enter maximized mode
        fireEvent.click(screen.getByRole('button', { name: /maximize preview/i }));
        expect(panes?.classList.contains('preview-maximized')).toBe(true);

        // Click Restore
        fireEvent.click(screen.getByRole('button', { name: /exit maximized preview/i }));
        expect(panes?.classList.contains('preview-maximized')).toBe(false);

        // Maximized badge is removed
        expect(screen.queryByText('Maximized')).toBeNull();
      });

      it('exits maximized preview mode when pressing Escape key', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const { container } = render(<Workspace documents={[docMain]} />);

        const panes = container.querySelector('.workspace-panes');

        // Enter maximized mode
        fireEvent.click(screen.getByRole('button', { name: /maximize preview/i }));
        expect(panes?.classList.contains('preview-maximized')).toBe(true);

        // Press Escape
        fireEvent.keyDown(window, { key: 'Escape' });

        expect(panes?.classList.contains('preview-maximized')).toBe(false);
      });
    });

    describe('Workspace UI/UX Cleanup & Symmetrical Controls', () => {
      it('renders complete control set (Zoom Out, %, Zoom In, Fit, Maximize) in Editor Workspace', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        render(<Workspace documents={[docMain]} />);

        const editorToolbar = screen.getByRole('toolbar', { name: /editor view controls/i });
        expect(editorToolbar).toBeDefined();

        expect(screen.getByRole('button', { name: /^zoom out$/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /^zoom in$/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /fit to screen/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /maximize editor/i })).toBeDefined();
      });

      it('toggles maximized editor mode and restores on button click or Escape', async () => {
        const docMain = makeDoc({ id: 'doc-main', name: 'main.pdf' });
        const { container } = render(<Workspace documents={[docMain]} />);

        const panes = container.querySelector('.workspace-panes');
        expect(panes?.classList.contains('editor-maximized')).toBe(false);

        const maxEditorBtn = screen.getByRole('button', { name: /maximize editor/i });
        fireEvent.click(maxEditorBtn);

        // Grid has editor-maximized class
        expect(panes?.classList.contains('editor-maximized')).toBe(true);

        // Editor shows Maximized badge
        expect(screen.getByText('Maximized')).toBeDefined();

        // Button label changes to exit
        const restoreBtn = screen.getByRole('button', { name: /exit maximized editor/i });
        expect(restoreBtn).toBeDefined();

        // Press Escape key
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(panes?.classList.contains('editor-maximized')).toBe(false);
      });

      it('displays graceful, non-misleading empty states when no document is loaded', async () => {
        render(<Workspace documents={[]} />);

        // Header badges reflect empty state
        expect(screen.getByText('No Document')).toBeDefined();
        expect(screen.getByText('Waiting for Document')).toBeDefined();

        // Footer indicators reflect no document
        expect(screen.getByText('No document')).toBeDefined();
        expect(screen.getByText('— / —')).toBeDefined();

        // Overlay dropdown prompts to upload
        expect(screen.getByText('Upload a document')).toBeDefined();

        // Zoom and page buttons are disabled
        const zoomInBtn = screen.getByRole('button', { name: /^zoom in$/i }) as HTMLButtonElement;
        expect(zoomInBtn.disabled).toBe(true);

        const prevPageBtn = screen.getByRole('button', { name: /^previous page$/i }) as HTMLButtonElement;
        expect(prevPageBtn.disabled).toBe(true);
      });
    });

    describe('Client-Side PDF Generation & Download (Phase 9: Task 9.3)', () => {
      it('disables the Download PDF button when no document is loaded', () => {
        render(<Workspace documents={[]} />);

        const downloadBtn = screen.getByRole('button', { name: /download pdf/i }) as HTMLButtonElement;
        expect(downloadBtn.disabled).toBe(true);
      });

      it('enables the Download PDF button when a main document is loaded', () => {
        const doc = makeDoc({ id: 'main-1', name: 'agreement.pdf' });
        render(<Workspace documents={[doc]} />);

        const downloadBtn = screen.getByRole('button', { name: /download pdf/i }) as HTMLButtonElement;
        expect(downloadBtn.disabled).toBe(false);
      });

      it('calls generatePdf and downloadPdfBlob when Download PDF button is clicked', async () => {
        const docMain = makeDoc({ id: 'main-1', name: 'agreement.pdf' });
        const docOverlay = makeDoc({ id: 'sig-1', name: 'sig.pdf' });
        const onGenerateSuccess = vi.fn();

        const pdfServices = await import('@/services/pdf');
        const mockBlob = new Blob(['mock-pdf'], { type: 'application/pdf' });
        const generatePdfSpy = vi.spyOn(pdfServices, 'generatePdf').mockResolvedValue({
          blob: mockBlob,
          bytes: new Uint8Array([1, 2, 3]),
          filename: 'agreement_signed.pdf',
        });
        const downloadBlobSpy = vi.spyOn(pdfServices, 'downloadPdfBlob').mockImplementation(() => {});

        render(
          <Workspace
            documents={[docMain, docOverlay]}
            onGeneratePdfSuccess={onGenerateSuccess}
          />,
        );

        const downloadBtn = screen.getByRole('button', { name: /download pdf/i });
        fireEvent.click(downloadBtn);

        await waitFor(() => {
          expect(generatePdfSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              mainDocument: expect.objectContaining({ id: 'main-1' }),
            }),
          );
          expect(downloadBlobSpy).toHaveBeenCalledWith(mockBlob, 'agreement_signed.pdf');
          expect(onGenerateSuccess).toHaveBeenCalledWith('agreement_signed.pdf');
        });

        generatePdfSpy.mockRestore();
        downloadBlobSpy.mockRestore();
      });

      it('displays error alert when generatePdf rejects with an error', async () => {
        const docMain = makeDoc({ id: 'main-1', name: 'corrupt.pdf' });
        const onGenerateError = vi.fn();

        const pdfServices = await import('@/services/pdf');
        const generatePdfSpy = vi
          .spyOn(pdfServices, 'generatePdf')
          .mockRejectedValue(new Error('Corrupted PDF header'));
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
          <Workspace
            documents={[docMain]}
            onGeneratePdfError={onGenerateError}
          />,
        );

        const downloadBtn = screen.getByRole('button', { name: /download pdf/i });
        fireEvent.click(downloadBtn);

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeDefined();
          expect(screen.getByText('Corrupted PDF header')).toBeDefined();
          expect(onGenerateError).toHaveBeenCalledWith('Corrupted PDF header');
        });

        // Dismiss alert
        const dismissBtn = screen.getByRole('button', { name: /dismiss alert/i });
        fireEvent.click(dismissBtn);

        await waitFor(() => {
          expect(screen.queryByRole('alert')).toBeNull();
        });

        generatePdfSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });
  });
});


