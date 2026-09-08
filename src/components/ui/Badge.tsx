import React from 'react';

export type BadgeVariant =
  'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  withDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  withDot = false,
  className = '',
  ...props
}) => {
  const classes = ['badge', `badge-${variant}`, `badge-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {withDot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
};
