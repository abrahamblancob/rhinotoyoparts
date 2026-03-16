import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { useAsyncData } from '@/hooks/useAsyncData.ts';
import { supabase } from '@/lib/supabase.ts';
import { parsePhotoUrls } from '@/utils/photos.ts';
import * as packingService from '@/services/packingService.ts';
import { logActivity } from '@/services/activityLogService.ts';
import type { PackSession, PackSessionItem } from '@/types/warehouse.ts';

export function usePackSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [actionLoading, setActionLoading] = useState(false);
  const [weight, setWeight] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionFetcher = useCallback(
    () =>
      sessionId
        ? packingService.getPackSession(sessionId)
        : Promise.resolve({ data: null, error: null }),
    [sessionId],
  );

  const itemsFetcher = useCallback(
    () =>
      sessionId
        ? packingService.getPackSessionItems(sessionId)
        : Promise.resolve({ data: null, error: null }),
    [sessionId],
  );

  const {
    data: session,
    loading: sessionLoading,
    reload: reloadSession,
  } = useAsyncData<PackSession>(sessionFetcher, [sessionId]);

  const {
    data: items,
    loading: itemsLoading,
    reload: reloadItems,
  } = useAsyncData<PackSessionItem[]>(itemsFetcher, [sessionId]);

  const loading = sessionLoading || itemsLoading;
  const allItems = items ?? [];
  const allVerified = allItems.length > 0 && allItems.every((i) => i.quantity_verified >= i.quantity_expected);
  const savedPhotos = session ? parsePhotoUrls(session.package_photo_url) : [];

  const handleVerifyItem = async (itemId: string, qtyExpected: number, productName?: string) => {
    setActionLoading(true);
    await packingService.verifyPackItem(itemId, qtyExpected);
    logActivity({ action: 'verify_item', entityType: 'pack_session', entityId: sessionId, description: `Verificó ${qtyExpected}x ${productName ?? 'producto'}` });
    await Promise.all([reloadItems(), reloadSession()]);
    setActionLoading(false);
  };

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setPhotoFiles((prev) => [...prev, ...Array.from(files)]);
    // Reset input so the same file can be added again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    setActionLoading(true);

    // Upload photos to Supabase Storage
    const photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      setUploadProgress('Subiendo fotos...');
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        setUploadProgress(`Subiendo foto ${i + 1} de ${photoFiles.length}...`);
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${sessionId}/${Date.now()}-${i}.${ext}`;
        const { data } = await supabase.storage.from('pack-photos').upload(path, file);
        if (data) {
          const { data: urlData } = supabase.storage.from('pack-photos').getPublicUrl(data.path);
          photoUrls.push(urlData.publicUrl);
        }
      }
      setUploadProgress('');
    }

    if (photoUrls.length > 0) {
      logActivity({ action: 'add_photo', entityType: 'pack_session', entityId: sessionId, description: 'Agregó foto de empaque' });
    }

    const weightKg = parseFloat(weight) || undefined;
    await packingService.completePackSession(sessionId, {
      package_weight_kg: weightKg,
      package_photo_url: photoUrls.length > 0 ? JSON.stringify(photoUrls) : undefined,
    });
    logActivity({ action: 'complete', entityType: 'pack_session', entityId: sessionId, description: 'Completó empaque' });
    await reloadSession();
    setActionLoading(false);
  };

  const handleAssignSelf = async () => {
    if (!sessionId || !user) return;
    setActionLoading(true);
    await packingService.assignPacker(sessionId, user.id);
    await reloadSession();
    setActionLoading(false);
  };

  return {
    session,
    allItems,
    loading,
    actionLoading,
    weight,
    setWeight,
    photoFiles,
    uploadProgress,
    lightboxUrl,
    setLightboxUrl,
    fileInputRef,
    allVerified,
    savedPhotos,
    handleVerifyItem,
    handleAddPhotos,
    handleRemovePhoto,
    handleComplete,
    handleAssignSelf,
    navigate,
  };
}
