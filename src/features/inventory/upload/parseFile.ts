import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { RawRow, ColumnMapping } from './types.ts';
import { HEADER_ALIASES } from './constants.ts';

export interface ParseResult {
  headers: string[];
  rows: RawRow[];
  columnMappings: ColumnMapping[];
  sheetName: string;
}

/**
 * Parse a file (CSV or Excel) into raw rows with auto-detected column mappings.
 * CSV uses PapaParse (with worker for large files).
 * Excel uses SheetJS in main thread (fast enough for <10K rows).
 */
export async function parseFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return parseCsv(file, onProgress);
  }
  return parseExcel(file, onProgress);
}

async function parseExcel(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParseResult> {
  onProgress?.(10);
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(30);

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  onProgress?.(50);

  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  onProgress?.(70);

  if (aoa.length === 0) {
    throw new Error('El archivo esta vacio');
  }

  const headers = (aoa[0] as unknown[]).map((h) => String(h).trim());
  const rows: RawRow[] = aoa
    .slice(1)
    .filter((row) => (row as unknown[]).some((cell) => String(cell).trim() !== ''))
    .map((row, idx) => {
      const data: Record<string, string> = {};
      headers.forEach((h, i) => {
        data[h] = String((row as unknown[])[i] ?? '').trim();
      });
      return { rowNumber: idx + 2, data };
    });

  onProgress?.(90);
  const columnMappings = autoDetectMappings(headers);
  onProgress?.(100);

  return { headers, rows, columnMappings, sheetName };
}

function parseCsv(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const rows: RawRow[] = [];
    let headers: string[] = [];
    let isFirstRow = true;
    let rowCount = 0;

    Papa.parse(file, {
      worker: file.size > 500_000,
      header: false,
      skipEmptyLines: true,
      step(result) {
        const row = result.data as string[];
        if (isFirstRow) {
          headers = row.map((h) => String(h).trim());
          isFirstRow = false;
          return;
        }
        rowCount++;
        const data: Record<string, string> = {};
        headers.forEach((h, i) => {
          data[h] = String(row[i] ?? '').trim();
        });
        rows.push({ rowNumber: rowCount + 1, data });
      },
      complete() {
        const columnMappings = autoDetectMappings(headers);
        onProgress?.(100);
        resolve({ headers, rows, columnMappings, sheetName: 'CSV' });
      },
      error(err: Error) {
        reject(new Error(`Error al leer CSV: ${err.message}`));
      },
    });
  });
}

/** Auto-detect column mappings from header names */
function autoDetectMappings(headers: string[]): ColumnMapping[] {
  return headers.map((h) => {
    const normalized = h.toLowerCase().trim().replace(/\s+/g, '_');
    const match = HEADER_ALIASES[normalized] ?? null;
    return {
      fileHeader: h,
      productField: match,
      autoDetected: match !== null,
    };
  });
}
