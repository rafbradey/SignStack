import { Header, Workspace } from '@/components/layout';
import { Alert } from '@/components/ui';
import { ErrorBoundary } from '@/components/common';
import { useDocuments } from '@/hooks';

export default function App() {
  const {
    documents,
    validationErrors,
    isProcessing,
    addFiles,
    removeDocument,
    moveDocument,
    reorderDocuments,
    dismissError,
  } = useDocuments();

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Application Header */}
      <Header />

      {/* Validation Error Alerts */}
      {validationErrors.length > 0 && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-6)',
            backgroundColor: 'var(--bg-canvas)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {validationErrors.map((err, idx) => (
            <Alert
              key={`${err.fileName}-${idx}`}
              variant="danger"
              title={`Validation Error: ${err.fileName}`}
              onDismiss={() => dismissError(idx)}
            >
              {err.message}
            </Alert>
          ))}
        </div>
      )}

      {/* Dual-Pane Workspace (EDITOR | RESULT) wrapped in Error Boundary */}
      <ErrorBoundary
        title="Workspace Error"
        message="An unexpected rendering issue occurred in the workspace. You can reset and continue working."
      >
        <Workspace
          documents={documents}
          addFiles={addFiles}
          isProcessing={isProcessing}
          onRemoveDocument={removeDocument}
          onMoveDocument={moveDocument}
          onReorderDocuments={reorderDocuments}
        />
      </ErrorBoundary>
    </div>
  );
}
