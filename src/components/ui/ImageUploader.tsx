import { useState, useCallback } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { trackImageUploadError } from '../../utils/analytics';

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

function compressImage(file: File): Promise<{ file: File; dataUrl: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Scale down if larger than MAX_DIMENSION
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIMENSION) / width);
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round((width * MAX_DIMENSION) / height);
                        height = MAX_DIMENSION;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Error al comprimir imagen'));
                            return;
                        }
                        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                            type: 'image/jpeg',
                        });
                        resolve({ file: compressedFile, dataUrl });
                    },
                    'image/jpeg',
                    JPEG_QUALITY
                );
            };
            img.onerror = () => reject(new Error('Error al cargar imagen'));
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

interface ImageUploaderProps {
    onImageSelected: (file: File, dataUrl: string) => void;
    disabled?: boolean;
}

export function ImageUploader({ onImageSelected, disabled }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const validateFile = (file: File): string | null => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
        const maxSize = 20 * 1024 * 1024; // 20MB (before compression)

        if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
            return 'invalid_format';
        }

        if (file.size > maxSize) {
            return 'file_too_large';
        }

        return null;
    };

    const handleFile = useCallback(async (file: File) => {
        const errorType = validateFile(file);
        if (errorType) {
            trackImageUploadError(errorType);
            const errorMessage = errorType === 'invalid_format'
                ? 'Formato no válido. Usa JPG, PNG o WEBP.'
                : 'Imagen muy grande. Máximo 20MB.';
            alert(errorMessage);
            return;
        }

        try {
            // Compress and resize for mobile (large photos)
            const { file: compressedFile, dataUrl } = await compressImage(file);
            onImageSelected(compressedFile, dataUrl);
        } catch {
            // Fallback: read without compression
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                onImageSelected(file, dataUrl);
            };
            reader.readAsDataURL(file);
        }
    }, [onImageSelected]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (disabled) return;

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [disabled, handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setIsDragging(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    return (
        <div
            className={`rhino-upload-zone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <Camera size={64} className="rhino-upload-icon" />
            <h3 className="rhino-upload-title">
                {isDragging ? '¡Suelta la imagen aquí!' : 'Arrastra tu imagen aquí'}
            </h3>
            <p className="rhino-upload-subtitle">o haz clic para seleccionar</p>

            <div className="rhino-upload-buttons">
                <label className="rhino-upload-btn">
                    <Upload size={20} />
                    Seleccionar Imagen
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                        onChange={handleFileInput}
                        disabled={disabled}
                        style={{ display: 'none' }}
                    />
                </label>

                <label className="rhino-upload-btn rhino-upload-btn-camera">
                    <Camera size={20} />
                    Tomar Foto
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInput}
                        disabled={disabled}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            <p className="rhino-upload-formats">PNG, JPG, WEBP, HEIC • Se comprime automáticamente</p>
        </div>
    );
}

interface ImagePreviewProps {
    imageUrl: string;
    fileName: string;
    fileSize: number;
    onRemove: () => void;
    onAnalyze: () => void;
    isAnalyzing: boolean;
}

export function ImagePreview({
    imageUrl,
    fileName,
    fileSize,
    onRemove,
    onAnalyze,
    isAnalyzing
}: ImagePreviewProps) {
    const formatFileSize = (bytes: number): string => {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="rhino-image-preview-container">
            <div className="rhino-image-preview">
                <img src={imageUrl} alt="Preview" className="rhino-preview-img" />
                <button
                    onClick={onRemove}
                    className="rhino-remove-image-btn"
                    disabled={isAnalyzing}
                    aria-label="Cambiar imagen"
                >
                    <X size={16} />
                    Cambiar imagen
                </button>
            </div>

            <div className="rhino-preview-info">
                <div className="rhino-preview-thumbnail">
                    <img src={imageUrl} alt="Thumbnail" />
                </div>
                <div className="rhino-preview-details">
                    <p className="rhino-preview-filename">{fileName}</p>
                    <p className="rhino-preview-filesize">{formatFileSize(fileSize)}</p>
                </div>
            </div>

            <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="rhino-analyze-btn"
            >
                {isAnalyzing ? (
                    <>
                        <span className="rhino-spinner" />
                        Analizando...
                    </>
                ) : (
                    <>
                        ✨ Analizar con IA
                    </>
                )}
            </button>

            <p className="rhino-preview-help">
                ¿Listo para analizar? La IA identificará el repuesto y te dará información sobre compatibilidad Toyota.
            </p>
        </div>
    );
}
