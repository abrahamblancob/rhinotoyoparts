// Supabase Edge Function: send-audit-email
// Sends a stock audit report via email using Resend API.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = [
  'https://www.rhinotoyoparts.com',
  'https://rhinotoyoparts.com',
  'http://localhost:5173',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON invalido' }, 400)
    }

    const { audit_id, email } = body
    if (!audit_id || !email) {
      return jsonResponse({ error: 'Faltan audit_id y/o email' }, 400)
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

    // Use service role to fetch audit data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch the audit with items
    const { data: audit, error: auditError } = await supabaseAdmin
      .from('stock_audits')
      .select(
        '*, auditor:profiles!stock_audits_audited_by_profiles_fkey(full_name, email), warehouse:warehouses!stock_audits_warehouse_id_fkey(name, code)'
      )
      .eq('id', audit_id as string)
      .single()

    if (auditError || !audit) {
      console.error('Audit query error:', auditError?.message, auditError?.details, auditError?.hint)
      return jsonResponse({ error: `Auditoria no encontrada: ${auditError?.message ?? 'sin datos'}` }, 404)
    }

    const { data: items } = await supabaseAdmin
      .from('stock_audit_items')
      .select(
        '*, location:warehouse_locations!location_id(code, level, position), rack:warehouse_racks!rack_id(code, name)'
      )
      .eq('audit_id', audit_id as string)
      .order('created_at')

    const auditItems = items ?? []

    // Build audit date
    const auditDate = new Date(audit.created_at).toLocaleString('es-VE', {
      timeZone: 'America/Caracas',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const warehouseName = (audit.warehouse as { name: string; code: string })?.name ?? 'N/A'
    const warehouseCode = (audit.warehouse as { name: string; code: string })?.code ?? ''
    const auditorName = (audit.auditor as { full_name: string; email: string })?.full_name ?? 'N/A'

    // Status label mapping
    const statusLabels: Record<string, string> = {
      match: 'Coincide',
      discrepancy: 'Discrepancia',
      empty: 'Vacio',
      pending: 'Pendiente',
    }
    const statusColors: Record<string, string> = {
      match: '#10B981',
      discrepancy: '#EF4444',
      empty: '#94A3B8',
      pending: '#F59E0B',
    }

    const typeLabels: Record<string, string> = {
      manual: 'Manual',
      random_single: '1 Aleatorio',
      random_multiple: 'Multiples Aleatorios',
    }

    // Build HTML email
    const itemRows = auditItems
      .map((item: Record<string, unknown>) => {
        const loc = item.location as { code: string } | null
        const rack = item.rack as { code: string; name: string } | null
        const status = (item.status as string) ?? 'pending'
        const statusColor = statusColors[status] ?? '#64748B'
        const statusLabel = statusLabels[status] ?? status

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 8px 12px; font-family: monospace; font-weight: 600;">${loc?.code ?? '-'}</td>
            <td style="padding: 8px 12px; color: #64748B;">${rack?.code ?? '-'}</td>
            <td style="padding: 8px 12px;">${(item.product_name as string) ?? '<span style="color:#94A3B8;font-style:italic">Sin producto</span>'}</td>
            <td style="padding: 8px 12px; color: #64748B;">${(item.product_sku as string) ?? '-'}</td>
            <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${item.expected_quantity ?? 0}</td>
            <td style="padding: 8px 12px; text-align: center; font-weight: 700;">${item.actual_quantity ?? '-'}</td>
            <td style="padding: 8px 12px; text-align: center;">
              <span style="padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background-color: ${statusColor}15; color: ${statusColor};">
                ${statusLabel}
              </span>
            </td>
          </tr>`
      })
      .join('')

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; max-width: 700px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #D3010A 0%, #B91C1C 100%); color: #fff; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Reporte de Auditoria de Stock</h1>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">${warehouseName} (${warehouseCode}) — ${auditDate}</p>
      </div>

      <div style="border: 1px solid #E2E8F0; border-top: none; padding: 24px 32px; border-radius: 0 0 12px 12px;">
        <!-- Summary cards -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <div style="flex: 1; text-align: center; padding: 16px; background: #F0F9FF; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 800; color: #0EA5E9;">${audit.location_count}</div>
            <div style="font-size: 11px; color: #64748B;">Ubicaciones</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 16px; background: #ECFDF5; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 800; color: #10B981;">${audit.match_count}</div>
            <div style="font-size: 11px; color: #64748B;">Coincidencias</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 16px; background: ${(audit.discrepancy_count ?? 0) > 0 ? '#FEF2F2' : '#F8FAFC'}; border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 800; color: ${(audit.discrepancy_count ?? 0) > 0 ? '#EF4444' : '#94A3B8'};">${audit.discrepancy_count}</div>
            <div style="font-size: 11px; color: #64748B;">Discrepancias</div>
          </div>
        </div>

        <!-- Info -->
        <div style="margin-bottom: 24px; font-size: 13px; color: #475569; line-height: 1.8;">
          <strong>Auditor:</strong> ${auditorName}<br>
          <strong>Tipo:</strong> ${typeLabels[audit.audit_type] ?? audit.audit_type}<br>
          <strong>Estado:</strong> ${audit.status === 'completed' ? 'Completada' : 'En progreso'}
        </div>

        <!-- Items table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
              <th style="text-align: left; padding: 10px 12px; color: #64748B; font-size: 11px;">Ubicacion</th>
              <th style="text-align: left; padding: 10px 12px; color: #64748B; font-size: 11px;">Estante</th>
              <th style="text-align: left; padding: 10px 12px; color: #64748B; font-size: 11px;">Producto</th>
              <th style="text-align: left; padding: 10px 12px; color: #64748B; font-size: 11px;">SKU</th>
              <th style="text-align: center; padding: 10px 12px; color: #64748B; font-size: 11px;">Esperado</th>
              <th style="text-align: center; padding: 10px 12px; color: #64748B; font-size: 11px;">Real</th>
              <th style="text-align: center; padding: 10px 12px; color: #64748B; font-size: 11px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
        <p style="font-size: 11px; color: #94A3B8; text-align: center;">
          Generado por Rhino Hub — Auditoria de Stock<br>
          Este es un registro inmutable. No se puede editar una vez completado.
        </p>
      </div>
    </body>
    </html>`

    // Send via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured in Supabase secrets')
      return jsonResponse({ error: 'Servicio de email no configurado. Contacta al administrador.' }, 503)
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rhino Hub <noreply@rhinotoyoparts.com>',
        to: [email as string],
        subject: `Reporte de Auditoria — ${warehouseName} — ${auditDate}`,
        html: htmlBody,
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text()
      console.error('Resend API error:', resendRes.status, errBody)
      return jsonResponse({ error: `Error al enviar email: ${errBody}` }, 500)
    }

    const resendData = await resendRes.json()
    console.log('Email sent successfully via Resend:', resendData.id)

    // Update audit with email_sent_to
    await supabaseAdmin
      .from('stock_audits')
      .update({ email_sent_to: email as string })
      .eq('id', audit_id as string)

    return jsonResponse({
      success: true,
      message: `Reporte enviado a ${email}`,
    })

  } catch (err) {
    console.error('send-audit-email error:', err)
    return jsonResponse({ error: `Error interno: ${(err as Error).message}` }, 500)
  }
})
