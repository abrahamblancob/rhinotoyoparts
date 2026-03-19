import { callEdgeFunction } from '@/lib/edgeFunction.ts';

interface YiucpRequest {
  query: string;
  orgId: string;
  orgType: string;
  roles: string[];
  userId: string;
}

interface YiucpResponse {
  answer: string;
  error?: string;
}

export function askYiucp(req: YiucpRequest): Promise<YiucpResponse> {
  return callEdgeFunction<YiucpResponse>('yiucp-chat', req as unknown as Record<string, unknown>);
}

export function getSuggestionChips(orgType: string, roles: string[]): string[] {
  if (roles.includes('warehouse_manager') && orgType !== 'platform') {
    return [
      '¿Qué pasó hoy en el almacén?',
      '¿Cuántas recepciones están pendientes?',
      '¿Qué ubicaciones tienen stock bajo?',
      '¿Cuál fue la última auditoría de stock?',
      '¿Cuántos productos hay en picking ahora?',
    ];
  }
  if (orgType === 'aggregator') {
    return [
      '¿Cuántas órdenes pendientes tengo?',
      '¿Cuál es mi inventario total?',
      '¿Qué asociados tienen más ventas este mes?',
      '¿Cuántos despachos están pendientes?',
      '¿Resumen de recepciones de hoy?',
    ];
  }
  // platform
  return [
    '¿Qué pasó hoy en todas las organizaciones?',
    '¿Cuál es el producto más vendido?',
    '¿Qué organizaciones tienen bajo stock?',
    '¿Cuántas órdenes se crearon esta semana?',
    '¿Resumen de recepciones del proveedor LAUT?',
    '¿Cuántos despachos están pendientes a los asociados?',
  ];
}
