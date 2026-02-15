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
  // Smooth animated progress: we split work into stages and yield to UI between them
  const reportProgress = async (pct: number) => {
    onProgress?.(pct);
    // Yield to the main thread so the UI can repaint the progress bar
    await new Promise((r) => setTimeout(r, 0));
  };

  await reportProgress(5);

  // Stage 1: Read file into ArrayBuffer (5% → 25%)
  const arrayBuffer = await file.arrayBuffer();
  await reportProgress(25);

  // Stage 2: Parse workbook (25% → 50%)
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  await reportProgress(50);

  // Stage 3: Convert to array of arrays (50% → 65%)
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  await reportProgress(65);

  if (aoa.length === 0) {
    throw new Error('El archivo esta vacio');
  }

  // Auto-detect the header row: find the first row with at least 2 non-empty cells
  // This handles files where row 1 is empty or has a title, and headers are in row 2+
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(aoa.length, 10); r++) {
    const row = aoa[r] as unknown[];
    const nonEmptyCells = row.filter((cell) => String(cell).trim() !== '').length;
    if (nonEmptyCells >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  // Build headers, assigning placeholder names to empty columns to avoid key collisions
  const rawHeaders = (aoa[headerRowIndex] as unknown[]).map((h) => String(h).trim());
  const seenHeaders = new Set<string>();
  const headers = rawHeaders.map((h, i) => {
    let name = h || `Columna ${i + 1}`;
    // Deduplicate: if same header appears twice, append index
    while (seenHeaders.has(name)) {
      name = `${name} (${i + 1})`;
    }
    seenHeaders.add(name);
    return name;
  });

  // Stage 4: Build rows with progress updates (65% → 90%)
  // Skip everything up to and including the header row
  const dataRows = aoa
    .slice(headerRowIndex + 1)
    .filter((row) => (row as unknown[]).some((cell) => String(cell).trim() !== ''));

  const rows: RawRow[] = [];
  const totalDataRows = dataRows.length;
  const CHUNK = 500;

  // Row numbers are relative to the original Excel file (1-based)
  // Header is at headerRowIndex+1 in Excel terms, data starts at headerRowIndex+2
  const dataStartExcelRow = headerRowIndex + 2;

  for (let i = 0; i < totalDataRows; i += CHUNK) {
    const end = Math.min(i + CHUNK, totalDataRows);
    for (let j = i; j < end; j++) {
      const row = dataRows[j];
      const data: Record<string, string> = {};
      headers.forEach((h, ci) => {
        data[h] = String((row as unknown[])[ci] ?? '').trim();
      });
      rows.push({ rowNumber: j + dataStartExcelRow, data });
    }
    // Report progress proportionally within the 65-90% range
    const pct = 65 + Math.round(((end / totalDataRows) * 25));
    await reportProgress(pct);
  }

  // Stage 5: Auto-detect column mappings (90% → 100%)
  await reportProgress(92);
  const columnMappings = autoDetectMappings(headers);
  await reportProgress(100);

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
