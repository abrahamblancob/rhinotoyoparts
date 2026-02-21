import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';
import { ToastContainer, showToast } from '@/components/hub/shared/ToastNotification.tsx';
import { useOrderNotifications } from '@/hooks/useOrderNotifications.ts';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Subscribe to real-time order status changes
  useOrderNotifications((msg) => showToast(msg));

  return (
    <div className="rh-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <div className={`rh-layout-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar />
        <main className="rh-layout-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
