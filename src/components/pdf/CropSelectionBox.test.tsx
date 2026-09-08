import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders four interactive corner resize handles with accessible labels', () => {
    const { container } = render(<CropSelectionBox cropRect={defaultCropRect} />);

    const handles = container.querySelectorAll('.crop-handle');
    expect(handles.length).toBe(4);

    expect(
      screen.getByRole('button', { name: 'Resize crop top-left handle' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Resize crop top-right handle' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Resize crop bottom-right handle' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Resize crop bottom-left handle' }),
    ).toBeDefined();
  });

  it('renders size badge with percentage label', () => {
    render(<CropSelectionBox cropRect={defaultCropRect} />);

    expect(screen.getByText('50% × 40%')).toBeDefined();
  });

  it('resizes crop rectangle using keyboard arrow keys on focused handle', () => {
    const handleChange = vi.fn();
    render(
      <CropSelectionBox
        cropRect={defaultCropRect}
        onChange={handleChange}
        isEditing={true}
      />,
    );

    const seHandle = screen.getByRole('button', {
      name: 'Resize crop bottom-right handle',
    });

    // Press ArrowRight to expand width by 0.01 (1%)
    fireEvent.keyDown(seHandle, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.2,
        y: 0.25,
        width: 0.51,
        height: 0.4,
      }),
    );

    // Press ArrowDown to expand height by 0.01 (1%)
    fireEvent.keyDown(seHandle, { key: 'ArrowDown' });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.2,
        y: 0.25,
        width: 0.5,
        height: 0.41,
      }),
    );

    // Press ArrowRight with Shift to expand width by 0.05 (5%)
    fireEvent.keyDown(seHandle, { key: 'ArrowRight', shiftKey: true });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.2,
        y: 0.25,
        width: 0.55,
        height: 0.4,
      }),
    );
  });

  it('handles pointer drag resizing on SE handle', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <CropSelectionBox
        cropRect={defaultCropRect}
        onChange={handleChange}
        isEditing={true}
      />,
    );

    const selectionContainer = container.querySelector(
      '.crop-selection-container',
    ) as HTMLElement;

    // Mock getBoundingClientRect on container to 500px x 400px
    vi.spyOn(selectionContainer, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const seHandle = screen.getByRole('button', {
      name: 'Resize crop bottom-right handle',
    });

    // Mock setPointerCapture and releasePointerCapture
    seHandle.setPointerCapture = vi.fn();
    seHandle.releasePointerCapture = vi.fn();

    // Pointer down at (350, 260)
    fireEvent.pointerDown(seHandle, {
      clientX: 350,
      clientY: 260,
      pointerId: 1,
    });

    // Move pointer by +50px X (50/500 = +0.10) and +40px Y (40/400 = +0.10)
    fireEvent.pointerMove(seHandle, {
      clientX: 400,
      clientY: 300,
      pointerId: 1,
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.2,
        y: 0.25,
        width: 0.6,
        height: 0.5,
      }),
    );

    // Pointer up releases drag
    fireEvent.pointerUp(seHandle, { pointerId: 1 });
  });

  it('handles pointer drag translation on crop box body', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <CropSelectionBox
        cropRect={defaultCropRect}
        onChange={handleChange}
        isEditing={true}
      />,
    );

    const selectionContainer = container.querySelector(
      '.crop-selection-container',
    ) as HTMLElement;

    vi.spyOn(selectionContainer, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 400,
      top: 0,
      left: 0,
      bottom: 400,
      right: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const cropBox = screen.getByRole('region', {
      name: 'Crop selection: 50% × 40%',
    });

    cropBox.setPointerCapture = vi.fn();
    cropBox.releasePointerCapture = vi.fn();

    // Pointer down on box body
    fireEvent.pointerDown(cropBox, {
      clientX: 200,
      clientY: 200,
      pointerId: 2,
    });

    // Move pointer by +50px X (+0.10) and +40px Y (+0.10)
    fireEvent.pointerMove(cropBox, {
      clientX: 250,
      clientY: 240,
      pointerId: 2,
    });

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.3,
        y: 0.35,
        width: 0.5,
        height: 0.4,
      }),
    );

    // Pointer up
    fireEvent.pointerUp(cropBox, { pointerId: 2 });
  });

  it('moves crop rectangle using keyboard arrow keys on focused crop box', () => {
    const handleChange = vi.fn();
    render(
      <CropSelectionBox
        cropRect={defaultCropRect}
        onChange={handleChange}
        isEditing={true}
      />,
    );

    const cropBox = screen.getByRole('region', {
      name: 'Crop selection: 50% × 40%',
    });

    // Press ArrowRight to move x by +0.01 (1%)
    fireEvent.keyDown(cropBox, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.21,
        y: 0.25,
        width: 0.5,
        height: 0.4,
      }),
    );

    // Press ArrowDown with Shift to move y by +0.05 (5%)
    fireEvent.keyDown(cropBox, { key: 'ArrowDown', shiftKey: true });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 0.2,
        y: 0.3,
        width: 0.5,
        height: 0.4,
      }),
    );
  });
});
