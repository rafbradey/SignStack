import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge primitive', () => {
  it('renders badge text correctly', () => {
    render(<Badge>Local Only</Badge>);
    expect(screen.getByText('Local Only')).toBeDefined();
  });

  it('renders dot indicator when withDot is true', () => {
    const { container } = render(
      <Badge variant="success" withDot>
        Active
      </Badge>,
    );
    const dot = container.querySelector('.badge-dot');
    expect(dot).toBeDefined();
    expect(container.firstChild).toHaveProperty(
      'className',
      expect.stringContaining('badge-success'),
    );
  });
});
