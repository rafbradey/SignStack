import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AddFilesResult } from '@/hooks';
import { Badge, Button, Spinner, Alert } from '@/components/ui';
import {
  Upload,
  Layers,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Link2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Minus,
  Plus,
  Trash2,
  Crop,
  RotateCcw,
  Move,
} from 'lucide-react';
import {
  UploadedDocument,
  PageDimensions,
  PageOverlay,
  NormalizedRect,
} from '@/types';
import { clamp, calculateOverlayViewportPosition } from '@/utils';
import { DocumentCard } from './DocumentCard';
import { PdfPageCanvas, PdfOverlayLayer } from '@/components/pdf';
import { ErrorBoundary } from '@/components/common';
import {
  loadPdfDocument,
  generatePdf,
  downloadPdfBlob,
  type PDFDocumentProxy,
} from '@/services/pdf';
import './Workspace.css';

const MIN_ZOOM = 0.5; // 50%
const MAX_ZOOM = 2.5; // 250%
const DEFAULT_ZOOM = 1.0; // 100%
const ZOOM_STEP = 0.25; // 25% step

/**
 * Calculates optimal scale factor so the entire PDF page and its black outline
 * fit comfortably within the viewport without cutting off header or footer.
 */
function calculateFitScale(
  viewport: HTMLElement,
  dimensions: PageDimensions,
): number {
  const paddingH = 64; // 32px on each side for padding + outline buffer
  const paddingV = 64;
  const availWidth = viewport.clientWidth - paddingH;
  const availHeight = viewport.clientHeight - paddingV;

  if (availWidth <= 0 || availHeight <= 0) {
    return DEFAULT_ZOOM;
  }

  const unscaledWidth = dimensions.width / dimensions.scale;
  const unscaledHeight = dimensions.height / dimensions.scale;

  if (unscaledWidth <= 0 || unscaledHeight <= 0) {
    return DEFAULT_ZOOM;
  }

  const fit = Math.min(availWidth / unscaledWidth, availHeight / unscaledHeight);
  return Math.round(clamp(fit, MIN_ZOOM, MAX_ZOOM) * 100) / 100;
}

export type WorkspaceTab = 'editor' | 'result';
export type WorkspaceLayout = 'split' | 'editor-maximized' | 'preview-maximized';

let overlayIdCounter = 0;
function generateOverlayId(): string {
  overlayIdCounter += 1;
  return `overlay-${overlayIdCounter}-${Date.now()}`;
}

export interface WorkspaceProps {
  onUploadClick?: () => void;
  documents?: UploadedDocument[];
  onRemoveDocument?: (id: string) => void;
  onReorderDocuments?: (startIndex: number, endIndex: number) => void;
  /** Called when the user moves a document up or down one position */
  onMoveDocument?: (id: string, direction: 'up' | 'down') => void;
  /** Function to add files to document state */
  addFiles?: (files: File[] | FileList) => Promise<AddFilesResult>;
  /** Whether files are actively being processed or validated */
  isProcessing?: boolean;
  /** Currently selected main document ID (controlled). Defaults to first document if omitted. */
  mainDocumentId?: string;
  /** Optional callback when the main document selection changes */
  onSelectMainDocument?: (id: string) => void;
  /** Optional initial/controlled overlays */
  initialOverlays?: PageOverlay[];
  /** Optional callback when PDF export completes successfully */
  onGeneratePdfSuccess?: (filename: string) => void;
  /** Optional callback when PDF export fails */
  onGeneratePdfError?: (error: string) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  onUploadClick,
  documents = [],
  onRemoveDocument,
  onMoveDocument,
  onReorderDocuments,
  addFiles,
  isProcessing = false,
  mainDocumentId,
  onSelectMainDocument,
  initialOverlays,
  onGeneratePdfSuccess,
  onGeneratePdfError,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('editor');
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>('split');
  const [editorScaleMode, setEditorScaleMode] = useState<'fit' | 'manual'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main Document: controlled if mainDocumentId is passed, otherwise local state defaulting to first document
  const [internalMainDocId, setInternalMainDocId] = useState<string | null>(null);
  const activeMainDocId = mainDocumentId ?? internalMainDocId;

  const mainDoc =
    documents.find((doc) => doc.id === activeMainDocId) ??
    (documents.length > 0 ? documents[0] : null);

  // PageOverlays: each overlay is tied to (mainDocumentId, mainPageNumber)
  const [overlays, setOverlays] = useState<PageOverlay[]>(initialOverlays ?? []);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const handleSelectMainDoc = useCallback(
    (id: string) => {
      setInternalMainDocId(id);
      onSelectMainDocument?.(id);
    },
    [onSelectMainDocument],
  );

  const handleRemoveDoc = useCallback(
    (id: string) => {
      onRemoveDocument?.(id);
    },
    [onRemoveDocument],
  );

  const handleMoveDocUp = useCallback(
    (id: string) => {
      onMoveDocument?.(id, 'up');
    },
    [onMoveDocument],
  );

  const handleMoveDocDown = useCallback(
    (id: string) => {
      onMoveDocument?.(id, 'down');
    },
    [onMoveDocument],
  );

