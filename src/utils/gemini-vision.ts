import type { PartAnalysisResult, GeminiVisionResponse } from '../types/vision';
import { findCompatiblePart } from '../data/parts-database';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface AnalyzeImageOptions {
    imageBase64: string;
    mimeType: string;
}

export async function analyzePartImage({ imageBase64, mimeType }: AnalyzeImageOptions): Promise<PartAnalysisResult> {
    console.log('🔍 Iniciando análisis de imagen...');
    console.log('📝 API Key configurada:', GEMINI_API_KEY ? 'Sí ✓' : 'No ✗');
    console.log('📝 Tipo MIME:', mimeType);
    console.log('📝 Tamaño Base64:', imageBase64.length, 'caracteres');

    if (!GEMINI_API_KEY) {
        console.error('❌ Error: API key no configurada');
        throw new Error('API key de Gemini no configurada. Por favor configura VITE_GEMINI_API_KEY en el archivo .env');
    }

    const prompt = `Analiza esta imagen de un repuesto automotriz y proporciona la siguiente información en formato JSON:

{
  "partType": "nombre específico del repuesto (ej: filtro de aceite, pastilla de freno)",
  "category": "categoría principal (Motor, Frenos, Suspensión, Eléctrico, o Transmisión)",
  "condition": "condición del repuesto (new, used, damaged, o unknown)",
  "description": "descripción breve del repuesto en español (máximo 2 líneas)",
  "confidence": número entre 0 y 100 indicando tu confianza en la identificación
}

Si la imagen no es claramente un repuesto automotriz, establece confidence en 0 y partType como "desconocido".
Responde SOLO con el JSON, sin texto adicional.`;

    try {
        console.log('📡 Enviando solicitud a Gemini API...');
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 1024,
                }
            })
        });

        console.log('📡 Respuesta recibida. Status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error de API:', errorData);
            throw new Error(errorData.error?.message || `Error de API: ${response.status} - ${response.statusText}`);
        }

        const data: GeminiVisionResponse = await response.json();
        console.log('✅ Datos recibidos:', data);

        if (data.error) {
            console.error('❌ Error en respuesta:', data.error);
            throw new Error(data.error.message);
        }

        if (!data.candidates || data.candidates.length === 0) {
            console.error('❌ No hay candidatos en la respuesta');
            throw new Error('No se recibió respuesta de la IA');
        }

        const textResponse = data.candidates[0].content.parts[0].text;
        console.log('📄 Respuesta de texto completa:', textResponse);

        // Extraer JSON de la respuesta (puede venir con markdown o texto adicional)
        let jsonText = '';

        // Primero intentar extraer de bloques de código markdown
        const codeBlockMatch = textResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
            console.log('📝 JSON extraído de bloque markdown');
        } else {
            // Buscar el primer { y el último } que forman un JSON válido
            const firstBrace = textResponse.indexOf('{');
            const lastBrace = textResponse.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonText = textResponse.substring(firstBrace, lastBrace + 1);
                console.log('📝 JSON extraído por posición de llaves');
            } else {
                console.error('❌ No se encontró JSON en la respuesta');
                throw new Error('Respuesta de IA en formato inválido - no se encontró JSON');
            }
        }

        console.log('📝 JSON extraído:', jsonText);

        let aiResult;
        try {
            aiResult = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('❌ Error al parsear JSON:', parseError);
            console.error('📝 Texto que intentó parsear:', jsonText);
            console.error('📝 Longitud del texto:', jsonText.length);
            throw new Error('Respuesta de IA en formato inválido - JSON no válido');
        }

        console.log('✅ Resultado parseado:', aiResult);

        // Validar confianza mínima
        if (aiResult.confidence < 30) {
            console.warn('⚠️ Confianza muy baja:', aiResult.confidence);
            throw new Error('No se pudo identificar el repuesto con suficiente confianza. Intenta con una imagen más clara.');
        }

        // Buscar compatibilidad en la base de datos
        const partData = findCompatiblePart(aiResult.partType, aiResult.category);
        console.log('🔍 Datos de compatibilidad:', partData);

        const result: PartAnalysisResult = {
            partType: aiResult.partType,
            category: partData ? `${partData.category} - ${partData.subcategory}` : aiResult.category,
            condition: aiResult.condition,
            confidence: aiResult.confidence,
            description: aiResult.description,
            compatibleModels: partData?.compatibleModels || ['Consultar disponibilidad'],
            imageUrl: '' // Se llenará con el data URL de la imagen
        };

        console.log('✅ Análisis completado exitosamente:', result);
        return result;

    } catch (error) {
        console.error('❌ Error en analyzePartImage:', error);
        if (error instanceof Error) {
            // Errores específicos de rate limiting
            if (error.message.includes('429') || error.message.includes('quota')) {
                throw new Error('Límite de solicitudes alcanzado. Por favor intenta de nuevo en unos minutos.');
            }
            throw error;
        }
        throw new Error('Error desconocido al analizar la imagen');
    }
}

export function imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remover el prefijo "data:image/xxx;base64,"
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function getImageDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
