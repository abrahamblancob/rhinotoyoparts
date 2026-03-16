import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import * as receivingService from '@/services/receivingService.ts';
import type { ReceivingOrder, ReceivingOrderItem } from '@/types/warehouse.ts';

export function useReceivingDetail() {
  const { receivingId } = useParams<{ receivingId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { canWrite } = usePermissions();
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveModal, setReceiveModal] = useState<ReceivingOrderItem | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrItemId, setQrItemId] = useState<string | null>(null);

  const hasWritePermission = canWrite('receiving');

  const orderFetcher = useCallback(
    () =>
      receivingId
        ? receivingService.getReceivingOrder(receivingId)
        : Promise.resolve({ data: null, error: null }),
    [receivingId],
  );

  const itemsFetcher = useCallback(
    () =>
      receivingId
        ? receivingService.getReceivingOrderItems(receivingId)
        : Promise.resolve({ data: null, error: null }),
    [receivingId],
  );

  const {
    data: order,
    loading: orderLoading,
    reload: reloadOrder,
  } = useAsyncData<ReceivingOrder>(orderFetcher, [receivingId]);

  const {
    data: items,
    loading: itemsLoading,
    reload: reloadItems,
  } = useAsyncData<ReceivingOrderItem[]>(itemsFetcher, [receivingId]);

  const loading = orderLoading || itemsLoading;
  const allItems = items ?? [];

  const handleCompleteReceiving = async () => {
    if (!receivingId || !user) return;
    setActionLoading(true);
    await receivingService.completeReceiving(receivingId, user.id);
    await reloadOrder();
    setActionLoading(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingId(itemId);
    const result = await receivingService.deleteReceivingItem(itemId);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!result.error) {
      reloadItems();
    }
  };

  const handlePrintProductQR = (item: ReceivingOrderItem) => {
    const sku = item.product?.sku ?? '—';
    const name = item.product?.name ?? 'Producto';
    const printWindow = window.open('', '_blank', 'width=400,height=550');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${sku}</title>
        <style>
          body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .sku { font-size: 24px; font-weight: 800; color: #1E293B; margin-bottom: 4px; letter-spacing: 1px; font-family: monospace; }
          .name { font-size: 13px; color: #64748B; margin-bottom: 14px; text-align: center; max-width: 280px; }
          .qr-container { padding: 20px; border: 2px solid #E2E8F0; border-radius: 12px; }
          .location { font-size: 12px; color: #94A3B8; margin-top: 10px; }
          @media print { body { margin: 0; } .qr-container { border: none; } }
        </style>
      </head>
      <body>
        <div class="sku">${sku}</div>
        <div class="name">${name}</div>
        <div class="qr-container" id="qr-target"></div>
        ${item.location?.code ? `<div class="location">Ubicacion: ${item.location.code}</div>` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    const size = 200;
    const svgEl = document.getElementById(`qr-product-${item.id}`)?.cloneNode(true) as SVGElement | null;
    if (svgEl) {
      svgEl.setAttribute('width', String(size));
      svgEl.setAttribute('height', String(size));
      printWindow.document.getElementById('qr-target')?.appendChild(svgEl);
    }
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return {
    // Data
    order,
    allItems,
    loading,
    actionLoading,

    // Modal state
    receiveModal,
    setReceiveModal,
    showAddProduct,
    setShowAddProduct,
    confirmDeleteId,
    setConfirmDeleteId,
    deletingId,
    qrItemId,
    setQrItemId,

    // Permissions
    hasWritePermission,

    // Handlers
    handleCompleteReceiving,
    handleDeleteItem,
    handlePrintProductQR,

    // Reload helpers
    reloadItems,
    reloadOrder,

    // Navigation
    navigate,
    receivingId,
  };
}
