import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse as WarehouseIcon,
  MapPin,
  Grid3X3,
  Package,
  Settings,
  BarChart3,
  ChevronRight,
  RefreshCw,
  Pencil,
  ArrowLeft,
  Plus,
  Building2,
  LayoutGrid,
  Layers,
  Trash2,
  Ban,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions.ts';
import {
  useWarehouses,
  useWarehouseStats,
  useWarehouseZones,
  useWarehouseRacks,
  useWarehouseLocations,
  useWarehouseStock,
} from '@/hooks/useWarehouse.ts';
import { RackDetailView } from './RackDetailView.tsx';
import { RackMiniGrid } from './components/RackMiniGrid.tsx';
import { ConfirmDeleteModal } from '@/components/hub/shared/ConfirmDeleteModal.tsx';
import * as warehouseService from '@/services/warehouseService.ts';
import { supabase } from '@/lib/supabase.ts';
import type { Organization } from '@/lib/database.types.ts';
import type { Warehouse, WarehouseRack, WarehouseLocation, InventoryStock } from '@/types/warehouse.ts';

const ZONE_TYPE_LABELS: Record<string, string> = {
  storage: 'Almacenamiento',
  receiving: 'Recepcion',
  packing: 'Empaque',
  dispatch: 'Despacho',
  returns: 'Devoluciones',
};

const RACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function WarehouseLayoutPage() {
  const navigate = useNavigate();
  const { canWrite, canDelete, isPlatform } = usePermissions();

  const { data: warehouses, loading: warehousesLoading, reload: reloadWarehouses } = useWarehouses();

  // Platform org selector
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(isPlatform);

  useEffect(() => {
    if (isPlatform) {
      setLoadingOrgs(true);
      supabase
        .from('organizations')
        .select('*')
        .in('type', ['aggregator', 'associate'])
        .eq('status', 'active')
        .order('name')
        .then(({ data }) => {
          setAvailableOrgs((data as Organization[]) ?? []);
          setLoadingOrgs(false);
        });
    }
  }, [isPlatform]);

  const selectedOrgInfo = availableOrgs.find((o) => o.id === selectedOrgFilter);

  // Filter warehouses by selected org for platform users
  const filteredWarehouses = isPlatform && selectedOrgFilter
    ? (warehouses ?? []).filter((w) => w.org_id === selectedOrgFilter)
    : warehouses;

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const activeWarehouse = warehouses?.find((w) => w.id === selectedWarehouseId) ?? null;

  const { stats, loading: statsLoading, reload: reloadStats } = useWarehouseStats(activeWarehouse?.id);
  const { data: zones, loading: zonesLoading, reload: reloadZones } = useWarehouseZones(activeWarehouse?.id);

  const [selectedRack, setSelectedRack] = useState<WarehouseRack | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showUnlocated, setShowUnlocated] = useState(false);

  // All racks (for cenital/lateral views)
  const { data: allRacks, reload: reloadAllRacks } = useWarehouseRacks(activeWarehouse?.id);

  // All locations & stock (for lateral view occupancy)
  const { data: allLocations, reload: reloadAllLocations } = useWarehouseLocations(activeWarehouse?.id);
  const { data: allStock, reload: reloadAllStock } = useWarehouseStock(activeWarehouse?.id);

  // Reset selections when warehouse changes
  useEffect(() => {
    setSelectedRack(null);
  }, [selectedWarehouseId]);

  // Group racks by zone for the unified zone map
  const racksByZone = useMemo(() => {
    const map = new Map<string, WarehouseRack[]>();
    if (allRacks) {
      for (const rack of allRacks) {
        const arr = map.get(rack.zone_id) || [];
        arr.push(rack);
        map.set(rack.zone_id, arr);
      }
    }
    return map;
  }, [allRacks]);

  // Lookup maps for lateral view occupancy
  const locationsByRack = useMemo(() => {
    const map = new Map<string, WarehouseLocation[]>();
    if (allLocations) {
      for (const loc of allLocations) {
        const arr = map.get(loc.rack_id) || [];
        arr.push(loc);
        map.set(loc.rack_id, arr);
      }
    }
    return map;
  }, [allLocations]);

  const stockByLocation = useMemo(() => {
    const map = new Map<string, InventoryStock>();
    if (allStock) {
      for (const s of allStock) {
        if (s.location_id) map.set(s.location_id, s);
      }
    }
    return map;
  }, [allStock]);

  // Unlocated stock items
  const unlocatedItems = useMemo(
    () => (allStock ?? []).filter((s) => s.location_id === null),
    [allStock],
  );
  const unlocatedUnits = useMemo(
    () => unlocatedItems.reduce((sum, s) => sum + s.quantity, 0),
    [unlocatedItems],
  );

  const handleRefresh = () => {
    reloadStats();
    reloadZones();
    reloadAllRacks();
    reloadAllLocations();
    reloadAllStock();
  };

  const handleDeleteWarehouse = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await warehouseService.deleteWarehouse(deleteTarget.id);
      if (error) {
        console.error('Error deleting warehouse:', error);
        alert(`Error al eliminar el almacen: ${typeof error === 'string' ? error : 'Error desconocido'}`);
        setDeleteLoading(false);
        return;
      }
      // If we just deleted the active warehouse, deselect it
      if (selectedWarehouseId === deleteTarget.id) {
        setSelectedWarehouseId(null);
        setSelectedRack(null);
      }
      setDeleteTarget(null);
      reloadWarehouses();
    } catch (err) {
      console.error('Error deleting warehouse:', err);
      alert('Error inesperado al eliminar el almacen');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBackToMap = () => {
    setSelectedRack(null);
  };

  // ── Loading state ──
  if (warehousesLoading || loadingOrgs) {
    return <p className="rh-loading">Cargando almacenes...</p>;
  }

  // ── Platform org selector (before showing warehouses) ──
  if (isPlatform && !selectedOrgFilter) {
    // Count warehouses per org
    const warehouseCountByOrg = new Map<string, number>();
    for (const wh of warehouses ?? []) {
      warehouseCountByOrg.set(wh.org_id, (warehouseCountByOrg.get(wh.org_id) ?? 0) + 1);
    }

    return (
      <div>
        <div className="rh-page-header">
          <div>
            <h1 className="rh-page-title">
              <WarehouseIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Almacenes
            </h1>
            <p className="rh-page-subtitle">Selecciona una organización para ver sus almacenes</p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {availableOrgs.map((org) => {
            const whCount = warehouseCountByOrg.get(org.id) ?? 0;
            return (
              <div
                key={org.id}
                onClick={() => setSelectedOrgFilter(org.id)}
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
                    <span style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: org.type === 'aggregator' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)',
                      color: org.type === 'aggregator' ? '#6366F1' : '#10B981',
                    }}>
                      {org.type === 'aggregator' ? 'Agregador' : 'Asociado'}
                    </span>
                  </div>
                  <span style={{ fontSize: 24, opacity: 0.3 }}>→</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'center', padding: '10px 20px', backgroundColor: '#F8FAFC', borderRadius: 8, flex: 1 }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#6366F1', margin: 0 }}>
                      {whCount}
                    </p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                      {whCount === 1 ? 'Almacén' : 'Almacenes'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── No warehouse exists for selected org ──
  if (!filteredWarehouses || filteredWarehouses.length === 0) {
    return (
      <div>
        <div className="rh-page-header">
          <div>
            <h1 className="rh-page-title">
              <WarehouseIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              {isPlatform && selectedOrgInfo ? `Almacén — ${selectedOrgInfo.name}` : 'Almacén'}
            </h1>
          </div>
          {isPlatform && selectedOrgFilter && (
            <button
              onClick={() => setSelectedOrgFilter(null)}
              className="rh-btn rh-btn-ghost"
            >
              ← Todas las organizaciones
            </button>
          )}
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
          <WarehouseIcon size={64} style={{ color: '#CBD5E1', margin: '0 auto 16px' }} />
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

  // ── Warehouse selection screen ──
  if (!activeWarehouse) {
    return (
      <div>
        <div className="rh-page-header">
          <div>
            <h1 className="rh-page-title">
              <WarehouseIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              {isPlatform && selectedOrgInfo ? `Almacenes — ${selectedOrgInfo.name}` : 'Almacenes'}
            </h1>
            <p className="rh-page-subtitle">
              Selecciona un almacen para ver su layout y configuracion
            </p>
          </div>
          <div className="rh-page-actions">
            {isPlatform && selectedOrgFilter && (
              <button
                onClick={() => setSelectedOrgFilter(null)}
                className="rh-btn rh-btn-ghost"
              >
                ← Todas las organizaciones
              </button>
            )}
            {canWrite('warehouse') && (
              <button
                onClick={() => navigate('/hub/warehouse/setup')}
                className="rh-btn rh-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} />
                Nuevo Almacen
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {(filteredWarehouses ?? []).map((wh) => {
            const areaSqm = wh.total_area_sqm ?? (wh.width_m && wh.length_m ? wh.width_m * wh.length_m : null);
            return (
              <div
                key={wh.id}
                onClick={() => setSelectedWarehouseId(wh.id)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 24,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)';
                  e.currentTarget.style.borderColor = '#6366F1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                {/* Top accent bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: '#6366F1',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: '#EEF2FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={24} style={{ color: '#6366F1' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: '0 0 4px', lineHeight: 1.2 }}>
                      {wh.name}
                    </h3>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontFamily: 'monospace' }}>
                      {wh.code}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {canDelete('warehouse') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(wh);
                        }}
                        className="rh-btn rh-btn-ghost"
                        style={{
                          padding: 4,
                          minWidth: 'auto',
                          color: '#94A3B8',
                          borderRadius: 6,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#D3010A'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                        title="Eliminar almacen"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <ChevronRight size={20} style={{ color: '#CBD5E1' }} />
                  </div>
                </div>

                {wh.address && (
                  <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px', lineHeight: 1.4 }}>
                    {wh.address}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
                  {wh.width_m && wh.length_m && (
                    <span>
                      {wh.width_m}m x {wh.length_m}m
                    </span>
                  )}
                  {areaSqm != null && (
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>
                      {areaSqm.toFixed(1)} m²
                    </span>
                  )}
                  {wh.height_m && (
                    <span>
                      Altura: {wh.height_m}m
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Warehouse Modal */}
        <ConfirmDeleteModal
          open={deleteTarget !== null}
          title={`Eliminar ${deleteTarget?.name ?? 'Almacen'}`}
          loading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteWarehouse}
        >
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            ¿Estas seguro de que deseas eliminar el almacen <strong>{deleteTarget?.name}</strong>?
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
            Se eliminaran todas las zonas, estantes y ubicaciones asociadas. Esta accion no se puede deshacer.
          </p>
        </ConfirmDeleteModal>
      </div>
    );
  }

  const handleBackToWarehouses = () => {
    setSelectedWarehouseId(null);
    setSelectedRack(null);
  };

  const hasMultipleWarehouses = (warehouses ?? []).length > 1;

  // ── Rack Detail View ──
  if (selectedRack && activeWarehouse) {
    return (
      <div>
        <div className="rh-page-header">
          <h1 className="rh-page-title">
            <WarehouseIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            {activeWarehouse.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8' }}>
            {hasMultipleWarehouses && (
              <>
                <span
                  onClick={handleBackToWarehouses}
                  style={{ cursor: 'pointer', color: '#6366F1', fontWeight: 500 }}
                >
                  Almacenes
                </span>
                <ChevronRight size={14} />
              </>
            )}
            <span
              onClick={handleBackToMap}
              style={{ cursor: 'pointer', color: '#6366F1', fontWeight: 500 }}
            >
              Mapa de Zonas
            </span>
            <ChevronRight size={14} />
            {(() => {
              const rackZone = zones?.find((z) => z.id === selectedRack.zone_id);
              return rackZone ? (
                <>
                  <span style={{ color: '#64748B', fontWeight: 500 }}>{rackZone.name}</span>
                  <ChevronRight size={14} />
                </>
              ) : null;
            })()}
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{selectedRack.name}</span>
          </div>
        </div>

        <RackDetailView
          rack={selectedRack}
          warehouseId={activeWarehouse.id}
          orgId={activeWarehouse.org_id}
          onBack={handleBackToMap}
          onStockChanged={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="rh-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasMultipleWarehouses && (
              <button
                onClick={handleBackToWarehouses}
                className="rh-btn rh-btn-ghost"
                style={{
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto',
                }}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="rh-page-title">
              <WarehouseIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              {activeWarehouse.name}
            </h1>
          </div>
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
              onClick={() => navigate(`/hub/warehouse/setup?edit=${activeWarehouse.id}`)}
              className="rh-btn rh-btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Pencil size={16} />
              Editar Almacen
            </button>
          )}
          {canDelete('warehouse') && (
            <button
              onClick={() => setDeleteTarget(activeWarehouse)}
              className="rh-btn rh-btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D3010A' }}
            >
              <Trash2 size={16} />
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="rh-stats-grid-5 mb-6">
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
              {statsLoading ? '...' : `${stats?.occupiedLocations ?? 0}/${stats?.totalLocations ?? 0}`}
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

        {/* Sin Ubicar - clickable */}
        <div
          onClick={() => unlocatedItems.length > 0 && setShowUnlocated(!showUnlocated)}
          className="rh-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: unlocatedItems.length > 0 ? 'pointer' : 'default',
            outline: showUnlocated ? '2px solid #F59E0B' : 'none',
            outlineOffset: -1,
            transition: 'outline 0.2s',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#FFF7ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ban size={20} style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              {unlocatedUnits} uds
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Sin Ubicar</p>
          </div>
        </div>
      </div>

      {/* ═══ Unlocated items panel ═══ */}
      {showUnlocated && unlocatedItems.length > 0 && (
        <div className="rh-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24, border: '1px solid #F59E0B' }}>
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#9A3412', margin: 0 }}>
                🚫 Productos sin ubicación asignada
              </h3>
              <p style={{ fontSize: 12, color: '#C2410C', margin: '4px 0 0' }}>
                Estos productos están en el almacén pero no tienen estante asignado
              </p>
            </div>
            <button onClick={() => setShowUnlocated(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9A3412', padding: 4 }}>✕</button>
          </div>
          <div className="rh-table-wrapper">
            <table className="rh-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Marca</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {unlocatedItems.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.product?.name ?? '—'}</td>
                    <td style={{ color: '#64748B', fontFamily: 'monospace', fontSize: 13 }}>{s.product?.sku ?? '—'}</td>
                    <td>{s.product?.brand ?? '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Visual views: Cenital + Lateral ── */}
      {activeWarehouse.width_m && activeWarehouse.length_m && (() => {
        const whW = activeWarehouse.width_m!;
        const whL = activeWarehouse.length_m!;

        const displayZones = (zones ?? []).filter(
          (z) => z.position_x != null && z.position_y != null && z.width != null && z.height != null,
        );

        const displayRacks = (allRacks ?? []).filter(
          (r) => r.position_x != null && r.position_y != null,
        );

        /* Simple full-warehouse scaling */
        const viewW = 520;
        const viewH = 420;
        const cellW = viewW / whW;    /* px per meter */
        const cellH = viewH / whL;

        /* Compute rack-only bounding box for the legend (ignore zones — they
           often cover the full warehouse and would hide the space-usage info) */
        let racksMaxY = 0;
        for (const r of displayRacks) {
          const ry = r.position_y ?? 0;
          const rh = r.orientation === 'horizontal' ? (r.rack_width_m ?? 1) : (r.rack_depth_m ?? 1);
          racksMaxY = Math.max(racksMaxY, ry + rh);
        }
        const usedPct = whL > 0 ? Math.round((racksMaxY / whL) * 100) : 100;
        const unusedPct = 100 - usedPct;

        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* ── Top-down / Cenital view ── */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: 16,
                backgroundColor: '#FAFBFC',
              }}
            >
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <LayoutGrid size={14} style={{ color: '#6366F1' }} />
                Vista Cenital (Planta)
                <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
                  {whW}m x {whL}m
                </span>
              </h4>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ position: 'relative', paddingBottom: 22, paddingRight: 48 }}>
                  <div
                    style={{
                      width: viewW,
                      height: viewH,
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #CBD5E1',
                      borderRadius: 6,
                      backgroundImage: `
                        linear-gradient(to right, #E2E8F020 1px, transparent 1px),
                        linear-gradient(to bottom, #E2E8F020 1px, transparent 1px)
                      `,
                      backgroundSize: `${cellW}px ${cellH}px`,
                    }}
                  >
                    {/* Zones */}
                    {displayZones.map((zone) => {
                      const zLeft = (zone.position_x ?? 0) * cellW;
                      const zTop = (zone.position_y ?? 0) * cellH;
                      const zW = Math.min((zone.width ?? 0) * cellW, viewW - zLeft);
                      const zH = Math.min((zone.height ?? 0) * cellH, viewH - zTop);
                      if (zW <= 0 || zH <= 0) return null;
                      const color = zone.color ?? '#6366F1';
                      return (
                        <div
                          key={zone.id}
                          style={{
                            position: 'absolute',
                            left: zLeft,
                            top: zTop,
                            width: zW,
                            height: zH,
                            backgroundColor: color + '15',
                            border: `1px dashed ${color}60`,
                            borderRadius: 3,
                          }}
                        >
                        </div>
                      );
                    })}

                    {/* Racks */}
                    {displayRacks.map((rack, rIdx) => {
                      const color = RACK_COLORS[rIdx % RACK_COLORS.length];
                      const rWidthM = rack.orientation === 'horizontal'
                        ? (rack.rack_depth_m ?? 1)
                        : (rack.rack_width_m ?? 1);
                      const rDepthM = rack.orientation === 'horizontal'
                        ? (rack.rack_width_m ?? 1)
                        : (rack.rack_depth_m ?? 1);
                      const rLeft = (rack.position_x ?? 0) * cellW;
                      const rTop = (rack.position_y ?? 0) * cellH;
                      const rW = rWidthM * cellW - 2;
                      const rH = rDepthM * cellH - 2;
                      if (rW <= 0 || rH <= 0) return null;
                      return (
                        <div
                          key={rack.id}
                          style={{
                            position: 'absolute',
                            left: rLeft,
                            top: rTop,
                            width: rW,
                            height: rH,
                            backgroundColor: color + '35',
                            border: `1.5px solid ${color}`,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              fontSize: Math.max(9, Math.min(12, Math.min(cellW, cellH) * 0.6)),
                              fontWeight: 800,
                              color,
                              fontFamily: 'monospace',
                            }}
                          >
                            {rack.code}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dimension labels */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      left: viewW / 2,
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      color: '#94A3B8',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {whW}m (ancho)
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: viewH / 2,
                      transform: 'translateY(-50%) rotate(90deg)',
                      fontSize: 10,
                      color: '#94A3B8',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {whL}m (largo)
                  </span>
                </div>
              </div>
              {/* Legend */}
              {displayRacks.length > 0 && unusedPct > 20 && (
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0', textAlign: 'center' }}>
                  {displayRacks.length} estantes posicionados en los primeros ~{Math.ceil(racksMaxY)}m de {whL}m
                  {' '}&mdash; {unusedPct}% del espacio sin usar
                </p>
              )}
            </div>

            {/* ── Side / Lateral view ── */}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: 16,
                backgroundColor: '#FAFBFC',
              }}
            >
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#475569',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Layers size={14} style={{ color: '#8B5CF6' }} />
                Vista Lateral (Estantes)
                <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 400, marginLeft: 'auto' }}>
                  {displayRacks.length} estantes
                </span>
              </h4>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  minHeight: 200,
                  alignItems: 'flex-end',
                }}
              >
                {displayRacks.length === 0 ? (
                  <div style={{ flex: 1, textAlign: 'center', padding: 40 }}>
                    <Layers size={32} style={{ color: '#CBD5E1', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: '#94A3B8' }}>
                      No hay estantes posicionados
                    </p>
                  </div>
                ) : (
                  displayRacks.map((rack, rIdx) => {
                    const color = RACK_COLORS[rIdx % RACK_COLORS.length];
                    return (
                      <div key={rack.id} style={{ flexShrink: 0, textAlign: 'center' }}>
                        <RackMiniGrid
                          rack={rack}
                          rackColor={color}
                          data={{
                            mode: 'occupancy',
                            locations: locationsByRack.get(rack.id) ?? [],
                            stockByLocation,
                          }}
                          cellSize={{ width: 20, height: 18 }}
                          maxLevels={10}
                          maxPositions={6}
                        />
                        <p style={{ fontSize: 9, fontWeight: 700, color, margin: '4px 0 0', fontFamily: 'monospace' }}>
                          {rack.code}
                        </p>
                        <p style={{ fontSize: 8, color: '#94A3B8', margin: 0 }}>
                          {rack.levels}N x {rack.positions_per_level}P
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Occupancy legend */}
              {displayRacks.length > 0 && (
                <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10, color: '#64748B', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'inline-block' }} />
                    Vacio
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.7)', border: '1px solid rgba(59,130,246,0.85)', display: 'inline-block' }} />
                    Con stock
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E2E8F0', border: '1px solid #CBD5E1', display: 'inline-block' }} />
                    Inactiva
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══ Mapa de Zonas con Estantes ═══ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: '#6366F1' }} />
            Mapa de Zonas
          </h3>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            Haz clic en un estante para ver sus ubicaciones
          </span>
        </div>

        {zonesLoading ? (
          <p className="rh-loading">Cargando zonas...</p>
        ) : !zones || zones.length === 0 ? (
          <div className="rh-card" style={{ padding: 40, textAlign: 'center' }}>
            <MapPin size={48} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>No hay zonas configuradas</p>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
              Ve a la configuracion del almacen para agregar zonas.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {zones.map((zone) => {
              const zoneColor = zone.color ?? '#6366F1';
              const zoneRacksForMap = racksByZone.get(zone.id) ?? [];
              const totalRacks = zoneRacksForMap.length;
              const totalLocations = zoneRacksForMap.reduce(
                (sum, r) => sum + r.levels * r.positions_per_level, 0,
              );

              return (
                <div
                  key={zone.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${zoneColor}30`,
                    borderRadius: 14,
                    overflow: 'hidden',
                  }}
                >
                  {/* Zone Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      borderBottom: `1px solid ${zoneColor}20`,
                      background: `linear-gradient(135deg, ${zoneColor}08 0%, ${zoneColor}03 100%)`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: zoneColor + '15',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MapPin size={17} style={{ color: zoneColor }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                            {zone.name}
                          </h4>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: zoneColor,
                              backgroundColor: zoneColor + '15',
                              padding: '2px 8px',
                              borderRadius: 10,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            {ZONE_TYPE_LABELS[zone.zone_type] ?? zone.zone_type}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0', fontFamily: 'monospace' }}>
                          {zone.code}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
                      <span><strong style={{ color: '#1E293B' }}>{totalRacks}</strong> estantes</span>
                      <span><strong style={{ color: '#1E293B' }}>{totalLocations}</strong> ubicaciones</span>
                    </div>
                  </div>

                  {/* Rack Cards */}
                  <div style={{ padding: '14px 16px' }}>
                    {zoneRacksForMap.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>
                        <Grid3X3 size={28} style={{ color: '#CBD5E1', margin: '0 auto 8px', display: 'block' }} />
                        No hay estantes en esta zona
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 10,
                        }}
                      >
                        {zoneRacksForMap.map((rack) => {
                          const totalLocs = rack.levels * rack.positions_per_level;
                          return (
                            <div
                              key={rack.id}
                              onClick={() => setSelectedRack(rack)}
                              style={{
                                backgroundColor: '#FAFBFC',
                                border: `1px solid ${zoneColor}25`,
                                borderLeft: `4px solid ${zoneColor}`,
                                borderRadius: 10,
                                padding: '12px 14px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${zoneColor}15`;
                                e.currentTarget.style.backgroundColor = '#FFFFFF';
                                e.currentTarget.style.borderColor = `${zoneColor}50`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.backgroundColor = '#FAFBFC';
                                e.currentTarget.style.borderColor = `${zoneColor}25`;
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Grid3X3 size={16} style={{ color: zoneColor, flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                  <h5 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {rack.name}
                                  </h5>
                                  <p style={{ fontSize: 10, color: '#94A3B8', margin: 0, fontFamily: 'monospace' }}>
                                    {rack.code}
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#64748B' }}>
                                <span>{rack.levels} <span style={{ color: '#94A3B8' }}>niv</span></span>
                                <span>{rack.positions_per_level} <span style={{ color: '#94A3B8' }}>pos</span></span>
                                <span style={{ fontWeight: 600, color: '#1E293B' }}>{totalLocs} <span style={{ fontWeight: 400, color: '#94A3B8' }}>ubic</span></span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  marginTop: 8,
                                  fontSize: 11,
                                  color: zoneColor,
                                  fontWeight: 500,
                                }}
                              >
                                <ChevronRight size={12} />
                                Ver ubicaciones
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Warehouse Modal */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={`Eliminar ${deleteTarget?.name ?? 'Almacen'}`}
        loading={deleteLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteWarehouse}
      >
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
          ¿Estas seguro de que deseas eliminar el almacen <strong>{deleteTarget?.name}</strong>?
        </p>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
          Se eliminaran todas las zonas, estantes y ubicaciones asociadas. Esta accion no se puede deshacer.
        </p>
      </ConfirmDeleteModal>
    </div>
  );
}