  // Drag-and-drop state for queue reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCardDragStart = useCallback(
    (_e: React.DragEvent<HTMLElement>, index?: number) => {
      if (index !== undefined) {
        setDraggedIndex(index);
      }
    },
    [],
  );

  const handleCardDragOver = useCallback(
    (e: React.DragEvent<HTMLElement>, index?: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (index !== undefined) {
        setDragOverIndex((prev) => (prev !== index ? index : prev));
      }
    },
    [],
  );

  const handleCardDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleCardDrop = useCallback(
    (e: React.DragEvent<HTMLElement>, targetIndex?: number) => {
      e.preventDefault();
      if (targetIndex !== undefined) {
        setDraggedIndex((prevDragged) => {
          if (prevDragged !== null && prevDragged !== targetIndex) {
            onReorderDocuments?.(prevDragged, targetIndex);
          }
          return null;
        });
      } else {
        setDraggedIndex(null);
      }
      setDragOverIndex(null);
    },
    [onReorderDocuments],
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(DEFAULT_ZOOM);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);
  const [previewPageDimensions, setPreviewPageDimensions] = useState<PageDimensions | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStateRef = useRef<{
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    pointerId: number;
    viewportElement: HTMLDivElement;
  } | null>(null);

  // Preview scale mode and values
  const [previewScaleMode, setPreviewScaleMode] = useState<'fit' | 'sync' | 'manual'>('fit');
  const [fitPreviewScale, setFitPreviewScale] = useState<number>(DEFAULT_ZOOM);
  const [manualPreviewScale, setManualPreviewScale] = useState<number>(DEFAULT_ZOOM);

  // Track document ID for which initial auto fit-to-view has already executed
  const [fittedDocId, setFittedDocId] = useState<string | null>(null);

  // When the selected main document changes, reset page, zoom, and dimension states
  const currentDocId = mainDoc ? mainDoc.id : null;
  const [prevDocId, setPrevDocId] = useState<string | null>(currentDocId);
  if (currentDocId !== prevDocId) {
    setPrevDocId(currentDocId);
    setCurrentPage(1);
    setScale(DEFAULT_ZOOM);
    setPageDimensions(null);
    setPreviewPageDimensions(null);
    setFittedDocId(null);
    setPreviewScaleMode('fit');
    setFitPreviewScale(DEFAULT_ZOOM);
    setManualPreviewScale(DEFAULT_ZOOM);
  }

  // Prune overlays if any referenced document was removed or if it conflicts with current mainDoc
  const validOverlays = overlays.filter((o) => {
    const mainExists = documents.some((d) => d.id === o.mainDocumentId);
    const overlayExists = documents.some((d) => d.id === o.overlayDocumentId);
    const isConflict = o.overlayDocumentId === currentDocId;
    return mainExists && overlayExists && !isConflict;
  });
  if (validOverlays.length !== overlays.length) {
    setOverlays(validOverlays);
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

  // Filter overlays for the current main document and current main page
  const currentPageOverlays = overlays.filter(
    (o) => o.mainDocumentId === currentDocId && o.mainPageNumber === safeCurrentPage,
  );

  // Active overlay being edited on the current page
  const activeOverlay =
    currentPageOverlays.find((o) => o.id === activeOverlayId) ??
    (currentPageOverlays.length > 0 ? currentPageOverlays[0] : null);

  // Map of loaded PDF proxies by document ID
  const [pdfDocsMap, setPdfDocsMap] = useState<Record<string, PDFDocumentProxy>>({});

  useEffect(() => {
    let isCancelled = false;
    const requiredDocIds = Array.from(
      new Set(currentPageOverlays.map((o) => o.overlayDocumentId)),
    );

    for (const docId of requiredDocIds) {
      const doc = documents.find((d) => d.id === docId);
      if (doc && !pdfDocsMap[docId]) {
        loadPdfDocument(doc.file, doc.id)
          .then((proxy) => {
            if (!isCancelled) {
              setPdfDocsMap((prev) => ({ ...prev, [docId]: proxy }));
            }
          })
          .catch(() => {
            // Error handled gracefully by canvas layer
          });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [currentPageOverlays, documents, pdfDocsMap]);

  // Prune entries in pdfDocsMap during render when documents are removed to free state references
  const activeDocIds = new Set(documents.map((d) => d.id));
  const hasOrphanPdfDocs = Object.keys(pdfDocsMap).some(
    (id) => !activeDocIds.has(id),
  );
  if (hasOrphanPdfDocs) {
    const pruned: Record<string, PDFDocumentProxy> = {};
    for (const [id, proxy] of Object.entries(pdfDocsMap)) {
      if (activeDocIds.has(id)) {
        pruned[id] = proxy;
      }
    }
    setPdfDocsMap(pruned);
  }

  const activeOverlayPdf = activeOverlay
    ? pdfDocsMap[activeOverlay.overlayDocumentId]
    : null;
  const overlayTotalPages = activeOverlayPdf?.numPages ?? 0;
  const safeOverlayPage =
    overlayTotalPages > 0 && activeOverlay
      ? Math.min(Math.max(1, activeOverlay.overlayPageNumber), overlayTotalPages)
      : 1;

  // Documents available for overlay selection (everything except the current main)
  const overlayDocOptions = documents.filter((doc) => doc.id !== currentDocId);

  const handleOverlayDocChange = (newDocId: string) => {
    if (!currentDocId || newDocId === '') return;

    if (activeOverlay) {
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === activeOverlay.id
            ? { ...o, overlayDocumentId: newDocId, overlayPageNumber: 1 }
            : o,
        ),
      );
    } else {
      const newOverlay: PageOverlay = {
        id: generateOverlayId(),
        mainDocumentId: currentDocId,
        mainPageNumber: safeCurrentPage,
        overlayDocumentId: newDocId,
        overlayPageNumber: 1,
        position: { x: 0, y: 0 },
        scale: 1.0,
        opacity: 0.75,
        rotation: 0,
      };
      setOverlays((prev) => [...prev, newOverlay]);
      setActiveOverlayId(newOverlay.id);
    }
  };

  const handleOverlayPrevPage = () => {
    if (!activeOverlay) return;
    const newPage = Math.max(1, activeOverlay.overlayPageNumber - 1);
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === activeOverlay.id ? { ...o, overlayPageNumber: newPage } : o,
      ),
    );
  };

  const handleOverlayNextPage = () => {
    if (!activeOverlay) return;
    const newPage = Math.min(overlayTotalPages, activeOverlay.overlayPageNumber + 1);
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === activeOverlay.id ? { ...o, overlayPageNumber: newPage } : o,
      ),
    );
  };

  const handleOverlayOpacityChange = (newOpacity: number) => {
    if (!activeOverlay) return;
    const clamped = Math.max(
      0,
      Math.min(1.0, Math.round(newOpacity * 100) / 100),
    );
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === activeOverlay.id ? { ...o, opacity: clamped } : o,
      ),
    );
  };

  const handleOverlayScaleChange = (newScale: number) => {
    if (!activeOverlay) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === activeOverlay.id ? { ...o, scale: newScale } : o,
      ),
    );
  };

  const handleRemoveOverlay = (overlayId: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== overlayId));
    if (activeOverlayId === overlayId) {
      setActiveOverlayId(null);
      setIsCropping(false);
    }
  };

  const handleToggleCrop = () => {
    if (!activeOverlay) return;
    if (!isCropping) {
      // Opening crop mode: if cropRect not yet initialized, set a default centered 60% box
      if (!activeOverlay.cropRect) {
        setOverlays((prev) =>
          prev.map((o) =>
            o.id === activeOverlay.id
              ? {
                  ...o,
                  cropRect: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
                }
              : o,
          ),
        );
      }
      setIsCropping(true);
    } else {
      setIsCropping(false);
    }
  };

  const handleResetCrop = () => {
    if (!activeOverlay) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === activeOverlay.id ? { ...o, cropRect: undefined } : o,
      ),
    );
    setIsCropping(false);
  };

  const handleCropChange = useCallback(
    (newCropRect: NormalizedRect) => {
      if (!activeOverlay) return;
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === activeOverlay.id ? { ...o, cropRect: newCropRect } : o,
        ),
      );
    },
    [activeOverlay],
  );

  const handleOverlayPositionChange = useCallback(
    (newPos: { x: number; y: number }) => {
      if (!activeOverlay) return;
      setOverlays((prev) =>
        prev.map((o) =>
          o.id === activeOverlay.id ? { ...o, position: newPos } : o,
        ),
      );
    },
    [activeOverlay],
  );

  const handleResetPosition = () => {
    if (!activeOverlay) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === activeOverlay.id ? { ...o, position: { x: 0, y: 0 } } : o,
      ),
    );
  };

  const updatePreviewFit = useCallback(
    (dims?: PageDimensions | null) => {
      const targetDims = dims ?? pageDimensions;
      if (previewViewportRef.current && targetDims) {
        if (
          previewViewportRef.current.clientWidth > 100 &&
          previewViewportRef.current.clientHeight > 100
        ) {
          const fit = calculateFitScale(previewViewportRef.current, targetDims);
          setFitPreviewScale(fit);
          return fit;
        }
      }
      return DEFAULT_ZOOM;
    },
    [pageDimensions],
  );

  const updateEditorFit = useCallback(
    (dims?: PageDimensions) => {
      const targetDims = dims ?? pageDimensions;
      if (viewportRef.current && targetDims) {
        if (
          viewportRef.current.clientWidth > 100 &&
          viewportRef.current.clientHeight > 100
        ) {
          const fit = calculateFitScale(viewportRef.current, targetDims);
          setScale(fit);
          return fit;
        }
      }
      return DEFAULT_ZOOM;
    },
    [pageDimensions],
  );

  const handleDimensionsChange = useCallback(
    (dims: PageDimensions) => {
      setPageDimensions(dims);
      // Automatically apply fit-to-view on initial page render so the entire page + black outline are visible
      if (currentDocId && fittedDocId !== currentDocId && viewportRef.current) {
        if (
          viewportRef.current.clientWidth > 100 &&
          viewportRef.current.clientHeight > 100
        ) {
          const fit = calculateFitScale(viewportRef.current, dims);
          setFittedDocId(currentDocId);
          setScale(fit);
        }
      } else if (editorScaleMode === 'fit' && viewportRef.current) {
        const fit = calculateFitScale(viewportRef.current, dims);
        setScale(fit);
      }
      // Compute preview fit scale
      if (previewViewportRef.current) {
        if (
          previewViewportRef.current.clientWidth > 100 &&
          previewViewportRef.current.clientHeight > 100
        ) {
          const previewFit = calculateFitScale(previewViewportRef.current, dims);
          setFitPreviewScale(previewFit);
        }
      }
    },
    [currentDocId, fittedDocId, editorScaleMode],
  );

  // Recalculate editor/preview fit on window resize
  useEffect(() => {
    const handleResize = () => {
      if (editorScaleMode === 'fit') {
        updateEditorFit();
      }
      if (previewScaleMode === 'fit') {
        updatePreviewFit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [editorScaleMode, previewScaleMode, updateEditorFit, updatePreviewFit]);

  // Recalculate fit when switching tabs on mobile
  useEffect(() => {
    if (activeTab === 'editor' && editorScaleMode === 'fit') {
      const timer = setTimeout(() => {
        updateEditorFit();
      }, 50);
      return () => clearTimeout(timer);
    }
    if (activeTab === 'result' && previewScaleMode === 'fit') {
      const timer = setTimeout(() => {
        updatePreviewFit();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, editorScaleMode, previewScaleMode, updateEditorFit, updatePreviewFit]);

  // Recalculate fit when switching between split and maximized workspace layout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorScaleMode === 'fit') {
        updateEditorFit();
      }
      if (previewScaleMode === 'fit') {
        updatePreviewFit();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [workspaceLayout, editorScaleMode, previewScaleMode, updateEditorFit, updatePreviewFit]);

  const effectivePreviewScale =
    previewScaleMode === 'sync'
      ? scale
      : previewScaleMode === 'fit'
        ? fitPreviewScale
        : manualPreviewScale;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleZoomOut = () => {
    setEditorScaleMode('manual');
    setScale((prev) =>
      Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 100) / 100),
    );
  };

  const handleZoomIn = () => {
    setEditorScaleMode('manual');
    setScale((prev) =>
      Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 100) / 100),
    );
  };

  const handleEditorFitToView = () => {
    setEditorScaleMode('fit');
    updateEditorFit();
  };

  // Preview zoom handlers
  const handlePreviewZoomIn = () => {
    setPreviewScaleMode('manual');
    setManualPreviewScale((prev) => {
      const current = previewScaleMode === 'manual' ? prev : effectivePreviewScale;
      return Math.min(MAX_ZOOM, Math.round((current + ZOOM_STEP) * 100) / 100);
    });
  };

  const handlePreviewZoomOut = () => {
    setPreviewScaleMode('manual');
    setManualPreviewScale((prev) => {
      const current = previewScaleMode === 'manual' ? prev : effectivePreviewScale;
      return Math.max(MIN_ZOOM, Math.round((current - ZOOM_STEP) * 100) / 100);
    });
  };

  const handlePreviewResetZoom = () => {
    setPreviewScaleMode('manual');
    setManualPreviewScale(DEFAULT_ZOOM);
  };

  const handlePreviewFitToView = () => {
    setPreviewScaleMode('fit');
    updatePreviewFit();
  };

  const handleTogglePreviewSync = () => {
    setPreviewScaleMode((prev) => (prev === 'sync' ? 'fit' : 'sync'));
  };

  const handleToggleMaximizeEditor = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const next = prev === 'editor-maximized' ? 'split' : 'editor-maximized';
      if (next === 'editor-maximized') {
        setActiveTab('editor');
      }
      return next;
    });
  }, []);

  const handleToggleMaximizePreview = useCallback(() => {
    setWorkspaceLayout((prev) => {
      const next = prev === 'preview-maximized' ? 'split' : 'preview-maximized';
      if (next === 'preview-maximized') {
        setActiveTab('result');
      }
      return next;
    });
  }, []);

  // PDF Generation / Export (Phase 9)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!mainDoc || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setPdfExportError(null);

    try {
      const result = await generatePdf({
        mainDocument: mainDoc,
        overlays,
        documents,
      });

      downloadPdfBlob(result.blob, result.filename);
      onGeneratePdfSuccess?.(result.filename);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while generating the PDF. Please try again.';
      console.error('Failed to generate PDF:', err);
      setPdfExportError(errorMessage);
      onGeneratePdfError?.(errorMessage);
    } finally {
      setIsGeneratingPdf(false);
    }
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
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === ' ' && !isInput && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      if (e.key === 'Escape') {
        if (isCropping) {
          e.preventDefault();
          setIsCropping(false);
        } else if (workspaceLayout !== 'split') {
          e.preventDefault();
          setWorkspaceLayout('split');
        }
        return;
      }

      // Page Navigation shortcuts: [ or PageUp -> previous page; ] or PageDown -> next page
      if (!isInput && (e.key === '[' || e.key === 'PageUp')) {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
        return;
      }
      if (!isInput && (e.key === ']' || e.key === 'PageDown')) {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
        return;
      }

      // Zoom Controls shortcuts: + / = -> zoom in; - / _ -> zoom out; 0 -> reset zoom
      if (!isInput && (e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (!isInput && (e.key === '-' || e.key === '_') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleZoomOut();
        return;
      }
      if (!isInput && e.key === '0' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditorScaleMode('manual');
        setScale(DEFAULT_ZOOM);
        return;
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
      panStateRef.current = null;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isCropping, workspaceLayout, totalPages]);

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Pan if Spacebar is pressed (left click) or if middle-mouse button (button 1) is clicked
    const shouldPan = isSpacePressed || e.button === 1;
    if (!shouldPan) return;

    const targetEl = e.currentTarget;
    e.preventDefault();
    e.stopPropagation();

    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback
    }

    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: targetEl.scrollLeft,
      startScrollTop: targetEl.scrollTop,
      pointerId: e.pointerId,
      viewportElement: targetEl,
    };
    setIsPanning(true);
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = panStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;

    state.viewportElement.scrollLeft = state.startScrollLeft - deltaX;
    state.viewportElement.scrollTop = state.startScrollTop - deltaY;
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = panStateRef.current;
    if (state && state.pointerId === e.pointerId) {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // Safe fallback
        }
      }
      panStateRef.current = null;
      setIsPanning(false);
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
      {/* Screen reader live status announcement */}
      <div
        className="sr-only"
        aria-label="Document status"
        aria-live="polite"
        aria-atomic="true"
      >
        {mainDoc ? `Document: page ${safeCurrentPage} of ${totalPages}` : ''}
      </div>

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
            <>
              {documents.map((doc, index) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  position={index + 1}
                  totalDocuments={documents.length}
                  isMain={doc.id === mainDoc?.id}
                  onSetMain={handleSelectMainDoc}
                  onRemove={handleRemoveDoc}
                  onMoveUp={handleMoveDocUp}
                  onMoveDown={handleMoveDocDown}
                  isDragging={draggedIndex === index}
                  isDragOver={dragOverIndex === index && draggedIndex !== index}
                  onDragStart={handleCardDragStart}
                  onDragOver={handleCardDragOver}
                  onDragEnd={handleCardDragEnd}
                  onDrop={handleCardDrop}
                />
              ))}

              {/* Inline processing indicator during multi-file ingestion */}
              {isProcessing && (
                <div
                  className="document-card-loading"
                  aria-label="Validating uploaded files"
                >
                  <Spinner size="sm" label="Validating..." />
                  <span className="document-card-loading-text">Validating...</span>
                </div>
              )}

              {/* Add PDFs button appearing as the last item in the queue */}
              <button
                type="button"
                className="doc-card-add-btn"
                onClick={() => {
                  fileInputRef.current?.click();
                  if (onUploadClick) onUploadClick();
                }}
                disabled={isProcessing}
                aria-label={isProcessing ? 'Validating...' : '+ Add PDFs'}
                title={isProcessing ? 'Validating...' : 'Add more PDFs to queue'}
              >
                <Plus size={15} />
                <span>{isProcessing ? 'Validating...' : '+ Add PDFs'}</span>
              </button>
            </>
          ) : !isProcessing ? (
            <div className="document-tray-empty-zone">
              <Upload
                size={14}
                className="document-tray-empty-icon"
                aria-hidden="true"
              />
              <span className="document-tray-empty-hint">
                No documents in queue. Your uploaded files will appear here.
              </span>
              <span className="document-tray-empty-subtext">
                Supports PDF up to 50MB
              </span>
            </div>
          ) : (
            <div
              className="document-card-loading"
              aria-label="Validating uploaded files"
            >
              <Spinner size="sm" label="Validating..." />
              <span className="document-card-loading-text">Validating...</span>
            </div>
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
      <div
        className={`workspace-panes ${
          workspaceLayout === 'preview-maximized'
            ? 'preview-maximized'
            : workspaceLayout === 'editor-maximized'
              ? 'editor-maximized'
              : ''
        }`.trim()}
      >
        {/* Left Pane: Editor */}
        <section
          className={`workspace-pane editor-pane ${activeTab !== 'editor' ? 'hidden-on-mobile' : ''}`.trim()}
          aria-label="Editor Workspace"
          tabIndex={0}
          onKeyDown={handleEditorKeyDown}
        >
          <div className="pane-header">
            <div className="pane-title-group">
              <span className="pane-title">Editor Workspace</span>
              {mainDoc ? (
                <Badge variant="primary" size="sm">
                  Main Document
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  No Document
                </Badge>
              )}
              {mainDoc && (
                <span className="pane-document-name" title={mainDoc.name}>
                  {mainDoc.name}
                </span>
              )}
              {workspaceLayout === 'editor-maximized' && (
                <Badge variant="neutral" size="sm">
                  Maximized
                </Badge>
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
                onClick={() => {
                  setEditorScaleMode('manual');
                  setScale(DEFAULT_ZOOM);
                }}
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
                variant={editorScaleMode === 'fit' ? 'secondary' : 'ghost'}
                size="sm"
                aria-label="Fit to screen"
                title="Fit page to view"
                disabled={!pdfDoc}
                onClick={handleEditorFitToView}
              >
                <Maximize2 size={14} />
                Fit
              </Button>

              <div className="toolbar-divider" />

              <Button
                variant={workspaceLayout === 'editor-maximized' ? 'secondary' : 'ghost'}
                size="sm"
                aria-label={workspaceLayout === 'editor-maximized' ? 'Exit maximized editor' : 'Maximize editor'}
                title={workspaceLayout === 'editor-maximized' ? 'Exit maximized editor (Esc)' : 'Maximize editor (full workspace)'}
                disabled={!mainDoc}
                onClick={handleToggleMaximizeEditor}
              >
                {workspaceLayout === 'editor-maximized' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {workspaceLayout === 'editor-maximized' ? 'Restore' : 'Maximize'}
              </Button>
            </div>
          </div>

          <div
            className={`pane-viewport ${isSpacePressed ? 'is-space-pressed' : ''} ${isPanning ? 'is-panning' : ''}`.trim()}
            ref={viewportRef}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
            onPointerCancel={handleViewportPointerUp}
          >
            {!mainDoc ? (
              documents.length === 0 ? (
                <div className="viewport-empty-card">
                  <div className="viewport-empty-icon" aria-hidden="true">
                    <FileText size={26} />
                  </div>
                  <h3 className="viewport-empty-title">No Document Loaded</h3>
                  <p className="viewport-empty-description">
                    Upload a PDF to view and edit it in the workspace.
                  </p>
                  <div
                    className="viewport-empty-steps"
                    aria-label="Workflow overview"
                  >
                    <div className="empty-step">
                      <span className="step-num">1</span>
                      <span className="step-label">Upload PDFs</span>
                    </div>
                    <span className="step-arrow" aria-hidden="true">
                      →
                    </span>
                    <div className="empty-step">
                      <span className="step-num">2</span>
                      <span className="step-label">Stack &amp; Crop</span>
                    </div>
                    <span className="step-arrow" aria-hidden="true">
                      →
                    </span>
                    <div className="empty-step">
                      <span className="step-num">3</span>
                      <span className="step-label">Download Result</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isProcessing}
                    leftIcon={<Upload size={14} />}
                    onClick={() => {
                      fileInputRef.current?.click();
                      if (onUploadClick) onUploadClick();
                    }}
                  >
                    {isProcessing ? 'Validating...' : 'Upload a Document'}
                  </Button>
                </div>
              ) : (
                <div className="viewport-empty-card">
                  <div className="viewport-empty-icon" aria-hidden="true">
                    <Layers size={26} />
                  </div>
                  <h3 className="viewport-empty-title">No Document Loaded</h3>
                  <p className="viewport-empty-description">
                    You have {documents.length} document
                    {documents.length === 1 ? '' : 's'} in your queue. Select a
                    document to begin editing.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSelectMainDoc(documents[0].id)}
                  >
                    Set "{documents[0].name}" as Main
                  </Button>
                </div>
              )
            ) : isDocLoading ? (
              <div className="viewport-loading-state">
                <div className="viewport-loading-card">
                  <Spinner size="lg" label={`Loading ${mainDoc.name}...`} />
                  <span className="viewport-loading-text">
                    Loading {mainDoc.name}...
                  </span>
                </div>
              </div>
            ) : docError ? (
              <div className="viewport-error-state">
                <Alert variant="danger" title="Unable to render document">
                  {docError}
                </Alert>
              </div>
            ) : (
              <ErrorBoundary
                title="Page Rendering Error"
                message="An unexpected error occurred while rendering this page."
              >
                <PdfPageCanvas
                  document={pdfDoc}
                  pageNumber={safeCurrentPage}
                  scale={scale}
                  onDimensionsChange={handleDimensionsChange}
                >
                  {currentPageOverlays.map((overlay) => {
                    const proxy = pdfDocsMap[overlay.overlayDocumentId] ?? null;
                    const renderPos = pageDimensions
                      ? calculateOverlayViewportPosition(overlay.position, pageDimensions)
                      : { x: 0, y: 0 };

                    return (
                      <PdfOverlayLayer
                        key={overlay.id}
                        document={proxy}
                        pageNumber={overlay.overlayPageNumber}
                        scale={scale * overlay.scale}
                        opacity={overlay.opacity}
                        position={renderPos}
                        normalizedPosition={overlay.position}
                        baseDimensions={pageDimensions ?? undefined}
                        rotation={overlay.rotation}
                        cropRect={overlay.cropRect}
                        isCropping={isCropping && overlay.id === activeOverlay?.id}
                        isDraggable={!isCropping}
                        isSelected={overlay.id === activeOverlay?.id}
                        onCropChange={handleCropChange}
                        onPositionChange={handleOverlayPositionChange}
                        onDelete={() => handleRemoveOverlay(overlay.id)}
                      />
                    );
                  })}
                </PdfPageCanvas>
              </ErrorBoundary>
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
                {mainDoc ? `Page ${safeCurrentPage} of ${totalPages}` : 'No document'}
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

            <div className="editor-control-group overlay-controls">
              <Layers size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <select
                className="overlay-select"
                value={activeOverlay?.overlayDocumentId ?? ''}
                disabled={!mainDoc || overlayDocOptions.length === 0}
                aria-label="Select overlay document"
                onChange={(e) => handleOverlayDocChange(e.target.value)}
              >
                <option value="" disabled>
                  {!mainDoc
                    ? 'Upload a document'
                    : overlayDocOptions.length === 0
                      ? 'Need 2+ documents'
                      : '— Select Overlay —'}
                </option>
                {overlayDocOptions.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>

              {activeOverlay && overlayTotalPages > 0 && (
                <>
                  <div className="overlay-page-controls">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={safeOverlayPage <= 1}
                      aria-label="Previous overlay page"
                      title="Previous overlay page"
                      onClick={handleOverlayPrevPage}
                    >
                      <ChevronLeft size={12} />
                    </Button>
                    <span className="page-indicator">
                      {safeOverlayPage}/{overlayTotalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={safeOverlayPage >= overlayTotalPages}
                      aria-label="Next overlay page"
                      title="Next overlay page"
                      onClick={handleOverlayNextPage}
                    >
                      <ChevronRight size={12} />
                    </Button>
                  </div>

                  <div
                    className="overlay-opacity-controls"
                    title="Overlay Opacity"
                  >
                    <span className="overlay-opacity-label">Opacity</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="overlay-stepper-btn"
                      aria-label="Decrease opacity"
                      title="Decrease opacity"
                      disabled={Math.round(activeOverlay.opacity * 100) <= 0}
                      onClick={() =>
                        handleOverlayOpacityChange(
                          Math.max(
                            0,
                            Math.round(activeOverlay.opacity * 100 - 5) / 100,
                          ),
                        )
                      }
                    >
                      <Minus size={10} />
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round(activeOverlay.opacity * 100)}
                      className="overlay-opacity-slider"
                      aria-label="Overlay opacity"
                      onChange={(e) =>
                        handleOverlayOpacityChange(Number(e.target.value) / 100)
                      }
                    />
                    <button
                      type="button"
                      className="overlay-opacity-value"
                      title="Click to reset opacity to 100%"
                      aria-label={`Current opacity: ${Math.round(activeOverlay.opacity * 100)}%. Click to reset to 100%`}
                      onClick={() => handleOverlayOpacityChange(1.0)}
                    >
                      {Math.round(activeOverlay.opacity * 100)}%
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="overlay-stepper-btn"
                      aria-label="Increase opacity"
                      title="Increase opacity"
                      disabled={Math.round(activeOverlay.opacity * 100) >= 100}
                      onClick={() =>
                        handleOverlayOpacityChange(
                          Math.min(
                            1.0,
                            Math.round(activeOverlay.opacity * 100 + 5) / 100,
                          ),
                        )
                      }
                    >
                      <Plus size={10} />
                    </Button>
                  </div>

                  <div
                    className="overlay-scale-controls"
                    title="Overlay Scale"
                  >
                    <span className="overlay-scale-label">Scale</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="overlay-stepper-btn"
                      aria-label="Decrease scale"
                      title="Decrease scale"
                      disabled={Math.round(activeOverlay.scale * 100) <= 25}
                      onClick={() =>
                        handleOverlayScaleChange(
                          Math.max(
                            0.25,
                            Math.round(activeOverlay.scale * 100 - 5) / 100,
                          ),
                        )
                      }
                    >
                      <Minus size={10} />
                    </Button>
                    <input
                      type="range"
                      min="25"
                      max="200"
                      step="5"
                      value={Math.round(activeOverlay.scale * 100)}
                      className="overlay-scale-slider"
                      aria-label="Overlay scale"
                      onChange={(e) =>
                        handleOverlayScaleChange(Number(e.target.value) / 100)
                      }
                    />
                    <span className="overlay-scale-value">
                      {Math.round(activeOverlay.scale * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="overlay-stepper-btn"
                      aria-label="Increase scale"
                      title="Increase scale"
                      disabled={Math.round(activeOverlay.scale * 100) >= 200}
                      onClick={() =>
                        handleOverlayScaleChange(
                          Math.min(
                            2.0,
                            Math.round(activeOverlay.scale * 100 + 5) / 100,
                          ),
                        )
                      }
                    >
                      <Plus size={10} />
                    </Button>
                  </div>

                  <div className="overlay-crop-controls">
                    <Button
                      variant={isCropping ? 'primary' : 'ghost'}
                      size="sm"
                      aria-label={isCropping ? 'Done cropping' : 'Crop overlay'}
                      title={isCropping ? 'Done cropping' : 'Crop overlay region'}
                      onClick={handleToggleCrop}
                    >
                      <Crop size={12} />
                    </Button>
                    {activeOverlay.cropRect && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Reset crop"
                        title="Reset crop to full page"
                        onClick={handleResetCrop}
                      >
                        <RotateCcw size={12} />
                      </Button>
                    )}
                  </div>

                  {(activeOverlay.position.x !== 0 || activeOverlay.position.y !== 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Reset overlay position"
                      title="Reset overlay position to top-left"
                      onClick={handleResetPosition}
                    >
                      <Move size={12} />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove overlay"
                    title="Remove overlay from this page"
                    onClick={() => handleRemoveOverlay(activeOverlay.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Pane: Result Preview */}
        <section
          className={`workspace-pane result-pane ${activeTab !== 'result' ? 'hidden-on-mobile' : ''}`.trim()}
          aria-label="Result Preview"
        >
          <div className="pane-header">
            <div className="pane-title-group">
              <span className="pane-title">Result Preview</span>
              {isGeneratingPdf ? (
                <Badge variant="primary" size="sm">
                  <Spinner size="sm" />
                  Generating PDF...
                </Badge>
              ) : mainDoc ? (
                <Badge variant="success" size="sm" withDot>
                  Live Composite
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  Waiting for Document
                </Badge>
              )}
              {workspaceLayout === 'preview-maximized' && (
                <Badge variant="neutral" size="sm">
                  Maximized
                </Badge>
              )}
            </div>

            <div
              className="pane-toolbar"
              role="toolbar"
              aria-label="Result preview view controls"
            >
              {/* Preview Zoom Controls */}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Preview zoom out"
                title="Zoom out preview"
                disabled={!pdfDoc || effectivePreviewScale <= MIN_ZOOM}
                onClick={handlePreviewZoomOut}
              >
                <ZoomOut size={14} />
              </Button>
              <button
                type="button"
                className="zoom-display-btn"
                title="Click to reset preview zoom to 100%"
                aria-label={`Current preview zoom: ${Math.round(effectivePreviewScale * 100)}%. Click to reset to 100%`}
                disabled={!pdfDoc}
                onClick={handlePreviewResetZoom}
              >
                {Math.round(effectivePreviewScale * 100)}%
              </button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Preview zoom in"
                title="Zoom in preview"
                disabled={!pdfDoc || effectivePreviewScale >= MAX_ZOOM}
                onClick={handlePreviewZoomIn}
              >
                <ZoomIn size={14} />
              </Button>

              {/* Fit & Sync Mode Toggles */}
              <Button
                variant={previewScaleMode === 'fit' ? 'secondary' : 'ghost'}
                size="sm"
                aria-label="Fit preview to screen"
                title="Fit preview page to view"
                disabled={!pdfDoc}
                onClick={handlePreviewFitToView}
              >
                <Maximize2 size={14} />
                Fit
              </Button>
              <Button
                variant={previewScaleMode === 'sync' ? 'secondary' : 'ghost'}
                size="sm"
                aria-label="Sync preview zoom with editor"
                title="Sync preview zoom with editor zoom"
                disabled={!pdfDoc}
                onClick={handleTogglePreviewSync}
              >
                <Link2 size={14} />
                Sync
              </Button>

              <div className="toolbar-divider" />

              {/* Maximize / Restore Layout Toggle */}
              <Button
                variant={workspaceLayout === 'preview-maximized' ? 'secondary' : 'ghost'}
                size="sm"
                aria-label={workspaceLayout === 'preview-maximized' ? 'Exit maximized preview' : 'Maximize preview'}
                title={workspaceLayout === 'preview-maximized' ? 'Exit maximized preview (Esc)' : 'Maximize preview (full workspace)'}
                disabled={!mainDoc}
                onClick={handleToggleMaximizePreview}
              >
                {workspaceLayout === 'preview-maximized' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {workspaceLayout === 'preview-maximized' ? 'Restore' : 'Maximize'}
              </Button>

              <div className="toolbar-divider" />

              <Button
                variant="primary"
                size="sm"
                isLoading={isGeneratingPdf}
                leftIcon={<Download size={14} />}
                disabled={!mainDoc}
                title={
                  !mainDoc
                    ? 'Upload a document to download PDF'
                    : isGeneratingPdf
                      ? 'Generating PDF...'
                      : 'Download PDF with embedded overlays'
                }
                onClick={handleDownloadPdf}
              >
                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>

          {pdfExportError && (
            <div
              className="pane-alert-banner"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <Alert
                variant="danger"
                title="Export Failed"
                onDismiss={() => setPdfExportError(null)}
              >
                {pdfExportError}
              </Alert>
            </div>
          )}

          <div
            ref={previewViewportRef}
            className={`pane-viewport ${isSpacePressed ? 'is-space-pressed' : ''} ${isPanning ? 'is-panning' : ''}`.trim()}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={handleViewportPointerUp}
          >
            {!mainDoc ? (
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
                  {documents.length === 0
                    ? 'Upload a PDF to view the live composite preview.'
                    : 'Select a Main Document to preview composite output.'}
                </p>
              </div>
            ) : isDocLoading ? (
              <div className="viewport-loading-state">
                <div className="viewport-loading-card">
                  <Spinner size="lg" label="Rendering live preview..." />
                  <span className="viewport-loading-text">
                    Rendering preview...
                  </span>
                </div>
              </div>
            ) : docError ? (
              <div className="viewport-error-state">
                <Alert variant="danger" title="Unable to render preview">
                  {docError}
                </Alert>
              </div>
            ) : (
              <ErrorBoundary
                title="Preview Rendering Error"
                message="An unexpected error occurred while rendering the composite preview."
              >
                <PdfPageCanvas
                  document={pdfDoc}
                  pageNumber={safeCurrentPage}
                  scale={effectivePreviewScale}
                  onDimensionsChange={setPreviewPageDimensions}
                  ariaLabel={`Result preview page ${safeCurrentPage}`}
                  className="result-preview-canvas"
                >
                  {currentPageOverlays.map((overlay) => {
                    const proxy = pdfDocsMap[overlay.overlayDocumentId] ?? null;
                    const currentBaseDims =
                      previewPageDimensions ??
                      (pageDimensions
                        ? {
                            width: (pageDimensions.width / scale) * effectivePreviewScale,
                            height: (pageDimensions.height / scale) * effectivePreviewScale,
                          }
                        : null);

                    const renderPos = currentBaseDims
                      ? calculateOverlayViewportPosition(overlay.position, currentBaseDims)
                      : { x: 0, y: 0 };

                    return (
                      <PdfOverlayLayer
                        key={`preview-${overlay.id}`}
                        document={proxy}
                        pageNumber={overlay.overlayPageNumber}
                        scale={effectivePreviewScale * overlay.scale}
                        opacity={overlay.opacity}
                        position={renderPos}
                        normalizedPosition={overlay.position}
                        baseDimensions={currentBaseDims ?? undefined}
                        rotation={overlay.rotation}
                        cropRect={overlay.cropRect}
                        isCropping={false}
                        isDraggable={false}
                        isSelected={false}
                        ariaLabel={`Result preview overlay page ${overlay.overlayPageNumber}`}
                      />
                    );
                  })}
                </PdfPageCanvas>
              </ErrorBoundary>
            )}
          </div>

          <div className="pane-footer">
            <div className="editor-control-group">
              <Button
                variant="ghost"
                size="sm"
                disabled={!pdfDoc || safeCurrentPage <= 1}
                aria-label="Previous preview page"
                title="Previous page"
                onClick={handlePrevPage}
              >
                <ChevronLeft size={14} />
              </Button>
              <span
                className="page-indicator"
                aria-label={mainDoc ? `Preview page ${safeCurrentPage} of ${totalPages}` : 'No document'}
              >
                {mainDoc ? `${safeCurrentPage} / ${totalPages}` : '— / —'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!pdfDoc || safeCurrentPage >= totalPages}
                aria-label="Next preview page"
                title="Next page"
                onClick={handleNextPage}
              >
                <ChevronRight size={14} />
              </Button>
              {mainDoc && (
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    marginLeft: 'var(--space-2)',
                  }}
                >
                  Output: Page {safeCurrentPage} • {currentPageOverlays.length}{' '}
                  {currentPageOverlays.length === 1 ? 'Overlay' : 'Overlays'}
                </span>
              )}
            </div>

            <div className="editor-control-group">
              <span
                className="pane-footer-text"
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                }}
              >
                {mainDoc
                  ? `${
                      previewScaleMode === 'fit'
                        ? 'Auto-Fit'
                        : previewScaleMode === 'sync'
                          ? 'Synced with Editor'
                          : 'Custom Zoom'
                    }${workspaceLayout === 'preview-maximized' ? ' • Maximized' : ''} • 100% Client-Side`
                  : '100% Client-Side'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
