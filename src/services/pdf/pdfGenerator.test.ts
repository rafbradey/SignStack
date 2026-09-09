import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  calculatePdfBoundingBox,
  getDefaultOutputFilename,
  generatePdf,
  downloadPdfBlob,
} from './pdfGenerator';
import type { UploadedDocument, PageOverlay, NormalizedRect } from '@/types';

/**
 * Helper to build a minimal valid PDF byte array in-memory for testing.
 */
async function createTestPdfBytes(
  pageCount = 1,
  width = 600,
  height = 800,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([width, height]);
    page.drawText(`Page ${i + 1}`, {
      x: 50,
      y: height - 50,
      size: 24,
      color: rgb(0, 0, 0),
    });
  }
  return doc.save();
}

/**
 * Helper to construct an UploadedDocument fixture from raw bytes.
 */
function createMockUploadedDocument(
  id: string,
  name: string,
  bytes: Uint8Array,
): UploadedDocument {
  const file = new File([bytes as Uint8Array<ArrayBuffer>], name, { type: 'application/pdf' });
  return {
    id,
    file,
    name,
    size: bytes.byteLength,
    formattedSize: `${(bytes.byteLength / 1024).toFixed(1)} KB`,
    type: 'application/pdf',
    uploadedAt: Date.now(),
  };
}

