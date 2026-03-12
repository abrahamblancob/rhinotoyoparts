/**
 * Shared date/time formatting utilities.
 * Locale: es-VE (Venezuelan Spanish).
 */

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-VE', {
    dateStyle: 'medium',
  });
}
