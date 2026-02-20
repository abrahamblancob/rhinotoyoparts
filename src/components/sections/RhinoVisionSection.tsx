import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ShoppingCart, MessageCircle, Search, Package } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionTitle } from '../ui/SectionTitle';
import { ImageUploader, ImagePreview } from '../ui/ImageUploader';
import { analyzePartWithVision, getWhatsAppBuyUrl, getWhatsAppRequestUrl, imageToBase64 } from '../../utils/rhino-vision-api';
import {
    trackImageUpload,
    trackAnalysisStarted,
    trackAnalysisError,
    trackRetryAnalysis
} from '../../utils/analytics';
import { trackEvent } from '../../utils/analytics';
import type { VisionSearchResponse, ProductMatch } from '../../types/vision';

type ViewState = 'upload' | 'preview' | 'analyzing' | 'results' | 'no_match' | 'error';

export function RhinoVisionSection() {
    const [viewState, setViewState] = useState<ViewState>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageDataUrl, setImageDataUrl] = useState<string>('');
    const [visionResult, setVisionResult] = useState<VisionSearchResponse | null>(null);
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

            const result = await analyzePartWithVision(base64, selectedFile.type || 'image/jpeg');
            setVisionResult(result);

            if (!result.analysis.identified || result.analysis.confidence < 25) {
                setErrorMessage('No se pudo identificar el repuesto con suficiente confianza. Intenta con una imagen más clara.');
                setViewState('error');
                return;
            }

            if (result.has_results) {
                setViewState('results');
            } else {
                setViewState('no_match');
            }

            trackEvent({
                action: 'rhino_vision_analysis_complete',
                category: 'rhino_vision',
                label: result.analysis.part_name,
                value: result.total_matches,
            });

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
        setVisionResult(null);
        setErrorMessage('');
        setViewState('upload');
    };

    const handleRetry = () => {
        setViewState('preview');
        setErrorMessage('');
        trackRetryAnalysis();
    };

    const handleWhatsAppBuy = (product: ProductMatch) => {
        if (!product.org_whatsapp) return;
        trackEvent({
            action: 'rhino_vision_whatsapp_buy',
            category: 'rhino_vision',
            label: product.name,
            value: product.price,
        });
        window.open(getWhatsAppBuyUrl(product.org_whatsapp, product.name, product.sku, product.price), '_blank');
    };

    const handleWhatsAppRequest = () => {
        if (!visionResult) return;
        const { part_name, oem_number, category } = visionResult.analysis;
        trackEvent({
            action: 'rhino_vision_whatsapp_request',
            category: 'rhino_vision',
            label: part_name,
        });
        window.open(getWhatsAppRequestUrl(part_name, oem_number, category), '_blank');
    };

    const analysis = visionResult?.analysis;

    return (
        <SectionWrapper id="rhino-vision">
            <SectionTitle
                title="Rhino Vision"
                subtitle="Identifica repuestos Toyota con IA. Sube una foto y te conectamos con proveedores."
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
                                        <strong>Nuestra IA lo identifica</strong>
                                        <p>Nombre, marca, OEM y compatibilidad Toyota</p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rhino-step-number">3</span>
                                    <div>
                                        <strong>Buscamos en proveedores</strong>
                                        <p>Encontramos quién lo tiene en stock y a qué precio</p>
                                    </div>
                                </li>
                                <li>
                                    <span className="rhino-step-number">4</span>
                                    <div>
                                        <strong>Compra por WhatsApp</strong>
                                        <p>Contacta directo al proveedor para comprarlo</p>
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
                                    La IA identificará el repuesto y buscará proveedores que lo tengan disponible.
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
                                Rhino Vision está identificando tu repuesto y buscando proveedores disponibles
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Estado: Results (con productos) */}
                {viewState === 'results' && analysis && visionResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* AI Analysis Card */}
                        <div className="rv2-analysis-card">
                            <div className="rv2-analysis-header">
                                <div className="rv2-analysis-badge-row">
                                    <span className="rv2-badge-success">Repuesto Identificado</span>
                                    <span className="rv2-confidence">Confianza: {analysis.confidence}%</span>
                                </div>
                                <h3 className="rv2-part-name">{analysis.part_name}</h3>
                                {analysis.oem_number && (
                                    <p className="rv2-oem">OEM: {analysis.oem_number}</p>
                                )}
                                <div className="rv2-details-row">
                                    <span className="rv2-detail-tag">{analysis.category}</span>
                                    <span className="rv2-detail-tag">{analysis.brand_guess}</span>
                                    <span className="rv2-detail-tag">{analysis.condition}</span>
                                </div>
                                {analysis.compatible_models.length > 0 && (
                                    <p className="rv2-compatible">
                                        Compatible con: {analysis.compatible_models.join(', ')}
                                    </p>
                                )}
                            </div>

                            {/* Products found */}
                            <div className="rv2-products-section">
                                <div className="rv2-products-header">
                                    <ShoppingCart size={20} />
                                    <span>{visionResult.total_matches} {visionResult.total_matches === 1 ? 'proveedor tiene' : 'proveedores tienen'} este repuesto</span>
                                </div>

                                <div className="rv2-products-list">
                                    {visionResult.products.map((product) => (
                                        <div key={product.id} className="rv2-product-card">
                                            <div className="rv2-product-info">
                                                <h4 className="rv2-product-name">{product.name}</h4>
                                                <p className="rv2-product-meta">
                                                    {product.brand && <span>{product.brand}</span>}
                                                    <span>SKU: {product.sku}</span>
                                                </p>
                                                <div className="rv2-product-pricing">
                                                    <span className="rv2-price">${product.price.toFixed(2)}</span>
                                                    <span className="rv2-stock">
                                                        <Package size={14} />
                                                        {product.stock} en stock
                                                    </span>
                                                </div>
                                                <p className="rv2-seller">Vendedor: {product.org_name}</p>
                                            </div>
                                            {product.org_whatsapp && (
                                                <button
                                                    className="rv2-buy-btn"
                                                    onClick={() => handleWhatsAppBuy(product)}
                                                >
                                                    <MessageCircle size={18} />
                                                    Comprar por WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="rv2-actions">
                            <button onClick={handleAnalyzeAnother} className="rv2-new-search-btn">
                                <Search size={18} />
                                Buscar otro repuesto
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Estado: No Match */}
                {viewState === 'no_match' && analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="rv2-analysis-card">
                            <div className="rv2-analysis-header">
                                <div className="rv2-analysis-badge-row">
                                    <span className="rv2-badge-success">Repuesto Identificado</span>
                                    <span className="rv2-confidence">Confianza: {analysis.confidence}%</span>
                                </div>
                                <h3 className="rv2-part-name">{analysis.part_name}</h3>
                                {analysis.oem_number && (
                                    <p className="rv2-oem">OEM: {analysis.oem_number}</p>
                                )}
                                {analysis.compatible_models.length > 0 && (
                                    <p className="rv2-compatible">
                                        Compatible con: {analysis.compatible_models.join(', ')}
                                    </p>
                                )}
                            </div>

                            {/* No stock section */}
                            <div className="rv2-no-match-section">
                                <p className="rv2-no-match-title">No encontramos este repuesto en stock actualmente</p>
                                <p className="rv2-no-match-subtitle">Pero podemos ayudarte a conseguirlo:</p>

                                <button className="rv2-buy-btn" onClick={handleWhatsAppRequest}>
                                    <MessageCircle size={18} />
                                    Solicitar por WhatsApp
                                </button>
                            </div>
                        </div>

                        <div className="rv2-actions">
                            <button onClick={handleAnalyzeAnother} className="rv2-new-search-btn">
                                <Search size={18} />
                                Buscar otro repuesto
                            </button>
                        </div>
                    </motion.div>
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
                    </motion.div>
                )}
            </div>
        </SectionWrapper>
    );
}
