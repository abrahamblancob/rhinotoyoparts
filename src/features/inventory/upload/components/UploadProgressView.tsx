import type { UploadProgress } from '../types.ts';

interface Props {
  progress: UploadProgress;
}

export function UploadProgressView({ progress }: Props) {
  const pct =
    progress.totalBatches > 0
      ? Math.round((progress.completedBatches / progress.totalBatches) * 100)
      : 0;

  return (
    <div className="rh-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#242321',
          marginBottom: 8,
        }}
      >
        Cargando productos a la base de datos...
      </h3>
      <p style={{ fontSize: 14, color: '#8A8886', marginBottom: 24 }}>
        Lote {progress.currentBatch} de {progress.totalBatches} —{' '}
        {progress.successCount} exitosos, {progress.errorCount} errores
      </p>

      <div className="rh-progress-bar">
        <div className="rh-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontSize: 13, color: '#8A8886', marginTop: 8 }}>{pct}%</p>
      <p style={{ fontSize: 12, color: '#F59E0B', marginTop: 16 }}>
        No cierres esta pagina mientras se completa la carga
      </p>
    </div>
  );
}
