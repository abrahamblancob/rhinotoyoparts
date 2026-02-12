import { motion } from 'framer-motion';
import { CheckCircle, Car, MessageCircle, ArrowLeft } from 'lucide-react';
import type { PartAnalysisResult } from '../../types/vision';
import { getWhatsAppUrl } from '../../utils/whatsapp-integration';
import { trackWhatsAppFromVision } from '../../utils/analytics';

interface PartResultCardProps {
    result: PartAnalysisResult;
    onAnalyzeAnother: () => void;
}

export function PartResultCard({ result, onAnalyzeAnother }: PartResultCardProps) {
    const handleWhatsAppClick = () => {
        trackWhatsAppFromVision(result.partType, result.category, result.condition);
        window.open(getWhatsAppUrl(result), '_blank');
    };

    const getConditionText = (condition: string): string => {
        switch (condition) {
            case 'new': return 'Nuevo ✓';
            case 'used': return 'Usado';
            case 'damaged': return 'Dañado';
            default: return 'A consultar';
        }
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 80) return '#16a34a'; // Verde
        if (confidence >= 60) return '#eab308'; // Amarillo
        return '#ef5350'; // Rojo
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="rhino-result-card"
        >
            <div className="rhino-result-header">
                <h3 className="rhino-result-title">RESULTADO DEL ANÁLISIS</h3>
                <div
                    className="rhino-confidence-badge"
                    style={{ backgroundColor: getConfidenceColor(result.confidence) }}
                >
                    <CheckCircle size={16} />
                    {result.confidence}%
                </div>
            </div>

            <div className="rhino-result-content">
                <div className="rhino-result-image">
                    <img src={result.imageUrl} alt={result.partType} />
                </div>

                <div className="rhino-result-info">
                    <h4 className="rhino-part-name">{result.partType.toUpperCase()}</h4>
                    <p className="rhino-part-category">
                        <strong>Categoría:</strong> {result.category}
                    </p>
                    <p className="rhino-part-condition">
                        <strong>Condición:</strong> {getConditionText(result.condition)}
                    </p>
                    <p className="rhino-part-confidence">
                        <strong>Confianza:</strong> {result.confidence}%
                    </p>
                    <p className="rhino-part-description">{result.description}</p>
                </div>
            </div>

            <div className="rhino-compatible-models">
                <h4 className="rhino-models-title">
                    <Car size={20} />
                    MODELOS COMPATIBLES
                </h4>
                <ul className="rhino-models-list">
                    {result.compatibleModels.map((model: string, index: number) => (
                        <li key={index} className="rhino-model-item">
                            <span className="rhino-toyota-badge">Toyota</span>
                            {model}
                        </li>
                    ))}
                </ul>
            </div>

            <button
                onClick={handleWhatsAppClick}
                className="rhino-whatsapp-cta-btn"
            >
                <MessageCircle size={20} />
                CONTACTAR POR WHATSAPP
                <span className="rhino-whatsapp-subtitle">Consultar disponibilidad y precio</span>
            </button>

            <button
                onClick={onAnalyzeAnother}
                className="rhino-analyze-another-btn"
            >
                <ArrowLeft size={18} />
                Analizar otra pieza
            </button>
        </motion.div>
    );
}
