import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ClipboardCheck, History, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAggregatorNav } from '@/hooks/useAggregatorNav.ts';
import { OrgSelectorGrid } from '@/components/hub/shared/OrgSelectorGrid.tsx';
import { Breadcrumbs } from '@/components/hub/shared/Breadcrumbs.tsx';
import { AssociateFilterCards } from '@/components/hub/shared/AssociateFilterCards.tsx';
import { getOrgAuditSummaries } from '@/services/stockAuditService.ts';
import type { OrgAuditSummary } from '@/services/stockAuditService.ts';
import { useStockAudit } from './hooks/useStockAudit.ts';
import { useJackpotAnimation } from './hooks/useJackpotAnimation.ts';
import { WarehouseSelector } from './components/WarehouseSelector.tsx';
import { AuditModeSelector } from './components/AuditModeSelector.tsx';
import { AuditMapView, fetchAllLocationIds } from './components/AuditMapView.tsx';
import { AuditConfirmation } from './components/AuditConfirmation.tsx';
import { AuditEmailModal } from './components/AuditEmailModal.tsx';
import { AuditHistory } from './components/AuditHistory.tsx';
import type { StockAuditType } from '@/types/warehouse.ts';

type Tab = 'new' | 'history';

const TAB_BASE: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: -2,
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    ...TAB_BASE,
    borderBottom: active ? '2px solid #D3010A' : '2px solid transparent',
    color: active ? '#D3010A' : '#64748B',
  };
}

