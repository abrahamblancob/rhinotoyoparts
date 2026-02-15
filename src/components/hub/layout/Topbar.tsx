import { useLocation } from 'react-router-dom';

const PAGE_TITLES: Record<string, string> = {
  '/hub': 'Dashboard',
  '/hub/organizations': 'Organizaciones',
  '/hub/users': 'Usuarios',
  '/hub/inventory': 'Inventario',
  '/hub/inventory/upload': 'Carga de Inventario',
  '/hub/catalog': 'Catálogo',
  '/hub/orders': 'Órdenes',
  '/hub/customers': 'Clientes',
  '/hub/billing': 'Facturación',
  '/hub/audit': 'Auditoría',
  '/hub/settings': 'Configuración',
};

export function Topbar() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'Rhino Hub';

  return (
    <header className="rh-topbar">
      <h2 className="rh-topbar-title">{title}</h2>
    </header>
  );
}
