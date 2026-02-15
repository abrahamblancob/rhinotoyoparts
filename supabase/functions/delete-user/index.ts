// Supabase Edge Function: delete-user
// Deletes a user from auth and their profile/roles.
// Only platform users with users:manage permission can delete.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }

    const { user_id } = body
    if (!user_id) {
      return jsonResponse({ error: 'Falta user_id' }, 400)
    }

    // Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Verify calling user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !callingUser) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    // Prevent self-deletion
    if (callingUser.id === user_id) {
      return jsonResponse({ error: 'No puedes eliminarte a ti mismo' }, 400)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify calling user has users:manage permission or is platform owner
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', callingUser.id)

    const roleIds = (callerRoles ?? []).map((r: { role_id: string }) => r.role_id)

    if (roleIds.length === 0) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('org_id, organizations(type)')
        .eq('id', callingUser.id)
        .single()
      const orgType = (profile?.organizations as { type: string } | null)?.type
      if (orgType !== 'platform') {
        return jsonResponse({ error: 'Sin permisos' }, 403)
      }
    } else {
      const { data: perms } = await supabaseAdmin
        .from('role_permissions')
        .select('permissions(module, action)')
        .in('role_id', roleIds)
      const ok = (perms ?? []).some(
        (rp: { permissions: { module: string; action: string } | null }) =>
          rp.permissions?.module === 'users' && rp.permissions?.action === 'manage'
      )
      if (!ok) {
        return jsonResponse({ error: 'Se requiere permiso users:manage para eliminar usuarios' }, 403)
      }
    }

    // Get target user info before deleting
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user_id as string)
      .single()

    if (!targetProfile) {
      return jsonResponse({ error: 'Usuario no encontrado' }, 404)
    }

    // Delete user roles
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id as string)

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id as string)

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id as string)

    if (deleteError) {
      return jsonResponse({
        error: `Error al eliminar usuario de auth: ${deleteError.message}`,
      }, 400)
    }

    return jsonResponse({
      success: true,
      message: `Usuario ${targetProfile.full_name} (${targetProfile.email}) eliminado exitosamente`,
    })

  } catch (err) {
    return jsonResponse({ error: `Error interno: ${(err as Error).message}` }, 500)
  }
})
