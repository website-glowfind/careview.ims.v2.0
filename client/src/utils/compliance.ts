import type { ITAsset } from '@/types/inventory';
import { assetRegisterId, type RegisterId } from '@/utils/assetRegister';

export type ComplianceStatus =
  | 'Compliant' | 'For Review' | 'Expiring Soon' | 'Missing Requirement' | 'Non-Compliant' | 'Not Applicable';

export type CheckState = 'pass' | 'warn' | 'fail';
export interface ComplianceCheck { label: string; state: CheckState }

export interface ComplianceResult {
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  acquisition?: string;
  lastUpdated?: string;
}

const DAY = 86_400_000;

/**
 * Derive a compliance snapshot for an asset from the data it carries. Compliance
 * is not stored — it is computed from four checks: identification, assignment,
 * warranty coverage, and required documentation.
 */
export function evaluateCompliance(a: ITAsset): ComplianceResult {
  if ((a as any).__warehouse) return evaluateWarehouse(a);
  if (a.assetType === 'MW' || a.assetType === 'MedicalEquipment') return evaluateEquipment(a);
  const checks: ComplianceCheck[] = [];

  // 1. Asset identification — code, name, and a serial/brand/model
  const idOk = !!(a.deviceCode && a.name && (a.serialNumber || a.brand || a.model));
  checks.push({ label: 'Asset identification', state: idOk ? 'pass' : 'fail' });

  // 2. Assignment record — assigned to someone or has a real location
  const assignOk = !!((a.assignedTo && a.assignedTo.trim()) || (a.location && a.location !== '—' && a.location !== 'N/A'));
  checks.push({ label: 'Assignment record', state: assignOk ? 'pass' : 'warn' });

  // 3. Warranty coverage
  let warrantyState: CheckState = 'warn';
  let expiringSoon = false, expired = false;
  if (a.warrantyExpiry) {
    const days = (new Date(a.warrantyExpiry).getTime() - Date.now()) / DAY;
    if (days < 0) { warrantyState = 'fail'; expired = true; }
    else if (days <= 60) { warrantyState = 'warn'; expiringSoon = true; }
    else warrantyState = 'pass';
  }
  checks.push({ label: 'Warranty coverage', state: warrantyState });

  // 4. Required documentation — at least one attachment
  const docsOk = (a.attachments?.length ?? 0) > 0;
  checks.push({ label: 'Required documentation', state: docsOk ? 'pass' : 'warn' });

  // Roll up to a single status
  let status: ComplianceStatus;
  if (!idOk) status = 'Missing Requirement';
  else if (expired) status = 'Non-Compliant';
  else if (expiringSoon) status = 'Expiring Soon';
  else {
    const fails = checks.filter((c) => c.state === 'fail').length;
    const warns = checks.filter((c) => c.state === 'warn').length;
    if (fails > 0) status = 'Non-Compliant';
    else if (warns >= 2) status = 'For Review';
    else status = 'Compliant';
  }

  return {
    status,
    checks,
    acquisition: a.purchaseDate,
    lastUpdated: (a as any).updatedAt ?? a.purchaseDate,
  };
}

export const COMPLIANCE_PILL: Record<ComplianceStatus, string> = {
  Compliant: 'bg-green-100 text-green-700',
  'For Review': 'bg-blue-100 text-blue-700',
  'Expiring Soon': 'bg-amber-100 text-amber-700',
  'Missing Requirement': 'bg-orange-100 text-orange-700',
  'Non-Compliant': 'bg-red-100 text-red-700',
  'Not Applicable': 'bg-gray-100 text-gray-600',
};

/** Map a register id to the MainLayout view key that opens that module. */
export const REGISTER_VIEW: Record<RegisterId, string> = {
  all: 'hub',
  it: 'inventory',
  furniture: 'furniture',
  mw: 'mw',
  'medical-equipment': 'medical-equipment',
  vehicle: 'vehicle',
  'staff-house': 'staff-house',
  'office-supplies': 'office-supplies',
};

export const sourceRegister = (a: ITAsset): RegisterId => assetRegisterId(a);

// ─── Equipment registers (MW / Medical Equipment) ────────────────────────────
// Schedules drive compliance: regulatory registration (medical), preventive
// maintenance, and calibration, plus the usual tag / assignment / documents.

