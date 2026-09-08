import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button primitive', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('applies variant and size classes', () => {
    const { container } = render(
      <Button variant="danger" size="sm">
        Delete
      </Button>,
    );
    const button = container.querySelector('button');
    expect(button?.classList.contains('btn-danger')).toBe(true);
    expect(button?.classList.contains('btn-sm')).toBe(true);
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Action</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button and displays spinner when isLoading is true', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Saving
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('disabled')).toBeDefined();
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
