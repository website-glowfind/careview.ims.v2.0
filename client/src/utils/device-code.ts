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
  phone: 'PH',
  tablet: 'TB',
  other: 'OT',
};

// Prefixes for License and Subscription
const licenseSubscriptionPrefixes = {
  license: 'LIC',
  subscription: 'SUB',
};

export function generateDeviceCode(
  company: Company,
  category: AssetCategory,
  existingAssets: ITAsset[]
): string {
  const companyPrefix = companyPrefixes[company];
  const categoryPrefix = categoryPrefixes[category];
  
  // Find the highest number across ALL companies AND ALL categories (truly global sequential numbering)
  // Pattern matches: XX-YY-### where XX is company, YY is category, ### is the global number
  const pattern = new RegExp(`^[A-Z]{2}-[A-Z]{2}-(\\d+)$`);
  let maxNumber = 0;
  
  existingAssets.forEach(asset => {
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

// Generate License or Subscription code with global sequential numbering
export function generateLicenseSubscriptionCode(
  company: Company,
  type: 'License' | 'Subscription',
  existingLicenseSubscriptions: LicenseSubscription[]
): string {
  const companyPrefix = companyPrefixes[company];
  const typePrefix = type === 'License' ? licenseSubscriptionPrefixes.license : licenseSubscriptionPrefixes.subscription;
  
  // Find the highest number across ALL companies for this type (global sequential numbering)
  const pattern = new RegExp(`^[A-Z]{2}-${typePrefix}-(\\d+)$`);
  let maxNumber = 0;
  
  existingLicenseSubscriptions.forEach(item => {
    const match = item.referenceCode.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${companyPrefix}-${typePrefix}-${nextNumber}`;
}

export function getCompanyColor(company: Company): string {
  switch (company) {
    case 'KHEALTH':
      return 'blue';
    case 'CAREVIEW':
      return 'green';
    case 'GLOWFIND':
      return 'orange';
  }
}

export function getCompanyBadgeClasses(company: Company): string {
  switch (company) {
    case 'KHEALTH':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'CAREVIEW':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'GLOWFIND':
      return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}