import { PDFDocument, degrees } from 'pdf-lib';
import type { PageBoundingBox } from 'pdf-lib';
import type { UploadedDocument, PageOverlay, NormalizedRect } from '@/types';
import { clamp, calculateOverlayPdfBounds } from '@/utils/pdfCoordinates';

/**
 * Options for generating a composite PDF with overlays.
 */
export interface GeneratePdfOptions {
  /** The destination main document */
  mainDocument: UploadedDocument;
  /** List of overlays to embed */
  overlays: PageOverlay[];
  /** Available documents in the workspace (used to lookup overlay source documents) */
  documents: UploadedDocument[];
  /** Optional custom output filename (defaults to "[originalName]_signed.pdf") */
  outputFilename?: string;
}

/**
 * Result of the PDF generation process.
 */
export interface GeneratePdfResult {
  /** The compiled PDF as a browser Blob (MIME type application/pdf) */
  blob: Blob;
  /** Raw byte array of the generated PDF */
  bytes: Uint8Array;
  /** Final output filename */
  filename: string;
}

/**
 * Converts a normalized top-left crop rectangle [0, 1] into
 * PDF point PageBoundingBox (bottom-left origin).
 *
 * In browser coordinates:
 * - (0, 0) is top-left
 * - crop.y increases downward
 *
 * In PDF coordinates:
 * - (0, 0) is bottom-left
 * - Y increases upward
 */
export function calculatePdfBoundingBox(
  cropRect: NormalizedRect,
  pageWidth: number,
  pageHeight: number,
): PageBoundingBox {
  const normX = clamp(cropRect.x, 0, 1);
  const normY = clamp(cropRect.y, 0, 1);
  const normWidth = clamp(cropRect.width, 0, 1 - normX);
  const normHeight = clamp(cropRect.height, 0, 1 - normY);

  const left = normX * pageWidth;
  const right = (normX + normWidth) * pageWidth;

  // In PDF space: top is higher Y, bottom is lower Y
  const top = pageHeight - normY * pageHeight;
  const bottom = pageHeight - (normY + normHeight) * pageHeight;

  return {
    left,
    right,
    bottom,
    top,
  };
}

/**
 * Formats a default output filename based on the main document's name.
 * e.g., "Contract.pdf" -> "Contract_signed.pdf"
 */
export function getDefaultOutputFilename(originalName: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  return `${baseName || 'document'}_signed.pdf`;
}

/**
 * Generates a high-fidelity vector PDF document client-side by embedding
 * overlay pages onto the main document using pdf-lib.
 *
 * Preserves vector sharpness and text clarity without rasterizing to canvas.
 * 100% private: no data is sent to external servers.
 */
