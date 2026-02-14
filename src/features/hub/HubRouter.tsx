import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/AuthGuard.tsx';
import { LoginPage } from '@/features/auth/LoginPage.tsx';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage.tsx';
import { DashboardLayout } from '@/components/hub/layout/DashboardLayout.tsx';
import { DashboardPage } from '@/features/dashboard/DashboardPage.tsx';
import { OrgListPage } from '@/features/organizations/OrgListPage.tsx';
import { UsersPage } from '@/features/users/UsersPage.tsx';
import { InventoryPage } from '@/features/inventory/InventoryPage.tsx';
import { InventoryUploadPage } from '@/features/inventory/InventoryUploadPage.tsx';
import { CatalogPage } from '@/features/catalog/CatalogPage.tsx';
import { OrdersPage } from '@/features/orders/OrdersPage.tsx';
import { CustomersPage } from '@/features/customers/CustomersPage.tsx';
import { BillingPage } from '@/features/billing/BillingPage.tsx';
import { AuditPage } from '@/features/audit/AuditPage.tsx';
import { SettingsPage } from '@/features/settings/SettingsPage.tsx';

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
            </DashboardLayout>
          </AuthGuard>
        }
      />
    </Routes>
  );
}
