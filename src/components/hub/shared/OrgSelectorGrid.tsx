import { StatsCard } from './StatsCard.tsx';

interface StatField<T> {
  key: keyof T;
  label: string;
  color: string;
  highlight?: boolean;
}

interface GlobalStat {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

interface OrgSelectorGridProps<T extends { id: string; name: string; type: string }> {
  summaries: T[];
  loading: boolean;
  statFields: StatField<T>[];
  onSelect: (orgId: string) => void;
  globalStats?: GlobalStat[];
  pageTitle: string;
  pageSubtitle: string;
  headerActions?: React.ReactNode;
}

export function OrgSelectorGrid<T extends { id: string; name: string; type: string }>({
  summaries,
  loading,
  statFields,
  onSelect,
  globalStats,
  pageTitle,
  pageSubtitle,
  headerActions,
}: OrgSelectorGridProps<T>) {
  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">{pageTitle}</h1>
          <p className="rh-page-subtitle">{pageSubtitle}</p>
        </div>
        {headerActions && <div className="rh-page-actions">{headerActions}</div>}
      </div>

      {globalStats && globalStats.length > 0 && (
        <div className="rh-stats-grid mb-6">
          {globalStats.map((s) => (
            <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} color={s.color} />
          ))}
        </div>
      )}

      {loading ? (
        <p className="rh-loading">Cargando organizaciones...</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {summaries.map((org) => (
            <div
              key={org.id}
              onClick={() => onSelect(org.id)}
              className="rh-card"
              style={{
                padding: '20px 24px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: '1px solid #E2E0DE',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D3010A';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(211,1,10,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E0DE';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                    {org.name}
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: org.type === 'aggregator' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      color: org.type === 'aggregator' ? '#6366F1' : '#10B981',
                    }}
                  >
                    {org.type === 'aggregator' ? 'Agregador' : 'Asociado'}
                  </span>
                </div>
                <span style={{ fontSize: 24, opacity: 0.3 }}>→</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {statFields.map((field) => {
                  const val = org[field.key] as number;
                  const displayColor = field.highlight && val > 0 ? '#D3010A' : field.color;
                  return (
                    <div
                      key={String(field.key)}
                      style={{ textAlign: 'center', padding: '8px 0', backgroundColor: '#F8FAFC', borderRadius: 8 }}
                    >
                      <p style={{ fontSize: 20, fontWeight: 800, color: displayColor, margin: 0 }}>
                        {typeof val === 'number' ? val.toLocaleString() : val}
                      </p>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{field.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
