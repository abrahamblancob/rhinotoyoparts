interface Props {
  phase: 'parsing' | 'mapping' | 'validating';
  progress: number;
  fileName: string;
}

const PHASE_CONFIG = {
  parsing: {
    icon: '📂',
    title: 'Leyendo archivo...',
    getSubtitle: (fileName: string) => `Procesando "${fileName}"`,
  },
  mapping: {
    icon: '🤖',
    title: 'Analizando columnas con IA...',
    getSubtitle: () => 'Identificando el mapeo correcto de tus columnas',
  },
  validating: {
    icon: '🔍',
    title: 'Validando datos...',
    getSubtitle: () => 'Verificando formato, campos requeridos y duplicados',
  },
};

export function ProcessingView({ phase, progress, fileName }: Props) {
  const config = PHASE_CONFIG[phase];

  return (
    <div className="rh-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{config.icon}</div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#242321',
          marginBottom: 8,
        }}
      >
        {config.title}
      </h3>
      <p style={{ fontSize: 14, color: '#8A8886', marginBottom: 24 }}>
        {config.getSubtitle(fileName)}
      </p>

      {phase !== 'mapping' && (
        <>
          <div className="rh-progress-bar">
            <div
              className="rh-progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p style={{ fontSize: 13, color: '#8A8886', marginTop: 8 }}>
            {progress}%
          </p>
        </>
      )}

      {phase === 'mapping' && (
        <div className="rh-progress-bar">
          <div
            className="rh-progress-bar-fill"
            style={{
              width: '100%',
              animation: 'rh-pulse 1.5s ease-in-out infinite',
              opacity: 0.6,
            }}
          />
        </div>
      )}
    </div>
  );
}
