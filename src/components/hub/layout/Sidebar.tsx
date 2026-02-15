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

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_CONFIG: Record<OrgType, NavSection[]> = {
  platform: [
    {
      title: 'PRINCIPAL',
      items: [
        { label: 'Dashboard', path: '/hub', icon: '📊', module: 'dashboard' },
        { label: 'Inventario', path: '/hub/inventory', icon: '📦', module: 'inventory' },
        { label: 'Órdenes de Compra', path: '/hub/orders', icon: '🛒', module: 'orders' },
        { label: 'Carga de Inventario', path: '/hub/inventory/upload', icon: '📤', module: 'upload' },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        { label: 'Agregadores', path: '/hub/organizations', icon: '🏢', module: 'organizations' },
        { label: 'Usuarios', path: '/hub/users', icon: '👥', module: 'users' },
      ],
    },
    {
      title: 'GESTIÓN',
      items: [
        { label: 'Catálogo de Productos', path: '/hub/catalog', icon: '🗂️', module: 'catalog' },
        { label: 'Facturación y Pagos', path: '/hub/billing', icon: '🧾', module: 'billing' },
        { label: 'Auditoría de Stock', path: '/hub/audit', icon: '📜', module: 'audit' },
      ],
    },
    {
      title: 'CUENTA',
      items: [
        { label: 'Centro de Ayuda', path: '/hub/help', icon: '❓', module: 'help' },
        { label: 'Configuración', path: '/hub/settings', icon: '⚙️', module: 'settings' },
      ],
    },
  ],
  aggregator: [
    {
      title: 'PRINCIPAL',
      items: [
        { label: 'Dashboard', path: '/hub', icon: '📊', module: 'dashboard' },
        { label: 'Inventario', path: '/hub/inventory', icon: '📦', module: 'inventory' },
        { label: 'Órdenes de Compra', path: '/hub/orders', icon: '🛒', module: 'orders' },
        { label: 'Carga de Inventario', path: '/hub/inventory/upload', icon: '📤', module: 'upload' },
      ],
    },
    {
      title: 'ADMINISTRACIÓN',
      items: [
        { label: 'Mis Asociados', path: '/hub/organizations', icon: '🏢', module: 'organizations' },
        { label: 'Usuarios', path: '/hub/users', icon: '👥', module: 'users' },
      ],
    },
    {
      title: 'GESTIÓN',
      items: [
        { label: 'Catálogo de Productos', path: '/hub/catalog', icon: '🗂️', module: 'catalog' },
        { label: 'Facturación y Pagos', path: '/hub/billing', icon: '🧾', module: 'billing' },
        { label: 'Auditoría de Stock', path: '/hub/audit', icon: '📜', module: 'audit' },
      ],
    },
    {
      title: 'CUENTA',
      items: [
        { label: 'Centro de Ayuda', path: '/hub/help', icon: '❓', module: 'help' },
        { label: 'Configuración', path: '/hub/settings', icon: '⚙️', module: 'settings' },
      ],
    },
  ],
  associate: [
    {
      title: 'PRINCIPAL',
      items: [
        { label: 'Dashboard', path: '/hub', icon: '📊', module: 'dashboard' },
        { label: 'Inventario', path: '/hub/inventory', icon: '📦', module: 'inventory' },
        { label: 'Órdenes de Compra', path: '/hub/orders', icon: '🛒', module: 'orders' },
        { label: 'Carga de Inventario', path: '/hub/inventory/upload', icon: '📤', module: 'upload' },
      ],
    },
    {
      title: 'GESTIÓN',
      items: [
        { label: 'Catálogo de Productos', path: '/hub/catalog', icon: '🗂️', module: 'catalog' },
        { label: 'Facturación y Pagos', path: '/hub/billing', icon: '🧾', module: 'billing' },
        { label: 'Auditoría de Stock', path: '/hub/audit', icon: '📜', module: 'audit' },
      ],
    },
    {
      title: 'CUENTA',
      items: [
        { label: 'Centro de Ayuda', path: '/hub/help', icon: '❓', module: 'help' },
        { label: 'Configuración', path: '/hub/settings', icon: '⚙️', module: 'settings' },
      ],
    },
  ],
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const logout = useAuthStore((s) => s.logout);
  const { canRead, orgType } = usePermissions();
  const navigate = useNavigate();

  const sections = NAV_CONFIG[orgType ?? 'associate'] ?? [];

  const handleLogout = async () => {
    await logout();
    navigate('/hub/login');
  };

  const orgLabel =
    orgType === 'platform' ? 'Plataforma' :
    orgType === 'aggregator' ? 'Agregador' : 'Asociado';

  return (
    <aside className={`rh-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="rh-sidebar-header">
        <img src="/logo.jpg" alt="Rhino" className="rh-sidebar-logo" />
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="rh-sidebar-brand">Rhino Hub</h1>
            <span className="rh-sidebar-badge">{orgLabel}</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rh-sidebar-toggle"
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? '☰' : '☰'}
        </button>
      </div>

      <nav className="rh-sidebar-nav">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => canRead(item.module));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="rh-sidebar-section">
              {!collapsed && (
                <p className="rh-sidebar-section-title">{section.title}</p>
              )}
              <div className="rh-space-y-sm">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/hub'}
                    className={({ isActive }) =>
                      `rh-sidebar-nav-item ${isActive ? 'active' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="rh-sidebar-nav-icon">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="rh-sidebar-footer">
        {!collapsed ? (
          <>
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
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="rh-sidebar-logout"
            title="Cerrar sesión"
            style={{ justifyContent: 'center' }}
          >
            <span>🚪</span>
          </button>
        )}
      </div>
    </aside>
  );
}
