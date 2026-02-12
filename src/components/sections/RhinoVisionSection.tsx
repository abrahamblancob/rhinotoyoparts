import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { ImageUploader, ImagePreview } from '../ui/ImageUploader';
import { PartResultCard } from '../ui/PartResultCard';
import { analyzePartImage, imageToBase64, getImageDataUrl } from '../../utils/gemini-vision';
import {
    trackImageUpload,
    trackAnalysisStarted,
    trackPartAnalysis,
    trackAnalysisError,
    trackLowConfidenceResult,
    trackRetryAnalysis
} from '../../utils/analytics';
import type { PartAnalysisResult } from '../../types/vision';

type ViewState = 'upload' | 'preview' | 'analyzing' | 'results' | 'error';

export function RhinoVisionSection() {
    const [viewState, setViewState] = useState<ViewState>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<PartAnalysisResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleImageSelected = (file: File, dataUrl: string) => {
        setSelectedFile(file);
        setImageDataUrl(dataUrl);
        setViewState('preview');
        trackImageUpload(file.size, file.type);
    };

    const handleRemoveImage = () => {
        setSelectedFile(null);
        setImageDataUrl('');
        setViewState('upload');
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;

        setViewState('analyzing');
        setErrorMessage('');
        trackAnalysisStarted();

        try {
            const base64 = await imageToBase64(selectedFile);
            const fullDataUrl = await getImageDataUrl(selectedFile);

            const result = await analyzePartImage({
                imageBase64: base64,
                mimeType: selectedFile.type
            });

            result.imageUrl = fullDataUrl;
            setAnalysisResult(result);
            setViewState('results');

            // Track successful analysis
            trackPartAnalysis(result.partType, result.category, result.condition, result.confidence);

            // Track low confidence results separately
            if (result.confidence < 60) {
                trackLowConfidenceResult(result.partType, result.confidence);
            }
        } catch (error) {
            console.error('Error analyzing image:', error);
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido al analizar la imagen';
            setErrorMessage(errorMsg);
            setViewState('error');
            trackAnalysisError(errorMsg);
        }
    };

    const handleAnalyzeAnother = () => {
        setSelectedFile(null);
        setImageDataUrl('');
        setAnalysisResult(null);
        setErrorMessage('');
        setViewState('upload');
    };

    const handleRetry = () => {
        setViewState('preview');
        setErrorMessage('');
        trackRetryAnalysis();
    };

    return (
        <SectionWrapper id="rhino-vision">
            <SectionTitle
                title="Rhino Vision"
                subtitle="Identifica repuestos Toyota con IA. Sube una foto y descubre compatibilidad al instante."
            />

            <div className="rhino-vision-container">
                {/* Estado: Upload */}
                {viewState === 'upload' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="rhino-vision-grid"
                    >
                        <ImageUploader onImageSelected={handleImageSelected} />

                        <div className="rhino-vision-instructions">
                            <h3 className="rhino-instructions-title">¿Cómo funciona?</h3>
                            <ol className="rhino-instructions-list">
                                <li>
                                    <span className="rhino-step-number">1</span>
                                    <div>
                                        <strong>Sube una foto clara</strong>
                                        <p>Del repuesto que necesitas identificar</p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rhino-step-number">2</span>
                                    <div>
                                        <strong>Nuestra IA lo analizará</strong>
                                        <p>Identificación automática en segundos</p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rhino-step-number">3</span>
                                    <div>
                                        <strong>Recibe información</strong>
                                        <p>Tipo de pieza y compatibilidad Toyota</p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rhino-step-number">4</span>
                                    <div>
                                        <strong>Contacta por WhatsApp</strong>
                                        <p>Contacta con uno de nuestros vendedores</p>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </motion.div>
                )}

                {/* Estado: Preview */}
                {viewState === 'preview' && selectedFile && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="rhino-vision-grid"
                    >
                        <ImagePreview
                            imageUrl={imageDataUrl}
                            fileName={selectedFile.name}
                            fileSize={selectedFile.size}
                            onRemove={handleRemoveImage}
                            onAnalyze={handleAnalyze}
                            isAnalyzing={false}
                        />

                        <div className="rhino-vision-ready">
                            <div className="rhino-ready-content">
                                <h3>¿Listo para analizar?</h3>
                                <p>
                                    La IA identificará el repuesto y te dará información sobre compatibilidad con modelos Toyota.
                                </p>
                                <p className="rhino-ready-note">
                                    Asegúrate de que la imagen sea clara y el repuesto esté bien iluminado para mejores resultados.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Estado: Analyzing */}
                {viewState === 'analyzing' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="rhino-vision-analyzing"
                    >
                        <div className="rhino-analyzing-overlay">
                            <img src={imageDataUrl} alt="Analyzing" className="rhino-analyzing-bg" />
                        </div>
                        <div className="rhino-analyzing-content">
                            <Loader2 size={64} className="rhino-analyzing-spinner" />
                            <h3 className="rhino-analyzing-title">Analizando...</h3>
                            <div className="rhino-progress-bar">
                                <div className="rhino-progress-fill" />
                            </div>
                            <p className="rhino-analyzing-text">
                                Nuestra IA está identificando el repuesto y buscando compatibilidad con modelos Toyota
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Estado: Results */}
                {viewState === 'results' && analysisResult && (
                    <PartResultCard
                        result={analysisResult}
                        onAnalyzeAnother={handleAnalyzeAnother}
                    />
                )}

                {/* Estado: Error */}
                {viewState === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="rhino-vision-error"
                    >
                        <AlertTriangle size={64} className="rhino-error-icon" />
                        <h3 className="rhino-error-title">No pudimos analizar la imagen</h3>
                        <p className="rhino-error-message">{errorMessage}</p>

                        <div className="rhino-error-causes">
                            <p><strong>Posibles causas:</strong></p>
                            <ul>
                                <li>Imagen borrosa o mal iluminada</li>
                                <li>El objeto no es un repuesto automotriz</li>
                                <li>Límite de solicitudes alcanzado (intenta en unos minutos)</li>
                            </ul>
                        </div>

                        <div className="rhino-error-actions">
                            <button onClick={handleRetry} className="rhino-retry-btn">
                                Intentar de nuevo
                            </button>
                            <button onClick={handleAnalyzeAnother} className="rhino-new-image-btn">
                                Subir otra imagen
                            </button>
                        </div>

                        <p className="rhino-error-help">
                            ¿Necesitas ayuda? Contáctanos por WhatsApp para asistencia personalizada
                        </p>
                    </motion.div>
                )}
            </div>
        </SectionWrapper>
    );
}
