/** Threshold at or below which stock is considered "low" (exclusive of zero). */
export const LOW_STOCK_THRESHOLD = 5;

/* ── Order status groups ── */
export const PENDING_ORDER_STATUSES = ['draft', 'pending', 'confirmed'] as const;
export const IN_PROGRESS_ORDER_STATUSES = ['picking', 'packing', 'packed', 'assigned', 'picked'] as const;

/* ── Pick-list status groups ── */
export const PENDING_PICK_STATUSES = ['pending'] as const;
export const IN_PROGRESS_PICK_STATUSES = ['assigned', 'in_progress'] as const;

/* ── Pack-session status groups ── */
export const PENDING_PACK_STATUSES = ['pending'] as const;
export const IN_PROGRESS_PACK_STATUSES = ['in_progress', 'verified'] as const;
