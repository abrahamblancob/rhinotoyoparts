import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore.ts';
import { usePermissions } from '@/hooks/usePermissions.ts';
import { supabase } from '@/lib/supabase.ts';
import type { Organization, Supplier } from '@/lib/database.types.ts';
import { getAllActiveSuppliers } from '@/services/supplierService.ts';

import type {
  WizardStep,
  RawRow,
  ColumnMapping,
  ProcessingResult,
  UploadProgress,
} from './upload/types.ts';

import { parseFile } from './upload/parseFile.ts';
import { validateRows } from './upload/validateRows.ts';
import { uploadProducts, logBulkUpload, createInventoryLot } from './upload/uploadBatch.ts';
import { smartMapColumns } from './upload/smartMapping.ts';
import type { SmartMappingResult } from './upload/smartMapping.ts';

import { StepIndicator } from './upload/components/StepIndicator.tsx';
import { FileDropzone } from './upload/components/FileDropzone.tsx';
import { ProcessingView } from './upload/components/ProcessingView.tsx';
import { SmartMappingView } from './upload/components/SmartMappingView.tsx';
import { SummaryView } from './upload/components/SummaryView.tsx';
import { UploadProgressView } from './upload/components/UploadProgressView.tsx';
import { ResultsView } from './upload/components/ResultsView.tsx';
import { ColumnMappingModal } from './upload/components/ColumnMappingModal.tsx';
import { RecentUploadsTable } from './upload/components/RecentUploadsTable.tsx';

