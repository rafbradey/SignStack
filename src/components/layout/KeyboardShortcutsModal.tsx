import React from 'react';
import { Modal, Button } from '@/components/ui';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Page Navigation',
    items: [
      { keys: ['[', 'PageUp'], description: 'Previous page' },
      { keys: [']', 'PageDown'], description: 'Next page' },
    ],
  },
  {
    title: 'Zoom & Pan',
    items: [
      { keys: ['+'], description: 'Zoom in' },
      { keys: ['-'], description: 'Zoom out' },
      { keys: ['0'], description: 'Reset zoom to 100%' },
      { keys: ['Space', 'Drag'], description: 'Pan viewport canvas' },
    ],
  },
  {
    title: 'Overlay Controls',
    items: [
      { keys: ['↑', '↓', '←', '→'], description: 'Nudge active overlay by 1px' },
      { keys: ['Shift', 'Arrow'], description: 'Fast nudge active overlay by 10px' },
      { keys: ['Delete', 'Backspace'], description: 'Delete selected overlay' },
      { keys: ['Esc'], description: 'Exit crop mode' },
    ],
  },
  {
    title: 'Layout & Help',
    items: [
      { keys: ['Esc'], description: 'Restore split view from maximized' },
      { keys: ['?'], description: 'Toggle keyboard shortcuts help' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
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
        {SHORTCUT_CATEGORIES.map((category) => (
          <div key={category.title}>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {category.title}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1-5, var(--space-2))',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
              }}
            >
              {category.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-1) 0',
                    borderBottom:
                      idx < category.items.length - 1
                        ? '1px solid var(--border-subtle)'
                        : 'none',
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xs)' }}>
                    {item.description}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                    }}
                  >
                    {item.keys.map((k, kIdx) => (
                      <kbd key={kIdx} className="kbd-badge">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
