// Supabase Edge Function: rhino-vision
// Receives an image, analyzes it with Claude Vision API,
// searches matching products in DB, and returns results.
// API key never exposed to frontend.

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

// ---------- Claude Vision Analysis ----------

interface ClaudeAnalysis {
  identified: boolean
  part_name: string
  oem_number: string | null
  category: string
  brand_guess: string
  compatible_models: string[]
  condition: string
  confidence: number
  search_keywords: string[]
}

async function analyzeWithClaude(imageBase64: string, mimeType: string): Promise<ClaudeAnalysis> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const systemPrompt = `Eres un experto en repuestos automotrices Toyota con 20 años de experiencia.
Analiza la imagen del repuesto y responde SOLO con JSON válido (sin markdown, sin texto adicional).

Estructura requerida:
{
  "identified": boolean,
  "part_name": "nombre específico del repuesto en español",
  "oem_number": "número OEM si es visible, o null",
  "category": "una de: Motor, Frenos, Suspensión, Eléctrico, Transmisión, Carrocería, Filtros, Refrigeración, Dirección, Encendido, Otro",
  "brand_guess": "marca visible o estimada (ej: Toyota Original, Denso, KYB, Aisin)",
  "compatible_models": ["lista de modelos Toyota compatibles con año"],
  "condition": "Nuevo | Usado | Dañado | No determinado",
  "confidence": número entre 0 y 100,
  "search_keywords": ["palabras clave para buscar en catálogo, incluir variaciones"]
}

Reglas:
- Si no puedes identificar la pieza, pon identified: false y confidence: 0
- Sé específico con el número OEM si es visible en la pieza o empaque
- Incluye en search_keywords: nombre corto, nombre largo, OEM parcial, sinónimos
- Prioriza modelos Toyota vendidos en Venezuela/Latinoamérica: Hilux, Corolla, Fortuner, 4Runner, Prado, RAV4, Yaris, Camry, Land Cruiser`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Identifica este repuesto automotriz. Responde SOLO con JSON.',
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('Claude API error:', err)
    throw new Error(err.error?.message || `Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const textContent = data.content?.[0]?.text || ''

  // Extract JSON from response
  let jsonText = textContent
  const codeBlock = textContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlock) {
    jsonText = codeBlock[1]
  } else {
    const first = textContent.indexOf('{')
    const last = textContent.lastIndexOf('}')
    if (first !== -1 && last > first) {
      jsonText = textContent.substring(first, last + 1)
    }
  }

  return JSON.parse(jsonText)
}

// ---------- Product Search (3 levels) ----------

interface ProductMatch {
  id: string
  name: string
  sku: string
  oem_number: string | null
  brand: string | null
  price: number
  stock: number
  image_url: string | null
  compatible_models: string[] | null
  org_name: string
  org_whatsapp: string | null
}

async function searchProducts(
  supabase: ReturnType<typeof createClient>,
  analysis: ClaudeAnalysis,
): Promise<ProductMatch[]> {
  // Level 1: Exact match by OEM/SKU
  if (analysis.oem_number) {
    const { data: exactMatches } = await supabase
      .from('products')
      .select(`
        id, name, sku, oem_number, brand, price, stock, image_url, compatible_models,
        organizations!inner(name, whatsapp)
      `)
      .or(`sku.ilike.%${analysis.oem_number}%,oem_number.ilike.%${analysis.oem_number}%`)
      .eq('status', 'active')
      .gt('stock', 0)
      .limit(10)

    if (exactMatches && exactMatches.length > 0) {
      console.log(`Level 1 (OEM): ${exactMatches.length} matches`)
      return mapProducts(exactMatches)
    }
  }

  // Level 2: Fuzzy match by name + category keywords
  const nameSearch = analysis.part_name.split(' ').slice(0, 3).join(' ')
  const { data: fuzzyMatches } = await supabase
    .from('products')
    .select(`
      id, name, sku, oem_number, brand, price, stock, image_url, compatible_models,
      organizations!inner(name, whatsapp)
    `)
    .ilike('name', `%${nameSearch}%`)
    .eq('status', 'active')
    .gt('stock', 0)
    .limit(10)

  if (fuzzyMatches && fuzzyMatches.length > 0) {
    console.log(`Level 2 (fuzzy name): ${fuzzyMatches.length} matches`)
    return mapProducts(fuzzyMatches)
  }

  // Level 3: Full-text search by keywords
  const keywords = analysis.search_keywords.join(' ')
  const { data: ftsMatches } = await supabase.rpc('search_products_fts', {
    search_query: keywords,
  })

  if (ftsMatches && ftsMatches.length > 0) {
    console.log(`Level 3 (FTS): ${ftsMatches.length} matches`)
    return ftsMatches as ProductMatch[]
  }

  console.log('No matches found at any level')
  return []
}

// deno-lint-ignore no-explicit-any
function mapProducts(rows: any[]): ProductMatch[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    oem_number: r.oem_number,
    brand: r.brand,
    price: r.price,
    stock: r.stock,
    image_url: r.image_url,
    compatible_models: r.compatible_models,
    org_name: r.organizations?.name ?? 'Proveedor',
    org_whatsapp: r.organizations?.whatsapp ?? null,
  }))
}

// ---------- Main Handler ----------

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

    const { image_base64, mime_type } = body
    if (!image_base64 || !mime_type) {
      return jsonResponse({ error: 'Faltan campos: image_base64 y mime_type' }, 400)
    }

    // Validate image size (base64 ≈ 1.33x original, limit ~4MB original = ~5.3MB base64)
    const base64Str = image_base64 as string
    if (base64Str.length > 6_000_000) {
      return jsonResponse({ error: 'Imagen demasiado grande. Máximo 4MB.' }, 400)
    }

    console.log('🔍 Analyzing image with Claude Vision...')

    // Step 1: Analyze with Claude
    const analysis = await analyzeWithClaude(base64Str, mime_type as string)
    console.log('✅ Claude analysis:', JSON.stringify(analysis))

    if (!analysis.identified || analysis.confidence < 25) {
      return jsonResponse({
        analysis,
        products: [],
        has_results: false,
        total_matches: 0,
      })
    }

    // Step 2: Search products in DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const products = await searchProducts(supabase, analysis)

    // Step 3: Log the search (fire and forget)
    supabase.from('vision_searches').insert({
      part_name: analysis.part_name,
      oem_number: analysis.oem_number,
      category: analysis.category,
      confidence: analysis.confidence,
      had_results: products.length > 0,
      results_count: products.length,
      user_agent: req.headers.get('user-agent'),
    }).then(() => {})

    console.log(`🛒 Found ${products.length} matching products`)

    return jsonResponse({
      analysis,
      products,
      has_results: products.length > 0,
      total_matches: products.length,
    })

  } catch (error) {
    console.error('❌ Error in rhino-vision:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'

    if (message.includes('429') || message.includes('rate')) {
      return jsonResponse({ error: 'Demasiadas solicitudes. Intenta en unos minutos.' }, 429)
    }

    return jsonResponse({ error: message }, 500)
  }
})
