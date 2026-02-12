import { useState, useCallback } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { trackImageUploadError } from '../../utils/analytics';

interface ImageUploaderProps {
    onImageSelected: (file: File, dataUrl: string) => void;
    disabled?: boolean;
}

export function ImageUploader({ onImageSelected, disabled }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const validateFile = (file: File): string | null => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            return 'invalid_format';
        }

        if (file.size > maxSize) {
            return 'file_too_large';
        }

        return null;
    };

    const handleFile = useCallback((file: File) => {
        const errorType = validateFile(file);
        if (errorType) {
            trackImageUploadError(errorType);
            const errorMessage = errorType === 'invalid_format'
                ? 'Formato no válido. Usa JPG, PNG o WEBP.'
                : 'Imagen muy grande. Máximo 10MB.';
            alert(errorMessage);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            onImageSelected(file, dataUrl);
        };
        reader.readAsDataURL(file);
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

            <label className="rhino-upload-btn">
                <Upload size={20} />
                Seleccionar Imagen
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileInput}
                    disabled={disabled}
                    style={{ display: 'none' }}
                />
            </label>

            <p className="rhino-upload-formats">PNG, JPG, WEBP • Máx. 10MB</p>
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
