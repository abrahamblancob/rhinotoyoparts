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
