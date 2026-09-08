import React, { useState, useEffect, useRef } from 'react';
import { AddFilesResult } from '@/hooks';
import { Badge, Button, Spinner, Alert } from '@/components/ui';
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
  FileText,
} from 'lucide-react';
import { UploadedDocument } from '@/types';
import { DocumentCard } from './DocumentCard';
import { PdfPageCanvas } from '@/components/pdf';
import { loadPdfDocument, type PDFDocumentProxy } from '@/services/pdf';
import './Workspace.css';

export type WorkspaceTab = 'editor' | 'result';

export interface WorkspaceProps {
  onUploadClick?: () => void;
  documents?: UploadedDocument[];
  onRemoveDocument?: (id: string) => void;
  onReorderDocuments?: (startIndex: number, endIndex: number) => void;
  /** Called when the user moves a document up or down one position */
  onMoveDocument?: (id: string, direction: 'up' | 'down') => void;
  /** Function to add files to document state */
  addFiles?: (files: File[] | FileList) => Promise<AddFilesResult>;
  /** Optional controlled ID for the main document */
  mainDocumentId?: string;
  /** Optional callback when the main document selection changes */
  onSelectMainDocument?: (id: string) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  onUploadClick,
  documents = [],
  onRemoveDocument,
  onMoveDocument,
  onReorderDocuments,
  addFiles,
  mainDocumentId,
  onSelectMainDocument,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main Document: controlled if mainDocumentId is passed, otherwise local state defaulting to first document
  const [internalMainDocId, setInternalMainDocId] = useState<string | null>(null);
  const activeMainDocId = mainDocumentId ?? internalMainDocId;

  const mainDoc =
    documents.find((doc) => doc.id === activeMainDocId) ??
    (documents.length > 0 ? documents[0] : null);

  const handleSelectMainDoc = (id: string) => {
    setInternalMainDocId(id);
    onSelectMainDocument?.(id);
  };

  // Drag-and-drop state for queue reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCardDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleCardDragOver = (e: React.DragEvent<HTMLElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleCardDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleCardDrop = (e: React.DragEvent<HTMLElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorderDocuments?.(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const [docState, setDocState] = useState<{
    docId: string | null;
    pdfDoc: PDFDocumentProxy | null;
    error: string | null;
  }>({
    docId: null,
    pdfDoc: null,
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    if (!mainDoc) {
      return;
    }

    loadPdfDocument(mainDoc.file, mainDoc.id)
      .then((doc) => {
        if (!isCancelled) {
          setDocState({
            docId: mainDoc.id,
            pdfDoc: doc,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setDocState({
            docId: mainDoc.id,
            pdfDoc: null,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to load PDF document.',
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [mainDoc]);

  const isDocLoading = Boolean(
    mainDoc && docState.docId !== mainDoc.id && !docState.error,
  );
  const pdfDoc =
    mainDoc && docState.docId === mainDoc.id ? docState.pdfDoc : null;
  const docError =
    mainDoc && docState.docId === mainDoc.id ? docState.error : null;

  return (
    <div className="workspace-container">
      {/* Top Document Tray */}
      <section
        className="document-tray"
        aria-label="Document Queue"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const files = e.dataTransfer.files;
          if (files && addFiles) {
            addFiles(files);
          }
        }}
      >
        <div className="document-tray-header">
          <Badge variant="neutral" size="sm">
            <FileSpreadsheet size={12} />
            Queue
          </Badge>
          <span className="document-tray-title">Uploaded Documents</span>
          {documents.length > 0 && (
            <span className="document-tray-count">
              Documents · {documents.length}
            </span>
          )}
        </div>

        <div className="document-tray-cards">
          {documents.length > 0 ? (
            documents.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                position={index + 1}
                totalDocuments={documents.length}
                isMain={doc.id === mainDoc?.id}
                onSetMain={handleSelectMainDoc}
                onRemove={onRemoveDocument ?? (() => {})}
                onMoveUp={(id) => onMoveDocument?.(id, 'up')}
                onMoveDown={(id) => onMoveDocument?.(id, 'down')}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index && draggedIndex !== index}
                onDragStart={() => handleCardDragStart(index)}
                onDragOver={(e) => handleCardDragOver(e, index)}
                onDragEnd={handleCardDragEnd}
                onDrop={(e) => handleCardDrop(e, index)}
              />
            ))
          ) : (
            <span className="document-tray-empty-hint">
              Upload a PDF to get started. Your documents will appear here.
            </span>
          )}
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          multiple
          accept="application/pdf"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={(e) => {
            const files = e.target.files;
            if (files && addFiles) {
              addFiles(files);
            }
          }}
        />
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload size={14} />}
          style={{ flexShrink: 0 }}
          onClick={() => {
            fileInputRef.current?.click();
            if (onUploadClick) onUploadClick();
          }}
        >
          + Add PDFs
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
              <Badge variant="primary" size="sm">
                Main Document
              </Badge>
              {mainDoc && (
                <span className="pane-document-name" title={mainDoc.name}>
                  {mainDoc.name}
                </span>
              )}
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
            {!mainDoc ? (
              <div className="viewport-empty-card">
                <div className="viewport-empty-icon" aria-hidden="true">
                  <FileText size={26} />
                </div>
                <h3 className="viewport-empty-title">No Document Loaded</h3>
                <p className="viewport-empty-description">
                  Upload a PDF to view and edit it in the workspace.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload a Document
                </Button>
              </div>
            ) : isDocLoading ? (
              <div className="viewport-loading-state">
                <Spinner size="lg" label={`Loading ${mainDoc.name}...`} />
                <span className="viewport-loading-text">
                  Loading {mainDoc.name}...
                </span>
              </div>
            ) : docError ? (
              <div className="viewport-error-state">
                <Alert variant="danger" title="Unable to render document">
                  {docError}
                </Alert>
              </div>
            ) : (
              <PdfPageCanvas document={pdfDoc} pageNumber={1} />
            )}
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
              <span>Page 1 of {pdfDoc?.numPages ?? 1}</span>
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
