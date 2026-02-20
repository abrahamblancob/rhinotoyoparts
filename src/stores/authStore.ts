import { create } from 'zustand';
import { supabase } from '@/lib/supabase.ts';
import type { Organization, Profile } from '@/lib/database.types.ts';

interface UserPermission {
  module: string;
  action: string;
}

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  organization: Organization | null;
  roles: string[];
  permissions: UserPermission[];
  loading: boolean;
  initialized: boolean;

  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  loadPermissions: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  organization: null,
  roles: [],
  permissions: [],
  loading: false,
  initialized: false,

  login: async (email: string, password: string) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ loading: false });
      return { error: error.message };
    }
    if (data.user) {
      const u = { id: data.user.id, email: data.user.email ?? '' };
      set({ user: u });
      await get().loadPermissions(data.user.id);

      // Track last_login and activate user on first login
      supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString(), is_active: true })
        .eq('id', data.user.id)
        .then(undefined, (err: unknown) => console.error('Failed to update last_login:', err));
    }
    set({ loading: false });
    return { error: null };
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      organization: null,
      roles: [],
      permissions: [],
    });
  },

  loadSession: async () => {
    set({ loading: true });
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser();
    if (verifiedUser) {
      const u = { id: verifiedUser.id, email: verifiedUser.email ?? '' };
      set({ user: u });
      await get().loadPermissions(verifiedUser.id);

      // Update last_login and ensure user is active
      supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString(), is_active: true })
        .eq('id', verifiedUser.id)
        .then(undefined, (err: unknown) => console.error('Failed to update last_login:', err));
    }
    set({ loading: false, initialized: true });
  },

  loadPermissions: async (userId: string) => {
    // Load profile and user roles in parallel (independent queries)
    const [profileRes, userRolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role_id, roles(name)').eq('user_id', userId),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      set({ loading: false, initialized: true });
      return;
    }

    const userRolesList = (userRolesRes.data ?? []) as unknown as { role_id: string; roles: { name: string } | null }[];
    const roleNames = userRolesList.map((ur) => ur.roles?.name ?? '');
    const roleIds = userRolesList.map((ur) => ur.role_id);

    // Load organization and role permissions in parallel (both depend on previous results)
    const [orgRes, permsResult] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', profile.org_id).single(),
      roleIds.length > 0
        ? supabase.from('role_permissions').select('permissions(module, action)').in('role_id', roleIds)
        : Promise.resolve({ data: null }),
    ]);

    let perms: UserPermission[] = [];
    if (permsResult.data) {
      const rolePermsList = permsResult.data as unknown as { permissions: { module: string; action: string } | null }[];
      perms = rolePermsList.map((rp) => ({
        module: rp.permissions?.module ?? '',
        action: rp.permissions?.action ?? '',
      }));
    }

    set({
      profile: profile as Profile,
      organization: orgRes.data as Organization,
      roles: roleNames,
      permissions: perms,
    });
  },
}));
