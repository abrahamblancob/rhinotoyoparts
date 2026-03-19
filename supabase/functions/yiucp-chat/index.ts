// Supabase Edge Function: yiucp-chat
// AI assistant using Gemini Function Calling for safe, structured data queries.
// No raw SQL generation — all queries go through predefined safe functions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ──────────────────────────────────────────────
// Tool definitions for Gemini Function Calling
// ──────────────────────────────────────────────

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'buscar_organizacion',
        description: 'Busca organizaciones por nombre. Retorna id, nombre, tipo (platform/aggregator/associate), y sus asociados si es un agregador.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nombre: { type: 'STRING', description: 'Nombre parcial o completo de la organización a buscar' },
          },
          required: ['nombre'],
        },
      },
      {
        name: 'obtener_ordenes',
        description: 'Obtiene órdenes de compra con filtros opcionales. Incluye número de orden, status, total, cliente y organización.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización (usar buscar_organizacion primero para obtenerlo)' },
            status: { type: 'STRING', description: 'Filtrar por status: draft, pending, confirmed, picking, picked, packing, packed, assigned, shipped, in_transit, delivered, cancelled' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio en formato YYYY-MM-DD. Si no se especifica, usa últimos 7 días' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin en formato YYYY-MM-DD. Si no se especifica, usa hoy' },
          },
        },
      },
      {
        name: 'obtener_recepciones',
        description: 'Obtiene órdenes de recepción de mercancía en almacén. Incluye proveedor, referencia, status y cantidad de items.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            status: { type: 'STRING', description: 'Filtrar por status: pending, in_progress, completed' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'obtener_picking',
        description: 'Obtiene listas de picking (preparación de pedidos). Incluye orden asociada, status, items totales y pickeados.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            status: { type: 'STRING', description: 'Filtrar por status: pending, assigned, in_progress, completed, expired, cancelled' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'obtener_packing',
        description: 'Obtiene sesiones de packing (empaque). Incluye orden asociada, status, items verificados, peso y paquetes.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            status: { type: 'STRING', description: 'Filtrar por status: pending, in_progress, verified, labelled, completed' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'obtener_stock',
        description: 'Obtiene el inventario/stock actual por ubicación. Incluye producto, ubicación, cantidad, cantidad reservada.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            producto: { type: 'STRING', description: 'Nombre parcial del producto para filtrar' },
            solo_bajo_stock: { type: 'BOOLEAN', description: 'Si es true, solo muestra productos con stock menor al mínimo' },
          },
        },
      },
      {
        name: 'obtener_auditorias',
        description: 'Obtiene auditorías de stock realizadas. Incluye tipo, status, ubicaciones auditadas, coincidencias y discrepancias.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'obtener_devoluciones',
        description: 'Obtiene devoluciones de órdenes. Incluye orden original, cantidad de paquetes, status.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            status: { type: 'STRING', description: 'Filtrar por status' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD' },
          },
        },
      },
      {
        name: 'obtener_productos',
        description: 'Obtiene productos del inventario. Incluye SKU, nombre, marca, precio, costo, stock actual, stock mínimo y status.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            nombre: { type: 'STRING', description: 'Nombre parcial del producto' },
            status: { type: 'STRING', description: 'Filtrar por status: active, inactive, out_of_stock' },
          },
        },
      },
      {
        name: 'obtener_clientes',
        description: 'Obtiene clientes de una organización. Incluye nombre, RIF, email, teléfono, ciudad, estado.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización' },
            nombre: { type: 'STRING', description: 'Nombre parcial del cliente' },
          },
        },
      },
      {
        name: 'resumen_actividad',
        description: 'Genera un resumen completo de actividad de una organización y sus asociados en un período. Incluye conteos de órdenes, recepciones, picking, packing, auditorías y devoluciones por status.',
        parameters: {
          type: 'OBJECT',
          properties: {
            org_id: { type: 'STRING', description: 'ID de la organización (usar buscar_organizacion primero)' },
            incluir_asociados: { type: 'BOOLEAN', description: 'Si es true, incluye datos de organizaciones asociadas (hijos en la jerarquía)' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD' },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'buscar_usuario',
        description: 'Busca usuarios/empleados por nombre dentro de las organizaciones permitidas. Retorna id, nombre completo, email, estado activo, último login y organización.',
        parameters: {
          type: 'OBJECT',
          properties: {
            nombre: { type: 'STRING', description: 'Nombre parcial o completo del usuario a buscar' },
          },
          required: ['nombre'],
        },
      },
      {
        name: 'obtener_actividad_usuario',
        description: 'Obtiene el historial de actividad (audit log) de un usuario específico. Incluye acción realizada, tipo de entidad, descripción y fecha. Usar buscar_usuario primero para obtener el user_id.',
        parameters: {
          type: 'OBJECT',
          properties: {
            user_id: { type: 'STRING', description: 'ID del usuario (UUID, obtener con buscar_usuario primero)' },
            fecha_desde: { type: 'STRING', description: 'Fecha inicio YYYY-MM-DD. Si no se especifica, usa hoy' },
            fecha_hasta: { type: 'STRING', description: 'Fecha fin YYYY-MM-DD. Si no se especifica, usa hoy' },
            accion: { type: 'STRING', description: 'Filtrar por tipo de acción: login, logout, create, update, delete, status_change, assign, cancel, complete, pick_item, verify_item, receive_item, upload' },
            tipo_entidad: { type: 'STRING', description: 'Filtrar por tipo de entidad: session, order, product, bulk_upload, customer, warehouse, picking, packing, receiving, returns, audits' },
          },
          required: ['user_id'],
        },
      },
    ],
  },
]

