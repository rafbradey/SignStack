import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback to render instead of default error card */
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  /** Optional callback fired when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional callback fired when the user resets/retries */
  onReset?: () => void;
  /** Optional custom title for default fallback card */
  title?: string;
  /** Optional custom message for default fallback card */
  message?: string;
  /** Optional CSS class name for wrapper */
  className?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Robust React Error Boundary component that catches unexpected rendering
 * exceptions in child components, preventing application crashes (white screen).
 *
 * Provides an accessible error card with an actionable "Try Again" recovery trigger.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    console.error('SignStack caught an unhandled rendering error:', error, errorInfo);
  }

  resetError = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, title, message, className = '' } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError);
      }
      if (fallback) {
        return fallback;
      }

      return (
        <div
          role="alert"
          className={`error-boundary-card ${className}`.trim()}
          style={{
            padding: 'var(--space-6)',
            margin: 'var(--space-4)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 'var(--space-3)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'var(--danger-subtle)',
              color: 'var(--danger-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={24} />
          </div>

          <h3
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {title || 'Something went wrong'}
          </h3>

          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              maxWidth: 480,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {message ||
              error.message ||
              'An unexpected error occurred while displaying this part of the workspace.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-2)',
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={this.resetError}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}
