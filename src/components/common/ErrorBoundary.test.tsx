import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Helper component that can throw on demand
function FaultyChild({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test component crashed!');
  }
  return <div>Clean child content</div>;
}

// Wrapper to test recovery
function RecoveryHarness() {
  const [hasCrash, setHasCrash] = useState(true);

  return (
    <ErrorBoundary onReset={() => setHasCrash(false)}>
      <FaultyChild shouldThrow={hasCrash} />
    </ErrorBoundary>
  );
}

describe('ErrorBoundary component', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error in tests to avoid noisy output from intentionally thrown errors
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('catches error in child and renders default accessible fallback card', () => {
    render(
      <ErrorBoundary>
        <FaultyChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Test component crashed!')).toBeDefined();
    expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
  });

  it('invokes onError callback with error details when a crash occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <FaultyChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('recovers when clicking Try Again', () => {
    render(<RecoveryHarness />);

    expect(screen.getByRole('alert')).toBeDefined();

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Clean child content')).toBeDefined();
  });

  it('supports custom fallback element', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Fallback Element</div>}>
        <FaultyChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom Fallback Element')).toBeDefined();
  });

  it('supports custom fallback function receiving error and reset callback', () => {
    render(
      <ErrorBoundary
        fallback={(err, reset) => (
          <div>
            <span>Error: {err.message}</span>
            <button type="button" onClick={reset}>
              Custom Reset
            </button>
          </div>
        )}
      >
        <FaultyChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Error: Test component crashed!')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Custom Reset' })).toBeDefined();
  });

  it('renders custom title and message overrides', () => {
    render(
      <ErrorBoundary
        title="Workspace Failed"
        message="Please reload your PDF file."
      >
        <FaultyChild shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Workspace Failed')).toBeDefined();
    expect(screen.getByText('Please reload your PDF file.')).toBeDefined();
  });
});
