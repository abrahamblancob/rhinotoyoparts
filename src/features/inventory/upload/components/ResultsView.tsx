import { useNavigate } from 'react-router-dom';
import type { UploadProgress } from '../types.ts';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';

interface Props {
  progress: UploadProgress;
  fileName: string;
  onUploadAnother: () => void;
}

export function ResultsView({ progress, fileName, onUploadAnother }: Props) {
  const navigate = useNavigate();
  const allSuccess = progress.errorCount === 0;

  return (
    <div>
      <div
        className={`rh-alert ${allSuccess ? 'rh-alert-success' : 'rh-alert-warning'} mb-6`}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          {allSuccess ? '✅' : '⚠️'}
        </div>
        <p style={{ fontWeight: 600, fontSize: 16 }}>
          {allSuccess
            ? 'Carga completada exitosamente'
            : 'Carga completada con errores'}
        </p>
        <p style={{ fontSize: 14, marginTop: 4 }}>Archivo: {fileName}</p>
      </div>

      <div className="rh-stats-grid mb-6">
        <StatsCard
          title="Cargados"
          value={progress.successCount}
          icon="✅"
          color="#10B981"
        />
        <StatsCard
          title="Errores"
          value={progress.errorCount}
          icon="❌"
          color="#D3010A"
        />
        <StatsCard
          title="Total"
          value={progress.successCount + progress.errorCount}
          icon="📊"
          color="#6366F1"
        />
      </div>

      {progress.errors.length > 0 && (
        <div className="rh-card mb-6">
          <h3 className="rh-card-title">Errores de carga</h3>
          <div
            className="rh-table-wrapper"
            style={{ maxHeight: 300, overflowY: 'auto' }}
          >
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {progress.errors.map((err, i) => (
                  <tr key={i}>
                    <td className="cell-mono">{err.rowNumber}</td>
                    <td style={{ color: '#D3010A' }}>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={onUploadAnother} className="rh-btn rh-btn-outline">
          Cargar otro archivo
        </button>
        <button
          onClick={() => navigate('/hub/inventory')}
          className="rh-btn rh-btn-primary"
        >
          Ver Inventario
        </button>
      </div>
    </div>
  );
}
