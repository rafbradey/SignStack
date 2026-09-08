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
import { UploadedDocument, PageDimensions } from '@/types';
import { clamp } from '@/utils';
import { DocumentCard } from './DocumentCard';
import { PdfPageCanvas } from '@/components/pdf';
import { loadPdfDocument, type PDFDocumentProxy } from '@/services/pdf';
import './Workspace.css';

export const MIN_ZOOM = 0.5; // 50%
export const MAX_ZOOM = 2.5; // 250%
export const DEFAULT_ZOOM = 1.0; // 100%
export const ZOOM_STEP = 0.25; // 25% step

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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(DEFAULT_ZOOM);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // When the selected main document changes, reset page, zoom, and dimension states
  const currentDocId = mainDoc ? mainDoc.id : null;
  const [prevDocId, setPrevDocId] = useState<string | null>(currentDocId);
  if (currentDocId !== prevDocId) {
    setPrevDocId(currentDocId);
    setCurrentPage(1);
    setScale(DEFAULT_ZOOM);
    setPageDimensions(null);
  }

  const [docState, setDocState] = useState<{
    docId: string | null;
    pdfDoc: PDFDocumentProxy | null;
    error: string | null;
  }>({
    docId: null,
    pdfDoc: null,
    error: null,
  });

  const totalPages = docState.pdfDoc?.numPages ?? 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleZoomOut = () => {
    setScale((prev) =>
      Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100),
    );
  };

  const handleZoomIn = () => {
    setScale((prev) =>
      Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100),
    );
  };

  const handleFitToView = () => {
    if (!viewportRef.current || !pageDimensions) {
      setScale(DEFAULT_ZOOM);
      return;
    }
    const viewport = viewportRef.current;
    const padding = 48; // Total horizontal & vertical padding inside viewport
    const availWidth = Math.max(100, viewport.clientWidth - padding);
    const availHeight = Math.max(100, viewport.clientHeight - padding);

    const unscaledWidth = pageDimensions.width / pageDimensions.scale;
    const unscaledHeight = pageDimensions.height / pageDimensions.scale;

    if (unscaledWidth <= 0 || unscaledHeight <= 0) {
      setScale(DEFAULT_ZOOM);
      return;
    }

    const fit = Math.min(
      availWidth / unscaledWidth,
      availHeight / unscaledHeight,
    );
    const clampedFit = Math.round(clamp(fit, MIN_ZOOM, MAX_ZOOM) * 100) / 100;
    setScale(clampedFit);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (docState.pdfDoc && safeCurrentPage > 1) {
        e.preventDefault();
        handlePrevPage();
      }
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      if (docState.pdfDoc && safeCurrentPage < totalPages) {
        e.preventDefault();
        handleNextPage();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      handleZoomIn();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      handleZoomOut();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      setScale(DEFAULT_ZOOM);
    }
  };

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
          tabIndex={0}
          onKeyDown={handleEditorKeyDown}
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

            <div
              className="pane-toolbar"
              role="toolbar"
              aria-label="Editor view controls"
            >
              <Button
                variant="ghost"
                size="sm"
                aria-label="Zoom out"
                title="Zoom out"
                disabled={!pdfDoc || scale <= MIN_ZOOM}
                onClick={handleZoomOut}
              >
                <ZoomOut size={14} />
              </Button>
              <button
                type="button"
                className="zoom-display-btn"
                title="Click to reset zoom to 100%"
                aria-label={`Current zoom: ${Math.round(scale * 100)}%. Click to reset to 100%`}
                disabled={!pdfDoc}
                onClick={() => setScale(DEFAULT_ZOOM)}
              >
                {Math.round(scale * 100)}%
              </button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Zoom in"
                title="Zoom in"
                disabled={!pdfDoc || scale >= MAX_ZOOM}
                onClick={handleZoomIn}
              >
                <ZoomIn size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fit to screen"
                title="Fit page to view"
                disabled={!pdfDoc}
                onClick={handleFitToView}
              >
                <Maximize2 size={14} />
              </Button>
            </div>
          </div>

          <div className="pane-viewport" ref={viewportRef}>
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
              <PdfPageCanvas
                document={pdfDoc}
                pageNumber={safeCurrentPage}
                scale={scale}
                onDimensionsChange={setPageDimensions}
              />
            )}
          </div>

          <div className="pane-footer">
            <div className="editor-control-group">
              <Button
                variant="ghost"
                size="sm"
                disabled={!pdfDoc || safeCurrentPage <= 1}
                aria-label="Previous page"
                title="Previous page"
                onClick={handlePrevPage}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="page-indicator">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!pdfDoc || safeCurrentPage >= totalPages}
                aria-label="Next page"
                title="Next page"
                onClick={handleNextPage}
              >
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
