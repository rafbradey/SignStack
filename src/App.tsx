import { Header, Workspace } from '@/components/layout';
import { Alert } from '@/components/ui';
import { useDocuments } from '@/hooks';

export default function App() {
  const {
    documents,
    validationErrors,
    addFiles,
    removeDocument,
    reorderDocuments,
    clearErrors,
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
              onDismiss={clearErrors}
            >
              {err.message}
            </Alert>
          ))}
        </div>
      )}


      {/* Dual-Pane Workspace (EDITOR | RESULT) */}
      <Workspace
        documents={documents}
        addFiles={addFiles}
        onRemoveDocument={removeDocument}
        onReorderDocuments={reorderDocuments}
      />
    </div>
  );
}
