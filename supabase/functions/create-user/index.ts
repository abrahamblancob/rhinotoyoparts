// Supabase Edge Function: create-user
// Creates a new user and sends invitation email.
// Uses service_role key (admin privileges) — never exposed to frontend.

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
    // Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }

    const { email, full_name, phone, org_id, role_id } = body

    if (!email || !full_name || !org_id || !role_id) {
      return jsonResponse({ error: `Faltan campos requeridos` }, 400)
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
      return jsonResponse({ error: `No autorizado - ${authError?.message || 'sesión inválida'}` }, 401)
    }

    // Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify permissions
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', callingUser.id)

    const roleIds = (callerRoles ?? []).map((r: { role_id: string }) => r.role_id)

    if (roleIds.length === 0) {
      // Fallback: allow platform org users (owner without explicit roles)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('org_id, organizations(type)')
        .eq('id', callingUser.id)
        .single()
      const orgType = (profile?.organizations as { type: string } | null)?.type
      if (orgType !== 'platform') {
        return jsonResponse({ error: 'No tienes roles asignados' }, 403)
      }
    } else {
      const { data: perms } = await supabaseAdmin
        .from('role_permissions')
        .select('permissions(module, action)')
        .in('role_id', roleIds)
      const ok = (perms ?? []).some(
        (rp: { permissions: { module: string; action: string } | null }) =>
          rp.permissions?.module === 'users' &&
          (rp.permissions?.action === 'write' || rp.permissions?.action === 'manage')
      )
      if (!ok) {
        return jsonResponse({ error: 'No tienes permisos para crear usuarios' }, 403)
      }
    }

    // Verify target role
    const { data: targetRole } = await supabaseAdmin
      .from('roles')
      .select('id, name, display_name')
      .eq('id', role_id as string)
      .single()
    if (!targetRole) {
      return jsonResponse({ error: 'El rol seleccionado no existe' }, 400)
    }

    // Step 1: Create auth user with a random temp password (NO user_metadata to avoid trigger issues)
    const tempPassword = crypto.randomUUID() + 'Aa1!'  // Meets password requirements
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email as string,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {}, // Empty to prevent trigger from failing
    })

    if (createError) {
      if (createError.message.includes('already')) {
        return jsonResponse({ error: 'Ya existe un usuario con este email' }, 409)
      }
      return jsonResponse({ error: `Error al crear usuario: ${createError.message}` }, 400)
    }

    const newUserId = newUserData.user.id

    // Step 2: Create profile manually (instead of relying on trigger)
    // is_active = false means "pending" — user hasn't set their password / logged in yet
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: newUserId,
      org_id: org_id as string,
      full_name: full_name as string,
      email: email as string,
      phone: (phone as string) || null,
      is_active: false,
    })

    if (profileError) {
      // Clean up: delete the auth user since profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return jsonResponse({ error: `Error al crear perfil: ${profileError.message}` }, 400)
    }

    // Step 3: Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role_id })

    if (roleError) {
      return jsonResponse({
        error: `Usuario creado, pero error al asignar rol: ${roleError.message}`,
        user_id: newUserId,
      }, 207)
    }

    // Step 4: Send password reset email so user can set their own password
    // resetPasswordForEmail() uses Supabase's built-in email system and actually sends the email
    const siteUrl = req.headers.get('origin') ?? Deno.env.get('SITE_URL') ?? supabaseUrl
    const redirectUrl = `${siteUrl}/hub/reset-password`

    // Use an anon client to call resetPasswordForEmail — this triggers Supabase's email sender
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const { error: emailError } = await anonClient.auth.resetPasswordForEmail(
      email as string,
      { redirectTo: redirectUrl }
    )

    const emailSent = !emailError
    const emailMsg = emailSent
      ? `Se envió un correo a ${email} para que establezca su contraseña.`
      : `No se pudo enviar el correo (${emailError?.message || 'SMTP no configurado'}). El usuario puede usar "Olvidé mi contraseña" en la página de login para acceder.`

    return jsonResponse({
      success: true,
      user_id: newUserId,
      role: targetRole.display_name,
      email_sent: emailSent,
      message: `Usuario creado exitosamente. ${emailMsg}`,
    }, 201)

  } catch (err) {
    return jsonResponse({ error: `Error interno: ${(err as Error).message}` }, 500)
  }
})
