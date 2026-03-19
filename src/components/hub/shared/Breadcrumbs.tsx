interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#CBD5E1' }}>/</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="rh-btn rh-btn-ghost"
              style={{ fontSize: 13, padding: '2px 4px', color: '#6366F1', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {item.label}
            </button>
          ) : (
            <span style={{ color: '#64748B', fontWeight: 600 }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
