import React from 'react';
import { Modal, Button, Badge } from '@/components/ui';
import { ShieldCheck, Layers, Cpu, Lock } from 'lucide-react';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About SignStack"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          fontSize: 'var(--text-sm)',
        }}
      >
        {/* Privacy Highlight Banner */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <ShieldCheck
            size={24}
            style={{ color: 'var(--success-text)', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              100% Client-Side Privacy
            </div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                marginTop: '2px',
              }}
            >
              Your documents never leave your browser. All PDF rendering,
              cropping, and stacking occur entirely in local memory.
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div>
          <h4
            style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            How SignStack Works
          </h4>
          <ol
            style={{
              paddingLeft: '1.25rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              lineHeight: 1.4,
            }}
          >
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>
                Upload PDFs:
              </strong>{' '}
              Add two or more documents to your local session.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>
                Select Base & Overlay:
              </strong>{' '}
              Designate one PDF as the foundation and choose an overlay
              document.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>
                Optional Precision Crop:
              </strong>{' '}
              Select just a signature, date, stamp, or field from the overlay
              page.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>
                Position & Preview:
              </strong>{' '}
              Adjust location, scale, and opacity in real time in the{' '}
              <code>EDITOR | RESULT</code> view.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Export:</strong>{' '}
              Download your finished composite PDF instantly.
            </li>
          </ol>
        </div>

        {/* Technical Architecture Pills */}
        <div
          style={{
            borderTop: '1px solid var(--border-default)',
            paddingTop: 'var(--space-3)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Architecture Highlights
          </div>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}
          >
            <Badge variant="neutral" size="sm">
              <Cpu size={12} /> Pure Client-Side
            </Badge>
            <Badge variant="neutral" size="sm">
              <Lock size={12} /> Zero Server Tracking
            </Badge>
            <Badge variant="neutral" size="sm">
              <Layers size={12} /> Dual-Pane Canvas
            </Badge>
          </div>
        </div>
      </div>
    </Modal>
  );
};
