import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CropSelectionBox } from './CropSelectionBox';
import type { NormalizedRect } from '@/types/coordinates';

describe('CropSelectionBox component', () => {
  const defaultCropRect: NormalizedRect = {
    x: 0.2,
    y: 0.25,
    width: 0.5,
    height: 0.4,
  };

  it('renders region with accessible aria-label and coordinate information', () => {
    render(<CropSelectionBox cropRect={defaultCropRect} />);

    const region = screen.getByRole('region', {
      name: 'Crop selection: 50% × 40%',
    });
    expect(region).toBeDefined();
  });

  it('calculates position and dimensions as percentages correctly', () => {
    render(<CropSelectionBox cropRect={defaultCropRect} />);

    const region = screen.getByRole('region', {
      name: 'Crop selection: 50% × 40%',
    });

    expect(region.style.left).toBe('20%');
    expect(region.style.top).toBe('25%');
    expect(region.style.width).toBe('50%');
    expect(region.style.height).toBe('40%');
  });

  it('renders four corner accent handles with aria-hidden', () => {
    const { container } = render(<CropSelectionBox cropRect={defaultCropRect} />);

    const handles = container.querySelectorAll('.crop-handle');
    expect(handles.length).toBe(4);

    expect(container.querySelector('.crop-handle-nw')).not.toBeNull();
    expect(container.querySelector('.crop-handle-ne')).not.toBeNull();
    expect(container.querySelector('.crop-handle-se')).not.toBeNull();
    expect(container.querySelector('.crop-handle-sw')).not.toBeNull();

    handles.forEach((handle) => {
      expect(handle.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('renders size badge with percentage label', () => {
    render(<CropSelectionBox cropRect={defaultCropRect} />);

    expect(screen.getByText('50% × 40%')).toBeDefined();
  });

  it('renders container and selection box elements', () => {
    const { container } = render(<CropSelectionBox cropRect={defaultCropRect} />);

    const selectionContainer = container.querySelector('.crop-selection-container');
    expect(selectionContainer).not.toBeNull();

    const selectionBox = container.querySelector('.crop-selection-box');
    expect(selectionBox).not.toBeNull();
  });
});