// ──────────────────────────────────────────────
// Function implementations (safe Supabase queries)
// ──────────────────────────────────────────────

type SupabaseAdmin = ReturnType<typeof createClient>

async function buscar_organizacion(db: SupabaseAdmin, args: { nombre: string }) {
  const { data: orgs } = await db
    .from('organizations')
    .select('id, name, type, rif, status')
    .ilike('name', `%${args.nombre}%`)
    .limit(10)

  if (!orgs?.length) return { resultado: 'No se encontraron organizaciones con ese nombre.' }

  // For each aggregator, also fetch its associates
  const results = []
  for (const org of orgs) {
    const entry: Record<string, unknown> = { ...org }
    if (org.type === 'aggregator') {
      const { data: children } = await db
        .from('org_hierarchy')
        .select('child:child_id(id, name, type, status)')
        .eq('parent_id', org.id)
      entry.asociados = children?.map((c: { child: unknown }) => c.child) ?? []
    }
    results.push(entry)
  }

  return { organizaciones: results }
}

async function obtener_ordenes(db: SupabaseAdmin, args: { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('orders')
    .select('order_number, status, total, source, created_at, customer:customers(name), org:organizations(name)')
    .in('org_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (args.status) q = q.eq('status', args.status)
  if (args.fecha_desde) q = q.gte('created_at', args.fecha_desde)
  else q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  if (args.fecha_hasta) q = q.lte('created_at', args.fecha_hasta + 'T23:59:59')

  const { data, error } = await q
  if (error) return { error: error.message }
  return { ordenes: data ?? [], total: data?.length ?? 0 }
}

async function obtener_recepciones(db: SupabaseAdmin, args: { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('receiving_orders')
    .select('id, supplier_name, reference_number, status, created_at, completed_at, org:organizations(name)')
    .in('org_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (args.status) q = q.eq('status', args.status)
  if (args.fecha_desde) q = q.gte('created_at', args.fecha_desde)
  else q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  if (args.fecha_hasta) q = q.lte('created_at', args.fecha_hasta + 'T23:59:59')

  const { data, error } = await q
  if (error) return { error: error.message }

  // Fetch item counts for each receiving order
  if (data?.length) {
    for (const ro of data) {
      const { data: items } = await db
        .from('receiving_order_items')
        .select('expected_quantity, received_quantity, status')
        .eq('receiving_order_id', ro.id)
      ;(ro as Record<string, unknown>).items_count = items?.length ?? 0
      ;(ro as Record<string, unknown>).total_expected = items?.reduce((s: number, i: { expected_quantity: number }) => s + (i.expected_quantity ?? 0), 0) ?? 0
      ;(ro as Record<string, unknown>).total_received = items?.reduce((s: number, i: { received_quantity: number }) => s + (i.received_quantity ?? 0), 0) ?? 0
    }
  }

  return { recepciones: data ?? [], total: data?.length ?? 0 }
}

async function obtener_picking(db: SupabaseAdmin, args: { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('pick_lists')
    .select('id, status, total_items, picked_items, started_at, completed_at, created_at, order:orders(order_number), org:organizations(name)')
    .in('org_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (args.status) q = q.eq('status', args.status)
  if (args.fecha_desde) q = q.gte('created_at', args.fecha_desde)
  else q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  if (args.fecha_hasta) q = q.lte('created_at', args.fecha_hasta + 'T23:59:59')

  const { data, error } = await q
  if (error) return { error: error.message }
  return { pick_lists: data ?? [], total: data?.length ?? 0 }
}

async function obtener_packing(db: SupabaseAdmin, args: { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('pack_sessions')
    .select('id, status, total_items, verified_items, package_weight_kg, package_count, started_at, completed_at, created_at, order:orders(order_number), org:organizations(name)')
    .in('org_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (args.status) q = q.eq('status', args.status)
  if (args.fecha_desde) q = q.gte('created_at', args.fecha_desde)
  else q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  if (args.fecha_hasta) q = q.lte('created_at', args.fecha_hasta + 'T23:59:59')

  const { data, error } = await q
  if (error) return { error: error.message }
  return { pack_sessions: data ?? [], total: data?.length ?? 0 }
}

async function obtener_stock(db: SupabaseAdmin, args: { org_id?: string; producto?: string; solo_bajo_stock?: boolean }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('inventory_stock')
    .select('quantity, reserved_quantity, lot_number, product:products(name, sku, stock, min_stock), location:warehouse_locations(code), org:organizations(name)')
    .in('org_id', ids)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(100)

  const { data, error } = await q
  if (error) return { error: error.message }

  let results = data ?? []

  if (args.producto) {
    const search = args.producto.toLowerCase()
    results = results.filter((r: { product: { name: string } | null }) =>
      r.product?.name?.toLowerCase().includes(search)
    )
  }

  if (args.solo_bajo_stock) {
    results = results.filter((r: { product: { stock: number; min_stock: number } | null }) =>
      r.product && r.product.stock <= r.product.min_stock
    )
  }

  return { stock: results, total_items: results.length }
}

async function obtener_auditorias(db: SupabaseAdmin, args: { org_id?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('stock_audits')
    .select('id, audit_type, status, location_count, match_count, discrepancy_count, created_at, completed_at, org:organizations(name)')
    .in('org_id', ids)
    .order('created_at', { ascending: false })
    .limit(20)

  if (args.fecha_desde) q = q.gte('created_at', args.fecha_desde)
  if (args.fecha_hasta) q = q.lte('created_at', args.fecha_hasta + 'T23:59:59')

  const { data, error } = await q
  if (error) return { error: error.message }
  return { auditorias: data ?? [], total: data?.length ?? 0 }
}

async function obtener_devoluciones(db: SupabaseAdmin, args: { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('return_orders')
    .select('id, order_number, package_count, status, created_at, completed_at, org:organizations(name)')
    .in('org_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)

  if (args.status) q = q.eq('status', args.status)
  if (args.fecha_desde) q = q.gte('created_at', args.fecha_desde)
  else q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
  if (args.fecha_hasta) q = q.lte('created_at', args.fecha_hasta + 'T23:59:59')

  const { data, error } = await q
  if (error) return { error: error.message }
  return { devoluciones: data ?? [], total: data?.length ?? 0 }
}

async function obtener_productos(db: SupabaseAdmin, args: { org_id?: string; nombre?: string; status?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('products')
    .select('sku, name, brand, oem_number, price, cost, stock, min_stock, status, org:organizations(name)')
    .in('org_id', ids)
    .order('name')
    .limit(50)

  if (args.nombre) q = q.ilike('name', `%${args.nombre}%`)
  if (args.status) q = q.eq('status', args.status)

  const { data, error } = await q
  if (error) return { error: error.message }
  return { productos: data ?? [], total: data?.length ?? 0 }
}

async function obtener_clientes(db: SupabaseAdmin, args: { org_id?: string; nombre?: string }, scopeIds: string[]) {
  const ids = args.org_id ? [args.org_id] : scopeIds
  let q = db
    .from('customers')
    .select('name, rif, email, phone, city, state, org:organizations(name)')
    .in('org_id', ids)
    .order('name')
    .limit(50)

  if (args.nombre) q = q.ilike('name', `%${args.nombre}%`)

  const { data, error } = await q
  if (error) return { error: error.message }
  return { clientes: data ?? [], total: data?.length ?? 0 }
}

async function resumen_actividad(db: SupabaseAdmin, args: { org_id: string; incluir_asociados?: boolean; fecha_desde?: string; fecha_hasta?: string }) {
  // Resolve scope
  const orgIds = [args.org_id]
  if (args.incluir_asociados) {
    const { data: children } = await db
      .from('org_hierarchy')
      .select('child_id')
      .eq('parent_id', args.org_id)
    if (children) {
      orgIds.push(...children.map((c: { child_id: string }) => c.child_id))
    }
  }

  const desde = args.fecha_desde ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const hasta = (args.fecha_hasta ?? new Date().toISOString().split('T')[0]) + 'T23:59:59'

  // Get org names
  const { data: orgNames } = await db
    .from('organizations')
    .select('id, name, type')
    .in('id', orgIds)

  // Parallel queries for all modules
  const [orders, receiving, picking, packing, audits, returns] = await Promise.all([
    db.from('orders').select('status, org_id, total, created_at').in('org_id', orgIds).gte('created_at', desde).lte('created_at', hasta),
    db.from('receiving_orders').select('status, org_id, created_at').in('org_id', orgIds).gte('created_at', desde).lte('created_at', hasta),
    db.from('pick_lists').select('status, org_id, total_items, picked_items, created_at').in('org_id', orgIds).gte('created_at', desde).lte('created_at', hasta),
    db.from('pack_sessions').select('status, org_id, total_items, verified_items, created_at').in('org_id', orgIds).gte('created_at', desde).lte('created_at', hasta),
    db.from('stock_audits').select('status, org_id, location_count, match_count, discrepancy_count, created_at').in('org_id', orgIds).gte('created_at', desde).lte('created_at', hasta),
    db.from('return_orders').select('status, org_id, created_at').in('org_id', orgIds).gte('created_at', desde).lte('created_at', hasta),
  ])

  // Build summary by status
  const countByStatus = (data: { status: string }[] | null) => {
    const counts: Record<string, number> = {}
    for (const item of data ?? []) {
      counts[item.status] = (counts[item.status] ?? 0) + 1
    }
    return counts
  }

  const resumen = {
    _instruccion: 'ESTOS SON LOS DATOS EXACTOS DE LA BASE DE DATOS. Reporta SOLO estos números, NO inventes ni modifiques ningún valor.',
    periodo: { desde, hasta: args.fecha_hasta ?? new Date().toISOString().split('T')[0] },
    organizaciones: orgNames ?? [],
    ordenes: { total: orders.data?.length ?? 0, por_status: countByStatus(orders.data), monto_total: orders.data?.reduce((s, o) => s + (Number(o.total) || 0), 0) ?? 0 },
    recepciones: { total: receiving.data?.length ?? 0, por_status: countByStatus(receiving.data) },
    picking: { total: picking.data?.length ?? 0, por_status: countByStatus(picking.data) },
    packing: { total: packing.data?.length ?? 0, por_status: countByStatus(packing.data) },
    auditorias: { total: audits.data?.length ?? 0, por_status: countByStatus(audits.data) },
    devoluciones: { total: returns.data?.length ?? 0, por_status: countByStatus(returns.data) },
  }

  console.log('📊 resumen_actividad result:', JSON.stringify(resumen))
  return resumen
}

// Strip diacritics/accents so "Ramón" matches "Ramon" in DB
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function buscar_usuario(
  db: SupabaseAdmin,
  args: { nombre: string },
  scopeIds: string[],
  isPlatform = false,
) {
  const searchName = stripAccents(args.nombre)
  let q = db
    .from('profiles')
    .select('id, full_name, email, is_active, last_login, org:organizations(name)')
    .ilike('full_name', `%${searchName}%`)
    .order('full_name')
    .limit(20)

  // Platform users can see all users; others are scoped to their orgs
  if (!isPlatform) {
    q = q.in('org_id', scopeIds)
  }

  const { data, error } = await q
  if (error) return { error: error.message }
  if (!data?.length) return { resultado: 'No se encontraron usuarios con ese nombre.' }
  return { usuarios: data, total: data.length }
}

async function obtener_actividad_usuario(
  db: SupabaseAdmin,
  args: { user_id: string; fecha_desde?: string; fecha_hasta?: string; accion?: string; tipo_entidad?: string },
  scopeIds: string[],
  isPlatform = false,
) {
  // Verify the user exists (and belongs to allowed org for non-platform)
  let profileQuery = db
    .from('profiles')
    .select('id, full_name, org_id')
    .eq('id', args.user_id)

  if (!isPlatform) {
    profileQuery = profileQuery.in('org_id', scopeIds)
  }

  const { data: userProfile, error: profileError } = await profileQuery.single()

  if (profileError || !userProfile) {
    return { error: 'Usuario no encontrado o no tienes acceso a su organización.' }
  }

  // Default date range: today
  const desde = args.fecha_desde ?? new Date().toISOString().split('T')[0]
  const hasta = (args.fecha_hasta ?? new Date().toISOString().split('T')[0]) + 'T23:59:59'

  let q = db
    .from('audit_logs')
    .select('action, entity_type, entity_id, description, metadata, created_at')
    .eq('user_id', args.user_id)
    .gte('created_at', desde)
    .lte('created_at', hasta)
    .order('created_at', { ascending: false })
    .limit(100)

  if (args.accion) q = q.eq('action', args.accion)
  if (args.tipo_entidad) q = q.eq('entity_type', args.tipo_entidad)

  const { data, error } = await q
  if (error) return { error: error.message }

  const logs = data ?? []

  // Group by module (entity_type) with action counts and descriptions
  const ACTION_LABELS: Record<string, string> = {
    login: 'Inicio de sesión', logout: 'Cierre de sesión',
    create: 'Creó', update: 'Actualizó', delete: 'Eliminó',
    status_change: 'Cambió estado', assign: 'Asignó',
    cancel: 'Canceló', complete: 'Completó', claim: 'Reclamó',
    start: 'Inició', pick_item: 'Pickeó ítem', verify_item: 'Verificó ítem',
    add_photo: 'Agregó foto', receive_item: 'Recibió ítem',
    upload: 'Cargó archivo', send_email: 'Envió email',
    assign_stock: 'Asignó stock', remove_stock: 'Removió stock',
  }
  const MODULE_LABELS: Record<string, string> = {
    session: 'Sesión', user: 'Usuarios', order: 'Pedidos',
    product: 'Inventario', bulk_upload: 'Cargas masivas',
    organization: 'Organizaciones', customer: 'Clientes',
    warehouse: 'Almacenes', location: 'Ubicaciones',
    pick_list: 'Picking', pack_session: 'Packing',
    receiving_order: 'Recepción', return: 'Devoluciones',
    stock_audit: 'Auditoría', supplier: 'Proveedores',
  }

  // Build grouped summary by module
  const porModulo: Record<string, { total: number; acciones: Record<string, number>; descripciones: string[] }> = {}
  for (const log of logs) {
    const modLabel = MODULE_LABELS[log.entity_type] ?? log.entity_type
    if (!porModulo[modLabel]) {
      porModulo[modLabel] = { total: 0, acciones: {}, descripciones: [] }
    }
    porModulo[modLabel].total++
    const actionLabel = ACTION_LABELS[log.action] ?? log.action
    porModulo[modLabel].acciones[actionLabel] = (porModulo[modLabel].acciones[actionLabel] ?? 0) + 1
    // Keep up to 5 descriptions per module for context
    if (log.description && porModulo[modLabel].descripciones.length < 5) {
      porModulo[modLabel].descripciones.push(log.description)
    }
  }

  // First and last activity timestamps converted to GMT-4 (Venezuela)
  const toGMT4 = (iso: string) => {
    const d = new Date(iso)
    d.setHours(d.getHours() - 4)
    return d.toISOString().replace('T', ' ').slice(0, 19) + ' (GMT-4)'
  }
  const primeraActividad = logs.length ? toGMT4(logs[logs.length - 1].created_at) : null
  const ultimaActividad = logs.length ? toGMT4(logs[0].created_at) : null

  return {
    _instruccion: 'ESTOS SON LOS DATOS EXACTOS. Presenta un RESUMEN organizado por módulo, NO listes cada actividad individual. Usa los datos de porModulo para mostrar qué hizo el usuario en cada área.',
    usuario: userProfile.full_name,
    periodo: { desde, hasta: args.fecha_hasta ?? new Date().toISOString().split('T')[0] },
    total_actividades: logs.length,
    primera_actividad: primeraActividad,
    ultima_actividad: ultimaActividad,
    por_modulo: porModulo,
  }
}

// ──────────────────────────────────────────────
// Gemini API with Function Calling
// ──────────────────────────────────────────────

interface GeminiMessage {
  role: 'user' | 'model' | 'function'
  parts: GeminiPart[]
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { result: unknown } } }

async function callGeminiWithTools(
  systemPrompt: string,
  messages: GeminiMessage[],
): Promise<{ parts: GeminiPart[]; text: string }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages,
        tools: TOOLS,
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
        },
      }),
    },
  )

  if (!response.ok) {
    const errText = await response.text().catch(() => '{}')
    console.error('Gemini API error:', response.status, errText)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts ?? []

  // Extract text (skip thoughts)
  let text = ''
  for (const part of parts) {
    if ('text' in part) text += part.text
  }

  return { parts, text: text.trim() }
}

function buildSystemPrompt(orgType: string, allowedOrgIds: string[]): string {
  const isPlatform = orgType === 'platform'

  let scopeInfo: string
  if (isPlatform) {
    scopeInfo = 'El usuario es un administrador de plataforma con acceso a TODAS las organizaciones.'
  } else if (orgType === 'aggregator') {
    scopeInfo = `El usuario es un administrador de agregador. Sus org_ids permitidos son: ${allowedOrgIds.join(', ')}.`
  } else {
    scopeInfo = `El usuario es un gerente de almacén. Su org_id es: ${allowedOrgIds[0]}.`
  }

  return `Eres Yiucp, el asistente de inteligencia artificial de Rhino Toyo Parts, una plataforma de gestión de almacén y venta de repuestos automotrices Toyota en Venezuela.

Responde siempre en español. Eres amigable, conciso y profesional.

${scopeInfo}

INSTRUCCIONES:
- Usa las funciones disponibles para consultar datos. SIEMPRE llama funciones antes de responder preguntas sobre datos.
- Si el usuario pregunta por una organización por nombre, PRIMERO usa buscar_organizacion para obtener su ID, y luego usa ese ID en las demás funciones.
- Si el usuario pregunta por la actividad de una persona específica (ej: "¿qué hizo Ramón hoy?"), PRIMERO usa buscar_usuario para encontrar al usuario por nombre, y luego usa obtener_actividad_usuario con su ID para ver su actividad.
- Cuando presentes actividad de usuario, muestra un RESUMEN organizado por módulo (ej: "Pedidos: 5 acciones - creó 3, actualizó 2"), NO listes cada actividad individual en una tabla larga. Incluye horario de primera y última actividad.
- Para preguntas amplias como "qué pasó hoy" o "resumen de actividad", usa la función resumen_actividad.
- Presenta los resultados de forma clara con tablas markdown cuando haya datos tabulares.
- Usa negritas para destacar valores importantes.

REGLA CRÍTICA ANTI-ALUCINACIÓN:
- NUNCA inventes, modifiques, redondees o extrapoles datos. Solo reporta EXACTAMENTE los números y valores que las funciones retornan.
- Cada función retorna un campo "total" con el conteo exacto. USA ese número, no cuentes manualmente.
- Si una función retorna total: 0 o una lista vacía, di que no hay datos. NUNCA inventes registros que no existen.
- Si una función retorna un error, reporta el error. NO intentes adivinar los datos.
- NO agregues datos que no estén explícitamente en la respuesta de la función.
- Si el usuario pregunta algo que no puedes verificar con las funciones disponibles, di que no tienes esa información.

- Si no hay datos, dilo de forma amigable.
- NO uses emojis excesivos, máximo 1-2 relevantes.
- La fecha de hoy es ${new Date().toISOString().split('T')[0]}.`
}

// ──────────────────────────────────────────────
// Function dispatcher
// ──────────────────────────────────────────────

async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  db: SupabaseAdmin,
  scopeIds: string[],
  isPlatform = false,
): Promise<unknown> {
  console.log(`🔧 Executing function: ${name}`, JSON.stringify(args))

  switch (name) {
    case 'buscar_organizacion':
      return buscar_organizacion(db, args as { nombre: string })
    case 'obtener_ordenes':
      return obtener_ordenes(db, args as { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds)
    case 'obtener_recepciones':
      return obtener_recepciones(db, args as { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds)
    case 'obtener_picking':
      return obtener_picking(db, args as { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds)
    case 'obtener_packing':
      return obtener_packing(db, args as { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds)
    case 'obtener_stock':
      return obtener_stock(db, args as { org_id?: string; producto?: string; solo_bajo_stock?: boolean }, scopeIds)
    case 'obtener_auditorias':
      return obtener_auditorias(db, args as { org_id?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds)
    case 'obtener_devoluciones':
      return obtener_devoluciones(db, args as { org_id?: string; status?: string; fecha_desde?: string; fecha_hasta?: string }, scopeIds)
    case 'obtener_productos':
      return obtener_productos(db, args as { org_id?: string; nombre?: string; status?: string }, scopeIds)
    case 'obtener_clientes':
      return obtener_clientes(db, args as { org_id?: string; nombre?: string }, scopeIds)
    case 'resumen_actividad':
      return resumen_actividad(db, args as { org_id: string; incluir_asociados?: boolean; fecha_desde?: string; fecha_hasta?: string })
    case 'buscar_usuario':
      return buscar_usuario(db, args as { nombre: string }, scopeIds, isPlatform)
    case 'obtener_actividad_usuario':
      return obtener_actividad_usuario(db, args as { user_id: string; fecha_desde?: string; fecha_hasta?: string; accion?: string; tipo_entidad?: string }, scopeIds, isPlatform)
    default:
      return { error: `Función desconocida: ${name}` }
  }
}

// ──────────────────────────────────────────────
// Main Handler
// ──────────────────────────────────────────────

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

    // Build system prompt
    const systemPrompt = buildSystemPrompt(orgType, allowedOrgIds)

    console.log('🤖 Yiucp query:', query)

    // Conversation loop with function calling
    const messages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: query }] },
    ]

    let finalAnswer = ''
    const MAX_TURNS = 6 // Prevent infinite loops

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await callGeminiWithTools(systemPrompt, messages)

      // Check for function calls
      const functionCalls = response.parts.filter(
        (p): p is { functionCall: { name: string; args: Record<string, unknown> } } => 'functionCall' in p,
      )

      if (functionCalls.length === 0) {
        // No more function calls — Gemini has the final answer
        finalAnswer = response.text
        break
      }

      // Add model's response (with function calls) to conversation
      messages.push({ role: 'model', parts: response.parts })

      // Execute all function calls and add results
      const functionResponses: GeminiPart[] = []
      for (const fc of functionCalls) {
        const result = await executeFunction(fc.functionCall.name, fc.functionCall.args, supabaseAdmin, allowedOrgIds, orgType === 'platform')
        console.log(`📦 Function ${fc.functionCall.name} result:`, JSON.stringify(result).substring(0, 2000))
        functionResponses.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: { result },
          },
        })
      }

      messages.push({ role: 'function', parts: functionResponses })
    }

    if (!finalAnswer) {
      finalAnswer = 'No pude completar la consulta. Intenta reformular tu pregunta.'
    }

    // Log conversation (fire and forget)
    supabaseAdmin.from('yiucp_conversations').insert({
      user_id: user.id,
      org_id: orgId || null,
      query,
      sql_generated: 'function_calling',
      response: finalAnswer.substring(0, 5000),
    }).then(() => {})

    console.log('✅ Yiucp response sent')

    return jsonResponse({ answer: finalAnswer })

  } catch (error) {
    console.error('❌ Error in yiucp-chat:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return jsonResponse({ answer: `Ocurrió un error inesperado: ${message}. Intenta de nuevo.` })
  }
})
