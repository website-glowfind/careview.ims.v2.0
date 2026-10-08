import type { Company, AssetCategory, ITAsset, LicenseSubscription } from '@/types/inventory';

const companyPrefixes: Record<Company, string> = {
  KHEALTH: 'KH',
  CAREVIEW: 'CV',
  GLOWFIND: 'GF',
};

const categoryPrefixes: Record<AssetCategory, string> = {
  laptop: 'LT',
  desktop: 'DT',
  monitor: 'MN',
  keyboard: 'KB',
  mouse: 'MS',
  printer: 'PR',
  server: 'SV',
  networking: 'NW',
  mobile: 'MB',
  'mobile + subscription': 'MB',
  tablet: 'TB',
  other: 'OT',
  furniture: 'FN',
  appliance: 'AP',
  fixture: 'FX',
  equipment: 'EQ',
  vehicle: 'VH',
};

// Prefixes for License and Subscription
const licenseSubscriptionPrefixes = {
  license: 'LIC',
  subscription: 'SUB',
};

// Derive a 2-letter prefix for a custom/unknown category (e.g. "projector" -> "PR")
export function deriveCategoryPrefix(category: string): string {
  const letters = (category || '').replace(/[^a-zA-Z]/g, '');
  return letters.slice(0, 2).toUpperCase() || 'OT';
}

export function generateDeviceCode(
  company: Company,
  category: AssetCategory,
  existingAssets: ITAsset[]
): string {
  const companyPrefix = companyPrefixes[company];
  const categoryPrefix = categoryPrefixes[category] ?? deriveCategoryPrefix(category);
  
  // Find the highest number across all IT category prefixes (global sequential numbering).
  // Pattern matches: XX-YY-### where XX is company, YY is category, ### is the global number.
  // Skip other registers (General/Vehicle/StaffHouse) so their FN/VH/SH codes don't
  // inflate the IT counter.
  const pattern = new RegExp(`^[A-Z]{2}-[A-Z]{2}-(\\d+)$`);
  let maxNumber = 0;

  existingAssets.forEach(asset => {
    if (asset.assetType && asset.assetType !== 'IT') return;
    const match = asset.deviceCode.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `${companyPrefix}-${categoryPrefix}-${nextNumber}`;
}

// Generate License or Subscription code — fixed IT prefix, global sequential
// Format: IT-LIC-0001 / IT-SUB-0001
export function generateLicenseSubscriptionCode(
  company: Company,
  type: 'License' | 'Subscription',
  existingLicenseSubscriptions: LicenseSubscription[]
): string {
  const typePrefix = type === 'License'
    ? licenseSubscriptionPrefixes.license
    : licenseSubscriptionPrefixes.subscription;

  const pattern = new RegExp(`^IT-${typePrefix}-(\\d+)$`);
  let maxNumber = 0;

  existingLicenseSubscriptions.forEach(item => {
    const match = item.referenceCode.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `IT-${typePrefix}-${nextNumber}`;
}

export function getCompanyColor(company: Company): string {
  switch (company) {
    case 'KHEALTH':  return 'blue';
    case 'CAREVIEW': return 'green';
    case 'GLOWFIND': return 'orange';
  }
}

export function getCompanyBadgeClasses(company: Company): string {
  switch (company) {
    case 'KHEALTH':  return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'CAREVIEW': return 'bg-green-100 text-green-800 border-green-200';
    case 'GLOWFIND': return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}

// ── Company logos (public folder) ─────────────────────────────────────────
export const COMPANY_LOGOS: Record<Company, string> = {
  KHEALTH:  '/khealthlogo.png',
  CAREVIEW: '/logo.png',
  GLOWFIND: '/glowfindName.png',
};

/** Returns the logo path or null if company is unknown */
export function getCompanyLogo(company: string): string | undefined {
  return (COMPANY_LOGOS as Record<string, string>)[company] ?? undefined;
}

// ── Company hex colors (for inline styles / PDF) ──────────────────────────
export const COMPANY_HEX_COLORS: Record<Company, string> = {
  KHEALTH:  '#1d4ed8',
  CAREVIEW: '#16a34a',
  GLOWFIND: '#ea580c',
};

/** Returns the hex color string or a default blue */
export function getCompanyHexColor(company: string): string {
  return (COMPANY_HEX_COLORS as Record<string, string>)[company] ?? '#1d4ed8';
}

// ── Company Tailwind bg classes (for colored headers / badges) ────────────
export const COMPANY_BG_CLASSES: Record<Company, string> = {
  KHEALTH:  'bg-blue-600',
  CAREVIEW: 'bg-green-600',
  GLOWFIND: 'bg-orange-600',
};

/** Returns the Tailwind bg class string */
export function getCompanyBgClass(company: string): string {
  return (COMPANY_BG_CLASSES as Record<string, string>)[company] ?? 'bg-gray-600';
}