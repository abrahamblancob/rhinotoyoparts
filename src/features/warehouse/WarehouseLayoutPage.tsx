import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  MapPin,
  Grid3X3,
  Package,
  Settings,
  BarChart3,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions.ts';
import {
  useWarehouses,
  useWarehouseStats,
  useWarehouseZones,
  useWarehouseRacks,
} from '@/hooks/useWarehouse.ts';
import { RackDetailView } from './RackDetailView.tsx';
import type { WarehouseZone, WarehouseRack } from '@/types/warehouse.ts';

const ZONE_TYPE_LABELS: Record<string, string> = {
  storage: 'Almacenamiento',
  receiving: 'Recepcion',
  packing: 'Empaque',
  dispatch: 'Despacho',
  returns: 'Devoluciones',
};

export function WarehouseLayoutPage() {
  const navigate = useNavigate();
  const { canWrite } = usePermissions();

  const { data: warehouses, loading: warehousesLoading } = useWarehouses();
  const activeWarehouse = warehouses?.[0] ?? null;

  const { stats, loading: statsLoading, reload: reloadStats } = useWarehouseStats(activeWarehouse?.id);
  const { data: zones, loading: zonesLoading, reload: reloadZones } = useWarehouseZones(activeWarehouse?.id);

  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null);
  const [selectedRack, setSelectedRack] = useState<WarehouseRack | null>(null);

  const { data: zoneRacks, loading: racksLoading, reload: reloadRacks } = useWarehouseRacks(
    activeWarehouse?.id,
    selectedZone?.id,
  );

  // Reset selections when warehouse changes
  useEffect(() => {
    setSelectedZone(null);
    setSelectedRack(null);
  }, [activeWarehouse?.id]);

  const handleRefresh = () => {
    reloadStats();
    reloadZones();
    if (selectedZone) reloadRacks();
  };

  const handleSelectZone = (zone: WarehouseZone) => {
    setSelectedZone(zone);
    setSelectedRack(null);
  };

  const handleBackToZones = () => {
    setSelectedZone(null);
    setSelectedRack(null);
  };

  const handleBackToRacks = () => {
    setSelectedRack(null);
  };

  // ── Loading state ──
  if (warehousesLoading) {
    return <p className="rh-loading">Cargando almacenes...</p>;
  }

  // ── No warehouse exists ──
  if (!activeWarehouse) {
    return (
      <div>
        <div className="rh-page-header">
          <h1 className="rh-page-title">
            <Warehouse size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Almacen
          </h1>
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
          }}
        >
          <Warehouse size={64} style={{ color: '#CBD5E1', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            No tienes un almacen configurado
          </h2>
          <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Configura tu primer almacen con zonas, estantes y ubicaciones para comenzar a gestionar tu inventario fisico.
          </p>
          {canWrite('warehouse') && (
            <button
              onClick={() => navigate('/hub/warehouse/setup')}
              className="rh-btn rh-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Settings size={18} />
              Configurar Almacen
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Rack Detail View ──
  if (selectedRack && activeWarehouse) {
    return (
      <div>
        <div className="rh-page-header">
          <h1 className="rh-page-title">
            <Warehouse size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {activeWarehouse.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8' }}>
            <span
              onClick={handleBackToZones}
              style={{ cursor: 'pointer', color: '#6366F1', fontWeight: 500 }}
            >
              Zonas
            </span>
            <ChevronRight size={14} />
            <span
              onClick={handleBackToRacks}
              style={{ cursor: 'pointer', color: '#6366F1', fontWeight: 500 }}
            >
              {selectedZone?.name}
            </span>
            <ChevronRight size={14} />
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{selectedRack.name}</span>
          </div>
        </div>

        <RackDetailView
          rack={selectedRack}
          warehouseId={activeWarehouse.id}
          orgId={activeWarehouse.org_id}
          onBack={handleBackToRacks}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">
            <Warehouse size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {activeWarehouse.name}
          </h1>
          <p className="rh-page-subtitle">
            {activeWarehouse.code}
            {activeWarehouse.address ? ` - ${activeWarehouse.address}` : ''}
          </p>
        </div>
        <div className="rh-page-actions">
          <button
            onClick={handleRefresh}
            className="rh-btn rh-btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          {canWrite('warehouse') && (
            <button
              onClick={() => navigate('/hub/warehouse/setup')}
              className="rh-btn rh-btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Settings size={16} />
              Configuracion
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="rh-stats-grid mb-6">
        <div
          className="rh-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={20} style={{ color: '#6366F1' }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {statsLoading ? '...' : stats?.zones ?? 0}
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Zonas</p>
          </div>
        </div>

        <div
          className="rh-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Grid3X3 size={20} style={{ color: '#10B981' }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {statsLoading ? '...' : stats?.racks ?? 0}
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Estantes</p>
          </div>
        </div>

        <div
          className="rh-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={20} style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {statsLoading ? '...' : stats?.totalLocations ?? 0}
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Ubicaciones</p>
          </div>
        </div>

        <div
          className="rh-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: stats && stats.occupancyRate > 80 ? '#FEE2E2' : '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3
              size={20}
              style={{ color: stats && stats.occupancyRate > 80 ? '#D3010A' : '#10B981' }}
            />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {statsLoading ? '...' : `${stats?.occupancyRate ?? 0}%`}
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Ocupacion</p>
          </div>
        </div>
      </div>

      {/* Breadcrumb for zone view */}
      {selectedZone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#94A3B8',
            marginBottom: 16,
          }}
        >
          <span
            onClick={handleBackToZones}
            style={{ cursor: 'pointer', color: '#6366F1', fontWeight: 500 }}
          >
            Zonas
          </span>
          <ChevronRight size={14} />
          <span style={{ fontWeight: 600, color: '#1E293B' }}>{selectedZone.name}</span>
        </div>
      )}

      {/* ═══ Zone Map or Rack List ═══ */}
      {!selectedZone ? (
        // Zone Grid Map
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} style={{ color: '#6366F1' }} />
              Mapa de Zonas
            </h3>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              Haz clic en una zona para ver sus estantes
            </span>
          </div>

          {zonesLoading ? (
            <p className="rh-loading">Cargando zonas...</p>
          ) : !zones || zones.length === 0 ? (
            <div
              className="rh-card"
              style={{ padding: 40, textAlign: 'center' }}
            >
              <MapPin size={48} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
                No hay zonas configuradas
              </p>
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                Ve a la configuracion del almacen para agregar zonas.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {zones.map((zone) => {
                const zoneColor = zone.color ?? '#6366F1';
                return (
                  <div
                    key={zone.id}
                    onClick={() => handleSelectZone(zone)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `2px solid ${zoneColor}40`,
                      borderLeft: `5px solid ${zoneColor}`,
                      borderRadius: 12,
                      padding: 20,
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 16px ${zoneColor}20`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Color accent bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        backgroundColor: zoneColor,
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: zoneColor + '15',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MapPin size={18} style={{ color: zoneColor }} />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: zoneColor,
                          backgroundColor: zoneColor + '15',
                          padding: '3px 8px',
                          borderRadius: 12,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {ZONE_TYPE_LABELS[zone.zone_type] ?? zone.zone_type}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: '0 0 4px' }}>
                      {zone.name}
                    </h4>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontFamily: 'monospace' }}>
                      {zone.code}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 12,
                        fontSize: 12,
                        color: '#64748B',
                      }}
                    >
                      <ChevronRight size={14} style={{ color: zoneColor }} />
                      Ver estantes
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Rack List for selected zone
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Grid3X3 size={18} style={{ color: selectedZone.color ?? '#10B981' }} />
              Estantes de {selectedZone.name}
            </h3>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              Haz clic en un estante para ver las ubicaciones
            </span>
          </div>

          {racksLoading ? (
            <p className="rh-loading">Cargando estantes...</p>
          ) : !zoneRacks || zoneRacks.length === 0 ? (
            <div className="rh-card" style={{ padding: 40, textAlign: 'center' }}>
              <Grid3X3 size={48} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
                No hay estantes en esta zona
              </p>
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                Agrega estantes desde la configuracion del almacen.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {zoneRacks.map((rack) => {
                const totalLocs = rack.levels * rack.positions_per_level;
                return (
                  <div
                    key={rack.id}
                    onClick={() => setSelectedRack(rack)}
                    className="rh-card"
                    style={{
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      borderLeft: `4px solid ${selectedZone.color ?? '#10B981'}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Grid3X3 size={20} style={{ color: selectedZone.color ?? '#10B981' }} />
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                          {rack.name}
                        </h4>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontFamily: 'monospace' }}>
                          {rack.code}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
                      <span>{rack.levels} niveles</span>
                      <span>{rack.positions_per_level} posiciones</span>
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>{totalLocs} ubicaciones</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 10,
                        fontSize: 12,
                        color: selectedZone.color ?? '#10B981',
                        fontWeight: 500,
                      }}
                    >
                      <ChevronRight size={14} />
                      Ver ubicaciones
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
