import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useOrgSelector } from '@/hooks/useOrgSelector.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { useWarehouses } from '@/hooks/useWarehouse.ts';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { StatsCard } from '@/components/hub/shared/StatsCard.tsx';
import { EmptyState } from '@/components/hub/shared/EmptyState.tsx';
import { Modal } from '@/components/hub/shared/Modal.tsx';
import * as receivingService from '@/services/receivingService.ts';
import { getOrgReceivingSummaries } from '@/services/dashboardService.ts';
import type { OrgReceivingSummary } from '@/services/dashboardService.ts';
import { getAllActiveSuppliers } from '@/services/supplierService.ts';
import type { Supplier } from '@/lib/database.types.ts';
import type { ReceivingOrder, ReceivingStatus } from '@/types/warehouse.ts';

const STATUS_LABELS: Record<string, string> = {
  all: 'Todos',
  pending: 'Pendiente',
  receiving: 'Recibiendo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<ReceivingStatus, { bg: string; text: string }> = {
  pending: { bg: '#F59E0B15', text: '#F59E0B' },
  receiving: { bg: '#3B82F615', text: '#3B82F6' },
  completed: { bg: '#10B98115', text: '#10B981' },
  cancelled: { bg: '#D3010A15', text: '#D3010A' },
};

export function ReceivingPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const { isPlatform, canWrite } = usePermissions();
  const organization = useAuthStore((s) => s.organization);

  const {
    summaries,
    selectedOrgId,
    loading: loadingSummaries,
    setSelectedOrgId,
    showSelector,
  } = useOrgSelector<OrgReceivingSummary>(getOrgReceivingSummaries, isPlatform);

  const orgId = selectedOrgId ?? organization?.id;

  const fetcher = useCallback(
    () => {
      if (showSelector) return Promise.resolve({ data: [], error: null });
      return receivingService.getReceivingOrders({
        orgId,
        isPlatform: false,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
    },
    [orgId, statusFilter, showSelector],
  );

  const { data: orders, loading, reload } = useAsyncData<ReceivingOrder[]>(fetcher, [
    orgId,
    statusFilter,
    showSelector,
  ]);

  const items = orders ?? [];
  const filtered = search.trim()
    ? items.filter(
        (o) =>
          o.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
          o.supplier_name?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  // Stats
  const totalCount = items.length;
  const pendingCount = items.filter((o) => o.status === 'pending').length;
  const inProgressCount = items.filter((o) => o.status === 'receiving').length;
  const completedCount = items.filter((o) => o.status === 'completed').length;

  const statuses = ['all', 'pending', 'receiving', 'completed', 'cancelled'];

  // Platform org selector view
  if (showSelector) {
    const totalReceiving = summaries.reduce((s, o) => s + o.receivingCount, 0);
    const totalPending = summaries.reduce((s, o) => s + o.pendingReceiving, 0);
    const totalInProgress = summaries.reduce((s, o) => s + o.inProgressReceiving, 0);
    const totalCompleted = summaries.reduce((s, o) => s + o.completedReceiving, 0);

    return (
      <OrgSelectorGrid<OrgReceivingSummary>
        summaries={summaries}
        loading={loadingSummaries}
        onSelect={setSelectedOrgId}
        pageTitle="Recepcion de Mercancia"
        pageSubtitle="Selecciona una organizacion para gestionar sus recepciones"
        globalStats={[
          { title: 'Total Recepciones', value: totalReceiving, icon: '📥', color: '#6366F1' },
          { title: 'Pendientes', value: totalPending, icon: '⏳', color: '#F59E0B' },
          { title: 'Recibiendo', value: totalInProgress, icon: '🔄', color: '#3B82F6' },
          { title: 'Completados', value: totalCompleted, icon: '✅', color: '#10B981' },
        ]}
        statFields={[
          { key: 'receivingCount', label: 'Recepciones', color: '#6366F1' },
          { key: 'pendingReceiving', label: 'Pendientes', color: '#F59E0B', highlight: true },
          { key: 'inProgressReceiving', label: 'Recibiendo', color: '#3B82F6' },
          { key: 'completedReceiving', label: 'Completados', color: '#10B981' },
        ]}
      />
    );
  }

  return (
    <div>
      <div className="rh-page-header">
        <div>
          {isPlatform && (
            <button
              className="rh-btn rh-btn-ghost"
              onClick={() => setSelectedOrgId(null)}
              style={{ marginBottom: 8, fontSize: 13 }}
            >
              ← Volver a organizaciones
            </button>
          )}
          <h1 className="rh-page-title">Recepcion de Mercancia</h1>
          <p style={{ color: '#8A8886', fontSize: 14, marginTop: 4 }}>
            Gestiona la recepcion de productos en almacen
          </p>
        </div>
        {canWrite('receiving') && (
          <button
            className="rh-btn rh-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} style={{ marginRight: 4 }} />
            Nueva Recepcion
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="rh-stats-grid mb-6">
        <StatsCard title="Total" value={totalCount} icon="📥" color="#6366F1" />
        <StatsCard title="Pendientes" value={pendingCount} icon="⏳" color="#F59E0B" />
        <StatsCard title="Recibiendo" value={inProgressCount} icon="🔄" color="#3B82F6" />
        <StatsCard title="Completados" value={completedCount} icon="✅" color="#10B981" />
      </div>

      {/* Filters */}
      <div className="rh-filters flex-wrap" style={{ gap: 8, marginBottom: 16 }}>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rh-filter-pill ${statusFilter === s ? 'active' : ''}`}
          >
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8886' }}
        />
        <input
          type="text"
          placeholder="Buscar por referencia o proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rh-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {loading ? (
        <p className="rh-loading">Cargando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📥"
          title="No hay recepciones"
          description="Las ordenes de recepcion aparecerean aqui cuando se creen"
          actionLabel={canWrite('receiving') ? 'Nueva Recepcion' : undefined}
          onAction={canWrite('receiving') ? () => setShowCreateModal(true) : undefined}
        />
      ) : (
        <div className="rh-table-wrapper">
          <table className="rh-table">
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Proveedor</th>
                <th>Almacen</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const statusStyle = STATUS_COLORS[order.status] ?? {
                  bg: '#8A888615',
                  text: '#8A8886',
                };

                return (
                  <tr
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/hub/receiving/${order.id}`)}
                  >
                    <td className="cell-primary cell-mono">
                      {order.reference_number ?? '-'}
                    </td>
                    <td>{order.supplier_name ?? '-'}</td>
                    <td>{order.warehouse?.name ?? '-'}</td>
                    <td>
                      <span
                        className="rh-badge"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="cell-muted">
                      {new Date(order.created_at).toLocaleDateString('es-VE')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateReceivingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          reload();
        }}
      />
    </div>
  );
}

// ── Create Receiving Order Modal ──

interface CreateReceivingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateReceivingModal({ open, onClose, onCreated }: CreateReceivingModalProps) {
  const { data: warehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getAllActiveSuppliers().then(({ data }) => {
      setSuppliers(data ?? []);
    });
  }, [open]);

  const handleSubmit = async () => {
    const selectedWarehouse = (warehouses ?? []).find((w) => w.id === warehouseId);
    if (!warehouseId || !selectedWarehouse) {
      setError('Selecciona un almacen');
      return;
    }
    if (!supplierId) {
      setError('Selecciona un proveedor');
      return;
    }
    setSaving(true);
    setError(null);

    const result = await receivingService.createReceivingOrder({
      warehouse_id: warehouseId,
      org_id: selectedWarehouse.org_id,
      supplier_id: supplierId || undefined,
      supplier_name: suppliers.find(s => s.id === supplierId)?.name || undefined,
      reference_number: referenceNumber || undefined,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setWarehouseId('');
    setSupplierId('');
    setReferenceNumber('');
    onCreated();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva Recepcion"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="rh-btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="rh-btn rh-btn-primary"
            onClick={handleSubmit}
            disabled={saving || !warehouseId || !supplierId}
          >
            {saving ? 'Creando...' : 'Crear Recepcion'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <p style={{ color: '#D3010A', fontSize: 13 }}>{error}</p>
        )}

        <div>
          <label className="rh-label">Almacen *</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="rh-input"
          >
            <option value="">Seleccionar almacen...</option>
            {(warehouses ?? []).map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rh-label">Proveedor *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="rh-input"
          >
            <option value="">Seleccionar proveedor...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rh-label">Numero de Referencia</label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="rh-input"
            placeholder="Ej: PO-2024-001"
          />
        </div>
      </div>
    </Modal>
  );
}
