import type { Company } from '@/types/inventory';

// ── Shared literal types ────────────────────────────────────────────────────
export type SubscriptionType    = 'License' | 'Subscription';
export type SubscriptionStatus  = 'Active' | 'Expired' | 'Pending' | 'Cancelled';
export type BillingCycle        = 'Monthly' | 'Quarterly' | 'Annually' | 'One-time';
export type ModeOfPayment       = 'Credit Card' | 'Cash' | 'Deposit' | 'Invoice';
export type SubscriptionCategory =
  | 'Software' | 'Cloud Service' | 'SaaS'
  | 'Hardware' | 'License' | 'Support' | 'Other';

// ── Main Subscription type ──────────────────────────────────────────────────
export interface Subscription {
  id: string;
  referenceCode: string;

  // Employee
  employeeName?: string;
  position?: string;
  company: Company;
  branch?: string;
  department?: string;

  // Type
  type: SubscriptionType;

  // License-specific
  licenseKey?: string;
  numberOfSeats?: number;

  // Subscription-specific
  subscriptionName?: string;
  accountNumber?: string;
  accountDescription?: string;
  accountName?: string;
  accountEmail?: string;

  // Common
  name: string;
  provider: string;
  planType?: string;
  category?: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  cost: number;
  currency: '$' | '₱';
  purchaseDate?: string;
  renewalDate: string;
  startDate: string;
  notes?: string;
  modeOfPayment?: ModeOfPayment;
  modeOfPaymentNote?: string;
  autoRenewal: boolean;
  deviceId?: string;

  // Legacy / optional compat fields
  code?: string;
  licenseCount?: number;
  description?: string;
  paymentMethod?: string;
  contactEmail?: string;
}
