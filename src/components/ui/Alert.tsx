import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
}

const variantIcons: Record<AlertVariant, React.ReactElement> = {
  info: <Info size={18} />,
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  danger: <AlertCircle size={18} />,
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
  ...props
}) => {
  return (
    <div
      role="alert"
      className={`alert alert-${variant} ${className}`.trim()}
      {...props}
    >
      <span className="alert-icon">{variantIcons[variant]}</span>
      <div className="alert-content">
        {title && <div className="alert-title">{title}</div>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          style={{ padding: '0.125rem', height: 'auto' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
