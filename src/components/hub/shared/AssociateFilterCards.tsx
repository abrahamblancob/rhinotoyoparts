import { Building2, Users } from 'lucide-react';

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
    <div style={{
      backgroundColor: '#F8FAFC',
      border: '1px solid #E2E8F0',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Users size={16} style={{ color: '#7C3AED' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
          Filtrar por Asociado
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          backgroundColor: '#EDE9FE',
          color: '#7C3AED',
          padding: '2px 8px',
          borderRadius: 10,
        }}>
          {childOrgs.length}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => onFilter(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 10,
            border: '2px solid',
            borderColor: filterChildOrgId === null ? '#6366F1' : '#E2E8F0',
            backgroundColor: filterChildOrgId === null ? '#EEF2FF' : '#FFFFFF',
            color: filterChildOrgId === null ? '#4F46E5' : '#64748B',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: filterChildOrgId === null ? '0 0 0 1px #6366F133' : '0 1px 2px #0000000A',
          }}
        >
          <Users size={16} />
          Todos
        </button>
        {childOrgs.map((org) => {
          const isActive = filterChildOrgId === org.id;
          return (
            <button
              key={org.id}
              onClick={() => onFilter(isActive ? null : org.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                border: '2px solid',
                borderColor: isActive ? '#7C3AED' : '#E2E8F0',
                backgroundColor: isActive ? '#EDE9FE' : '#FFFFFF',
                color: isActive ? '#6D28D9' : '#64748B',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 0 0 1px #7C3AED33' : '0 1px 2px #0000000A',
              }}
            >
              <Building2 size={16} />
              {org.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
