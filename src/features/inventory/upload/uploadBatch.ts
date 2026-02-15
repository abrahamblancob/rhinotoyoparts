import { supabase } from '@/lib/supabase.ts';
import type { ValidatedProduct, UploadProgress } from './types.ts';
import { UPLOAD_BATCH_SIZE } from './constants.ts';

/**
 * Upload validated products to Supabase in batches.
 * If a batch fails, retries row-by-row to identify which specific rows failed.
 */
export async function uploadProducts(
  products: ValidatedProduct[],
  orgId: string,
  onProgress: (progress: UploadProgress) => void,
): Promise<UploadProgress> {
  const batches: ValidatedProduct[][] = [];
  for (let i = 0; i < products.length; i += UPLOAD_BATCH_SIZE) {
    batches.push(products.slice(i, i + UPLOAD_BATCH_SIZE));
  }

  const progress: UploadProgress = {
    totalBatches: batches.length,
    completedBatches: 0,
    successCount: 0,
    errorCount: 0,
    currentBatch: 0,
    errors: [],
  };

  for (let i = 0; i < batches.length; i++) {
    progress.currentBatch = i + 1;
    onProgress({ ...progress });

    const batch = batches[i];
    const insertData = batch.map((p) => ({
      org_id: orgId,
      sku: p.sku,
      name: p.name,
      description: p.description,
      brand: p.brand,
      oem_number: p.oem_number,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      min_stock: p.min_stock,
      status: p.status,
    }));

    const { error } = await supabase.from('products').insert(insertData);

    if (error) {
      // Batch failed — retry individually to find which rows failed
      for (const product of batch) {
        const { error: singleErr } = await supabase.from('products').insert({
          org_id: orgId,
          sku: product.sku,
          name: product.name,
          description: product.description,
          brand: product.brand,
          oem_number: product.oem_number,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          min_stock: product.min_stock,
          status: product.status,
        });

        if (singleErr) {
          progress.errorCount++;
          progress.errors.push({
            rowNumber: product.rowNumber,
            message: singleErr.message.includes('duplicate')
              ? `SKU "${product.sku}" ya existe en la base de datos`
              : singleErr.message,
          });
        } else {
          progress.successCount++;
        }
      }
    } else {
      progress.successCount += batch.length;
    }

    progress.completedBatches = i + 1;
    onProgress({ ...progress });
  }

  return progress;
}

/**
 * Log the bulk upload result to the bulk_uploads table.
 */
export async function logBulkUpload(
  orgId: string,
  userId: string,
  fileName: string,
  totalRows: number,
  successRows: number,
  errorRows: number,
  errorsJson: Array<{ rowNumber: number; message: string }> | null,
): Promise<void> {
  await supabase.from('bulk_uploads').insert({
    org_id: orgId,
    uploaded_by: userId,
    file_name: fileName,
    total_rows: totalRows,
    success_rows: successRows,
    error_rows: errorRows,
    status: 'completed',
    errors_json: errorsJson,
  });
}