type Due = 'none' | 'ok' | 'soon' | 'overdue';
function due(date?: string): Due {
  if (!date) return 'none';
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return 'none';
  const now = new Date();
  const days = Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY);
  return days < 0 ? 'overdue' : days <= 30 ? 'soon' : 'ok';
}
const dueCheck = (d: Due): CheckState => (d === 'overdue' ? 'fail' : d === 'soon' ? 'warn' : 'pass');

function evaluateEquipment(a: ITAsset): ComplianceResult {
  const eq: Record<string, any> = a.equipment ?? {};
  const medical = a.assetType === 'MedicalEquipment';
  const checks: ComplianceCheck[] = [
    { label: 'Asset tag / QR record', state: a.deviceCode ? 'pass' : 'fail' },
    { label: 'Assignment record', state: (a.assignedTo || '').trim() || (a.location && a.location !== 'N/A') ? 'pass' : 'warn' },
  ];
  let missing = false, overdue = false, soon = false;

  if (medical) {
    const r = eq.regulatoryNo ? due(eq.regulatoryExpiry) : 'overdue';
    if (!eq.regulatoryNo) missing = true; else if (r === 'overdue') overdue = true; else if (r === 'soon') soon = true;
    checks.push({ label: eq.regulatoryNo ? 'Regulatory registration' : 'Regulatory registration (not registered)', state: eq.regulatoryNo ? dueCheck(r) : 'fail' });
  }

  const svc = due(eq.nextServiceDue);
  if (svc !== 'none') {
    if (svc === 'overdue') overdue = true; else if (svc === 'soon') soon = true;
    checks.push({ label: 'Preventive maintenance schedule', state: dueCheck(svc) });
  }

  if (eq.calibrationRequired) {
    const cal = due(eq.nextCalibrationDue);
    if (cal === 'none') missing = true; else if (cal === 'overdue') overdue = true; else if (cal === 'soon') soon = true;
    checks.push({ label: cal === 'none' ? 'Calibration (no due date set)' : 'Calibration', state: cal === 'none' ? 'fail' : dueCheck(cal) });
  }

  const docs = (a.attachments?.length ?? 0) > 0;
  checks.push({ label: 'Supporting documents', state: docs ? 'pass' : 'warn' });

  const status: ComplianceStatus = overdue ? 'Non-Compliant' : missing ? 'Missing Requirement' : soon ? 'Expiring Soon' : !docs ? 'For Review' : 'Compliant';
  return { status, checks, acquisition: a.purchaseDate, lastUpdated: (a as any).updatedAt ?? a.purchaseDate };
}

// ─── MW warehouse stock items (shown as MW records) ──────────────────────────

function evaluateWarehouse(a: ITAsset): ComplianceResult {
  const w: Record<string, any> = (a as any).__warehouse;
  const num = (v: any) => (v === null || v === undefined || v === '' ? 0 : Number(v));
  const reconciled = num(w.received) - num(w.issued) === num(w.currentStock);
  const checks: ComplianceCheck[] = [
    { label: 'Warehouse item record', state: 'pass' },
    { label: 'Storage location', state: (w.location || '').trim() ? 'pass' : 'warn' },
    { label: 'Stock reconciled (received − issued = current stock)', state: reconciled ? 'pass' : 'warn' },
  ];
  return {
    status: num(w.currentStock) <= 0 ? 'For Review' : 'Compliant',
    checks,
    acquisition: w.createdAt,
    lastUpdated: w.updatedAt ?? w.createdAt,
  };
}

/** Present a warehouse stock item as an MW record for Records & Compliance. */
export function warehouseAsRecord(w: Record<string, any>): ITAsset {
  return {
    _id: `wh-${w._id}`, deviceCode: w.itemCode, name: w.itemDescription, category: 'warehouse inventory' as any,
    assetType: 'MW', company: 'KHEALTH', companyId: '', brand: '', model: w.unit ? `Unit: ${w.unit}` : '', serialNumber: '',
    status: (w.status || '').toLowerCase() as any, department: w.department, location: w.location, assignedTo: '',
    purchaseDate: w.createdAt, attachments: [], __warehouse: w, updatedAt: w.updatedAt,
  } as any;
}
