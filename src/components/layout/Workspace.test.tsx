import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Workspace } from './Workspace';

describe('Workspace component', () => {
  it('renders Document Tray with upload button and empty queue state', () => {
    render(<Workspace />);
    expect(screen.getByText('Uploaded Documents')).toBeDefined();
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeDefined();
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

  it('renders document badges when documents are provided', () => {
    const mockFile = new File(['%PDF-1.4 sample'], 'invoice.pdf', {
      type: 'application/pdf',
    });
    const mockDoc = {
      id: 'doc-1',
      file: mockFile,
      name: 'invoice.pdf',
      size: 1500,
      formattedSize: '1.5 KB',
      type: 'application/pdf',
      uploadedAt: Date.now(),
    };

    render(<Workspace documents={[mockDoc]} />);
    expect(screen.getByText(/1\. invoice\.pdf \(1\.5 KB\)/i)).toBeDefined();
    expect(screen.queryByText(/no pdfs loaded/i)).toBeNull();
  });
});
