// Supabase Edge Function: yiucp-chat
// AI assistant that generates SQL from natural language, executes it, and formats results.
// Uses Gemini API. Never exposes raw SQL to untrusted clients.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const DB_SCHEMA = `
Tables available (PostgreSQL):

organizations(id uuid PK, name text, type text ['platform','aggregator','associate'], rif text, email text, phone text, status text, created_at timestamptz)
org_hierarchy(id uuid PK, parent_id uuid FK→organizations, child_id uuid FK→organizations) -- parent=aggregator, child=associate

orders(id uuid PK, org_id uuid FK→organizations, customer_id uuid FK→customers, order_number text, status text ['draft','pending','confirmed','picking','picked','packing','packed','assigned','shipped','in_transit','delivered','cancelled'], subtotal numeric, tax numeric, discount numeric, total numeric, source varchar, created_at timestamptz, updated_at timestamptz, shipped_at timestamptz, delivered_at timestamptz, cancelled_at timestamptz, warehouse_id uuid, stock_reserved boolean)

products(id uuid PK, org_id uuid FK→organizations, sku text, name text, brand text, oem_number text, price numeric, cost numeric, stock int, min_stock int, status text ['active','inactive','out_of_stock'], created_at timestamptz, updated_at timestamptz)

customers(id uuid PK, org_id uuid FK→organizations, name text, rif text, email text, phone text, city text, state text, created_at timestamptz)

pick_lists(id uuid PK, order_id uuid FK→orders, warehouse_id uuid, org_id uuid FK→organizations, assigned_to uuid, status varchar ['pending','assigned','in_progress','completed','expired','cancelled'], total_items int, picked_items int, started_at timestamptz, completed_at timestamptz, created_at timestamptz)

pack_sessions(id uuid PK, order_id uuid FK→orders, pick_list_id uuid FK→pick_lists, warehouse_id uuid, org_id uuid FK→organizations, packed_by uuid, status varchar ['pending','in_progress','verified','labelled','completed'], total_items int, verified_items int, package_weight_kg numeric, package_count int, started_at timestamptz, completed_at timestamptz, created_at timestamptz)

receiving_orders(id uuid PK, warehouse_id uuid, org_id uuid FK→organizations, supplier_name varchar, reference_number varchar, status varchar ['pending','in_progress','completed'], received_by uuid, created_at timestamptz, completed_at timestamptz)
receiving_order_items(id uuid PK, receiving_order_id uuid FK→receiving_orders, product_id uuid FK→products, expected_quantity int, received_quantity int, assigned_location_id uuid, lot_number varchar, status varchar)

inventory_stock(id uuid PK, product_id uuid FK→products, location_id uuid FK→warehouse_locations, warehouse_id uuid FK→warehouses, org_id uuid FK→organizations, quantity int, reserved_quantity int, lot_number varchar, source text, updated_at timestamptz)

warehouses(id uuid PK, org_id uuid FK→organizations, name varchar, code varchar, is_active boolean, created_at timestamptz)
warehouse_locations(id uuid PK, rack_id uuid, warehouse_id uuid FK→warehouses, code varchar, level int, position int, is_occupied boolean, is_active boolean)

stock_audits(id uuid PK, org_id uuid FK→organizations, warehouse_id uuid FK→warehouses, audited_by uuid, audit_type text, status text, location_count int, match_count int, discrepancy_count int, created_at timestamptz, completed_at timestamptz)
stock_audit_items(id uuid PK, audit_id uuid FK→stock_audits, location_id uuid, product_id uuid, product_name text, product_sku text, expected_quantity numeric, actual_quantity numeric, status text)

