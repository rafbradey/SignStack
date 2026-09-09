import React, { useState, useEffect } from 'react';
import { Badge, Button } from '@/components/ui';
import { Layers, ShieldCheck, HelpCircle, Keyboard } from 'lucide-react';
import { AboutModal } from './AboutModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import './Header.css';

export interface HeaderProps {
  rightActions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ rightActions }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Global listener for '?' key to toggle shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (isInput) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="app-header" role="banner">
        {/* Brand Group */}
        <div className="header-brand">
          <div className="header-logo-badge" aria-hidden="true">
            <Layers size={20} />
          </div>
          <div className="header-title-group">
            <span className="header-title">SignStack</span>
            <span className="header-subtitle">
              PDF Stacking & Precision Overlay
            </span>
          </div>
        </div>

        {/* Center: Privacy Status */}
        <div className="header-status-area">
          <Badge variant="success" size="md" withDot>
            <ShieldCheck size={13} aria-hidden="true" />
            100% Client-Side / Local
          </Badge>
        </div>

        {/* Right Actions & Navigation */}
        <nav className="header-actions" aria-label="Main Navigation">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsShortcutsOpen(true)}
            leftIcon={<Keyboard size={15} />}
            title="Keyboard Shortcuts (?)"
            aria-label="Shortcuts"
          >
            <span className="header-btn-text">Shortcuts</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAboutOpen(true)}
            leftIcon={<HelpCircle size={15} />}
            title="How SignStack works"
            aria-label="How it works"
          >
            <span className="header-btn-text">How it works</span>
          </Button>
          {rightActions}
        </nav>
      </header>

      {/* About & Privacy Information Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </>
  );
};
