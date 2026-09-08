import React from 'react';
import { FileText, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
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
  /** Called when the user removes this document */
  onRemove: (id: string) => void;
  /** Called when the user moves this document up one position */
  onMoveUp: (id: string) => void;
  /** Called when the user moves this document down one position */
  onMoveDown: (id: string) => void;
}

/**
 * DocumentCard renders a single uploaded PDF with its metadata and actions.
 *
 * Responsibilities:
 *   - Display document name, size, and a PDF indicator
 *   - Provide a remove button
 *   - Provide move-up / move-down buttons for basic reordering
 *
 * It does NOT own any state — it is a pure presentational component
 * driven entirely by props.
 */
export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  position,
  totalDocuments,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const isFirst = position === 1;
  const isLast = position === totalDocuments;

  return (
    <article className="doc-card" aria-label={`Document: ${document.name}`}>
      {/* Icon column */}
      <div className="doc-card-icon" aria-hidden="true">
        <FileText size={20} />
      </div>

      {/* Metadata column */}
      <div className="doc-card-meta">
        <span className="doc-card-name" title={document.name}>
          {document.name}
        </span>
        <div className="doc-card-details">
          <Badge variant="neutral" size="sm">
            PDF
          </Badge>
          <span className="doc-card-size">{document.formattedSize}</span>
        </div>
      </div>

      {/* Actions column */}
      <div className="doc-card-actions">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Move "${document.name}" up`}
          disabled={isFirst}
          onClick={() => onMoveUp(document.id)}
        >
          <ChevronUp size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Move "${document.name}" down`}
          disabled={isLast}
          onClick={() => onMoveDown(document.id)}
        >
          <ChevronDown size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove "${document.name}"`}
          onClick={() => onRemove(document.id)}
          className="doc-card-remove"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </article>
  );
};
