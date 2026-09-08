import React, { useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { Layers, ShieldCheck, HelpCircle } from 'lucide-react';
import { AboutModal } from './AboutModal';
import './Header.css';

export interface HeaderProps {
  rightActions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ rightActions }) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

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
            onClick={() => setIsAboutOpen(true)}
            leftIcon={<HelpCircle size={15} />}
          >
            How it works
          </Button>
          {rightActions}
        </nav>
      </header>

      {/* About & Privacy Information Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};
