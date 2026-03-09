import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, Warehouse, MapPin, Grid3X3, ClipboardCheck, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import * as warehouseService from '@/services/warehouseService.ts';
import type { ZoneType } from '@/types/warehouse.ts';

type WizardStep = 'warehouse' | 'zones' | 'racks' | 'confirm';

const STEPS: { key: WizardStep; label: string; icon: typeof Warehouse }[] = [
  { key: 'warehouse', label: 'Almacen', icon: Warehouse },
  { key: 'zones', label: 'Zonas', icon: MapPin },
  { key: 'racks', label: 'Estantes', icon: Grid3X3 },
  { key: 'confirm', label: 'Confirmacion', icon: ClipboardCheck },
];

interface WarehouseForm {
  name: string;
  code: string;
  address: string;
  total_area_sqm: number | null;
  pick_expiry_minutes: number;
}

interface ZoneForm {
  id: string; // local temp id
  name: string;
  code: string;
  zone_type: ZoneType;
  color: string;
}

interface RackForm {
  id: string; // local temp id
  zoneId: string; // references ZoneForm.id
  zoneName: string;
  name: string;
  code: string;
  levels: number;
  positions_per_level: number;
}

const ZONE_TYPES: { value: ZoneType; label: string }[] = [
  { value: 'storage', label: 'Almacenamiento' },
  { value: 'receiving', label: 'Recepcion' },
  { value: 'packing', label: 'Empaque' },
  { value: 'dispatch', label: 'Despacho' },
  { value: 'returns', label: 'Devoluciones' },
];

const ZONE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

let idCounter = 0;
function tempId() {
  return `temp_${++idCounter}_${Date.now()}`;
}

