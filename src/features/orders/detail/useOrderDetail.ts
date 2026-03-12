import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { getPickListForOrder, getPickListItems } from '@/services/pickingService.ts';
import { getPackSessionForOrder } from '@/services/packingService.ts';
import type { Order, Customer } from '@/lib/database.types.ts';
import type { PickList, PickListItem, PackSession } from '@/types/warehouse.ts';
import type { OrderItemWithProduct, StatusHistoryWithUser, OrderQr, RealtimeStatus } from './types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */

const POST_PACK_STATUSES = ['packed', 'assigned', 'picked', 'preparing', 'ready_to_ship', 'shipped', 'in_transit', 'delivered'];

export function useOrderDetail(orderId: string | undefined) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [history, setHistory] = useState<StatusHistoryWithUser[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickList, setPickList] = useState<PickList | null>(null);
  const [pickListItems, setPickListItems] = useState<PickListItem[]>([]);
  const [packSession, setPackSession] = useState<PackSession | null>(null);
  const [dispatcherName, setDispatcherName] = useState('Despachador');
  const [orderQr, setOrderQr] = useState<OrderQr | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  // Resolved delivery coordinates
  const [resolvedDeliveryLat, setResolvedDeliveryLat] = useState<number | null>(null);
  const [resolvedDeliveryLng, setResolvedDeliveryLng] = useState<number | null>(null);
  const geocodeAttemptedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);

    const [orderRes, itemsRes, historyRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('order_items').select('*, products(name, sku, image_url)').eq('order_id', orderId),
      supabase.from('order_status_history').select('*, profiles(full_name)').eq('order_id', orderId).order('created_at', { ascending: true }),
    ]);

    const orderData = orderRes.data as Order | null;
    setOrder(orderData);
    setItems((itemsRes.data as OrderItemWithProduct[]) ?? []);
    setHistory((historyRes.data as StatusHistoryWithUser[]) ?? []);

    if (orderData?.customer_id) {
      const { data: c } = await supabase.from('customers').select('*').eq('id', orderData.customer_id).single();
      setCustomer(c as Customer | null);
    }

    if (orderData?.assigned_to) {
      const { data: dp } = await supabase.from('profiles').select('full_name').eq('id', orderData.assigned_to).single();
      if (dp) setDispatcherName((dp as { full_name: string }).full_name);
    }

    // Load or auto-generate order QR code (only after packing is done)
    if (orderData?.tracking_code && orderData?.org_id && POST_PACK_STATUSES.includes(orderData.status)) {
      const { data: qr } = await supabase
        .from('order_qr_codes')
        .select('qr_code, scanned_at, scanned_by, is_valid')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (qr) {
        setOrderQr(qr as OrderQr);
      } else {
        const qrCode = orderData.tracking_code.replace(/^TRACK-/, 'RHINO-QR-');
        const { data: newQr } = await supabase
          .from('order_qr_codes')
          .insert({
            order_id: orderId, org_id: orderData.org_id,
            qr_code: qrCode, generated_at: new Date().toISOString(),
            is_valid: true, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select('qr_code, scanned_at, scanned_by, is_valid')
          .single();
        if (newQr) setOrderQr(newQr as OrderQr);
      }
    }

    // Load associated pick list
    if (orderId) {
      getPickListForOrder(orderId).then(({ data }) => {
        const pl = (data as PickList) ?? null;
        setPickList(pl);
        if (pl?.status === 'completed') {
          getPickListItems(pl.id).then(({ data: plItems }) => {
            setPickListItems((plItems as PickListItem[]) ?? []);
          }).catch(() => setPickListItems([]));
        }
      }).catch(() => setPickList(null));

      // Load associated pack session
      getPackSessionForOrder(orderId).then(({ data }) => {
        setPackSession((data as PackSession) ?? null);
      }).catch(() => setPackSession(null));
    }

    setLoading(false);
  }, [orderId]);

  // Initial load
  useEffect(() => { loadOrder(); }, [loadOrder]);

  // Geocode delivery address
  useEffect(() => {
    if (!order) return;

    if (order.delivery_latitude && order.delivery_longitude) {
      setResolvedDeliveryLat(order.delivery_latitude);
      setResolvedDeliveryLng(order.delivery_longitude);
      return;
    }

    const addr = (order.shipping_address as Record<string, string> | null)?.address;
    if (!addr || geocodeAttemptedRef.current) return;
    geocodeAttemptedRef.current = true;

    const tryGeocode = () => {
      if (!window.google?.maps) { setTimeout(tryGeocode, 500); return; }
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: addr }, (results: any[], status: string) => {
        let lat: number | null = null;
        let lng: number | null = null;

        if (status === 'OK' && results?.[0]?.geometry?.location) {
          lat = results[0].geometry.location.lat();
          lng = results[0].geometry.location.lng();
        }

        if (!lat && window.google?.maps?.places) {
          const dummyDiv = document.createElement('div');
          const service = new window.google.maps.places.PlacesService(dummyDiv);
          service.textSearch({ query: addr }, (placeResults: any[], placeStatus: string) => {
            if (placeStatus === 'OK' && placeResults?.[0]?.geometry?.location) {
              const loc = placeResults[0].geometry.location;
              setResolvedDeliveryLat(loc.lat());
              setResolvedDeliveryLng(loc.lng());
              supabase.from('orders').update({ delivery_latitude: loc.lat(), delivery_longitude: loc.lng() }).eq('id', order.id).then(() => {});
            }
          });
          return;
        }

        if (lat && lng) {
          setResolvedDeliveryLat(lat);
          setResolvedDeliveryLng(lng);
          supabase.from('orders').update({ delivery_latitude: lat, delivery_longitude: lng }).eq('id', order.id).then(() => {});
        }
      });
    };
    tryGeocode();
  }, [order?.id, order?.delivery_latitude, order?.delivery_longitude, order?.shipping_address]);

  // Realtime subscription
  useEffect(() => {
    if (!orderId) return;
    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => { setOrder((prev) => prev ? { ...prev, ...(payload.new as Order) } : prev); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_status_history', filter: `order_id=eq.${orderId}` },
        () => {
          supabase.from('order_status_history').select('*, profiles(full_name)')
            .eq('order_id', orderId).order('created_at', { ascending: true })
            .then(({ data }) => { if (data) setHistory(data as StatusHistoryWithUser[]); });
        })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
      });

    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [orderId]);

  return {
    order, setOrder, items, history, customer, loading,
    pickList, pickListItems, packSession,
    dispatcherName, orderQr, realtimeStatus,
    resolvedDeliveryLat, resolvedDeliveryLng,
    loadOrder,
  };
}
