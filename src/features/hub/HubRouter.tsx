import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/AuthGuard.tsx';
import { LoginPage } from '@/features/auth/LoginPage.tsx';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage.tsx';
import { DashboardLayout } from '@/components/hub/layout/DashboardLayout.tsx';
import { usePermissions } from '@/hooks/usePermissions.ts';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage.tsx').then(m => ({ default: m.DashboardPage })));
const OrgListPage = lazy(() => import('@/features/organizations/OrgListPage.tsx').then(m => ({ default: m.OrgListPage })));
const UsersPage = lazy(() => import('@/features/users/UsersPage.tsx').then(m => ({ default: m.UsersPage })));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage.tsx').then(m => ({ default: m.InventoryPage })));
const InventoryUploadPage = lazy(() => import('@/features/inventory/InventoryUploadPage.tsx').then(m => ({ default: m.InventoryUploadPage })));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage.tsx').then(m => ({ default: m.CatalogPage })));
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage.tsx').then(m => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage.tsx').then(m => ({ default: m.OrderDetailPage })));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage.tsx').then(m => ({ default: m.CustomersPage })));
const DispatchesPage = lazy(() => import('@/features/dispatches/DispatchesPage.tsx').then(m => ({ default: m.DispatchesPage })));
const BillingPage = lazy(() => import('@/features/billing/BillingPage.tsx').then(m => ({ default: m.BillingPage })));
const AuditPage = lazy(() => import('@/features/audit/AuditPage.tsx').then(m => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage.tsx').then(m => ({ default: m.SettingsPage })));

// WMS features
const WarehouseLayoutPage = lazy(() => import('@/features/warehouse/WarehouseLayoutPage.tsx').then(m => ({ default: m.WarehouseLayoutPage })));
const WarehouseSetupWizard = lazy(() => import('@/features/warehouse/WarehouseSetupWizard.tsx').then(m => ({ default: m.WarehouseSetupWizard })));
const PickingDashboard = lazy(() => import('@/features/picking/PickingDashboard.tsx').then(m => ({ default: m.PickingDashboard })));
const PickListDetail = lazy(() => import('@/features/picking/PickListDetail.tsx').then(m => ({ default: m.PickListDetail })));
const PackingDashboard = lazy(() => import('@/features/packing/PackingDashboard.tsx').then(m => ({ default: m.PackingDashboard })));
const PackSessionDetail = lazy(() => import('@/features/packing/PackSessionDetail.tsx').then(m => ({ default: m.PackSessionDetail })));
const ReceivingPage = lazy(() => import('@/features/receiving/ReceivingPage.tsx').then(m => ({ default: m.ReceivingPage })));
const ReceivingDetailPage = lazy(() => import('@/features/receiving/ReceivingDetailPage.tsx').then(m => ({ default: m.ReceivingDetailPage })));
const StockDashboard = lazy(() => import('@/features/stock/StockDashboard.tsx').then(m => ({ default: m.StockDashboard })));
const StockMovements = lazy(() => import('@/features/stock/StockMovements.tsx').then(m => ({ default: m.StockMovements })));
const StockAdjustment = lazy(() => import('@/features/stock/StockAdjustment.tsx').then(m => ({ default: m.StockAdjustment })));

/** Redirects vendedor/despachador away from Dashboard to their relevant page */
function SmartIndex() {
  const { roles, isDispatcher } = usePermissions();
  const isEditor = roles.includes('associate_editor');

  const isPicker = roles.includes('warehouse_picker');
  const isPacker = roles.includes('warehouse_packer');
  const isReceiver = roles.includes('warehouse_receiver');
  const isWarehouseManager = roles.includes('warehouse_manager');

  if (isDispatcher) return <Navigate to="/hub/dispatches" replace />;
  if (isEditor) return <Navigate to="/hub/orders" replace />;
  if (isPicker) return <Navigate to="/hub/picking" replace />;
  if (isPacker) return <Navigate to="/hub/packing" replace />;
  if (isReceiver) return <Navigate to="/hub/receiving" replace />;
  if (isWarehouseManager) return <Navigate to="/hub/warehouse" replace />;

  // All other roles see the Dashboard
  return <DashboardPage />;
}

function HubLoading() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
      <div className="flex items-center gap-2">
        <svg className="animate-spin h-5 w-5" style={{ color: '#D3010A' }} viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm" style={{ color: '#8A8886' }}>Cargando...</span>
      </div>
    </div>
  );
}

export function HubRouter() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />

      {/* All authenticated routes */}
      <Route
        path="*"
        element={
          <AuthGuard>
            <DashboardLayout>
              <Suspense fallback={<HubLoading />}>
                <Routes>
                  <Route index element={<SmartIndex />} />
                  <Route path="organizations" element={<OrgListPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/upload" element={<InventoryUploadPage />} />
                  <Route path="catalog" element={<CatalogPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="dispatches" element={<DispatchesPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="audit" element={<AuditPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  {/* WMS routes */}
                  <Route path="warehouse" element={<WarehouseLayoutPage />} />
                  <Route path="warehouse/setup" element={<WarehouseSetupWizard />} />
                  <Route path="picking" element={<PickingDashboard />} />
                  <Route path="picking/:pickListId" element={<PickListDetail />} />
                  <Route path="packing" element={<PackingDashboard />} />
                  <Route path="packing/:sessionId" element={<PackSessionDetail />} />
                  <Route path="receiving" element={<ReceivingPage />} />
                  <Route path="receiving/:receivingId" element={<ReceivingDetailPage />} />
                  <Route path="stock" element={<StockDashboard />} />
                  <Route path="stock/movements" element={<StockMovements />} />
                  <Route path="stock/adjust" element={<StockAdjustment />} />
                  <Route path="*" element={<Navigate to="/hub" replace />} />
                </Routes>
              </Suspense>
            </DashboardLayout>
          </AuthGuard>
        }
      />
    </Routes>
  );
}
