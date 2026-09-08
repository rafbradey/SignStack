import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Workspace } from './Workspace';

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
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeDefined();
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
    expect(screen.getByText('Editor Canvas Ready')).toBeDefined();
    expect(screen.getByText('Live Composite Output')).toBeDefined();
  });

  it('triggers onUploadClick callback when upload button is clicked', () => {
    const handleUpload = vi.fn();
    render(<Workspace onUploadClick={handleUpload} />);
    const uploadBtn = screen.getByRole('button', { name: /upload pdf/i });
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

  it('renders a DocumentCard for each provided document', () => {
    const doc = makeDoc();
    render(<Workspace documents={[doc]} />);

    // Document name is visible
    expect(screen.getByText('invoice.pdf')).toBeDefined();
    // Formatted size is visible
    expect(screen.getByText('1.5 KB')).toBeDefined();
    // Empty-state hint is gone
    expect(screen.queryByText(/upload a pdf to get started/i)).toBeNull();
  });

  it('renders cards for multiple documents', () => {
    const docs = [
      makeDoc({ id: 'a', name: 'contract.pdf' }),
      makeDoc({ id: 'b', name: 'receipt.pdf' }),
    ];
    render(<Workspace documents={docs} />);
    expect(screen.getByText('contract.pdf')).toBeDefined();
    expect(screen.getByText('receipt.pdf')).toBeDefined();
  });

  it('calls onRemoveDocument with the correct document id', () => {
    const doc = makeDoc();
    const handleRemove = vi.fn();
    render(<Workspace documents={[doc]} onRemoveDocument={handleRemove} />);

    const removeBtn = screen.getByRole('button', {
      name: /remove "invoice\.pdf"/i,
    });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith('doc-1');
  });

  it('calls onMoveDocument with direction "up" when move-up is clicked', () => {
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
  });
});
