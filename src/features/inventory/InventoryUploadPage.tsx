import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';

import type {
  WizardStep,
  RawRow,
  ColumnMapping,
  ProcessingResult,
  UploadProgress,
} from './upload/types.ts';

import { parseFile } from './upload/parseFile.ts';
import { validateRows } from './upload/validateRows.ts';
import { uploadProducts, logBulkUpload } from './upload/uploadBatch.ts';

import { StepIndicator } from './upload/components/StepIndicator.tsx';
import { FileDropzone } from './upload/components/FileDropzone.tsx';
import { ProcessingView } from './upload/components/ProcessingView.tsx';
import { SummaryView } from './upload/components/SummaryView.tsx';
import { UploadProgressView } from './upload/components/UploadProgressView.tsx';
import { ResultsView } from './upload/components/ResultsView.tsx';
import { ColumnMappingModal } from './upload/components/ColumnMappingModal.tsx';

export function InventoryUploadPage() {
  const navigate = useNavigate();
  const { canWrite } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('file');
  const [fileName, setFileName] = useState('');

  // Processing state
  const [parseProgress, setParseProgress] = useState(0);
  const [validateProgress, setValidateProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<'parsing' | 'validating'>('parsing');

  // Data state
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Column mapping modal
  const [showMappingModal, setShowMappingModal] = useState(false);

  // Error state
  const [fatalError, setFatalError] = useState('');

  // Permission check
  if (!canWrite('inventory')) {
    return (
      <div className="rh-alert rh-alert-error">
        No tienes permisos para cargar inventario
      </div>
    );
  }

  const handleFileSelected = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setStep('processing');
      setProcessingPhase('parsing');
      setParseProgress(0);
      setFatalError('');

      try {
        // Step 1: Parse file
        const parseResult = await parseFile(file, setParseProgress);
        setRawRows(parseResult.rows);
        setColumnMappings(parseResult.columnMappings);

        if (parseResult.rows.length === 0) {
          setFatalError(
            'El archivo no contiene datos (solo encabezados o esta vacio)',
          );
          setStep('file');
          return;
        }

        // Step 2: Validate rows
        setProcessingPhase('validating');
        setValidateProgress(0);
        const result = await validateRows(
          parseResult.rows,
          parseResult.columnMappings,
          setValidateProgress,
        );
        setProcessingResult(result);
        setStep('summary');
      } catch (err) {
        setFatalError(
          err instanceof Error
            ? err.message
            : 'Error desconocido al procesar el archivo',
        );
        setStep('file');
      }
    },
    [],
  );

  const handleMappingsChanged = useCallback(
    async (newMappings: ColumnMapping[]) => {
      setColumnMappings(newMappings);
      // Re-validate with new mappings
      setStep('processing');
      setProcessingPhase('validating');
      setValidateProgress(0);
      const result = await validateRows(rawRows, newMappings, setValidateProgress);
      setProcessingResult(result);
      setStep('summary');
    },
    [rawRows],
  );

  const handleConfirmUpload = useCallback(async () => {
    if (!processingResult || !organization || !user) return;

    setStep('uploading');
    const finalProgress = await uploadProducts(
      processingResult.validRows,
      organization.id,
      setUploadProgress,
    );

    // Log to bulk_uploads table
    await logBulkUpload(
      organization.id,
      user.id,
      fileName,
      processingResult.totalRows,
      finalProgress.successCount,
      finalProgress.errorCount,
      finalProgress.errors.length > 0 ? finalProgress.errors : null,
    );

    setUploadProgress(finalProgress);
    setStep('results');
  }, [processingResult, organization, user, fileName]);

  const handleReset = useCallback(() => {
    setStep('file');
    setFileName('');
    setRawRows([]);
    setColumnMappings([]);
    setProcessingResult(null);
    setUploadProgress(null);
    setFatalError('');
  }, []);

  return (
    <div>
      <div className="rh-page-header">
        <div>
          <h1 className="rh-page-title">Carga Masiva de Inventario</h1>
          <p className="rh-page-subtitle">
            Sube un archivo CSV o Excel con tus productos para cargarlos
            masivamente
          </p>
        </div>
        <button
          onClick={() => navigate('/hub/inventory')}
          className="rh-btn rh-btn-ghost"
        >
          Volver al Inventario
        </button>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Fatal error */}
      {fatalError && (
        <div className="rh-alert rh-alert-error mb-4">{fatalError}</div>
      )}

      {/* Step content */}
      {step === 'file' && (
        <FileDropzone onFileSelected={handleFileSelected} />
      )}

      {step === 'processing' && (
        <ProcessingView
          phase={processingPhase}
          progress={
            processingPhase === 'parsing' ? parseProgress : validateProgress
          }
          fileName={fileName}
        />
      )}

      {step === 'summary' && processingResult && (
        <SummaryView
          result={processingResult}
          mappings={columnMappings}
          fileName={fileName}
          onConfirm={handleConfirmUpload}
          onCancel={handleReset}
          onEditMappings={() => setShowMappingModal(true)}
        />
      )}

      {step === 'uploading' && uploadProgress && (
        <UploadProgressView progress={uploadProgress} />
      )}

      {step === 'results' && uploadProgress && (
        <ResultsView
          progress={uploadProgress}
          fileName={fileName}
          onUploadAnother={handleReset}
        />
      )}

      {/* Column mapping modal */}
      <ColumnMappingModal
        open={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        mappings={columnMappings}
        onSave={handleMappingsChanged}
      />
    </div>
  );
}
