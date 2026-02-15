/** Raw row from file parsing, before validation */
export interface RawRow {
  rowNumber: number;
  data: Record<string, string>;
}

/** Column mapping: file header → product field */
export interface ColumnMapping {
  fileHeader: string;
  productField: string | null;
  autoDetected: boolean;
}

/** A single validation error */
export interface RowError {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
}

/** Validated product ready for insert */
export interface ValidatedProduct {
  rowNumber: number;
  name: string;
  sku: string;
  description: string | null;
  brand: string | null;
  oem_number: string | null;
  price: number;
  cost: number | null;
  stock: number;
  min_stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
}

/** Overall processing result */
export interface ProcessingResult {
  totalRows: number;
  validRows: ValidatedProduct[];
  errors: RowError[];
  duplicateSkus: string[];
  warnings: string[];
}

/** Upload progress state */
export interface UploadProgress {
  totalBatches: number;
  completedBatches: number;
  successCount: number;
  errorCount: number;
  currentBatch: number;
  errors: Array<{ rowNumber: number; message: string }>;
}

/** Wizard step */
export type WizardStep = 'file' | 'processing' | 'mapping' | 'summary' | 'uploading' | 'results';