return_orders(id uuid PK, org_id uuid FK→organizations, warehouse_id uuid, order_id uuid FK→orders, order_number text, package_count int, status text, created_at timestamptz, completed_at timestamptz)
`

const WAREHOUSE_TABLES = [
  'warehouses', 'warehouse_locations', 'inventory_stock',
  'receiving_orders', 'receiving_order_items', 'stock_audits',
  'stock_audit_items', 'pick_lists', 'pack_sessions',
]

function buildSystemPrompt(orgType: string, roles: string[], allowedOrgIds: string[]): string {
  const isWarehouseManager = roles.includes('warehouse_manager') && orgType !== 'platform'
  const isPlatform = orgType === 'platform'

  let scopeRules: string
  if (isPlatform) {
    scopeRules = 'Tienes acceso a TODOS los datos. No necesitas filtrar por org_id a menos que el usuario pregunte por una organización específica.'
  } else if (isWarehouseManager) {
    scopeRules = `DEBES filtrar SIEMPRE con org_id = '${allowedOrgIds[0]}'. Solo puedes consultar tablas relacionadas con almacén: ${WAREHOUSE_TABLES.join(', ')}. NO consultes orders, customers, ni products directamente excepto como JOIN.`
  } else {
    scopeRules = `DEBES filtrar SIEMPRE con org_id IN (${allowedOrgIds.map(id => `'${id}'`).join(', ')}). Estos son los IDs de tu organización y sus asociados.`
  }

  return `Eres Yiucp, el asistente de inteligencia artificial de Rhino Toyo Parts, una plataforma de gestión de almacén y venta de repuestos automotrices Toyota en Venezuela.

Responde siempre en español. Genera UNA SOLA consulta SQL PostgreSQL SELECT para responder la pregunta del usuario.

${DB_SCHEMA}

REGLAS DE ACCESO:
${scopeRules}

REGLAS SQL:
- Solo genera SELECT. NUNCA uses INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE o GRANT.
- Siempre incluye LIMIT 100 al final.
- Usa JOINs cuando necesites nombres de organizaciones, productos, clientes, etc.
- Para fechas "hoy" usa CURRENT_DATE, para "esta semana" usa date_trunc('week', CURRENT_DATE).
- Los status de órdenes son: draft, pending, confirmed, picking, picked, packing, packed, assigned, shipped, in_transit, delivered, cancelled.
- Usa COUNT, SUM, AVG para resúmenes. Usa alias claros en español.

Responde SOLO con JSON válido:
{ "sql": "SELECT ...", "explanation": "Breve explicación de lo que hace la consulta" }`
}

function buildFormatPrompt(): string {
  return `Eres Yiucp, el asistente de inteligencia artificial de Rhino Toyo Parts.
Formatea los resultados de la consulta SQL como una respuesta clara y útil en español.
- Usa tablas markdown para datos tabulares.
- Incluye totales o resúmenes cuando aplique.
- Si el resultado está vacío, dilo de forma amigable.
- Sé conciso pero completo.
- Usa negritas para destacar valores importantes.
- NO incluyas el SQL en tu respuesta.
- NO uses emojis excesivos, máximo 1-2 relevantes al inicio.`
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text().catch(() => '{}')
    console.error('Gemini API error:', response.status, errText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts || []

  let textContent = ''
  for (const part of parts) {
    if (part.text && !part.thought) {
      textContent += part.text
    }
  }
  if (!textContent) {
    for (const part of parts) {
      if (part.text) textContent += part.text
    }
  }
  if (!textContent) throw new Error('Gemini returned no content')

  return textContent.trim()
}

function validateSQL(sql: string, isPlatform: boolean): string | null {
  const normalized = sql.trim().toLowerCase()

  if (!normalized.startsWith('select')) {
    return 'Solo se permiten consultas SELECT'
  }

  const forbidden = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'create', 'grant', 'revoke']
  for (const word of forbidden) {
    // Check as whole word to avoid false positives (e.g., "created_at" contains "create")
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    if (word !== 'create' && regex.test(sql)) {
      return `Operación no permitida: ${word.toUpperCase()}`
    }
    // For 'create', be more specific — only block if followed by table/function/index etc.
    if (word === 'create' && /\bcreate\s+(table|function|index|view|schema|role|database)\b/i.test(sql)) {
      return 'Operación no permitida: CREATE'
    }
  }

  if (sql.includes(';')) {
    return 'No se permiten múltiples sentencias'
  }

  if (!normalized.includes('limit')) {
    // Auto-add LIMIT if missing
    return null
  }

  return null
}

function extractJSON(text: string): { sql: string; explanation: string } {
  let jsonText = text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  if (!jsonText.startsWith('{')) {
    const first = jsonText.indexOf('{')
    const last = jsonText.lastIndexOf('}')
    if (first !== -1 && last > first) {
      jsonText = jsonText.substring(first, last + 1)
    }
  }
  jsonText = jsonText.replace(/,\s*([\]}])/g, '$1')
  return JSON.parse(jsonText)
}

// ---------- Main Handler ----------

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
    // Parse body
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON inválido' }, 400)
    }

    const { query, orgId, orgType, roles, userId } = body as {
      query: string
      orgId: string
      orgType: string
      roles: string[]
      userId: string
    }

    if (!query || !orgType || !userId) {
      return jsonResponse({ error: 'Faltan campos requeridos: query, orgType, userId' }, 400)
    }

    // Verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'No autorizado - sesión inválida' }, 401)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve org scope
    const isPlatform = orgType === 'platform'
    let allowedOrgIds: string[] = orgId ? [orgId] : []

    if (orgType === 'aggregator' && orgId) {
      const { data: children } = await supabaseAdmin
        .from('org_hierarchy')
        .select('child_id')
        .eq('parent_id', orgId)
      if (children) {
        allowedOrgIds = [orgId, ...children.map((c: { child_id: string }) => c.child_id)]
      }
    }

    // Build system prompt and call Gemini for SQL
    const systemPrompt = buildSystemPrompt(orgType, roles ?? [], allowedOrgIds)

    console.log('🤖 Yiucp query:', query)

    let sqlResponse: { sql: string; explanation: string }
    try {
      const geminiResult = await callGemini(systemPrompt, query)
      sqlResponse = extractJSON(geminiResult)
    } catch (e) {
      console.error('Gemini SQL generation error:', e)
      return jsonResponse({ answer: 'No pude procesar tu consulta. Intenta reformularla con más detalle.' })
    }

    console.log('📝 Generated SQL:', sqlResponse.sql)

    // Validate SQL
    const validationError = validateSQL(sqlResponse.sql, isPlatform)
    if (validationError) {
      console.error('SQL validation failed:', validationError)
      return jsonResponse({ answer: `No puedo ejecutar esa consulta: ${validationError}. Intenta con otra pregunta.` })
    }

    // Ensure LIMIT exists
    let finalSQL = sqlResponse.sql.trim()
    if (!/\blimit\b/i.test(finalSQL)) {
      finalSQL += ' LIMIT 100'
    }

    // Execute SQL
    let queryResults: unknown
    try {
      const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', { query_text: finalSQL })
      if (error) throw error
      queryResults = data
    } catch (sqlError) {
      console.error('SQL execution error:', sqlError)

      // Retry once: feed error back to Gemini
      try {
        const retryPrompt = `La consulta SQL anterior falló con este error: ${sqlError}.