export async function generatePdf({
  mainDocument,
  overlays,
  documents,
  outputFilename,
}: GeneratePdfOptions): Promise<GeneratePdfResult> {
  if (!mainDocument || !mainDocument.file) {
    throw new Error('A valid main document is required for PDF generation.');
  }

  // 1. Read main document bytes
  let mainDocBytes: ArrayBuffer;
  try {
    mainDocBytes = await mainDocument.file.arrayBuffer();
  } catch (error) {
    throw new Error(
      `Failed to read main document "${mainDocument.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error },
    );
  }

  // 2. Load main PDF document into pdf-lib
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(mainDocBytes, { ignoreEncryption: true });
  } catch (error) {
    throw new Error(
      `Failed to parse main document "${mainDocument.name}": ${error instanceof Error ? error.message : 'Corrupted or invalid PDF'}`,
      { cause: error },
    );
  }

  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error(`The document "${mainDocument.name}" contains no pages.`);
  }

  // 3. Cache source overlay documents so we don't reload the same file multiple times
  const docsById = new Map<string, UploadedDocument>();
  for (const doc of documents) {
    docsById.set(doc.id, doc);
  }
  // Ensure main document is accessible
  docsById.set(mainDocument.id, mainDocument);

  const loadedOverlayPdfDocs = new Map<string, PDFDocument>();

  // Helper to load or retrieve cached source PDFDocument
  const getSourcePdfDoc = async (docId: string): Promise<PDFDocument | null> => {
    if (loadedOverlayPdfDocs.has(docId)) {
      return loadedOverlayPdfDocs.get(docId)!;
    }

    const doc = docsById.get(docId);
    if (!doc || !doc.file) {
      console.warn(`Overlay source document ID "${docId}" not found in workspace.`);
      return null;
    }

    try {
      const bytes = await doc.file.arrayBuffer();
      const loaded = await PDFDocument.load(bytes, { ignoreEncryption: true });
      loadedOverlayPdfDocs.set(docId, loaded);
      return loaded;
    } catch (err) {
      console.warn(
        `Failed to parse overlay document "${doc.name}":`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  };

  // 4. Group overlays by mainPageNumber (1-based)
  // Filter overlays that belong to this main document
  const relevantOverlays = overlays.filter(
    (o) => o.mainDocumentId === mainDocument.id,
  );

  for (const overlay of relevantOverlays) {
    const pageIndex = overlay.mainPageNumber - 1;
    if (pageIndex < 0 || pageIndex >= pageCount) {
      console.warn(
        `Overlay references page ${overlay.mainPageNumber}, but document only has ${pageCount} pages. Skipping.`,
      );
      continue;
    }

    const basePage = pdfDoc.getPage(pageIndex);
    const sourcePdfDoc = await getSourcePdfDoc(overlay.overlayDocumentId);
    if (!sourcePdfDoc) {
      continue;
    }

    const overlayPageIndex = overlay.overlayPageNumber - 1;
    if (
      overlayPageIndex < 0 ||
      overlayPageIndex >= sourcePdfDoc.getPageCount()
    ) {
      console.warn(
        `Overlay references source page ${overlay.overlayPageNumber}, but source has ${sourcePdfDoc.getPageCount()} pages. Skipping.`,
      );
      continue;
    }

    const sourcePage = sourcePdfDoc.getPage(overlayPageIndex);
    const sourceSize = sourcePage.getSize();
    const baseSize = basePage.getSize();

    // 5. Handle Crop Bounding Box if defined
    let embeddedPage;
    let intrinsicWidth: number;
    let intrinsicHeight: number;

    if (overlay.cropRect) {
      const boundingBox = calculatePdfBoundingBox(
        overlay.cropRect,
        sourceSize.width,
        sourceSize.height,
      );
      embeddedPage = await pdfDoc.embedPage(sourcePage, boundingBox);
      intrinsicWidth = Math.abs(boundingBox.right - boundingBox.left);
      intrinsicHeight = Math.abs(boundingBox.top - boundingBox.bottom);
    } else {
      embeddedPage = await pdfDoc.embedPage(sourcePage);
      intrinsicWidth = sourceSize.width;
      intrinsicHeight = sourceSize.height;
    }

    // 6. Calculate placement coordinates in standard PDF points
    const pdfBounds = calculateOverlayPdfBounds(
      overlay.position,
      overlay.scale ?? 1,
      baseSize,
      { width: intrinsicWidth, height: intrinsicHeight },
    );

    // 7. Draw the embedded page onto the base page
    basePage.drawPage(embeddedPage, {
      x: pdfBounds.x,
      y: pdfBounds.y,
      width: pdfBounds.width,
      height: pdfBounds.height,
      opacity: typeof overlay.opacity === 'number' ? clamp(overlay.opacity, 0, 1) : 1,
      rotate: overlay.rotation ? degrees(overlay.rotation) : undefined,
    });
  }

  // 8. Save the final PDF bytes
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const filename = outputFilename || getDefaultOutputFilename(mainDocument.name);

  return {
    blob,
    bytes,
    filename,
  };
}

/**
 * Triggers a browser file download for a generated PDF Blob.
 *
 * @param blob The PDF Blob to download
 * @param filename The downloaded file name
 */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Clean up DOM and revoke object URL
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
