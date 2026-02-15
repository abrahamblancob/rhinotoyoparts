import { useAuthStore } from '@/stores/authStore.ts';

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);
  const organization = useAuthStore((s) => s.organization);

  const hasPermission = (module: string, action: string): boolean => {
    // Platform owners have all permissions
    if (roles.includes('platform_owner')) return true;
    return permissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const canRead = (module: string) => hasPermission(module, 'read');
  const canWrite = (module: string) => hasPermission(module, 'write');
  const canDelete = (module: string) => hasPermission(module, 'delete');
  const canManage = (module: string) => hasPermission(module, 'manage');

  const isPlatform = organization?.type === 'platform';
  const isAggregator = organization?.type === 'aggregator';
  const isAssociate = organization?.type === 'associate';
  const isPlatformOwner = roles.includes('platform_owner');

  return {
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    canManage,
    isPlatform,
    isPlatformOwner,
    isAggregator,
    isAssociate,
    orgType: organization?.type,
  };
}
