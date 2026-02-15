import { supabase } from '@/lib/supabase.ts';
import type { ValidatedProduct, UploadProgress } from './types.ts';
import { UPLOAD_BATCH_SIZE } from './constants.ts';

/** Inserted product with its DB-generated id */
interface InsertedProduct {
  rowNumber: number;
  dbId: string;
  sku: string;
  stock: number;
  cost: number | null;
  price: number;
}

/**
 * Upload validated products to Supabase in batches.
 * Returns progress AND list of successfully inserted product IDs (for lot entries).
 */
export async function uploadProducts(
  products: ValidatedProduct[],
  orgId: string,
  onProgress: (progress: UploadProgress) => void,
): Promise<{ progress: UploadProgress; insertedProducts: InsertedProduct[] }> {
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

  const insertedProducts: InsertedProduct[] = [];

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

    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
      .select('id, sku');

    if (error) {
      // Batch failed — retry individually to find which rows failed
      for (const product of batch) {
        const { data: singleData, error: singleErr } = await supabase
          .from('products')
          .insert({
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
          })
          .select('id, sku');

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
          if (singleData?.[0]) {
            insertedProducts.push({
              rowNumber: product.rowNumber,
              dbId: singleData[0].id,
              sku: product.sku,
              stock: product.stock,
              cost: product.cost,
              price: product.price,
            });
          }
        }
      }
    } else {
      progress.successCount += batch.length;
      // Map inserted DB ids back to product data
      if (data) {
        for (const dbRow of data) {
          const original = batch.find((p) => p.sku === dbRow.sku);
          if (original) {
            insertedProducts.push({
              rowNumber: original.rowNumber,
              dbId: dbRow.id,
              sku: original.sku,
              stock: original.stock,
              cost: original.cost,
              price: original.price,
            });
          }
        }
      }
    }

    progress.completedBatches = i + 1;
    onProgress({ ...progress });
  }

  return { progress, insertedProducts };
}

/**
 * Generate the next lot number for an organization.
 * Format: LOT-YYYY-NNNN (e.g., LOT-2026-0001)
 */
async function generateLotNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LOT-${year}-`;

  const { data } = await supabase
    .from('inventory_lots')
    .select('lot_number')
    .eq('org_id', orgId)
    .like('lot_number', `${prefix}%`)
    .order('lot_number', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].lot_number.replace(prefix, ''), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

/**
 * Create an inventory lot and its product entries.
 * Links the bulk upload log to the lot.
 */
export async function createInventoryLot(
  orgId: string,
  userId: string,
  fileName: string,
  insertedProducts: InsertedProduct[],
): Promise<string | null> {
  if (insertedProducts.length === 0) return null;

  const lotNumber = await generateLotNumber(orgId);

  const totalStock = insertedProducts.reduce((s, p) => s + p.stock, 0);
  const totalCost = insertedProducts.reduce(
    (s, p) => s + p.stock * (p.cost ?? 0),
    0,
  );
  const totalRetailValue = insertedProducts.reduce(
    (s, p) => s + p.stock * p.price,
    0,
  );

  // Create the lot
  const { data: lotData, error: lotError } = await supabase
    .from('inventory_lots')
    .insert({
      org_id: orgId,
      uploaded_by: userId,
      lot_number: lotNumber,
      file_name: fileName,
      total_products: insertedProducts.length,
      total_stock: totalStock,
      total_cost: totalCost,
      total_retail_value: totalRetailValue,
      status: 'active',
    })
    .select('id')
    .single();

  if (lotError || !lotData) {
    console.error('Error creating inventory lot:', lotError);
    return null;
  }

  const lotId = lotData.id;

  // Create lot entries in batches
  const entries = insertedProducts.map((p) => ({
    lot_id: lotId,
    product_id: p.dbId,
    initial_stock: p.stock,
    remaining_stock: p.stock,
    unit_cost: p.cost ?? 0,
    unit_price: p.price,
  }));

  for (let i = 0; i < entries.length; i += UPLOAD_BATCH_SIZE) {
    const batch = entries.slice(i, i + UPLOAD_BATCH_SIZE);
    const { error } = await supabase.from('product_lot_entries').insert(batch);
    if (error) {
      console.error('Error creating lot entries batch:', error);
    }
  }

  return lotId;
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
  totalStock?: number,
  inventoryValue?: number,
  lotId?: string | null,
): Promise<void> {
  await supabase.from('bulk_uploads').insert({
    org_id: orgId,
    uploaded_by: userId,
    lot_id: lotId ?? null,
    file_name: fileName,
    total_rows: totalRows,
    success_rows: successRows,
    error_rows: errorRows,
    total_stock: totalStock ?? 0,
    inventory_value: inventoryValue ?? 0,
    status: 'completed',
    errors_json: errorsJson,
  });
}

/**
 * Delete an inventory lot and all its associated products.
 * Steps: 1) Get product IDs from lot entries, 2) Delete products, 3) Delete lot (cascades entries).
 * Returns { success, error?, deletedProducts? }
 */
export async function deleteLot(
  lotId: string,
): Promise<{ success: boolean; error?: string; deletedProducts?: number }> {
  // 1. Get all product IDs linked to this lot
  const { data: entries, error: entriesErr } = await supabase
    .from('product_lot_entries')
    .select('product_id')
    .eq('lot_id', lotId);

  if (entriesErr) {
    return { success: false, error: `Error al leer entradas del lote: ${entriesErr.message}` };
  }

  const productIds = (entries ?? []).map((e) => e.product_id);

  // 2. Check if any product has orders (protect sold inventory)
  if (productIds.length > 0) {
    const { count, error: orderCheckErr } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .in('product_id', productIds);

    if (orderCheckErr) {
      return { success: false, error: `Error al verificar ordenes: ${orderCheckErr.message}` };
    }

    if (count && count > 0) {
      return {
        success: false,
        error: `No se puede eliminar: ${count} producto(s) de este lote ya tienen ordenes asociadas`,
      };
    }
  }

  // 3. Delete the products (in batches to avoid hitting limits)
  if (productIds.length > 0) {
    for (let i = 0; i < productIds.length; i += UPLOAD_BATCH_SIZE) {
      const batch = productIds.slice(i, i + UPLOAD_BATCH_SIZE);
      const { error: delErr } = await supabase
        .from('products')
        .delete()
        .in('id', batch);

      if (delErr) {
        return { success: false, error: `Error al eliminar productos: ${delErr.message}` };
      }
    }
  }

  // 4. Delete the lot (product_lot_entries cascade automatically)
  const { error: lotDelErr } = await supabase
    .from('inventory_lots')
    .delete()
    .eq('id', lotId);

  if (lotDelErr) {
    return { success: false, error: `Error al eliminar lote: ${lotDelErr.message}` };
  }

  return { success: true, deletedProducts: productIds.length };
}

/**
 * Fetch recent bulk uploads for an organization, including the uploader's name and lot number.
 */
export async function fetchRecentUploads(orgId: string) {
  const { data, error } = await supabase
    .from('bulk_uploads')
    .select('*, profiles:uploaded_by(full_name), inventory_lots:lot_id(lot_number)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent uploads:', error);
    return [];
  }

  return data ?? [];
}
