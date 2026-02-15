interface Props {
  phase: 'parsing' | 'validating';
  progress: number;
  fileName: string;
}

export function ProcessingView({ phase, progress, fileName }: Props) {
  return (
    <div className="rh-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>
        {phase === 'parsing' ? '📂' : '🔍'}
      </div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#242321',
          marginBottom: 8,
        }}
      >
        {phase === 'parsing' ? 'Leyendo archivo...' : 'Validando datos...'}
      </h3>
      <p style={{ fontSize: 14, color: '#8A8886', marginBottom: 24 }}>
        {phase === 'parsing'
          ? `Procesando "${fileName}"`
          : 'Verificando formato, campos requeridos y duplicados'}
      </p>

      <div className="rh-progress-bar">
        <div
          className="rh-progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p style={{ fontSize: 13, color: '#8A8886', marginTop: 8 }}>{progress}%</p>
    </div>
  );
}
