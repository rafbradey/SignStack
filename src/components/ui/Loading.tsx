import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label = 'Loading...',
}) => {
  const pixelSize = size === 'sm' ? 16 : size === 'lg' ? 32 : 24;

  return (
    <span
      role="status"
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      className={className}
    >
      <Loader2 className="spinner" size={pixelSize} />
      <span
        className="sr-only"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {label}
      </span>
    </span>
  );
};

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: borderRadius ?? undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};
