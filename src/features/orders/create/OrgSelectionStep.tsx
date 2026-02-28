import type { Organization } from '@/lib/database.types.ts';

interface OrgSelectionStepProps {
  orgSubStep: 'aggregator' | 'store';
  organizations: Organization[];
  orgsLoading: boolean;
  selectedOrg: Organization | null;
  childOrgs: Organization[];
  onSelectAggregator: (org: Organization) => void;
  onSelectStore: (store: Organization) => void;
  onUseAggregatorDirectly: () => void;
}

function OrgCard({ onClick, title, subtitle }: { onClick: () => void; title: string; subtitle: string }) {
  return (
    <div onClick={onClick}
      style={{
        padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
        border: '1px solid #E2E0DE', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D3010A'; e.currentTarget.style.background = '#FEF2F2'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E0DE'; e.currentTarget.style.background = '#fff'; }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#1E293B' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#8A8886', marginTop: 2 }}>{subtitle}</div>
      </div>
      <span style={{ color: '#94A3B8', fontSize: 18 }}>→</span>
    </div>
  );
}

export function OrgSelectionStep({
  orgSubStep, organizations, orgsLoading, selectedOrg, childOrgs,
  onSelectAggregator, onSelectStore, onUseAggregatorDirectly,
}: OrgSelectionStepProps) {
  return (
    <div>
      {/* Sub-step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: orgSubStep === 'aggregator' ? '#D3010A' : '#E2E8F0',
          color: orgSubStep === 'aggregator' ? '#fff' : '#64748B',
        }}>
          1. Agregador
        </div>
        <span style={{ color: '#CBD5E1' }}>→</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: orgSubStep === 'store' ? '#D3010A' : '#E2E8F0',
          color: orgSubStep === 'store' ? '#fff' : '#64748B',
        }}>
          2. Tienda
        </div>
      </div>

      {/* Sub-step A: Select Aggregator */}
      {orgSubStep === 'aggregator' && (
        <>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Selecciona el agregador de cuyo inventario se descontarán los productos.
          </p>
          {orgsLoading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>Cargando agregadores...</p>
          ) : organizations.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>No hay agregadores activos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {organizations.map((org) => (
                <OrgCard
                  key={org.id}
                  onClick={() => onSelectAggregator(org)}
                  title={org.name}
                  subtitle={`Agregador${org.rif ? ` · RIF: ${org.rif}` : ''}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sub-step B: Select Store / Child */}
      {orgSubStep === 'store' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8, marginBottom: 16,
            background: '#F1F5F9', border: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: 14 }}>🏢</span>
            <span style={{ fontSize: 13, color: '#475569' }}>Agregador:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{selectedOrg?.name}</span>
          </div>

          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            ¿De qué tienda deseas descontar el inventario?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OrgCard
              onClick={onUseAggregatorDirectly}
              title={`${selectedOrg?.name ?? ''}`}
              subtitle={`Agregador${selectedOrg?.rif ? ` · RIF: ${selectedOrg.rif}` : ''}`}
            />
            {childOrgs.map((store) => (
              <OrgCard
                key={store.id}
                onClick={() => onSelectStore(store)}
                title={store.name}
                subtitle={`Tienda asociada${store.rif ? ` · RIF: ${store.rif}` : ''}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
