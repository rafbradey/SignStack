import React from 'react';
import { NormalizedRect } from '@/types';
import './CropSelectionBox.css';

export interface CropSelectionBoxProps {
  /** Normalized crop rectangle in range [0, 1] relative to overlay page */
  cropRect: NormalizedRect;
  /** Whether crop editing handles and outline are active */
  isEditing?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Visual crop selection frame rendered on top of an overlay PDF page.
 *
 * Displays:
 * - High-contrast selection boundary highlighting the cropped region
 * - Corner anchor handles for visual clarity
 * - Semi-transparent mask indicating portions of the overlay outside the crop
 */
export const CropSelectionBox: React.FC<CropSelectionBoxProps> = ({
  cropRect,
  isEditing = true,
  className = '',
}) => {
  const left = `${Math.round(cropRect.x * 10000) / 100}%`;
  const top = `${Math.round(cropRect.y * 10000) / 100}%`;
  const width = `${Math.round(cropRect.width * 10000) / 100}%`;
  const height = `${Math.round(cropRect.height * 10000) / 100}%`;

  const widthPct = Math.round(cropRect.width * 100);
  const heightPct = Math.round(cropRect.height * 100);

  return (
    <div className={`crop-selection-container ${className}`.trim()}>
      <div
        className={`crop-selection-box ${isEditing ? 'is-editing' : ''}`}
        role="region"
        aria-label={`Crop selection: ${widthPct}% × ${heightPct}%`}
        style={{
          left,
          top,
          width,
          height,
        }}
      >
        {/* Corner accent handles */}
        <span className="crop-handle crop-handle-nw" aria-hidden="true" />
        <span className="crop-handle crop-handle-ne" aria-hidden="true" />
        <span className="crop-handle crop-handle-se" aria-hidden="true" />
        <span className="crop-handle crop-handle-sw" aria-hidden="true" />

        {/* Center label badge */}
        <span className="crop-box-badge">{`${widthPct}% × ${heightPct}%`}</span>
      </div>
    </div>
  );
};
