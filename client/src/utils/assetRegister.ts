import type { ElementType } from 'react';
import { Layers, MonitorSmartphone, Armchair, Warehouse, CarFront, BedDouble, PencilRuler } from 'lucide-react';

export type RegisterId = 'all' | 'it' | 'furniture' | 'mw' | 'vehicle' | 'staff-house' | 'office-supplies';

export interface RegisterDef {
  id: RegisterId;
  label: string;
  icon: ElementType;
}

// Order matches the module hub registers
export const REGISTERS: RegisterDef[] = [
  { id: 'all',             label: 'All',             icon: Layers },
  { id: 'it',              label: 'IT Assets',       icon: MonitorSmartphone },
  { id: 'furniture',       label: 'Furniture',       icon: Armchair },
  { id: 'mw',              label: 'MW',              icon: Warehouse },
  { id: 'vehicle',         label: 'Company Vehicle', icon: CarFront },
  { id: 'staff-house',     label: 'Staff House',     icon: BedDouble },
  { id: 'office-supplies', label: 'Office Supplies', icon: PencilRuler },
];

/**
 * Map an asset to its register. Currently IT assets -> 'it' and every General
 * asset -> 'furniture' (the only active general register). MW / Vehicle /
 * Staff House / Office Supplies are set-up placeholders with no records yet.
 */
export function assetRegisterId(a: { assetType?: string; category?: string } | undefined): RegisterId {
  if (!a) return 'it';
  return (a.assetType ?? 'IT') === 'IT' ? 'it' : 'furniture';
}

// General-asset category prefixes (device code middle segment), e.g. KH-FN-001
const GENERAL_PREFIXES = new Set(['FN', 'AP', 'FX', 'EQ', 'VH']);

/** Infer the register from a device code (for records that only carry the code). */
export function registerFromDeviceCode(code?: string): RegisterId {
  const m = (code || '').match(/^[A-Z]{2}-([A-Z]{2})-/);
  if (!m) return 'it';
  return GENERAL_PREFIXES.has(m[1]) ? 'furniture' : 'it';
}
