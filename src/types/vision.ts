// Claude Vision analysis result from Edge Function
export interface ClaudeAnalysis {
    identified: boolean;
    part_name: string;
    oem_number: string | null;
    category: string;
    brand_guess: string;
    compatible_models: string[];
    condition: string;
    confidence: number;
    search_keywords: string[];
}

// Product match from DB search
export interface ProductMatch {
    id: string;
    name: string;
    sku: string;
    oem_number: string | null;
    brand: string | null;
    price: number;
    stock: number;
    image_url: string | null;
    compatible_models: string[] | null;
    org_name: string;
    org_whatsapp: string | null;
}

// Full response from rhino-vision Edge Function
export interface VisionSearchResponse {
    analysis: ClaudeAnalysis;
    products: ProductMatch[];
    has_results: boolean;
    total_matches: number;
    error?: string;
}

// Legacy types (kept for backward compat during migration)
export interface PartAnalysisResult {
    partType: string;
    category: string;
    condition: 'new' | 'used' | 'damaged' | 'unknown';
    confidence: number;
    compatibleModels: string[];
    description: string;
    imageUrl: string;
}

export interface GeminiVisionResponse {
    candidates?: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
    error?: {
        message: string;
        code: number;
    };
}