export function WarehouseSetupWizard() {
  const navigate = useNavigate();
  const organization = useAuthStore((s) => s.organization);

  const [currentStep, setCurrentStep] = useState<WizardStep>('warehouse');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Warehouse data
  const [warehouse, setWarehouse] = useState<WarehouseForm>({
    name: '',
    code: 'ALM-01',
    address: '',
    total_area_sqm: null,
    pick_expiry_minutes: 30,
  });

  // Step 2: Zones
  const [zones, setZones] = useState<ZoneForm[]>([]);

  // Step 3: Racks
  const [racks, setRacks] = useState<RackForm[]>([]);

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'warehouse':
        return warehouse.name.trim().length > 0 && warehouse.code.trim().length > 0;
      case 'zones':
        return zones.length > 0 && zones.every((z) => z.name.trim() && z.code.trim());
      case 'racks':
        // At least one rack for each storage zone
        const storageZones = zones.filter((z) => z.zone_type === 'storage');
        return storageZones.length === 0 || storageZones.every((z) =>
          racks.some((r) => r.zoneId === z.id && r.name.trim() && r.code.trim()),
        );
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const goPrev = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  // ── Zone helpers ──

  const addZone = () => {
    const index = zones.length + 1;
    setZones((prev) => [
      ...prev,
      {
        id: tempId(),
        name: `Zona ${index}`,
        code: `Z-${String(index).padStart(2, '0')}`,
        zone_type: 'storage',
        color: ZONE_COLORS[index % ZONE_COLORS.length],
      },
    ]);
  };

  const updateZone = (id: string, field: keyof ZoneForm, value: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)),
    );
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setRacks((prev) => prev.filter((r) => r.zoneId !== id));
  };

  // ── Rack helpers ──

  const addRack = (zone: ZoneForm) => {
    const zoneRacks = racks.filter((r) => r.zoneId === zone.id);
    const index = zoneRacks.length + 1;
    setRacks((prev) => [
      ...prev,
      {
        id: tempId(),
        zoneId: zone.id,
        zoneName: zone.name,
        name: `Estante ${zone.code}-${index}`,
        code: `${zone.code}-R${String(index).padStart(2, '0')}`,
        levels: 4,
        positions_per_level: 5,
      },
    ]);
  };

  const updateRack = (id: string, field: keyof RackForm, value: string | number) => {
    setRacks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const removeRack = (id: string) => {
    setRacks((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Save all ──

  const handleCreate = async () => {
    if (!organization?.id) {
      setError('No se encontro la organizacion activa.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // 1. Create warehouse
      const whResult = await warehouseService.saveWarehouse({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || '',
        total_area_sqm: warehouse.total_area_sqm,
        usable_area_sqm: null,
        latitude: null,
        longitude: null,
        pick_expiry_minutes: warehouse.pick_expiry_minutes,
        org_id: organization.id,
      });

      if (whResult.error || !whResult.data) {
        setError(whResult.error ?? 'Error al crear el almacen.');
        setSaving(false);
        return;
      }

      const warehouseId = whResult.data.id;

      // 2. Create zones
      const zoneIdMap = new Map<string, string>(); // tempId -> real id

      for (const zone of zones) {
        const zoneResult = await warehouseService.saveZone({
          name: zone.name,
          code: zone.code,
          zone_type: zone.zone_type,
          area_sqm: null,
          color: zone.color,
          position_x: 0,
          position_y: 0,
          width: 200,
          height: 150,
          warehouse_id: warehouseId,
        });

        if (zoneResult.error || !zoneResult.data) {
          setError(`Error al crear zona "${zone.name}": ${zoneResult.error}`);
          setSaving(false);
          return;
        }

        zoneIdMap.set(zone.id, zoneResult.data.id);
      }

      // 3. Create racks (this triggers auto-generate locations via DB trigger)
      for (const rack of racks) {
        const realZoneId = zoneIdMap.get(rack.zoneId);
        if (!realZoneId) continue;

        const rackResult = await warehouseService.saveRack({
          name: rack.name,
          code: rack.code,
          zone_id: realZoneId,
          levels: rack.levels,
          positions_per_level: rack.positions_per_level,
          max_weight_kg: null,
          warehouse_id: warehouseId,
        });

        if (rackResult.error) {
          setError(`Error al crear estante "${rack.name}": ${rackResult.error}`);
          setSaving(false);
          return;
        }
      }

      // Navigate to warehouse layout
      navigate('/hub/warehouse');
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  // ── Totals for confirmation ──

  const totalLocations = racks.reduce((sum, r) => sum + r.levels * r.positions_per_level, 0);

  return (
    <div>
      {/* Page Header */}
      <div className="rh-page-header">
        <h1 className="rh-page-title">
          <Warehouse size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
          Configurar Almacen
        </h1>
        <p className="rh-page-subtitle">
          Sigue los pasos para crear tu almacen, zonas y estantes
        </p>
      </div>

      {/* Step Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          marginBottom: 32,
          padding: '16px 0',
        }}
      >
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const state = i < currentIndex ? 'completed' : i === currentIndex ? 'active' : 'pending';
          return (
            <div
              key={step.key}
              style={{ display: 'flex', alignItems: 'center', gap: 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  cursor: state === 'completed' ? 'pointer' : 'default',
                }}
                onClick={state === 'completed' ? () => setCurrentStep(step.key) : undefined}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      state === 'completed' ? '#10B981' :
                      state === 'active' ? '#D3010A' : '#E2E8F0',
                    color: state === 'pending' ? '#94A3B8' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {state === 'completed' ? <Check size={18} /> : <StepIcon size={18} />}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: state === 'active' ? 700 : 500,
                    color: state === 'active' ? '#D3010A' : state === 'completed' ? '#10B981' : '#94A3B8',
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 60,
                    height: 2,
                    backgroundColor: i < currentIndex ? '#10B981' : '#E2E8F0',
                    margin: '0 8px',
                    marginBottom: 24,
                    transition: 'background-color 0.2s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rh-alert rh-alert-error mb-4">{error}</div>
      )}

      {/* Step Content */}
      <div className="rh-card" style={{ padding: 24 }}>
        {/* ════════ Step 1: Warehouse ════════ */}
        {currentStep === 'warehouse' && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 20 }}>
              Datos del Almacen
            </h3>
            <div className="rh-form-grid">
              <div className="col-span-2">
                <div className="rh-field">
                  <label className="rh-label">Nombre del almacen *</label>
                  <input
                    type="text"
                    value={warehouse.name}
                    onChange={(e) => setWarehouse((p) => ({ ...p, name: e.target.value }))}
                    className="rh-input"
                    placeholder="Almacen Principal"
                  />
                </div>
              </div>

              <div className="rh-field">
                <label className="rh-label">Codigo *</label>
                <input
                  type="text"
                  value={warehouse.code}
                  onChange={(e) => setWarehouse((p) => ({ ...p, code: e.target.value }))}
                  className="rh-input"
                  placeholder="ALM-01"
                />
              </div>

              <div className="rh-field">
                <label className="rh-label">Area total (m2)</label>
                <input
                  type="number"
                  min={0}
                  value={warehouse.total_area_sqm ?? ''}
                  onChange={(e) =>
                    setWarehouse((p) => ({
                      ...p,
                      total_area_sqm: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="rh-input"
                  placeholder="500"
                />
              </div>

              <div className="col-span-2">
                <div className="rh-field">
                  <label className="rh-label">Direccion</label>
                  <input
                    type="text"
                    value={warehouse.address}
                    onChange={(e) => setWarehouse((p) => ({ ...p, address: e.target.value }))}
                    className="rh-input"
                    placeholder="Av. Principal, Zona Industrial"
                  />
                </div>
              </div>

              <div className="rh-field">
                <label className="rh-label">Expiracion de picking (min)</label>
                <input
                  type="number"
                  min={1}
                  value={warehouse.pick_expiry_minutes}
                  onChange={(e) =>
                    setWarehouse((p) => ({
                      ...p,
                      pick_expiry_minutes: parseInt(e.target.value) || 30,
                    }))
                  }
                  className="rh-input"
                  placeholder="30"
                />
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  Tiempo maximo para completar una lista de picking antes de expirar
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════════ Step 2: Zones ════════ */}
        {currentStep === 'zones' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Zonas del Almacen
              </h3>
              <button
                onClick={addZone}
                className="rh-btn rh-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} />
                Agregar Zona
              </button>
            </div>

            {zones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <MapPin size={48} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
                  No has agregado zonas
                </p>
                <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                  Agrega al menos una zona para organizar tu almacen
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      padding: 16,
                      borderLeft: `4px solid ${zone.color}`,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
                      <div className="rh-field">
                        <label className="rh-label">Nombre *</label>
                        <input
                          type="text"
                          value={zone.name}
                          onChange={(e) => updateZone(zone.id, 'name', e.target.value)}
                          className="rh-input"
                          placeholder="Zona A"
                        />
                      </div>

                      <div className="rh-field">
                        <label className="rh-label">Codigo *</label>
                        <input
                          type="text"
                          value={zone.code}
                          onChange={(e) => updateZone(zone.id, 'code', e.target.value)}
                          className="rh-input"
                          placeholder="Z-01"
                        />
                      </div>

                      <div className="rh-field">
                        <label className="rh-label">Tipo</label>
                        <select
                          value={zone.zone_type}
                          onChange={(e) => updateZone(zone.id, 'zone_type', e.target.value)}
                          className="rh-select"
                        >
                          {ZONE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="rh-field">
                        <label className="rh-label">Color</label>
                        <input
                          type="color"
                          value={zone.color}
                          onChange={(e) => updateZone(zone.id, 'color', e.target.value)}
                          style={{
                            width: 40,
                            height: 36,
                            padding: 2,
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        />
                      </div>

                      <button
                        onClick={() => removeZone(zone.id)}
                        className="rh-btn rh-btn-ghost"
                        style={{ color: '#EF4444', padding: '8px' }}
                        title="Eliminar zona"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════ Step 3: Racks ════════ */}
        {currentStep === 'racks' && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
              Estantes por Zona
            </h3>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
              Agrega estantes para las zonas de almacenamiento. Las ubicaciones se generan automaticamente.
            </p>

            {zones.filter((z) => z.zone_type === 'storage').length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Grid3X3 size={48} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#64748B' }}>
                  No hay zonas de almacenamiento
                </p>
                <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
                  Solo las zonas de tipo "Almacenamiento" requieren estantes.
                  {zones.length > 0 ? ' Tus zonas son de otro tipo.' : ' Vuelve al paso anterior y agrega una.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {zones
                  .filter((z) => z.zone_type === 'storage')
                  .map((zone) => {
                    const zoneRacks = racks.filter((r) => r.zoneId === zone.id);
                    return (
                      <div key={zone.id}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                            paddingBottom: 8,
                            borderBottom: `2px solid ${zone.color}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                backgroundColor: zone.color,
                                display: 'inline-block',
                              }}
                            />
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                              {zone.name}
                            </h4>
                            <span style={{ fontSize: 12, color: '#94A3B8' }}>({zone.code})</span>
                          </div>
                          <button
                            onClick={() => addRack(zone)}
                            className="rh-btn rh-btn-outline"
                            style={{ fontSize: 12, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Plus size={14} />
                            Estante
                          </button>
                        </div>

                        {zoneRacks.length === 0 ? (
                          <p style={{ fontSize: 13, color: '#94A3B8', padding: '12px 0', textAlign: 'center' }}>
                            Sin estantes. Agrega al menos uno.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {zoneRacks.map((rack) => (
                              <div
                                key={rack.id}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr 80px 80px auto',
                                  gap: 10,
                                  alignItems: 'end',
                                  padding: '10px 12px',
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: 8,
                                }}
                              >
                                <div className="rh-field">
                                  <label className="rh-label" style={{ fontSize: 11 }}>Nombre</label>
                                  <input
                                    type="text"
                                    value={rack.name}
                                    onChange={(e) => updateRack(rack.id, 'name', e.target.value)}
                                    className="rh-input"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <div className="rh-field">
                                  <label className="rh-label" style={{ fontSize: 11 }}>Codigo</label>
                                  <input
                                    type="text"
                                    value={rack.code}
                                    onChange={(e) => updateRack(rack.id, 'code', e.target.value)}
                                    className="rh-input"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <div className="rh-field">
                                  <label className="rh-label" style={{ fontSize: 11 }}>Niveles</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={rack.levels}
                                    onChange={(e) => updateRack(rack.id, 'levels', parseInt(e.target.value) || 1)}
                                    className="rh-input"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <div className="rh-field">
                                  <label className="rh-label" style={{ fontSize: 11 }}>Pos/Nivel</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={rack.positions_per_level}
                                    onChange={(e) => updateRack(rack.id, 'positions_per_level', parseInt(e.target.value) || 1)}
                                    className="rh-input"
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <button
                                  onClick={() => removeRack(rack.id)}
                                  className="rh-btn rh-btn-ghost"
                                  style={{ color: '#EF4444', padding: '8px' }}
                                  title="Eliminar estante"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ════════ Step 4: Confirmation ════════ */}
        {currentStep === 'confirm' && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 20 }}>
              Resumen de Configuracion
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  textAlign: 'center',
                  padding: 20,
                  backgroundColor: '#EEF2FF',
                  borderRadius: 10,
                }}
              >
                <Warehouse size={28} style={{ color: '#6366F1', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>1</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Almacen</p>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  padding: 20,
                  backgroundColor: '#ECFDF5',
                  borderRadius: 10,
                }}
              >
                <MapPin size={28} style={{ color: '#10B981', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>{zones.length}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Zonas</p>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  padding: 20,
                  backgroundColor: '#FEF3C7',
                  borderRadius: 10,
                }}
              >
                <Grid3X3 size={28} style={{ color: '#F59E0B', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>{racks.length}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Estantes</p>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  padding: 20,
                  backgroundColor: '#FEE2E2',
                  borderRadius: 10,
                }}
              >
                <Package size={28} style={{ color: '#D3010A', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>{totalLocations}</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Ubicaciones</p>
              </div>
            </div>

            {/* Warehouse details */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                Almacen
              </h4>
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#F8FAFC',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#1E293B',
                  lineHeight: 1.8,
                }}
              >
                <strong>{warehouse.name}</strong> ({warehouse.code})<br />
                {warehouse.address && <>Direccion: {warehouse.address}<br /></>}
                {warehouse.total_area_sqm && <>Area: {warehouse.total_area_sqm} m2<br /></>}
                Expiracion picking: {warehouse.pick_expiry_minutes} minutos
              </div>
            </div>

            {/* Zones summary */}
            {zones.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Zonas ({zones.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {zones.map((z) => (
                    <span
                      key={z.id}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: z.color + '20',
                        color: z.color,
                        border: `1px solid ${z.color}40`,
                      }}
                    >
                      {z.name} ({z.code}) - {ZONE_TYPES.find((t) => t.value === z.zone_type)?.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Racks summary */}
            {racks.length > 0 && (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                  Estantes ({racks.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {racks.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#1E293B' }}>
                        {r.name} ({r.code})
                      </span>
                      <span style={{ color: '#64748B' }}>
                        {r.levels} niveles x {r.positions_per_level} posiciones = {r.levels * r.positions_per_level} ubicaciones
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 20,
          paddingTop: 16,
        }}
      >
        <button
          onClick={currentIndex === 0 ? () => navigate('/hub/warehouse') : goPrev}
          className="rh-btn rh-btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} />
          {currentIndex === 0 ? 'Cancelar' : 'Anterior'}
        </button>

        {currentStep === 'confirm' ? (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="rh-btn rh-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}
          >
            {saving ? (
              'Creando almacen...'
            ) : (
              <>
                <Check size={16} />
                Crear Almacen
              </>
            )}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="rh-btn rh-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
