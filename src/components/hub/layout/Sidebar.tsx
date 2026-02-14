import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import type { OrgType } from '@/lib/constants.ts';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  module: string;
}

const NAV_CONFIG: Record<OrgType, NavItem[]> = {
  platform: [
    { label: 'Dashboard', path: '/hub', icon: '📊', module: 'dashboard' },
    { label: 'Agregadores', path: '/hub/organizations', icon: '🏢', module: 'organizations' },
    { label: 'Usuarios', path: '/hub/users', icon: '👥', module: 'users' },
    { label: 'Inventario Global', path: '/hub/inventory', icon: '📦', module: 'inventory' },
    { label: 'Órdenes', path: '/hub/orders', icon: '🛒', module: 'orders' },
    { label: 'Facturación', path: '/hub/billing', icon: '🧾', module: 'billing' },
    { label: 'Auditoría', path: '/hub/audit', icon: '📜', module: 'audit' },
    { label: 'Configuración', path: '/hub/settings', icon: '⚙️', module: 'settings' },
  ],
  aggregator: [
    { label: 'Dashboard', path: '/hub', icon: '📊', module: 'dashboard' },
    { label: 'Mis Asociados', path: '/hub/organizations', icon: '🏢', module: 'organizations' },
    { label: 'Usuarios', path: '/hub/users', icon: '👥', module: 'users' },
    { label: 'Inventario', path: '/hub/inventory', icon: '📦', module: 'inventory' },
    { label: 'Órdenes', path: '/hub/orders', icon: '🛒', module: 'orders' },
    { label: 'Facturación', path: '/hub/billing', icon: '🧾', module: 'billing' },
    { label: 'Auditoría', path: '/hub/audit', icon: '📜', module: 'audit' },
    { label: 'Configuración', path: '/hub/settings', icon: '⚙️', module: 'settings' },
  ],
  associate: [
    { label: 'Dashboard', path: '/hub', icon: '📊', module: 'dashboard' },
    { label: 'Inventario', path: '/hub/inventory', icon: '📦', module: 'inventory' },
    { label: 'Catálogo', path: '/hub/catalog', icon: '🗂️', module: 'catalog' },
    { label: 'Carga Inventario', path: '/hub/inventory/upload', icon: '📤', module: 'upload' },
    { label: 'Órdenes', path: '/hub/orders', icon: '🛒', module: 'orders' },
    { label: 'Clientes', path: '/hub/customers', icon: '👤', module: 'customers' },
    { label: 'Facturación', path: '/hub/billing', icon: '🧾', module: 'billing' },
    { label: 'Auditoría', path: '/hub/audit', icon: '📜', module: 'audit' },
    { label: 'Configuración', path: '/hub/settings', icon: '⚙️', module: 'settings' },
  ],
};

export function Sidebar() {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const logout = useAuthStore((s) => s.logout);
  const { canRead, orgType } = usePermissions();
  const navigate = useNavigate();

  const navItems = NAV_CONFIG[orgType ?? 'associate'] ?? [];
  const visibleItems = navItems.filter((item) => canRead(item.module));

  const handleLogout = async () => {
    await logout();
    navigate('/hub/login');
  };

  const orgLabel =
    orgType === 'platform' ? 'Plataforma' :
    orgType === 'aggregator' ? 'Agregador' : 'Asociado';

  return (
    <aside className="rh-sidebar">
      <div className="rh-sidebar-header">
        <img src="/logo.jpg" alt="Rhino" className="rh-sidebar-logo" />
        <div>
          <h1 className="rh-sidebar-brand">Rhino Hub</h1>
          <span className="rh-sidebar-badge">{orgLabel}</span>
        </div>
      </div>

      <nav className="rh-sidebar-nav">
        <div className="rh-space-y-sm">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/hub'}
              className={({ isActive }) =>
                `rh-sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="rh-sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="rh-sidebar-footer">
        <div className="rh-sidebar-user">
          <div className="rh-sidebar-avatar">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="rh-sidebar-user-name">{profile?.full_name ?? 'Usuario'}</p>
            <p className="rh-sidebar-user-org">{organization?.name ?? ''}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="rh-sidebar-logout">
          <span>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
