import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert primitive', () => {
  it('renders alert with title and description', () => {
    render(
      <Alert variant="danger" title="Corrupt PDF">
        This file could not be read.
      </Alert>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Corrupt PDF')).toBeDefined();
    expect(screen.getByText('This file could not be read.')).toBeDefined();
  });

  it('triggers onDismiss when close button is clicked', () => {
    const handleDismiss = vi.fn();
    render(
      <Alert variant="warning" onDismiss={handleDismiss}>
        Warning notice
      </Alert>,
    );
    const dismissButton = screen.getByLabelText('Dismiss alert');
    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
