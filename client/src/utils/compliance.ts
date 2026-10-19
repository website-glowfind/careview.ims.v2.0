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