describe('pdfGenerator', () => {
  describe('calculatePdfBoundingBox', () => {
    it('converts a full-page normalized rectangle to PDF bounding box', () => {
      const crop: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 };
      const box = calculatePdfBoundingBox(crop, 500, 700);

      expect(box.left).toBe(0);
      expect(box.right).toBe(500);
      expect(box.bottom).toBe(0);
      expect(box.top).toBe(700);
    });

    it('converts a partial crop region with correct top-to-bottom inversion', () => {
      // 10% from left, 20% from top, 50% width, 30% height on a 600x800 page
      const crop: NormalizedRect = { x: 0.1, y: 0.2, width: 0.5, height: 0.3 };
      const box = calculatePdfBoundingBox(crop, 600, 800);

      expect(box.left).toBeCloseTo(60);
      expect(box.right).toBeCloseTo(360);
      // Top of crop in browser is 20% down -> in PDF space it is 800 - 160 = 640
      expect(box.top).toBeCloseTo(640);
      // Bottom of crop in browser is 50% down -> in PDF space it is 800 - 400 = 400
      expect(box.bottom).toBeCloseTo(400);
    });

    it('clamps crop coordinates that exceed [0, 1] bounds', () => {
      const crop: NormalizedRect = { x: -0.5, y: -0.2, width: 2, height: 2 };
      const box = calculatePdfBoundingBox(crop, 500, 500);

      expect(box.left).toBe(0);
      expect(box.right).toBe(500);
      expect(box.bottom).toBe(0);
      expect(box.top).toBe(500);
    });
  });

  describe('getDefaultOutputFilename', () => {
    it('appends _signed to filename', () => {
      expect(getDefaultOutputFilename('document.pdf')).toBe('document_signed.pdf');
    });

    it('handles files with multiple dots', () => {
      expect(getDefaultOutputFilename('Contract.v2.final.pdf')).toBe(
        'Contract.v2.final_signed.pdf',
      );
    });

    it('handles filenames without extension', () => {
      expect(getDefaultOutputFilename('invoice')).toBe('invoice_signed.pdf');
    });
  });

  describe('generatePdf', () => {
    it('generates a valid PDF when there are no overlays', async () => {
      const mainBytes = await createTestPdfBytes(2, 600, 800);
      const mainDoc = createMockUploadedDocument('main-1', 'MainDoc.pdf', mainBytes);

      const result = await generatePdf({
        mainDocument: mainDoc,
        overlays: [],
        documents: [mainDoc],
      });

      expect(result.filename).toBe('MainDoc_signed.pdf');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/pdf');
      expect(result.bytes.byteLength).toBeGreaterThan(0);

      // Verify the generated PDF can be loaded and has 2 pages
      const parsedDoc = await PDFDocument.load(result.bytes);
      expect(parsedDoc.getPageCount()).toBe(2);
    });

    it('embeds an overlay onto a main document page', async () => {
      const mainBytes = await createTestPdfBytes(2, 600, 800);
      const overlayBytes = await createTestPdfBytes(1, 200, 100);

      const mainDoc = createMockUploadedDocument('main-1', 'MainDoc.pdf', mainBytes);
      const overlayDoc = createMockUploadedDocument(
        'sig-1',
        'Signature.pdf',
        overlayBytes,
      );

      const overlay: PageOverlay = {
        id: 'overlay-1',
        mainDocumentId: 'main-1',
        mainPageNumber: 1,
        overlayDocumentId: 'sig-1',
        overlayPageNumber: 1,
        position: { x: 0.2, y: 0.7 },
        scale: 0.8,
        opacity: 0.85,
        rotation: 0,
      };

      const result = await generatePdf({
        mainDocument: mainDoc,
        overlays: [overlay],
        documents: [mainDoc, overlayDoc],
      });

      expect(result.bytes.byteLength).toBeGreaterThan(0);
      const parsedDoc = await PDFDocument.load(result.bytes);
      expect(parsedDoc.getPageCount()).toBe(2);
    });

    it('embeds a cropped overlay onto a destination page', async () => {
      const mainBytes = await createTestPdfBytes(1, 600, 800);
      const overlayBytes = await createTestPdfBytes(1, 400, 300);

      const mainDoc = createMockUploadedDocument('main-1', 'MainDoc.pdf', mainBytes);
      const overlayDoc = createMockUploadedDocument('sig-1', 'Stamp.pdf', overlayBytes);

      const overlay: PageOverlay = {
        id: 'overlay-crop',
        mainDocumentId: 'main-1',
        mainPageNumber: 1,
        overlayDocumentId: 'sig-1',
        overlayPageNumber: 1,
        position: { x: 0.1, y: 0.1 },
        scale: 1,
        opacity: 1,
        rotation: 0,
        cropRect: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
      };

      const result = await generatePdf({
        mainDocument: mainDoc,
        overlays: [overlay],
        documents: [mainDoc, overlayDoc],
        outputFilename: 'Custom_output.pdf',
      });

      expect(result.filename).toBe('Custom_output.pdf');
      const parsedDoc = await PDFDocument.load(result.bytes);
      expect(parsedDoc.getPageCount()).toBe(1);
    });

    it('skips overlays that reference missing documents or out-of-range pages gracefully', async () => {
      const mainBytes = await createTestPdfBytes(1, 600, 800);
      const mainDoc = createMockUploadedDocument('main-1', 'MainDoc.pdf', mainBytes);

      const invalidOverlays: PageOverlay[] = [
        {
          id: 'missing-source',
          mainDocumentId: 'main-1',
          mainPageNumber: 1,
          overlayDocumentId: 'non-existent-doc',
          overlayPageNumber: 1,
          position: { x: 0, y: 0 },
          scale: 1,
          opacity: 1,
          rotation: 0,
        },
        {
          id: 'out-of-range-main-page',
          mainDocumentId: 'main-1',
          mainPageNumber: 99, // Document only has 1 page
          overlayDocumentId: 'main-1',
          overlayPageNumber: 1,
          position: { x: 0, y: 0 },
          scale: 1,
          opacity: 1,
          rotation: 0,
        },
      ];

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await generatePdf({
        mainDocument: mainDoc,
        overlays: invalidOverlays,
        documents: [mainDoc],
      });

      expect(result.bytes.byteLength).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('throws when main document is missing or corrupted', async () => {
      const invalidDoc = {
        id: 'corrupt',
        file: new File([new Uint8Array([1, 2, 3])], 'bad.pdf', {
          type: 'application/pdf',
        }),
        name: 'bad.pdf',
        size: 3,
        formattedSize: '3 B',
        type: 'application/pdf',
        uploadedAt: Date.now(),
      };

      await expect(
        generatePdf({
          mainDocument: invalidDoc,
          overlays: [],
          documents: [invalidDoc],
        }),
      ).rejects.toThrow('Failed to parse main document');
    });
  });

  describe('downloadPdfBlob', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('creates an anchor, triggers click, and cleans up URL and DOM', () => {
      const mockBlob = new Blob(['dummy content'], { type: 'application/pdf' });
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      downloadPdfBlob(mockBlob, 'export.pdf');

      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
      expect(appendChildSpy).toHaveBeenCalled();

      const appendedLink = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(appendedLink.tagName).toBe('A');
      expect(appendedLink.download).toBe('export.pdf');
      expect(appendedLink.href).toBe('blob:http://localhost/test-uuid');

      // Fast-forward timeout for cleanup
      vi.runAllTimers();

      expect(removeChildSpy).toHaveBeenCalledWith(appendedLink);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
    });

    it('automatically appends .pdf extension if omitted', () => {
      const mockBlob = new Blob(['dummy content'], { type: 'application/pdf' });
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test');
      globalThis.URL.revokeObjectURL = vi.fn();

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      downloadPdfBlob(mockBlob, 'signed_doc');

      const appendedLink = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(appendedLink.download).toBe('signed_doc.pdf');
    });
  });
});
