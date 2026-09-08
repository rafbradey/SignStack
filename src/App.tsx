import { useState } from 'react';
import { Header, Workspace } from '@/components/layout';
import { Alert } from '@/components/ui';
import { useDocuments } from '@/hooks';

export default function App() {
  const [phaseNotice, setPhaseNotice] = useState<string | null>(null);
  const {
    documents,
    validationErrors,
    removeDocument,
    reorderDocuments,
    clearErrors,
  } = useDocuments();

  const handleUploadClick = () => {
    setPhaseNotice(
      'Document state management (Task 3.2) is active. The upload dropzone and file picker will be connected in Task 3.3.',
    );
  };

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

      {/* Transient Notification Banner */}
      {phaseNotice && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-6)',
            backgroundColor: 'var(--bg-canvas)',
          }}
        >
          <Alert
            variant="info"
            title="Upload Pipeline Status"
            onDismiss={() => setPhaseNotice(null)}
          >
            {phaseNotice}
          </Alert>
        </div>
      )}

      {/* Dual-Pane Workspace (EDITOR | RESULT) */}
      <Workspace
        documents={documents}
        onUploadClick={handleUploadClick}
        onRemoveDocument={removeDocument}
        onReorderDocuments={reorderDocuments}
      />
    </div>
  );
}
