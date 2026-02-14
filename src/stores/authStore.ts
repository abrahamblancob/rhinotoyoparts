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
        .then();
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
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const u = { id: session.user.id, email: session.user.email ?? '' };
      set({ user: u });
      await get().loadPermissions(session.user.id);

      // Update last_login and ensure user is active
      supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString(), is_active: true })
        .eq('id', session.user.id)
        .then();
    }
    set({ loading: false, initialized: true });
  },

  loadPermissions: async (userId: string) => {
    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) {
      set({ loading: false, initialized: true });
      return;
    }

    // Load organization
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single();

    // Load roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId);

    const roleNames = (userRoles ?? []).map(
      (ur: { role_id: string; roles: { name: string } | null }) =>
        ur.roles?.name ?? ''
    );

    // Load permissions via role_permissions
    const roleIds = (userRoles ?? []).map(
      (ur: { role_id: string }) => ur.role_id
    );
    let perms: UserPermission[] = [];

    if (roleIds.length > 0) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permissions(module, action)')
        .in('role_id', roleIds);

      perms = (rolePerms ?? []).map(
        (rp: { permissions: { module: string; action: string } | null }) => ({
          module: rp.permissions?.module ?? '',
          action: rp.permissions?.action ?? '',
        })
      );
    }

    set({
      profile: profile as Profile,
      organization: org as Organization,
      roles: roleNames,
      permissions: perms,
    });
  },
}));
