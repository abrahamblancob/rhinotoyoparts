interface Props {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: Props) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Build page numbers to show (max 5 visible)
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderTop: '1px solid #E8E6E4',
        backgroundColor: '#FAFAF9',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#8A8886' }}>
        {from}–{to} de {totalItems}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '4px 10px',
            fontSize: 13,
            border: '1px solid #E8E6E4',
            borderRadius: 6,
            backgroundColor: currentPage === 1 ? '#F3F2F1' : '#FFFFFF',
            color: currentPage === 1 ? '#C8C6C4' : '#242321',
            cursor: currentPage === 1 ? 'default' : 'pointer',
          }}
        >
          ←
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '4px 6px', color: '#8A8886' }}>
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                padding: '4px 10px',
                fontSize: 13,
                border: p === currentPage ? '1px solid #D3010A' : '1px solid #E8E6E4',
                borderRadius: 6,
                backgroundColor: p === currentPage ? '#D3010A' : '#FFFFFF',
                color: p === currentPage ? '#FFFFFF' : '#242321',
                fontWeight: p === currentPage ? 600 : 400,
                cursor: 'pointer',
                minWidth: 32,
              }}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '4px 10px',
            fontSize: 13,
            border: '1px solid #E8E6E4',
            borderRadius: 6,
            backgroundColor: currentPage === totalPages ? '#F3F2F1' : '#FFFFFF',
            color: currentPage === totalPages ? '#C8C6C4' : '#242321',
            cursor: currentPage === totalPages ? 'default' : 'pointer',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
