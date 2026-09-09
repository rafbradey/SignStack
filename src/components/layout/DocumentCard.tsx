import React from 'react';
import {
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { UploadedDocument } from '@/types';
import './DocumentCard.css';

export interface DocumentCardProps {
  /** The uploaded document to display */
  document: UploadedDocument;
  /** Position in the document list (1-based, for display) */
  position: number;
  /** Total number of documents (used to disable move-down on the last item) */
  totalDocuments: number;
  /** Whether this document is currently the designated Main Document */
  isMain?: boolean;
  /** Called when the user sets this document as the Main Document */
  onSetMain?: (id: string) => void;
  /** Called when the user removes this document */
  onRemove: (id: string) => void;
  /** Called when the user moves this document up (left) one position */
  onMoveUp: (id: string) => void;
  /** Called when the user moves this document down (right) one position */
  onMoveDown: (id: string) => void;
  /** Whether this card is currently being dragged */
  isDragging?: boolean;
  /** Whether another dragged card is currently hovered over this card */
  isDragOver?: boolean;
  /** Drag-and-drop event handlers */
  onDragStart?: (e: React.DragEvent<HTMLElement>, index?: number) => void;
  onDragOver?: (e: React.DragEvent<HTMLElement>, index?: number) => void;
  onDragEnd?: (e: React.DragEvent<HTMLElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLElement>, index?: number) => void;
}

/**
 * DocumentCard renders a single uploaded PDF within the compact horizontal queue.
 *
 * Responsibilities:
 *   - Display queue position number (1, 2, 3...)
 *   - Drag handle icon with drag feedback
 *   - Display document name with accessible tooltip
 *   - Display formatted file size
 *   - Indicate and allow selecting the Main Document
 *   - Provide accessible fallback reorder controls (move up / down)
 *   - Provide accessible remove button
 */
export const DocumentCard = React.memo<DocumentCardProps>(function DocumentCard({
  document,
  position,
  totalDocuments,
  isMain = false,
  onSetMain,
  onRemove,
  onMoveUp,
  onMoveDown,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}) {
  const isFirst = position === 1;
  const isLast = position === totalDocuments;

  const cardClasses = [
    'doc-card',
    isMain ? 'is-main' : '',
    isDragging ? 'is-dragging' : '',
    isDragOver ? 'is-drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleCardClick = (e: React.MouseEvent) => {
    // If click originated from a button, don't trigger main document selection
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!isMain && onSetMain) {
      onSetMain(document.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }
      e.preventDefault();
      if (!isMain && onSetMain) {
        onSetMain(document.id);
      }
    }
  };

  return (
    <article
      className={cardClasses}
      aria-label={`Document ${position}: ${document.name}${isMain ? ' (Main Document)' : ''}`}
      draggable
      onDragStart={(e) => {
        // Prevent drag when user is clicking buttons
        if ((e.target as HTMLElement).closest('button')) {
          e.preventDefault();
          return;
        }
        onDragStart?.(e, position - 1);
      }}
      onDragOver={(e) => {
        onDragOver?.(e, position - 1);
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        onDrop?.(e, position - 1);
      }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      title={
        isMain
          ? `${document.name} (Main Document)`
          : `Click to set "${document.name}" as Main Document`
      }
    >
      {/* Queue position number */}
      <span
        className="doc-card-num"
        aria-label={`Queue position ${position}`}
        title={`Position ${position} in queue`}
      >
        {position}
      </span>

      {/* Subtle drag handle */}
      <div
        className="doc-card-drag-handle"
        aria-hidden="true"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </div>

      {/* PDF file icon */}
      <div className="doc-card-icon" aria-hidden="true">
        <FileText size={16} />
      </div>

      {/* Metadata column */}
      <div className="doc-card-meta">
        <div className="doc-card-name-row">
          <span
            className="doc-card-name"
            title={document.name}
            tabIndex={0}
            aria-label={document.name}
          >
            {document.name}
          </span>
        </div>
        <div className="doc-card-subline">
          <span className="doc-card-size">{document.formattedSize}</span>
          {isMain ? (
            <Badge variant="primary" size="sm">
              Main
            </Badge>
          ) : (
            onSetMain && (
              <button
                type="button"
                className="doc-card-set-main-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetMain(document.id);
                }}
                aria-label={`Set "${document.name}" as Main Document`}
                title="Set as Main Document"
              >
                Set Main
              </button>
            )
          )}
        </div>
      </div>

      {/* Actions column: accessible reorder fallback + remove button */}
      <div className="doc-card-actions">
        <div className="doc-card-reorder">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Move "${document.name}" up`}
            title="Move earlier in queue"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(document.id);
            }}
            className="doc-card-btn-icon"
          >
            <ChevronLeft size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Move "${document.name}" down`}
            title="Move later in queue"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(document.id);
            }}
            className="doc-card-btn-icon"
          >
            <ChevronRight size={13} />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove "${document.name}"`}
          title="Remove document"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(document.id);
          }}
          className="doc-card-remove doc-card-btn-icon"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </article>
  );
});

DocumentCard.displayName = 'DocumentCard';
