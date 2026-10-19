// Shared configuration for the equipment registers (MW and Medical Equipment).
// Both use the same list / wizard / details screens; `medical` turns on the
// regulatory fields and calibration-by-default.

export type EquipmentKind = 'mw' | 'medical';

export interface EquipmentKindConfig {
  kind: EquipmentKind;
  assetType: 'MW' | 'MedicalEquipment';
  label: string;
  title: string;
  description: string;
  addLabel: string;
  codeSegment: string;
  categories: string[];
  medical: boolean;
  calibrationDefault: boolean;
  namePlaceholder: string;
}

export const EQUIPMENT_KINDS: Record<EquipmentKind, EquipmentKindConfig> = {
  mw: {
    kind: 'mw', assetType: 'MW', label: 'MW', title: 'MW Equipment Inventory',
    description: 'Manage machinery, equipment, and tools across sites — assignments, servicing, calibration, and disposal.',
    addLabel: 'Add Equipment', codeSegment: 'MW',
    categories: [
      'generator', 'compressor', 'pump', 'power tool', 'hand tool', 'welding equipment', 'lifting equipment', 'pallet jack / trolley',
      'test & measuring instrument', 'cleaning machine', 'shelving / racking', 'other',
    ],
    medical: false, calibrationDefault: false, namePlaceholder: 'e.g. Portable Generator 5 kVA',
  },
  medical: {
    kind: 'medical', assetType: 'MedicalEquipment', label: 'Medical Equipment', title: 'Medical Equipment Inventory',
    description: 'Track clinical and diagnostic equipment with regulatory registration, preventive maintenance, and calibration schedules.',
    addLabel: 'Add Medical Equipment', codeSegment: 'ME',
    categories: [
      'digital weighing scale (platform)', 'hospital bed (2 cranks)', 'wheelchair (standard)', 'bp monitor (digital)', 'iv stand', 'foot stool', 'push cart', 'other',
    ],
    medical: true, calibrationDefault: true, namePlaceholder: 'e.g. Multi-parameter Patient Monitor',
  },
};

export const RISK_CLASSES = ['', 'A', 'B', 'C', 'D'] as const;
export const RISK_LABEL: Record<string, string> = {
  '': 'Not classified', A: 'Class A — low risk', B: 'Class B — low-moderate', C: 'Class C — moderate-high', D: 'Class D — high risk',
};

export const EQUIPMENT_DOC_TYPES = [
  'Asset Photo', 'Invoice', 'Official Receipt', 'Purchase Order', 'Warranty Document',
  'Calibration Certificate', 'Service Report', 'User Manual', 'Regulatory License', 'Other',
];

// ── Due dates ────────────────────────────────────────────────────────────────
export type DueState = 'none' | 'ok' | 'soon' | 'overdue';
export const DUE_SOON_DAYS = 30;

export function dueState(date?: string): DueState {
  if (!date) return 'none';
  const due = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (isNaN(due.getTime())) return 'none';
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due.getTime() - start.getTime()) / 86400000);
  return days < 0 ? 'overdue' : days <= DUE_SOON_DAYS ? 'soon' : 'ok';
}

/** Worst of the calibration and service schedules (for list badges and counters). */
export function scheduleState(eq: Record<string, any> = {}): DueState {
  const states: DueState[] = [eq.calibrationRequired ? dueState(eq.nextCalibrationDue) : 'none', dueState(eq.nextServiceDue)];
  return states.includes('overdue') ? 'overdue' : states.includes('soon') ? 'soon' : states.includes('ok') ? 'ok' : 'none';
}

export const DUE_PILL: Record<DueState, string> = {
  none: 'bg-gray-100 text-gray-500', ok: 'bg-green-100 text-green-700', soon: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700',
};
export const DUE_LABEL: Record<DueState, string> = { none: 'Not scheduled', ok: 'On schedule', soon: 'Due soon', overdue: 'Overdue' };

/** yyyy-mm-dd plus N months ('' when either is missing). */
export function addMonthsIso(date: string, months: number): string {
  if (!date || !months) return '';
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export const titleCase = (s: string) => (s || '').replace(/\b\w/g, (m) => m.toUpperCase());
