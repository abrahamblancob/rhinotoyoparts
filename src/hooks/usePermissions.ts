import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore.ts';

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);
  const organization = useAuthStore((s) => s.organization);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    // Platform owners have all permissions
    if (roles.includes('platform_owner')) return true;
    return permissions.some(
      (p) => p.module === module && p.action === action
    );
  }, [roles, permissions]);

  const canRead = useCallback((module: string) => hasPermission(module, 'read'), [hasPermission]);
  const canWrite = useCallback((module: string) => hasPermission(module, 'write'), [hasPermission]);
  const canDelete = useCallback((module: string) => hasPermission(module, 'delete'), [hasPermission]);
  const canManage = useCallback((module: string) => hasPermission(module, 'manage'), [hasPermission]);

  const isPlatform = organization?.type === 'platform';
  const isAggregator = organization?.type === 'aggregator';
  const isAssociate = organization?.type === 'associate';
  const isPlatformOwner = roles.includes('platform_owner');
  const isDispatcher = roles.includes('associate_dispatcher');

  return useMemo(() => ({
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    canManage,
    isPlatform,
    isPlatformOwner,
    isAggregator,
    isAssociate,
    isDispatcher,
    roles,
    orgType: organization?.type,
  }), [hasPermission, canRead, canWrite, canDelete, canManage, isPlatform, isPlatformOwner, isAggregator, isAssociate, isDispatcher, roles, organization?.type]);
}
