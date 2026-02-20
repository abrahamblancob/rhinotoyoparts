import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/AuthGuard.tsx';
import { LoginPage } from '@/features/auth/LoginPage.tsx';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage.tsx';
import { DashboardLayout } from '@/components/hub/layout/DashboardLayout.tsx';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage.tsx').then(m => ({ default: m.DashboardPage })));
const OrgListPage = lazy(() => import('@/features/organizations/OrgListPage.tsx').then(m => ({ default: m.OrgListPage })));
const UsersPage = lazy(() => import('@/features/users/UsersPage.tsx').then(m => ({ default: m.UsersPage })));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage.tsx').then(m => ({ default: m.InventoryPage })));
const InventoryUploadPage = lazy(() => import('@/features/inventory/InventoryUploadPage.tsx').then(m => ({ default: m.InventoryUploadPage })));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage.tsx').then(m => ({ default: m.CatalogPage })));
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage.tsx').then(m => ({ default: m.OrdersPage })));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage.tsx').then(m => ({ default: m.CustomersPage })));
const BillingPage = lazy(() => import('@/features/billing/BillingPage.tsx').then(m => ({ default: m.BillingPage })));
const AuditPage = lazy(() => import('@/features/audit/AuditPage.tsx').then(m => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage.tsx').then(m => ({ default: m.SettingsPage })));

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
                  <Route index element={<DashboardPage />} />
                  <Route path="organizations" element={<OrgListPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="inventory/upload" element={<InventoryUploadPage />} />
                  <Route path="catalog" element={<CatalogPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="audit" element={<AuditPage />} />
                  <Route path="settings" element={<SettingsPage />} />
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
