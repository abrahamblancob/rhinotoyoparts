import type { ColumnMapping, RawRow } from './types.ts';
import { HEADER_ALIASES, PRODUCT_FIELDS } from './constants.ts';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** Product fields we want to map to */
const TARGET_FIELDS = PRODUCT_FIELDS.map((f) => ({
  key: f.key,
  label: f.label,
  required: f.required,
}));

/**
 * Smart column mapping: tries Gemini AI first, falls back to fuzzy local matching.
 * Returns improved column mappings with explanations for the user.
 */
export async function smartMapColumns(
  headers: string[],
  sampleRows: RawRow[],
  currentMappings: ColumnMapping[],
): Promise<SmartMappingResult> {
  // Check how many columns were auto-detected by exact alias matching
  const unmappedCount = currentMappings.filter((m) => !m.productField).length;

  // If all columns are already mapped, skip AI
  if (unmappedCount === 0) {
    return {
      mappings: currentMappings,
      explanations: currentMappings
        .filter((m) => m.productField)
        .map((m) => ({
          fileHeader: m.fileHeader,
          productField: m.productField!,
          reason: 'Nombre de columna reconocido automaticamente',
        })),
      usedAI: false,
      unmappedHeaders: [],
    };
  }

  // Try AI mapping if Gemini key is available
  if (GEMINI_API_KEY) {
    try {
      const aiResult = await mapWithGemini(headers, sampleRows);
      if (aiResult) {
        return aiResult;
      }
    } catch {
      // AI failed, fall back to local heuristics
    }
  }

  // Fallback: local heuristic mapping
  return mapWithHeuristics(headers, sampleRows, currentMappings);
}

export interface SmartMappingResult {
  mappings: ColumnMapping[];
  explanations: MappingExplanation[];
  usedAI: boolean;
  unmappedHeaders: string[];
}

export interface MappingExplanation {
  fileHeader: string;
  productField: string;
  reason: string;
}

// ─── Gemini AI Mapping ─────────────────────────────────────────────

