import { useState, useRef, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

const ACCEPTED = '.csv,.xlsx,.xls,.ods,.tsv';
const VALID_EXTENSIONS = ['csv', 'xlsx', 'xls', 'ods', 'tsv'];

interface Props {
  onFileSelected: (file: File) => void;
}

export function FileDropzone({ onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!VALID_EXTENSIONS.includes(ext)) {
      setError(`Formato no soportado: .${ext}. Usa CSV, XLSX, XLS u ODS.`);
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('El archivo es demasiado grande (maximo 50MB)');
      return false;
    }
    setError('');
    return true;
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        onFileSelected(file);
      }
    },
    [onFileSelected, validateFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        onFileSelected(file);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFileSelected, validateFile],
  );

  return (
    <div className="rh-card">
      {/* Process explanation */}
      <div style={{ marginBottom: 20 }}>
        <h3 className="rh-card-title">Como funciona la carga masiva</h3>
        <ol
          style={{
            fontSize: 14,
            color: '#8A8886',
            paddingLeft: 20,
            lineHeight: 1.8,
          }}
        >
          <li>Selecciona tu archivo (CSV, Excel, ODS)</li>
          <li>El sistema procesa y valida los datos en tu navegador</li>
          <li>Revisa el resumen y corrige errores si es necesario</li>
          <li>Confirma para enviar los productos a la base de datos</li>
        </ol>
      </div>

      <div
        className={`rh-dropzone ${isDragging ? 'active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <span className="rh-dropzone-icon">📤</span>
        <p className="rh-dropzone-title">Arrastra tu archivo aqui</p>
        <p className="rh-dropzone-subtitle">
          Formatos soportados: CSV, XLSX, XLS, ODS (max 50MB)
        </p>
        <label className="rh-btn rh-btn-primary mt-4" style={{ display: 'inline-flex', cursor: 'pointer' }}>
          Seleccionar archivo
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleInputChange}
          />
        </label>
      </div>

      {error && <div className="rh-alert rh-alert-error mt-4">{error}</div>}

      {/* Format example */}
      <div style={{ marginTop: 20 }}>
        <h3 className="rh-card-title">Formato esperado</h3>
        <p className="rh-page-subtitle mb-3">
          El archivo debe contener una fila de encabezados. Se aceptan nombres en
          espanol o ingles:
        </p>
        <div className="rh-code-block">
          sku,nombre,descripcion,marca,oem,precio,costo,stock,stock_minimo
          <br />
          TOY-001,Pastillas de freno,Pastillas delanteras,Toyota,04465-33471,25.50,15.00,100,10
        </div>
      </div>
    </div>
  );
}