export function StockAuditPage() {
  const { isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);

  const fetchSummaries = useCallback(() => getOrgAuditSummaries(), []);
  const nav = useAggregatorNav<OrgAuditSummary>(fetchSummaries, isPlatform);

  const orgId = isPlatform ? nav.effectiveOrgId ?? undefined : organization?.id;

  const [tab, setTab] = useState<Tab>('new');
  const [focusedRackId, setFocusedRackId] = useState<string | null>(null);
  const [allLocationIds, setAllLocationIds] = useState<string[]>([]);

  const audit = useStockAudit(orgId);

  useEffect(() => {
    if (audit.selectedWarehouse) {
      fetchAllLocationIds(audit.selectedWarehouse.id).then(setAllLocationIds);
    } else {
      setAllLocationIds([]);
    }
  }, [audit.selectedWarehouse]);

  const jackpot = useJackpotAnimation(allLocationIds, audit.randomCount);

  useEffect(() => {
    if (jackpot.phase === 'done' && audit.phase === 'jackpot') {
      const finalArr = Array.from(jackpot.finalIds);
      audit.confirmRandomLocations(finalArr);
      setTimeout(() => {
        audit.startAudit();
      }, 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jackpot.phase]);

  const handleModeSelect = (mode: StockAuditType, count?: number) => {
    audit.selectMode(mode, count);
    if (mode !== 'manual') {
      setTimeout(() => jackpot.start(), 300);
    }
  };

  const handleLocationClick = (locationId: string, rackId: string) => {
    audit.selectLocation(locationId, rackId);
  };

  const handleRackClick = (rackId: string) => {
    setFocusedRackId((prev) => (prev === rackId ? null : rackId));
  };

  const handleStartManualAudit = () => {
    audit.startAudit();
  };

  const handleResetAudit = () => {
    audit.resetAudit();
    jackpot.reset();
    setFocusedRackId(null);
  };

  // ─── Platform: Aggregator grid ───
  if (nav.navState === 'aggregators') {
    return (
      <OrgSelectorGrid<OrgAuditSummary>
        summaries={nav.summaries}
        loading={nav.loading}
        onSelect={nav.selectAggregator}
        pageTitle="Auditoría de Stock"
        pageSubtitle="Selecciona un agregador para auditar su inventario"
        statFields={[
          { key: 'totalAudits', label: 'Auditorías', color: '#6366F1' },
          { key: 'warehouseCount', label: 'Almacenes', color: '#10B981' },
        ]}
      />
    );
  }

  // ─── Main Content ───
  return (
    <div>
      {/* Header */}
      <div className="rh-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {audit.selectedWarehouse && audit.phase !== 'warehouse_select' && (
            <button
              onClick={audit.goBackToWarehouse}
              className="rh-btn rh-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <ArrowLeft size={14} />
              Almacenes
            </button>
          )}
          <div>
            {isPlatform && nav.breadcrumbs.length > 0 && <Breadcrumbs items={nav.breadcrumbs} />}
            <h1 className="rh-page-title">Auditoría de Stock</h1>
            <p className="rh-page-subtitle">
              {audit.selectedWarehouse
                ? `${audit.selectedWarehouse.name} (${audit.selectedWarehouse.code})`
                : 'Verificación de inventario físico vs sistema'}
            </p>
          </div>
        </div>
      </div>

      {isPlatform && nav.childOrgs.length > 0 && !audit.selectedWarehouse && (
        <AssociateFilterCards
          childOrgs={nav.childOrgs}
          filterChildOrgId={nav.filterChildOrgId}
          onFilter={nav.setFilterChildOrgId}
        />
      )}

      {/* Warehouse Selector phase */}
      {audit.phase === 'warehouse_select' && (
        <>
          {audit.selectedWarehouse == null && (
            <WarehouseSelector
              orgId={orgId}
              isPlatform={isPlatform && !nav.selectedAggregatorId}
              onSelect={audit.selectWarehouse}
            />
          )}
        </>
      )}

      {/* After warehouse is selected: show tabs */}
      {audit.selectedWarehouse && (
        <>
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #E2E8F0' }}>
            <button onClick={() => setTab('new')} style={tabStyle(tab === 'new')}>
              <Plus size={14} />
              Nueva Auditoría
            </button>
            <button onClick={() => setTab('history')} style={tabStyle(tab === 'history')}>
              <History size={14} />
              Historial
            </button>
          </div>

          {tab === 'history' && (
            <AuditHistory warehouseId={audit.selectedWarehouse.id} />
          )}

          {tab === 'new' && (
            <>
              {audit.phase === 'mode_select' && (
                <AuditModeSelector onSelect={handleModeSelect} />
              )}

              {audit.phase === 'map_select' && (
                <>
                  <AuditMapView
                    warehouseId={audit.selectedWarehouse.id}
                    selectedLocationIds={audit.selectedLocationIds}
                    animatingLocationIds={new Set()}
                    auditedLocationIds={new Set()}
                    onLocationClick={handleLocationClick}
                    onRackClick={handleRackClick}
                    focusedRackId={focusedRackId}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <button onClick={handleResetAudit} className="rh-btn rh-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowLeft size={14} />
                      Cambiar modo
                    </button>
                    <button
                      onClick={handleStartManualAudit}
                      disabled={audit.selectedLocationIds.size === 0}
                      className="rh-btn rh-btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: audit.selectedLocationIds.size === 0 ? 0.5 : 1 }}
                    >
                      <ClipboardCheck size={14} />
                      Iniciar Auditoría ({audit.selectedLocationIds.size} ubicación{audit.selectedLocationIds.size !== 1 ? 'es' : ''})
                    </button>
                  </div>
                </>
              )}

              {audit.phase === 'jackpot' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <p style={{
                      fontSize: 18, fontWeight: 700,
                      color: jackpot.phase === 'done' ? '#10B981' : '#F97316',
                      animation: jackpot.phase !== 'done' ? 'pulse 1s ease-in-out infinite' : undefined,
                    }}>
                      {jackpot.phase === 'done'
                        ? `Seleccionadas ${jackpot.finalIds.size} ubicación${jackpot.finalIds.size !== 1 ? 'es' : ''}`
                        : jackpot.phase === 'settling' ? 'Deteniendo...' : 'Seleccionando ubicaciones...'}
                    </p>
                  </div>
                  <AuditMapView
                    warehouseId={audit.selectedWarehouse.id}
                    selectedLocationIds={jackpot.phase === 'done' ? jackpot.finalIds : new Set()}
                    animatingLocationIds={jackpot.phase !== 'done' ? jackpot.animatingIds : new Set()}
                    auditedLocationIds={new Set()}
                  />
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                  `}</style>
                </>
              )}

              {audit.phase === 'confirmation' && (
                <>
                  <AuditMapView
                    warehouseId={audit.selectedWarehouse.id}
                    selectedLocationIds={audit.selectedLocationIds}
                    animatingLocationIds={new Set()}
                    auditedLocationIds={new Set(audit.auditItems.filter((i) => i.status !== 'pending').map((i) => i.location_id))}
                  />
                  <AuditConfirmation
                    items={audit.auditItems}
                    onUpdateItem={audit.updateItem}
                    onComplete={audit.completeAudit}
                    completing={audit.completing}
                  />
                </>
              )}

              {audit.phase === 'email_modal' && (
                <AuditEmailModal
                  open={true}
                  onClose={audit.skipEmail}
                  onSend={audit.sendEmail}
                  onSkip={audit.skipEmail}
                  defaultEmail={user?.email ?? ''}
                  matchCount={audit.auditItems.filter((i) => i.status === 'match').length}
                  discrepancyCount={audit.auditItems.filter((i) => i.status === 'discrepancy').length}
                  totalLocations={audit.auditItems.length}
                />
              )}

              {audit.phase === 'done' && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <ClipboardCheck size={48} style={{ color: '#10B981', marginBottom: 16 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Auditoría Completada</h3>
                  <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>La auditoría ha sido registrada exitosamente.</p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button onClick={handleResetAudit} className="rh-btn rh-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={14} />
                      Nueva Auditoría
                    </button>
                    <button onClick={() => setTab('history')} className="rh-btn rh-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <History size={14} />
                      Ver Historial
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
