import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="rh-layout">
      <Sidebar />
      <div className="rh-layout-main">
        <Topbar />
        <main className="rh-layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
