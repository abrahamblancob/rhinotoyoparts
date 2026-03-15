import {
  Warehouse,
  Grid3X3,
  LayoutGrid,
  MapPin,
  ClipboardCheck,
} from 'lucide-react';

// ── Re-exports ──

export type { WizardRackForm, PlacedRack, WizardAisleForm, PlacedAisle } from '../FloorPlanBuilder.tsx';
export type { WizardZoneForm } from '../ZonePainter.tsx';

// ── Step definitions ──

export type WizardStep = 'warehouse' | 'racks' | 'layout' | 'zones' | 'confirm';

export const STEPS: { key: WizardStep; label: string; icon: typeof Warehouse }[] = [
  { key: 'warehouse', label: 'Almacen', icon: Warehouse },
  { key: 'racks', label: 'Estantes', icon: Grid3X3 },
  { key: 'layout', label: 'Distribucion', icon: LayoutGrid },
  { key: 'zones', label: 'Zonas', icon: MapPin },
  { key: 'confirm', label: 'Confirmacion', icon: ClipboardCheck },
];

// ── Warehouse form ──

export interface WarehouseForm {
  name: string;
  code: string;
  width_m: number | null;
  length_m: number | null;
  height_m: number | null;
  address: string;
  pick_expiry_minutes: number;
}

// ── Helpers ──

let idCounter = 0;
export function tempId() {
  return `temp_${++idCounter}_${Date.now()}`;
}

export function levelToLetter(level: number): string {
  return String.fromCharCode(64 + level);
}

export const RACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];
