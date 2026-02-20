// Supabase Edge Function: rhino-vision
// Receives an image, analyzes it with Gemini Vision API,
// searches matching products in DB, and returns results.
// API key never exposed to frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

// ---------- Gemini Vision Analysis ----------

interface PartAnalysis {
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

async function analyzeWithGemini(imageBase64: string, mimeType: string): Promise<PartAnalysis> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const prompt = `Eres un experto en repuestos automotrices Toyota con 20 años de experiencia.
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
- MUY IMPORTANTE para search_keywords: incluye MUCHAS variaciones del nombre como lo buscaría un vendedor de repuestos. Por ejemplo para un cilindro maestro de freno incluye: "cilindro maestro", "bomba de freno", "master cylinder", "bomba freno", "cilindro freno", "brake master". Incluye el nombre en español e inglés, abreviaciones y sinónimos comunes en el mercado automotriz latinoamericano
- Prioriza modelos Toyota vendidos en Venezuela/Latinoamérica: Hilux, Corolla, Fortuner, 4Runner, Prado, RAV4, Yaris, Camry, Land Cruiser

Identifica este repuesto automotriz. Responde SOLO con JSON.`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text().catch(() => '{}')
    console.error('Gemini API error:', response.status, errText)
    let errMsg = `Gemini API error: ${response.status}`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.error?.message || errMsg
    } catch { /* use default */ }
    throw new Error(errMsg)
  }

  const data = await response.json()

  // Gemini 2.5 Flash may return multiple parts (thinking + text)
  // We need to find the text part that contains our JSON
  const parts = data.candidates?.[0]?.content?.parts || []
  console.log('Gemini response parts count:', parts.length)

  // Collect all text parts (skip thought parts)
  let textContent = ''
  for (const part of parts) {
    if (part.text && !part.thought) {
      textContent += part.text
    }
  }

  // If no non-thought text, try any text part
  if (!textContent) {
    for (const part of parts) {
      if (part.text) {
        textContent += part.text
      }
    }
  }

  console.log('Raw Gemini text (first 500 chars):', textContent.substring(0, 500))

  if (!textContent) {
    console.error('Full Gemini response:', JSON.stringify(data).substring(0, 1000))
    throw new Error('Gemini no devolvió contenido de texto')
  }

  // With responseMimeType: 'application/json', Gemini should return pure JSON
  // But add fallback extraction just in case
  let jsonText = textContent.trim()

  // If it starts with ``` remove markdown code block wrapper
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  // If still not starting with {, extract from first { to last }
  if (!jsonText.startsWith('{')) {
    const first = jsonText.indexOf('{')
    const last = jsonText.lastIndexOf('}')
    if (first !== -1 && last > first) {
      jsonText = jsonText.substring(first, last + 1)
    }
  }

  // Clean trailing commas
  jsonText = jsonText.replace(/,\s*([\]}])/g, '$1')

  try {
    return JSON.parse(jsonText)
  } catch (e) {
    console.error('Failed to parse JSON. Text:', jsonText.substring(0, 500))
    console.error('Parse error:', e)
    throw new Error('La IA devolvió una respuesta inválida. Intenta de nuevo.')
  }
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
  analysis: PartAnalysis,
): Promise<ProductMatch[]> {
  console.log('🔎 Searching products with smart match...')
  console.log('  Name:', analysis.part_name)
  console.log('  Keywords:', analysis.search_keywords)
  console.log('  Category:', analysis.category)
  console.log('  OEM:', analysis.oem_number)

  const { data: matches, error } = await supabase.rpc('search_products_smart', {
    search_name: analysis.part_name,
    search_keywords: analysis.search_keywords,
    search_category: analysis.category,
    search_oem: analysis.oem_number,
  })

  if (error) {
    console.error('Smart search error:', error)
    return []
  }

  if (matches && matches.length > 0) {
    console.log(`Smart search: ${matches.length} matches found`)
    // deno-lint-ignore no-explicit-any
    matches.forEach((m: any) => console.log(`  - ${m.name} (score: ${m.match_score})`))
    return matches as ProductMatch[]
  }

  console.log('No matches found')
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

    const { image_base64, mime_type } = body
    if (!image_base64 || !mime_type) {
      return jsonResponse({ error: 'Faltan campos: image_base64 y mime_type' }, 400)
    }

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validMimes.includes(mime_type as string)) {
      return jsonResponse({ error: 'Tipo de imagen no soportado. Usa JPEG, PNG o WebP.' }, 400)
    }

    // Verify JWT — require authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'No autorizado - sesión inválida' }, 401)
    }

    // Validate image size (base64 ≈ 1.33x original, limit ~4MB original = ~5.3MB base64)
    const base64Str = image_base64 as string
    if (base64Str.length > 6_000_000) {
      return jsonResponse({ error: 'Imagen demasiado grande. Máximo 4MB.' }, 400)
    }

    console.log('🔍 Analyzing image with Gemini Vision...')

    // Step 1: Analyze with Gemini
    const analysis = await analyzeWithGemini(base64Str, mime_type as string)
    console.log('✅ Gemini analysis:', JSON.stringify(analysis))

    if (!analysis.identified || analysis.confidence < 25) {
      return jsonResponse({
        analysis,
        products: [],
        has_results: false,
        total_matches: 0,
      })
    }

    // Step 2: Search products in DB (use anon key — products_public_read RLS allows anon SELECT on active products)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const products = await searchProducts(supabase, analysis)

    // Step 3: Log the search (fire and forget — use service role to bypass RLS for analytics table)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    supabaseAdmin.from('vision_searches').insert({
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
