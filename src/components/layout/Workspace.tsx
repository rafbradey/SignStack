import React, { useState } from 'react';
import { Badge, Button } from '@/components/ui';
import {
  Upload,
  Layers,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';
import './Workspace.css';

export type WorkspaceTab = 'editor' | 'result';

export interface WorkspaceProps {
  onUploadClick?: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ onUploadClick }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');

  return (
    <div className="workspace-container">
      {/* Top Document Tray */}
      <section className="document-tray" aria-label="Document Queue">
        <div className="document-tray-header">
          <Badge variant="neutral" size="sm">
            <FileSpreadsheet size={12} />
            Queue
          </Badge>
          <span className="document-tray-title">Uploaded Documents</span>
        </div>

        <div className="document-tray-chips">
          <span className="document-tray-empty-hint">
            No PDFs loaded. Document cards will appear here in Phase 3.
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload size={14} />}
          onClick={onUploadClick}
        >
          Upload PDF
        </Button>
      </section>

      {/* Responsive View Switcher (for small viewports) */}
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Workspace View"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'editor'}
          className={`workspace-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <Layers size={14} />
          Editor Workspace
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'result'}
          className={`workspace-tab-btn ${activeTab === 'result' ? 'active' : ''}`}
          onClick={() => setActiveTab('result')}
        >
          <Eye size={14} />
          Result Preview
        </button>
      </div>

      {/* Main Dual-Pane Grid (EDITOR | RESULT) */}
      <div className="workspace-panes">
        {/* Left Pane: Editor */}
        <section
          className={`workspace-pane ${activeTab !== 'editor' ? 'hidden-on-mobile' : ''}`}
          aria-label="Editor Workspace"
        >
          <div className="pane-header">
            <div className="pane-title-group">
              <span className="pane-title">Editor Workspace</span>
              <Badge variant="neutral" size="sm">
                Base
              </Badge>
            </div>

            <div className="pane-toolbar">
              <Button variant="ghost" size="sm" aria-label="Zoom out" disabled>
                <ZoomOut size={14} />
              </Button>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                100%
              </span>
              <Button variant="ghost" size="sm" aria-label="Zoom in" disabled>
                <ZoomIn size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fit to screen"
                disabled
              >
                <Maximize2 size={14} />
              </Button>
            </div>
          </div>

          <div className="pane-viewport">
            <div className="viewport-empty-card">
              <div className="viewport-empty-icon" aria-hidden="true">
                <Layers size={26} />
              </div>
              <h3 className="viewport-empty-title">Editor Canvas Ready</h3>
              <p className="viewport-empty-description">
                In <strong>Phase 4</strong>, your selected base PDF will render
                here for interactive cropping, overlay alignment, and opacity
                adjustments.
              </p>
              <Badge variant="primary" size="sm">
                Awaiting Phase 3 (Upload)
              </Badge>
            </div>
          </div>

          <div className="pane-footer">
            <div className="editor-control-group">
              <Button
                variant="ghost"
                size="sm"
                disabled
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </Button>
              <span>Page 1 of 1</span>
              <Button variant="ghost" size="sm" disabled aria-label="Next page">
                <ChevronRight size={14} />
              </Button>
            </div>

            <div className="editor-control-group">
              <Sliders size={14} style={{ color: 'var(--text-muted)' }} />
              <span>Overlay Controls: Ready</span>
            </div>
          </div>
        </section>

        {/* Right Pane: Result Preview */}
        <section
          className={`workspace-pane ${activeTab !== 'result' ? 'hidden-on-mobile' : ''}`}
          aria-label="Result Preview"
        >
          <div className="pane-header">
            <div className="pane-title-group">
              <span className="pane-title">Result Preview</span>
              <Badge variant="primary" size="sm" withDot>
                Live Preview
              </Badge>
            </div>

            <div className="pane-toolbar">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download size={14} />}
                disabled
                title="PDF generation available in Phase 9"
              >
                Download PDF
              </Button>
            </div>
          </div>

          <div className="pane-viewport">
            <div className="viewport-empty-card">
              <div
                className="viewport-empty-icon"
                style={{
                  backgroundColor: 'var(--success-subtle)',
                  color: 'var(--success-text)',
                }}
                aria-hidden="true"
              >
                <Eye size={26} />
              </div>
              <h3 className="viewport-empty-title">Live Composite Output</h3>
              <p className="viewport-empty-description">
                In <strong>Phase 8</strong>, the final composited document will
                reflect your overlay edits in real time so you always know what
                your downloaded PDF looks like.
              </p>
              <Badge variant="success" size="sm">
                Awaiting Phase 8 (Result Preview)
              </Badge>
            </div>
          </div>

          <div className="pane-footer">
            <div className="editor-control-group">
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                Output: Ready • 0 Layers
              </span>
            </div>
            <div className="editor-control-group">
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                }}
              >
                100% Client-Side
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