async function mapWithGemini(
  headers: string[],
  sampleRows: RawRow[],
): Promise<SmartMappingResult | null> {
  // Build sample data for context (first 3 rows)
  const samples = sampleRows.slice(0, 3).map((row) => {
    const values: Record<string, string> = {};
    headers.forEach((h) => {
      values[h] = row.data[h] ?? '';
    });
    return values;
  });

  const prompt = `Eres un asistente que mapea columnas de archivos de inventario de repuestos automotrices a un esquema estandar.

COLUMNAS DEL ARCHIVO DEL USUARIO:
${headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

DATOS DE EJEMPLO (primeras filas):
${JSON.stringify(samples, null, 2)}

CAMPOS DE NUESTRO SISTEMA:
${TARGET_FIELDS.map((f) => `- "${f.key}" (${f.label})${f.required ? ' [REQUERIDO]' : ''}`).join('\n')}

Campos del sistema:
- "sku": Codigo unico del producto (codigos como TOY-001, ATF-WSLT-TOY, etc.)
- "name": Nombre descriptivo del producto
- "description": Descripcion detallada (opcional)
- "brand": Marca del fabricante
- "oem_number": Numero OEM del fabricante original
- "price": Precio de venta (numero)
- "cost": Costo de compra (numero, opcional)
- "stock": Cantidad en inventario (entero)
- "min_stock": Stock minimo para alerta (entero, opcional)
- "status": Estado (active/inactive/out_of_stock, opcional)

INSTRUCCIONES:
1. Analiza cada columna del archivo del usuario basandote en su nombre Y en los datos de ejemplo
2. Mapea cada columna a uno de nuestros campos, o "skip" si no corresponde a ningun campo
3. Explica brevemente por que hiciste cada mapeo

Responde SOLO con este JSON (sin texto adicional):
{
  "mappings": [
    { "fileHeader": "nombre_columna", "productField": "campo_del_sistema_o_skip", "reason": "explicacion breve" }
  ]
}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) return null;

  const textResponse = data.candidates[0].content.parts[0].text;

  // Extract JSON from response
  let jsonText = '';
  const codeBlockMatch = textResponse.match(
    /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
  );
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  } else {
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonText = textResponse.substring(firstBrace, lastBrace + 1);
    }
  }

  if (!jsonText) return null;

  const aiResult = JSON.parse(jsonText) as {
    mappings: Array<{
      fileHeader: string;
      productField: string;
      reason: string;
    }>;
  };

  // Convert AI result to our ColumnMapping format
  const validFieldKeys: Set<string> = new Set(TARGET_FIELDS.map((f) => f.key));
  const mappings: ColumnMapping[] = headers.map((h) => {
    const aiMapping = aiResult.mappings.find(
      (m) =>
        m.fileHeader.toLowerCase().trim() === h.toLowerCase().trim(),
    );
    const field =
      aiMapping && validFieldKeys.has(aiMapping.productField)
        ? aiMapping.productField
        : null;

    return {
      fileHeader: h,
      productField: field,
      autoDetected: false, // AI-detected, not alias-detected
    };
  });

  const explanations: MappingExplanation[] = aiResult.mappings
    .filter(
      (m) => m.productField !== 'skip' && validFieldKeys.has(m.productField),
    )
    .map((m) => ({
      fileHeader: m.fileHeader,
      productField: m.productField,
      reason: m.reason,
    }));

  const unmappedHeaders = mappings
    .filter((m) => !m.productField)
    .map((m) => m.fileHeader);

  return {
    mappings,
    explanations,
    usedAI: true,
    unmappedHeaders,
  };
}

// ─── Local Heuristic Mapping ───────────────────────────────────────

function mapWithHeuristics(
  headers: string[],
  sampleRows: RawRow[],
  currentMappings: ColumnMapping[],
): SmartMappingResult {
  const explanations: MappingExplanation[] = [];
  const usedFields = new Set<string>();

  // First pass: keep already-detected mappings
  for (const m of currentMappings) {
    if (m.productField) {
      usedFields.add(m.productField);
    }
  }

  const mappings: ColumnMapping[] = headers.map((h, idx) => {
    const existing = currentMappings[idx];

    // Already mapped by alias
    if (existing?.productField) {
      explanations.push({
        fileHeader: h,
        productField: existing.productField,
        reason: 'Nombre de columna reconocido automaticamente',
      });
      return existing;
    }

    // Try content-based heuristics
    const detected = detectFieldByContent(h, sampleRows, usedFields);
    if (detected) {
      usedFields.add(detected.field);
      explanations.push({
        fileHeader: h,
        productField: detected.field,
        reason: detected.reason,
      });
      return {
        fileHeader: h,
        productField: detected.field,
        autoDetected: false,
      };
    }

    // Try fuzzy name matching
    const fuzzy = fuzzyMatchHeader(h, usedFields);
    if (fuzzy) {
      usedFields.add(fuzzy.field);
      explanations.push({
        fileHeader: h,
        productField: fuzzy.field,
        reason: fuzzy.reason,
      });
      return {
        fileHeader: h,
        productField: fuzzy.field,
        autoDetected: false,
      };
    }

    return { fileHeader: h, productField: null, autoDetected: false };
  });

  const unmappedHeaders = mappings
    .filter((m) => !m.productField)
    .map((m) => m.fileHeader);

  return { mappings, explanations, usedAI: false, unmappedHeaders };
}

/** Detect field by analyzing the content of a column */
function detectFieldByContent(
  header: string,
  sampleRows: RawRow[],
  usedFields: Set<string>,
): { field: string; reason: string } | null {
  const values = sampleRows.slice(0, 10).map((r) => r.data[header] ?? '');
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return null;

  // Check if all values are decimal numbers (price/cost candidates)
  const allDecimals = nonEmpty.every((v) => /^\d+([.,]\d{1,2})?$/.test(v.replace(/\s/g, '')));
  // Check if all values are integers (stock candidate)
  const allIntegers = nonEmpty.every((v) => /^-?\d+$/.test(v.trim()));
  // Check if values look like SKU codes (alphanumeric with dashes)
  const allCodes = nonEmpty.every((v) => /^[A-Z0-9][\w-]{2,}$/i.test(v.trim()));

  const headerLower = header.toLowerCase().trim();

  // Price detection
  if (
    allDecimals &&
    !usedFields.has('price') &&
    (headerLower.includes('precio') ||
      headerLower.includes('price') ||
      headerLower.includes('pvp') ||
      headerLower.includes('venta'))
  ) {
    return { field: 'price', reason: `Columna con valores decimales y nombre "${header}" sugiere precio` };
  }

  // Cost detection
  if (
    allDecimals &&
    !usedFields.has('cost') &&
    (headerLower.includes('costo') ||
      headerLower.includes('cost') ||
      headerLower.includes('compra'))
  ) {
    return { field: 'cost', reason: `Columna con valores decimales y nombre "${header}" sugiere costo` };
  }

  // Stock detection by content (integers)
  if (
    allIntegers &&
    !usedFields.has('stock') &&
    (headerLower.includes('stock') ||
      headerLower.includes('cant') ||
      headerLower.includes('qty') ||
      headerLower.includes('inv'))
  ) {
    return { field: 'stock', reason: `Columna con valores enteros y nombre "${header}" sugiere stock` };
  }

  // SKU detection by content (codes with dashes/numbers)
  if (
    allCodes &&
    !usedFields.has('sku') &&
    (headerLower.includes('art') ||
      headerLower.includes('cod') ||
      headerLower.includes('code') ||
      headerLower.includes('part') ||
      headerLower.includes('ref'))
  ) {
    return { field: 'sku', reason: `Columna con codigos alfanumericos y nombre "${header}" sugiere SKU` };
  }

  // Brand detection (short text, repeated values)
  const uniqueValues = new Set(nonEmpty.map((v) => v.toUpperCase()));
  if (
    !usedFields.has('brand') &&
    uniqueValues.size <= Math.ceil(nonEmpty.length * 0.6) &&
    nonEmpty.every((v) => v.length < 20) &&
    (headerLower.includes('marca') || headerLower.includes('brand') || headerLower.includes('fab'))
  ) {
    return { field: 'brand', reason: `Columna con valores repetidos cortos "${header}" sugiere marca` };
  }

  // Name/Description detection (longer text)
  if (
    !usedFields.has('name') &&
    nonEmpty.some((v) => v.length > 15) &&
    !allDecimals &&
    !allIntegers &&
    (headerLower.includes('desc') ||
      headerLower.includes('nombre') ||
      headerLower.includes('name') ||
      headerLower.includes('product'))
  ) {
    return { field: 'name', reason: `Columna con textos descriptivos "${header}" sugiere nombre del producto` };
  }

  return null;
}

/** Fuzzy match header to known aliases using simple substring matching */
function fuzzyMatchHeader(
  header: string,
  usedFields: Set<string>,
): { field: string; reason: string } | null {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // Try partial matches against known aliases
  const partialMatches: Array<{ alias: string; field: string; score: number }> = [];
  for (const [alias, field] of Object.entries(HEADER_ALIASES)) {
    if (usedFields.has(field)) continue;
    const normalizedAlias = alias.replace(/[^a-z0-9]/g, '');

    if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
      const score = Math.abs(normalized.length - normalizedAlias.length);
      partialMatches.push({ alias, field, score });
    }
  }

  if (partialMatches.length > 0) {
    partialMatches.sort((a, b) => a.score - b.score);
    const best = partialMatches[0];
    return {
      field: best.field,
      reason: `Nombre "${header}" es similar a "${best.alias}"`,
    };
  }

  return null;
}
