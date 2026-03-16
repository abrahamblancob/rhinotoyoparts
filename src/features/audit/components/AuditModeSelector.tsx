import { useState } from 'react';
import { Target, Dice1, Dice5 } from 'lucide-react';
import type { StockAuditType } from '@/types/warehouse.ts';

interface AuditModeSelectorProps {
  onSelect: (mode: StockAuditType, count?: number) => void;
}

export function AuditModeSelector({ onSelect }: AuditModeSelectorProps) {
  const [randomCount, setRandomCount] = useState(5);

  const modes: { type: StockAuditType; icon: typeof Target; title: string; description: string; color: string; bg: string }[] = [
    {
      type: 'manual',
      icon: Target,
      title: '1 Lugar Manual',
      description: 'Selecciona la ubicacion directamente en el mapa del almacen',
      color: '#3B82F6',
      bg: '#EFF6FF',
    },
    {
      type: 'random_single',
      icon: Dice1,
      title: '1 Lugar Aleatorio',
      description: 'El sistema seleccionara 1 ubicacion al azar con animacion tipo jackpot',
      color: '#F97316',
      bg: '#FFF7ED',
    },
    {
      type: 'random_multiple',
      icon: Dice5,
      title: 'X Lugares Aleatorios',
      description: 'Selecciona multiples ubicaciones al azar para auditar',
      color: '#8B5CF6',
      bg: '#F5F3FF',
    },
  ];

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', marginBottom: 16 }}>
        Selecciona el modo de auditoria
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.type}
              onClick={() => {
                if (mode.type === 'random_multiple') return; // handled by button inside
                onSelect(mode.type);
              }}
              style={{
                padding: 24,
                borderRadius: 12,
                border: `2px solid ${mode.color}30`,
                backgroundColor: mode.bg,
                cursor: mode.type === 'random_multiple' ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = mode.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${mode.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${mode.color}30`;
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Icon size={36} style={{ color: mode.color, marginBottom: 12 }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: '0 0 8px' }}>
                {mode.title}
              </h4>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                {mode.description}
              </p>

              {mode.type === 'random_multiple' && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Cantidad:</label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={randomCount}
                    onChange={(e) => setRandomCount(Math.max(2, parseInt(e.target.value) || 2))}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: 60,
                      padding: '4px 8px',
                      fontSize: 14,
                      fontWeight: 700,
                      textAlign: 'center',
                      border: `2px solid ${mode.color}40`,
                      borderRadius: 6,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect('random_multiple', randomCount);
                    }}
                    style={{
                      padding: '6px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: mode.color,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Iniciar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
