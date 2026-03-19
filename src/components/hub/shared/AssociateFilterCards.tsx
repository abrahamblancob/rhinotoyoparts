interface ChildOrg {
  id: string;
  name: string;
  type: string;
}

interface Props {
  childOrgs: ChildOrg[];
  filterChildOrgId: string | null;
  onFilter: (id: string | null) => void;
}

export function AssociateFilterCards({ childOrgs, filterChildOrgId, onFilter }: Props) {
  if (childOrgs.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      <button
        onClick={() => onFilter(null)}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid',
          borderColor: filterChildOrgId === null ? '#6366F1' : '#E2E8F0',
          backgroundColor: filterChildOrgId === null ? '#EEF2FF' : '#FFFFFF',
          color: filterChildOrgId === null ? '#6366F1' : '#64748B',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        Todos
      </button>
      {childOrgs.map((org) => (
        <button
          key={org.id}
          onClick={() => onFilter(filterChildOrgId === org.id ? null : org.id)}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid',
            borderColor: filterChildOrgId === org.id ? '#7C3AED' : '#E2E8F0',
            backgroundColor: filterChildOrgId === org.id ? '#EDE9FE' : '#FFFFFF',
            color: filterChildOrgId === org.id ? '#7C3AED' : '#64748B',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {org.name}
        </button>
      ))}
    </div>
  );
}