La consulta era: ${finalSQL}
Genera una consulta SQL corregida. Responde SOLO con JSON: { "sql": "...", "explanation": "..." }`

        const retryResult = await callGemini(systemPrompt, retryPrompt)
        const retrySQL = extractJSON(retryResult)

        let retrySQLText = retrySQL.sql.trim()
        if (!/\blimit\b/i.test(retrySQLText)) retrySQLText += ' LIMIT 100'

        const retryValidation = validateSQL(retrySQLText, isPlatform)
        if (retryValidation) throw new Error(retryValidation)

        const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', { query_text: retrySQLText })
        if (error) throw error
        queryResults = data
        finalSQL = retrySQLText
        console.log('✅ Retry succeeded with SQL:', retrySQLText)
      } catch (retryError) {
        console.error('Retry also failed:', retryError)
        return jsonResponse({ answer: 'No pude obtener los datos solicitados. Intenta reformular tu pregunta de otra manera.' })
      }
    }

    // Format results with Gemini
    let formattedAnswer: string
    try {
      const formatPrompt = buildFormatPrompt()
      const resultsStr = JSON.stringify(queryResults)
      const formatMessage = `Pregunta del usuario: "${query}"\n\nResultados de la consulta (JSON):\n${resultsStr.substring(0, 8000)}`
      formattedAnswer = await callGemini(formatPrompt, formatMessage)
    } catch (e) {
      console.error('Gemini format error:', e)
      formattedAnswer = `Resultados obtenidos:\n\`\`\`json\n${JSON.stringify(queryResults, null, 2).substring(0, 2000)}\n\`\`\``
    }

    // Log conversation (fire and forget)
    supabaseAdmin.from('yiucp_conversations').insert({
      user_id: user.id,
      org_id: orgId || null,
      query,
      sql_generated: finalSQL,
      response: formattedAnswer.substring(0, 5000),
    }).then(() => {})

    console.log('✅ Yiucp response sent')

    return jsonResponse({ answer: formattedAnswer })

  } catch (error) {
    console.error('❌ Error in yiucp-chat:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return jsonResponse({ answer: `Ocurrió un error inesperado: ${message}. Intenta de nuevo.` })
  }
})