export function InventoryUploadPage() {
  const navigate = useNavigate();
  const { canWrite, isPlatform } = usePermissions();
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);

  // Target organization selector (for platform users)
  const [targetOrgId, setTargetOrgId] = useState(organization?.id ?? '');
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);

  // Supplier selector
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  useEffect(() => {
    if (isPlatform) {
      supabase
        .from('organizations')
        .select('*')
        .in('type', ['aggregator', 'associate'])
        .eq('status', 'active')
        .order('name')
        .then(({ data }) => {
          setAvailableOrgs((data as Organization[]) ?? []);
          // Default to first aggregator if current is platform
          if (organization?.type === 'platform' && data?.length) {
            setTargetOrgId(data[0].id);
          }
        });
    } else {
      setTargetOrgId(organization?.id ?? '');
    }
  }, [isPlatform, organization]);

  // Load active suppliers
  useEffect(() => {
    getAllActiveSuppliers().then(({ data }) => {
      setSuppliers(data ?? []);
    });
  }, []);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('file');
  const [fileName, setFileName] = useState('');

  // Processing state
  const [parseProgress, setParseProgress] = useState(0);
  const [validateProgress, setValidateProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<'parsing' | 'mapping' | 'validating'>('parsing');

  // Data state
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [smartMappingResult, setSmartMappingResult] = useState<SmartMappingResult | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Column mapping modal
  const [showMappingModal, setShowMappingModal] = useState(false);

  // Error state
  const [fatalError, setFatalError] = useState('');

  // Refresh key to re-fetch recent uploads after a new upload
  const [uploadsRefreshKey, setUploadsRefreshKey] = useState(0);

  // Permission check
  if (!canWrite('inventory')) {
    return (
      <div className="rh-alert rh-alert-error">
        No tienes permisos para cargar inventario
      </div>
    );
  }

  // Step 1: File selected → parse → smart mapping → show mapping view
  const handleFileSelected = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setStep('processing');
      setProcessingPhase('parsing');
      setParseProgress(0);
      setFatalError('');

      try {
        // Parse file
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

        // Smart mapping (AI or heuristics)
        setProcessingPhase('mapping');
        const mappingResult = await smartMapColumns(
          parseResult.headers,
          parseResult.rows,
          parseResult.columnMappings,
        );
        setSmartMappingResult(mappingResult);
        setColumnMappings(mappingResult.mappings);
        setStep('mapping');
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

  // Step 2: User accepts mapping → validate → show summary
  const handleAcceptMapping = useCallback(
    async (acceptedMappings: ColumnMapping[]) => {
      setColumnMappings(acceptedMappings);
      setStep('processing');
      setProcessingPhase('validating');
      setValidateProgress(0);

      const result = await validateRows(rawRows, acceptedMappings, setValidateProgress);
      setProcessingResult(result);
      setStep('summary');
    },
    [rawRows],
  );

  // Re-validate from summary (when user edits mapping from summary view)
  const handleMappingsChangedFromSummary = useCallback(
    async (newMappings: ColumnMapping[]) => {
      setColumnMappings(newMappings);
      setStep('processing');
      setProcessingPhase('validating');
      setValidateProgress(0);
      const result = await validateRows(rawRows, newMappings, setValidateProgress);
      setProcessingResult(result);
      setStep('summary');
    },
    [rawRows],
  );

  // Step 3: User confirms upload → batch insert → show results
  const handleConfirmUpload = useCallback(async () => {
    if (!processingResult || !targetOrgId || !user) return;

    setStep('uploading');
    const { progress: finalProgress, insertedProducts } = await uploadProducts(
      processingResult.validRows,
      targetOrgId,
      setUploadProgress,
    );

    // Calculate inventory totals for logging
    const totalStock = insertedProducts.reduce((sum, p) => sum + p.stock, 0);
    const inventoryValue = insertedProducts.reduce(
      (sum, p) => sum + p.stock * p.price,
      0,
    );

    // Create inventory lot with product entries
    const lotId = await createInventoryLot(
      targetOrgId,
      user.id,
      fileName,
      insertedProducts,
    );

    // Log to bulk_uploads table (linked to lot)
    await logBulkUpload(
      targetOrgId,
      user.id,
      fileName,
      processingResult.totalRows,
      finalProgress.successCount,
      finalProgress.errorCount,
      finalProgress.errors.length > 0 ? finalProgress.errors : null,
      totalStock,
      inventoryValue,
      lotId,
      selectedSupplierId || null,
    );

    setUploadProgress(finalProgress);
    setUploadsRefreshKey((k) => k + 1);
    setStep('results');
  }, [processingResult, targetOrgId, user, fileName, selectedSupplierId]);

  // Navigate back to a specific step (preserving state)
  const handleGoToStep = useCallback(
    (target: WizardStep) => {
      // Only allow navigating to steps where we have data
      if (target === 'file') {
        setStep('file');
      } else if (target === 'mapping' && smartMappingResult) {
        setStep('mapping');
      } else if (target === 'summary' && processingResult) {
        setStep('summary');
      }
    },
    [smartMappingResult, processingResult],
  );

  // Go back from mapping → file (re-select file)
  const handleBackFromMapping = useCallback(() => {
    setStep('file');
  }, []);

  // Go back from summary → mapping (re-edit column assignments)
  const handleBackFromSummary = useCallback(() => {
    if (smartMappingResult) {
      setStep('mapping');
    }
  }, [smartMappingResult]);

  // Reset wizard to start
  const handleReset = useCallback(() => {
    setStep('file');
    setFileName('');
    setRawRows([]);
    setColumnMappings([]);
    setSmartMappingResult(null);
    setProcessingResult(null);
    setUploadProgress(null);
    setFatalError('');
    setSelectedSupplierId('');
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

      {/* Organization selector for platform users */}
      {isPlatform && availableOrgs.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#FFF7ED',
          border: '1px solid #FDBA74',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#9A3412', whiteSpace: 'nowrap' }}>
            Cargar inventario para:
          </span>
          <select
            value={targetOrgId}
            onChange={(e) => {
              setTargetOrgId(e.target.value);
              setUploadsRefreshKey((k) => k + 1);
            }}
            className="rh-select"
            style={{ maxWidth: 350 }}
          >
            {availableOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.type === 'aggregator' ? 'Agregador' : 'Asociado'})
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#B45309' }}>
            Los productos se asignarán a la organización seleccionada
          </span>
        </div>
      )}

      {/* Supplier selector */}
      {suppliers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#F0F9FF',
          border: '1px solid #7DD3FC',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0C4A6E', whiteSpace: 'nowrap' }}>
            🚚 Proveedor:
          </span>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="rh-select"
            style={{ maxWidth: 300 }}
          >
            <option value="">— Sin proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#0369A1' }}>
            El proveedor se asociará al registro de carga
          </span>
        </div>
      )}

      {/* Step indicator */}
      <StepIndicator currentStep={step} onStepClick={handleGoToStep} />

      {/* Fatal error */}
      {fatalError && (
        <div className="rh-alert rh-alert-error mb-4">{fatalError}</div>
      )}

      {/* Step 1: File selection */}
      {step === 'file' && (
        <FileDropzone onFileSelected={handleFileSelected} />
      )}

      {/* Processing indicator (parsing / mapping / validating) */}
      {step === 'processing' && (
        <ProcessingView
          phase={processingPhase}
          progress={
            processingPhase === 'parsing'
              ? parseProgress
              : processingPhase === 'validating'
                ? validateProgress
                : 0
          }
          fileName={fileName}
        />
      )}

      {/* Step 2: Smart mapping review */}
      {step === 'mapping' && smartMappingResult && (
        <SmartMappingView
          result={smartMappingResult}
          rawRows={rawRows}
          onAccept={handleAcceptMapping}
          onCancel={handleReset}
          onBack={handleBackFromMapping}
        />
      )}

      {/* Step 3: Summary with preview */}
      {step === 'summary' && processingResult && (
        <SummaryView
          result={processingResult}
          mappings={columnMappings}
          fileName={fileName}
          onConfirm={handleConfirmUpload}
          onCancel={handleReset}
          onEditMappings={() => setShowMappingModal(true)}
          onBack={handleBackFromSummary}
        />
      )}

      {/* Step 4: Upload progress */}
      {step === 'uploading' && uploadProgress && (
        <UploadProgressView progress={uploadProgress} />
      )}

      {/* Step 5: Results */}
      {step === 'results' && uploadProgress && (
        <ResultsView
          progress={uploadProgress}
          fileName={fileName}
          onUploadAnother={handleReset}
        />
      )}

      {/* Recent uploads history — visible on file selection and results steps */}
      {(step === 'file' || step === 'results') && targetOrgId && (
        <div style={{ marginTop: 32 }}>
          <RecentUploadsTable orgId={targetOrgId} refreshKey={uploadsRefreshKey} />
        </div>
      )}

      {/* Column mapping modal (shared by mapping and summary steps) */}
      <ColumnMappingModal
        open={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        mappings={columnMappings}
        onSave={handleMappingsChangedFromSummary}
      />
    </div>
  );
}
