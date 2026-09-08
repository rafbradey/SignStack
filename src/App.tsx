import { useState } from 'react';
import { Header, Workspace } from '@/components/layout';
import { Alert } from '@/components/ui';

export default function App() {
  const [phaseNotice, setPhaseNotice] = useState<string | null>(null);

  const handleUploadClick = () => {
    setPhaseNotice(
      'PDF uploading, validation, and document cards will be activated in Phase 3.',
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

      {/* Transient Notification Banner (e.g. Phase 3 prompt) */}
      {phaseNotice && (
        <div
          style={{
            padding: 'var(--space-2) var(--space-6)',
            backgroundColor: 'var(--bg-canvas)',
          }}
        >
          <Alert
            variant="info"
            title="Phase 3 Ready"
            onDismiss={() => setPhaseNotice(null)}
          >
            {phaseNotice}
          </Alert>
        </div>
      )}

      {/* Dual-Pane Workspace (EDITOR | RESULT) */}
      <Workspace onUploadClick={handleUploadClick} />
    </div>
  );
}
