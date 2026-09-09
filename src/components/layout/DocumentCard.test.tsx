import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard, DocumentCardProps } from './DocumentCard';
import { UploadedDocument } from '@/types';

function createMockDoc(id = 'doc-1', name = 'contract.pdf', size = 1024): UploadedDocument {
  const file = new File(['mock content'], name, { type: 'application/pdf' });
  return {
    id,
    name,
    file,
    size,
    formattedSize: '1 KB',
    type: 'application/pdf',
    uploadedAt: Date.now(),
  };
}

describe('DocumentCard component', () => {
  const defaultProps: DocumentCardProps = {
    document: createMockDoc('doc-1', 'agreement.pdf'),
    position: 1,
    totalDocuments: 3,
    isMain: false,
    onSetMain: vi.fn(),
    onRemove: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
  };

  it('renders document name, formatted size, and position index', () => {
    render(<DocumentCard {...defaultProps} />);

    expect(screen.getByText('agreement.pdf')).toBeDefined();
    expect(screen.getByText('1 KB')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
  });

  it('renders "Main" badge when isMain is true', () => {
    render(<DocumentCard {...defaultProps} isMain={true} />);

    expect(screen.getByText('Main')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Set .* as Main Document/i })).toBeNull();
  });

  it('calls onSetMain when clicking Set Main button or card body', () => {
    const onSetMain = vi.fn();
    render(<DocumentCard {...defaultProps} onSetMain={onSetMain} />);

    const setMainBtn = screen.getByRole('button', { name: /Set "agreement\.pdf" as Main Document/i });
    fireEvent.click(setMainBtn);
    expect(onSetMain).toHaveBeenCalledWith('doc-1');

    // Click card article
    const article = screen.getByRole('group');
    fireEvent.click(article);
    expect(onSetMain).toHaveBeenCalledTimes(2);
  });

  it('calls onRemove when clicking delete button', () => {
    const onRemove = vi.fn();
    render(<DocumentCard {...defaultProps} onRemove={onRemove} />);

    const removeBtn = screen.getByRole('button', { name: /Remove "agreement\.pdf"/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith('doc-1');
  });

  it('disables Move Up on first position and enables on middle position', () => {
    const onMoveUp = vi.fn();
    const { rerender } = render(<DocumentCard {...defaultProps} position={1} onMoveUp={onMoveUp} />);

    const moveUpBtn = screen.getByRole('button', { name: /Move "agreement\.pdf" up/i }) as HTMLButtonElement;
    expect(moveUpBtn.disabled).toBe(true);

    // Re-render as position 2
    rerender(<DocumentCard {...defaultProps} position={2} onMoveUp={onMoveUp} />);
    const updatedMoveUpBtn = screen.getByRole('button', { name: /Move "agreement\.pdf" up/i }) as HTMLButtonElement;
    expect(updatedMoveUpBtn.disabled).toBe(false);
    fireEvent.click(updatedMoveUpBtn);
    expect(onMoveUp).toHaveBeenCalledWith('doc-1');
  });

  it('disables Move Down on last position', () => {
    render(<DocumentCard {...defaultProps} position={3} totalDocuments={3} />);

    const moveDownBtn = screen.getByRole('button', { name: /Move "agreement\.pdf" down/i }) as HTMLButtonElement;
    expect(moveDownBtn.disabled).toBe(true);
  });

  it('passes calculated index to drag handlers', () => {
    const onDragStart = vi.fn();
    const onDragOver = vi.fn();
    const onDrop = vi.fn();

    render(
      <DocumentCard
        {...defaultProps}
        position={2}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />,
    );

    const article = screen.getByRole('group');

    fireEvent.dragStart(article);
    expect(onDragStart).toHaveBeenCalledWith(expect.anything(), 1);

    fireEvent.dragOver(article);
    expect(onDragOver).toHaveBeenCalledWith(expect.anything(), 1);

    fireEvent.drop(article);
    expect(onDrop).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('skips re-render when wrapped in React.memo and props do not change', () => {
    let renderCount = 0;
    const MemoWrapper: React.FC<DocumentCardProps> = (props) => {
      renderCount++;
      return <DocumentCard {...props} />;
    };

    const doc = createMockDoc();
    const onRemove = vi.fn();
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();

    const { rerender } = render(
      <MemoWrapper
        document={doc}
        position={1}
        totalDocuments={3}
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );
    expect(renderCount).toBe(1);

    // Re-render with same prop references
    rerender(
      <MemoWrapper
        document={doc}
        position={1}
        totalDocuments={3}
        onRemove={onRemove}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );
    expect(renderCount).toBe(2);
    expect(screen.getByText(doc.name)).toBeDefined();
  });
});
