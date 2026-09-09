import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import * as hooks from '@/hooks';

// Mock loadPdfDocument to prevent canvas render errors
vi.mock('@/services/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/pdf')>();
  return {
    ...actual,
    loadPdfDocument: vi.fn(),
  };
});

describe('App component', () => {
  it('renders Header and Workspace', () => {
    render(<App />);

    expect(screen.getByText('SignStack')).toBeDefined();
    expect(screen.getByText('Uploaded Documents')).toBeDefined();
    expect(screen.getByText('No Document Loaded')).toBeDefined();
  });

  it('renders validation errors and calls dismissError for the specific error when dismissed', () => {
    const mockDismissError = vi.fn();
    vi.spyOn(hooks, 'useDocuments').mockReturnValue({
      documents: [],
      validationErrors: [
        {
          code: 'INVALID_FILE_TYPE',
          message: 'Only PDF documents (.pdf) are supported.',
          fileName: 'notes.txt',
        },
        {
          code: 'EMPTY_FILE',
          message: 'The file is empty (0 bytes).',
          fileName: 'empty.pdf',
        },
      ],
      isProcessing: false,
      addFiles: vi.fn(),
      removeDocument: vi.fn(),
      reorderDocuments: vi.fn(),
      moveDocument: vi.fn(),
      clearDocuments: vi.fn(),
      clearErrors: vi.fn(),
      dismissError: mockDismissError,
    });

    render(<App />);

    expect(screen.getByText('Validation Error: notes.txt')).toBeDefined();
    expect(screen.getByText('Validation Error: empty.pdf')).toBeDefined();

    // Click dismiss button on the first alert
    const dismissButtons = screen.getAllByRole('button', {
      name: /dismiss alert/i,
    });
    expect(dismissButtons).toHaveLength(2);

    fireEvent.click(dismissButtons[0]);
    expect(mockDismissError).toHaveBeenCalledWith(0);

    fireEvent.click(dismissButtons[1]);
    expect(mockDismissError).toHaveBeenCalledWith(1);
  });
});
