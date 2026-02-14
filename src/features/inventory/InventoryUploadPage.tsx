import { useState } from 'react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';

export function InventoryUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);

  const handleUpload = async () => {
    if (!file || !organization || !user) return;
    setUploading(true);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1);

      let success = 0;
      let errors = 0;

      for (const row of rows) {
        const cols = row.split(',').map((c) => c.trim());
        const record: Record<string, string> = {};
        headers.forEach((h, i) => { record[h] = cols[i] ?? ''; });

        const { error: insertErr } = await supabase.from('products').insert({
          org_id: organization.id,
          sku: record['sku'] || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: record['nombre'] || record['name'] || 'Sin nombre',
          description: record['descripcion'] || record['description'] || null,
          brand: record['marca'] || record['brand'] || null,
          oem_number: record['oem'] || record['oem_number'] || null,
          price: parseFloat(record['precio'] || record['price'] || '0') || 0,
          cost: parseFloat(record['costo'] || record['cost'] || '0') || null,
          stock: parseInt(record['stock'] || record['cantidad'] || '0', 10) || 0,
          min_stock: parseInt(record['stock_minimo'] || record['min_stock'] || '5', 10) || 5,
          status: 'active',
        });

        if (insertErr) {
          errors++;
        } else {
          success++;
        }
      }

      // Log the upload
      await supabase.from('bulk_uploads').insert({
        org_id: organization.id,
        uploaded_by: user.id,
        file_name: file.name,
        total_rows: rows.length,
        success_rows: success,
        error_rows: errors,
        status: errors === 0 ? 'completed' : 'completed',
      });

      setResult({ success, errors, total: rows.length });
    } catch {
      setError('Error al procesar el archivo. Verifica el formato CSV.');
    }

    setUploading(false);
  };

  return (
    <div>
      <div className="rh-page-header">
        <h1 className="rh-page-title">Carga de Inventario</h1>
        <p className="rh-page-subtitle">
          Sube un archivo CSV con tus productos para cargarlos masivamente
        </p>
      </div>

      {/* Instructions */}
      <div className="rh-card mb-6">
        <h3 className="rh-card-title">Formato del archivo CSV</h3>
        <p className="rh-page-subtitle mb-3">
          El archivo debe contener las siguientes columnas (separadas por comas):
        </p>
        <div className="rh-code-block">
          sku,nombre,descripcion,marca,oem,precio,costo,stock,stock_minimo<br />
          TOY-001,Pastillas de freno Toyota,Pastillas delanteras,Toyota,04465-33471,25.50,15.00,100,10<br />
          TOY-002,Filtro de aceite,Filtro original,Toyota,90915-YZZD1,8.99,4.50,200,20
        </div>
      </div>

      {/* Upload area */}
      <div className="rh-card">
        <div
          className={`rh-dropzone ${file ? 'active' : ''}`}
        >
          <span className="rh-dropzone-icon">{file ? '📄' : '📤'}</span>
          {file ? (
            <div>
              <p className="rh-dropzone-title">{file.name}</p>
              <p className="rh-dropzone-subtitle">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setFile(null)}
                  className="rh-btn rh-btn-ghost"
                >
                  Cambiar archivo
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rh-btn rh-btn-primary"
                >
                  {uploading ? 'Procesando...' : 'Subir Productos'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="rh-dropzone-title">
                Arrastra tu archivo CSV aquí
              </p>
              <p className="rh-dropzone-subtitle">o haz clic para seleccionar</p>
              <label className="rh-btn rh-btn-primary mt-4 inline-block">
                Seleccionar archivo
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}
        </div>

        {error && (
          <div className="rh-alert rh-alert-error mt-4">
            {error}
          </div>
        )}

        {result && (
          <div className={`rh-alert ${result.errors === 0 ? 'rh-alert-success' : 'rh-alert-warning'} mt-4`}>
            <p className="font-semibold mb-1">
              {result.errors === 0 ? 'Carga completada exitosamente' : 'Carga completada con errores'}
            </p>
            <p>
              {result.success} de {result.total} productos cargados correctamente.
              {result.errors > 0 && ` ${result.errors} errores.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
