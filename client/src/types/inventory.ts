export type AssetStatus = 'active' | 'in-maintenance' | 'in-storage' | 'available' | 'disposed';

export type AssetCategory = 'laptop' | 'desktop' | 'monitor' | 'keyboard' | 'mouse' | 'printer' | 'server' | 'networking' | 'mobile' | 'mobile + subscription' | 'tablet' | 'other'
  | 'furniture' | 'appliance' | 'fixture' | 'equipment' | 'vehicle';

export type AssetType = 'IT' | 'General';

export type LicenseSubscriptionType = 'license' | 'subscription';

export type Company = 'KHEALTH' | 'CAREVIEW' | 'GLOWFIND';

export type UserRole = 'admin' | 'editor' | 'user';

export type DisposalMethod = 'Recycle' | 'Donate' | 'Sell' | 'Trash' | 'E-Waste Facility' | 'Return to Vendor' | 'Other';

export interface User {
  id: string;
  fullName: string;
  department: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export interface ITAsset {
  _id?: string;
  deviceCode: string;
  name: string;
  category: AssetCategory;
  assetType?: AssetType;
  company: Company;
  companyId: string;
  brand: string;
  model: string;
  serialNumber: string;
  specifications?: string;
  status: AssetStatus;
  assignedTo?: string;
  employeeId?: string;
  position?: string;
  department?: string;
  purchaseDate: string;
  warrantyExpiry?: string;
  location: string;
  notes?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  disposalId?: string;
}

export interface Subscription {
  id: string;
  referenceCode: string;
  type: 'Subscription' | 'License';
  name: string;
  renewalDate: string;
  status: string;
  company: Company;
}

// Disposal record (master reference to inventory)
export interface DisposalRecord {
  id: string;
  assetId: string; // Reference to ITAsset
  deviceCode: string;
  assetName: string;
  category: AssetCategory;
  company: Company;
  brand: string;
  model: string;
  serialNumber: string;
  disposalDate: string;
  disposalMethod: DisposalMethod;
  disposalReason: string;
  disposalCost?: number;
  approvedBy: string;
  witnessedBy?: string;
  notes?: string;
  disposedBy: string; // User who performed disposal
  createdAt: string;
}

// Legacy history entry type (for global activity log)
export type HistoryAction = 'added' | 'edited' | 'deleted' | 'transferred' | 'disposed' | 'restored';
export type HistoryCategory = 'asset' | 'subscription' | 'user';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: HistoryAction;
  category: HistoryCategory;
  // asset: deviceCode/deviceName | subscription: referenceCode/name | user: username/fullName
  deviceCode: string;
  deviceName: string;
  company: Company;
  fromCompany?: Company;
  toCompany?: Company;
  details?: string;
  performedBy?: string;
  changes?: Array<{ field: string; oldValue?: string; newValue?: string }>;
}

// Detailed activity log types (for device-specific activity log)
export type ActivityActionType = 'create' | 'update' | 'assign' | 'unassign' | 'delete' | 'transfer' | 'restore' | 'system';

export type ActivitySource = 'web' | 'api' | 'system';

export interface FieldChange {
  field: string;
  oldValue: string | undefined;
  newValue: string | undefined;
}

export interface DeviceActivity {
  id: string;
  deviceId: string;
  timestamp: string;
  user: string;
  userRole: UserRole;
  actionType: ActivityActionType;
  description: string;
  changes?: FieldChange[];
  source: ActivitySource;
}

// Form Masterlist types
export type FormType =
  | 'Asset Issuance'
  | 'Inventory Management'
  | 'Subscription Management'
  | 'Asset Transfer'
  | 'Asset Disposal'
  | 'New User Transfer';

export type FormStatus = 'Active' | 'Returned' | 'Disposed' | 'Completed';

export interface FormRecord {
  id: string;
  formType?: FormType;
  assignedTo?: string;
  position?: string;
  deviceCode?: string;
  assetTag?: string;
  referenceId?: string;
  employeeName?: string;
  department?: string;
  company?: Company;
  fromCompany?: Company;
  toCompany?: Company;
  location?: string;
  brand?: string;
  category?: AssetCategory;
  name?: string;
  dateCreated: string;
  status: FormStatus;
  details?: string;
  createdBy: string;
  relatedAssetId?: string;
  relatedSubscriptionId?: string;
  formData?: any;
}

// License and Subscription Management types
export interface LicenseSubscription {
  id: string;
  referenceCode: string; // Auto-generated: {CompanyPrefix}-LIC/SUB-0001 (global sequential)
  type: 'License' | 'Subscription';
  
  // Employee Information
  employeeName?: string;
  position?: string;
  company: Company;
  branch?: string;
  department?: string;
  
  // License Details (when type = 'License')
  licenseKey?: string;
  numberOfSeats?: number;
  
  // Subscription Details (when type = 'Subscription')
  subscriptionName?: string;
  accountNumber?: string;
  accountDescription?: string;
  accountName?: string;
  accountEmail?: string;
  
  // Common Fields
  name: string;
  provider: string;
  planType?: string;
  
  // Settings
  category?: string;
  status: 'Active' | 'Expired' | 'Pending' | 'Cancelled';
  billingCycle: 'Monthly' | 'Quarterly' | 'Annually' | 'One-time';
  cost: number;
  currency: '$' | '₱';
  purchaseDate?: string;
  renewalDate: string;
  startDate: string;
  notes?: string;
  modeOfPayment?: 'Credit Card' | 'Cash' | 'Deposit' | 'Invoice';
  modeOfPaymentNote?: string;
  autoRenewal: boolean;
  
  // Link to IT Asset
  deviceId?: string;
}