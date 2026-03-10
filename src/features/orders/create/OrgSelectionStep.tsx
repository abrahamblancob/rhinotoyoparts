import type { Organization } from '@/lib/database.types.ts';
import type { Warehouse } from '@/types/warehouse.ts';

interface OrgSelectionStepBaseProps {
  orgSubStep: string;
  orgsLoading: boolean;
  selectedOrg: Organization | null;
  childOrgs: Organization[];
}

interface PlatformOrgSelectionStepProps extends OrgSelectionStepBaseProps {
  mode: 'platform';
  organizations: Organization[];
  onSelectAggregator: (org: Organization) => void;
  onSelectStore: (store: Organization) => void;
  onUseAggregatorDirectly: () => void;
  warehouses?: never;
  onSelectAssociate?: never;
  onSelectWarehouse?: never;
}

interface AggregatorOrgSelectionStepProps extends OrgSelectionStepBaseProps {
  mode: 'aggregator';
  organizations?: never;
  onSelectAggregator?: never;
  onSelectStore?: never;
  onUseAggregatorDirectly?: never;
  warehouses: Warehouse[];
  onSelectAssociate: (org: Organization) => void;
  onSelectWarehouse: (wh: Warehouse) => void;
}

type OrgSelectionStepProps = PlatformOrgSelectionStepProps | AggregatorOrgSelectionStepProps;

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

export function OrgSelectionStep(props: OrgSelectionStepProps) {
  if (props.mode === 'aggregator') {
    return <AggregatorSelectionStep {...props} />;
  }
  return <PlatformSelectionStep {...props} />;
}

/* ─── Platform flow: Aggregator → Store ─── */
function PlatformSelectionStep({
  orgSubStep, organizations, orgsLoading, selectedOrg, childOrgs,
  onSelectAggregator, onSelectStore, onUseAggregatorDirectly,
}: PlatformOrgSelectionStepProps) {
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
          ) : !organizations || organizations.length === 0 ? (
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

/* ─── Aggregator flow: Associate → Warehouse ─── */
function AggregatorSelectionStep({
  orgSubStep, orgsLoading, selectedOrg, childOrgs,
  warehouses, onSelectAssociate, onSelectWarehouse,
}: AggregatorOrgSelectionStepProps) {
  return (
    <div>
      {/* Sub-step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: orgSubStep === 'associate' ? '#D3010A' : '#E2E8F0',
          color: orgSubStep === 'associate' ? '#fff' : '#64748B',
        }}>
          1. Asociado
        </div>
        <span style={{ color: '#CBD5E1' }}>→</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: orgSubStep === 'warehouse' ? '#D3010A' : '#E2E8F0',
          color: orgSubStep === 'warehouse' ? '#fff' : '#64748B',
        }}>
          2. Almacén
        </div>
      </div>

      {/* Sub-step A: Select Associate */}
      {orgSubStep === 'associate' && (
        <>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Selecciona el asociado para el cual se creará la orden de compra.
          </p>
          {orgsLoading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>Cargando asociados...</p>
          ) : childOrgs.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>No hay asociados registrados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {childOrgs.map((org) => (
                <OrgCard
                  key={org.id}
                  onClick={() => onSelectAssociate(org)}
                  title={org.name}
                  subtitle={`Asociado${org.rif ? ` · RIF: ${org.rif}` : ''}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sub-step B: Select Warehouse */}
      {orgSubStep === 'warehouse' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 8, marginBottom: 16,
            background: '#F1F5F9', border: '1px solid #E2E8F0',
          }}>
            <span style={{ fontSize: 14 }}>👤</span>
            <span style={{ fontSize: 13, color: '#475569' }}>Asociado:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{selectedOrg?.name}</span>
          </div>

          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Selecciona el almacén de donde se tomarán los productos.
          </p>

          {warehouses.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>No hay almacenes activos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {warehouses.map((wh) => (
                <OrgCard
                  key={wh.id}
                  onClick={() => onSelectWarehouse(wh)}
                  title={wh.name}
                  subtitle={`Código: ${wh.code}${wh.address ? ` · ${wh.address}` : ''}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
