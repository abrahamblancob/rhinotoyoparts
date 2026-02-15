import type { RawRow, ColumnMapping, ValidatedProduct, RowError, ProcessingResult } from './types.ts';
import { VALIDATION_CHUNK_SIZE } from './constants.ts';

/**
 * Validate all rows against business rules.
 * Processes in chunks via requestAnimationFrame to avoid blocking the main thread.
 */
export function validateRows(
  rows: RawRow[],
  mappings: ColumnMapping[],
  onProgress: (pct: number) => void,
): Promise<ProcessingResult> {
  return new Promise((resolve) => {
    const validRows: ValidatedProduct[] = [];
    const errors: RowError[] = [];
    const warnings: string[] = [];
    const skuSet = new Set<string>();
    const duplicateSkus: string[] = [];

    // Build lookup: productField → fileHeader
    const fieldToHeader: Record<string, string> = {};
    for (const m of mappings) {
      if (m.productField) {
        fieldToHeader[m.productField] = m.fileHeader;
      }
    }

    const getValue = (row: RawRow, field: string): string => {
      const header = fieldToHeader[field];
      if (!header) return '';
      return row.data[header] ?? '';
    };

    let index = 0;

    function processChunk() {
      const end = Math.min(index + VALIDATION_CHUNK_SIZE, rows.length);

      for (; index < end; index++) {
        const row = rows[index];
        const rowErrors: RowError[] = [];

        // --- name (required) ---
        const name = getValue(row, 'name').trim();
        if (!name) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'nombre',
            value: '',
            message: 'El nombre del producto es requerido',
          });
        }

        // --- price (required, positive number) ---
        const priceStr = getValue(row, 'price');
        const price = parseFloat(priceStr);
        if (!priceStr || isNaN(price) || price < 0) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'precio',
            value: priceStr,
            message: 'El precio debe ser un numero positivo',
          });
        }

        // --- stock (required, non-negative integer) ---
        const stockStr = getValue(row, 'stock');
        const stock = parseInt(stockStr, 10);
        if (stockStr === '' || isNaN(stock) || stock < 0) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'stock',
            value: stockStr,
            message: 'El stock debe ser un entero no negativo',
          });
        }

        // --- cost (optional, positive number if provided) ---
        const costStr = getValue(row, 'cost');
        let cost: number | null = null;
        if (costStr) {
          cost = parseFloat(costStr);
          if (isNaN(cost) || cost < 0) {
            rowErrors.push({
              rowNumber: row.rowNumber,
              field: 'costo',
              value: costStr,
              message: 'El costo debe ser un numero positivo',
            });
            cost = null;
          }
        }

        // --- min_stock (optional, non-negative integer) ---
        const minStockStr = getValue(row, 'min_stock');
        let minStock = 5;
        if (minStockStr) {
          minStock = parseInt(minStockStr, 10);
          if (isNaN(minStock) || minStock < 0) {
            rowErrors.push({
              rowNumber: row.rowNumber,
              field: 'stock_minimo',
              value: minStockStr,
              message: 'El stock minimo debe ser un entero no negativo',
            });
            minStock = 5;
          }
        }

        // --- sku (auto-generate if empty, check duplicates) ---
        let sku = getValue(row, 'sku').trim();
        if (!sku) {
          sku = `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }
        if (skuSet.has(sku)) {
          duplicateSkus.push(sku);
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'sku',
            value: sku,
            message: `SKU duplicado en el archivo: "${sku}"`,
          });
        }
        skuSet.add(sku);

        // --- status (optional, default 'active') ---
        const statusStr = getValue(row, 'status').toLowerCase();
        const validStatuses = ['active', 'inactive', 'out_of_stock'];
        const status = validStatuses.includes(statusStr)
          ? (statusStr as 'active' | 'inactive' | 'out_of_stock')
          : 'active';

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
        } else {
          validRows.push({
            rowNumber: row.rowNumber,
            name,
            sku,
            description: getValue(row, 'description').trim() || null,
            brand: getValue(row, 'brand').trim() || null,
            oem_number: getValue(row, 'oem_number').trim() || null,
            price,
            cost,
            stock,
            min_stock: minStock,
            status,
          });
        }
      }

      const pct = Math.round((index / rows.length) * 100);
      onProgress(pct);

      if (index < rows.length) {
        requestAnimationFrame(processChunk);
      } else {
        if (duplicateSkus.length > 0) {
          warnings.push(
            `Se encontraron ${duplicateSkus.length} SKU(s) duplicados en el archivo`,
          );
        }
        const unmappedCount = mappings.filter((m) => !m.productField).length;
        if (unmappedCount > 0) {
          warnings.push(
            `${unmappedCount} columna(s) del archivo no fueron mapeadas a campos del producto`,
          );
        }

        resolve({
          totalRows: rows.length,
          validRows,
          errors,
          duplicateSkus,
          warnings,
        });
      }
    }

    requestAnimationFrame(processChunk);
  });
}
