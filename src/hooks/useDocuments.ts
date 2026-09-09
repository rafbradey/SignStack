import { useState, useCallback } from 'react';
import {
  UploadedDocument,
  ValidationError,
  PdfValidationOptions,
} from '@/types';
import {
  validatePdfFile,
  createUploadedDocument,
  resolveUniqueFilename,
} from '@/utils';

/**
 * Immutably moves an item within an array from startIndex to endIndex.
 * Returns a new array copy without mutating the original.
 */
export function arrayMove<T>(
  array: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= array.length ||
    toIndex < 0 ||
    toIndex >= array.length ||
    fromIndex === toIndex
  ) {
    return [...array];
  }

  const result = [...array];
  const [movedItem] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, movedItem);
  return result;
}

export interface AddFilesResult {
  added: UploadedDocument[];
  errors: ValidationError[];
}

export interface UseDocumentsReturn {
  /** Ordered list of uploaded and validated PDF documents in client memory */
  documents: UploadedDocument[];
  /** Errors encountered during file validation */
  validationErrors: ValidationError[];
  /** Whether files are actively being validated/processed */
  isProcessing: boolean;
  /**
   * Validates and adds incoming files to state.
   * Valid files are appended to documents.
   * Invalid files produce validation errors without halting valid ones.
   */
  addFiles: (
    files: File[] | FileList,
    options?: PdfValidationOptions,
  ) => Promise<AddFilesResult>;
  /** Removes an uploaded document by unique identifier */
  removeDocument: (id: string) => void;
  /** Reorders documents by moving an item from startIndex to endIndex */
  reorderDocuments: (startIndex: number, endIndex: number) => void;
  /** Moves a document up or down one step in the queue */
  moveDocument: (id: string, direction: 'up' | 'down') => void;
  /** Clears all uploaded documents from memory */
  clearDocuments: () => void;
  /** Clears all validation errors */
  clearErrors: () => void;
  /** Dismisses a single validation error by index */
  dismissError: (index: number) => void;
}

/**
 * Custom hook for managing the state of uploaded PDF documents.
 *
 * Privacy-first: All document operations occur exclusively in client memory.
 * No data is uploaded or transmitted over the network.
 */
export function useDocuments(): UseDocumentsReturn {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const addFiles = useCallback(
    async (
      files: File[] | FileList,
      options?: PdfValidationOptions,
    ): Promise<AddFilesResult> => {
      const fileList = Array.from(files);
      if (fileList.length === 0) {
        return { added: [], errors: [] };
      }

      setIsProcessing(true);

      try {
        const validationResults = await Promise.all(
          fileList.map(async (file) => ({
            file,
            result: await validatePdfFile(file, options),
          })),
        );

        const existingNames = new Set(documents.map((d) => d.name));
        const newValidDocs: UploadedDocument[] = [];
        const newErrors: ValidationError[] = [];

        for (const item of validationResults) {
          if (item.result.valid) {
            const uniqueName = resolveUniqueFilename(
              item.file.name,
              existingNames,
            );
            existingNames.add(uniqueName);
            newValidDocs.push(createUploadedDocument(item.file, uniqueName));
          } else {
            newErrors.push(item.result.error);
          }
        }

        if (newValidDocs.length > 0) {
          setDocuments((prev) => [...prev, ...newValidDocs]);
        }

        if (newErrors.length > 0) {
          setValidationErrors((prev) => [...prev, ...newErrors]);
        }

        return { added: newValidDocs, errors: newErrors };
      } finally {
        setIsProcessing(false);
      }
    },
    [documents],
  );

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const reorderDocuments = useCallback(
    (startIndex: number, endIndex: number) => {
      setDocuments((prev) => arrayMove(prev, startIndex, endIndex));
    },
    [],
  );

  const moveDocument = useCallback((id: string, direction: 'up' | 'down') => {
    setDocuments((prev) => {
      const currentIndex = prev.findIndex((doc) => doc.id === id);
      if (currentIndex === -1) return prev;

      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      return arrayMove(prev, currentIndex, targetIndex);
    });
  }, []);

  const clearDocuments = useCallback(() => {
    setDocuments([]);
  }, []);

  const clearErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  const dismissError = useCallback((index: number) => {
    setValidationErrors((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    documents,
    validationErrors,
    isProcessing,
    addFiles,
    removeDocument,
    reorderDocuments,
    moveDocument,
    clearDocuments,
    clearErrors,
    dismissError,
  };
}
