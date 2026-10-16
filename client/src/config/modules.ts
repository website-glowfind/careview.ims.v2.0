import {
  MonitorSmartphone, Armchair, Warehouse, CarFront, BedDouble, PencilRuler, Recycle,
  KeyRound, Archive, ScrollText, ClipboardCheck, Contact, type LucideIcon,
} from 'lucide-react';

export interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Views (existing `currentView` keys) that belong to this module */
  views: string[];
  /** View opened when the card is clicked */
  entryView: string;
  /** Optional sub-tabs shown in the module header (e.g. IT Assets: Inventory · Add Assets · …) */
  tabs?: { view: string; label: string }[];
  adminOnly?: boolean;
  /** Module has no content yet */
  upcoming?: boolean;
  accent: string; // tailwind classes for icon tile
  code: string; // short tag shown on the module card
  group: 'Asset Registers' | 'Records & Compliance' | 'Administration';
}

export const MODULES: ModuleDef[] = [
  { id: 'it-assets', name: 'IT Assets', description: 'Manage company computers, devices, software subscriptions, and IT inventory.', icon: MonitorSmartphone, views: ['inventory', 'add', 'subscriptions', 'dashboard', 'export'], entryView: 'dashboard', tabs: [
    { view: 'dashboard',     label: 'Overview' },
    { view: 'inventory',     label: 'Inventory' },
    { view: 'subscriptions', label: 'Subscription List' },
    { view: 'export',        label: 'Export Reports' },
  ], accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'ITA', group: 'Asset Registers' },
  { id: 'furniture', name: 'Furniture', description: 'Track office desks, chairs, cabinets, and other fixed company assets.', icon: Armchair, views: ['furniture'], entryView: 'furniture', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'FUR', group: 'Asset Registers' },
  { id: 'mw', name: 'MW', description: 'Maintain machinery, equipment, and tools inventory across sites.', icon: Warehouse, views: ['mw'], entryView: 'mw', upcoming: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'MWE', group: 'Asset Registers' },
  { id: 'vehicle', name: 'Company Vehicle', description: 'Monitor fleet vehicles, assignments, registration, insurance, fuel, and maintenance.', icon: CarFront, views: ['vehicle'], entryView: 'vehicle', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'VEH', group: 'Asset Registers' },
  { id: 'staff-house', name: 'Staff House', description: 'Track staff house rooms, furniture, appliances, residents, and bed assignments.', icon: BedDouble, views: ['staff-house'], entryView: 'staff-house', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'STH', group: 'Asset Registers' },
  { id: 'office-supplies', name: 'Office Supplies', description: 'Track accountable equipment individually and monitor consumable stock levels with issuance history.', icon: PencilRuler, views: ['office-supplies'], entryView: 'office-supplies', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'OFS', group: 'Asset Registers' },
  { id: 'disposal', name: 'Disposal Form', description: 'Prepare and record IT asset disposal forms for approval.', icon: Recycle, views: ['disposal'], entryView: 'disposal', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'DSP', group: 'Records & Compliance' },
  { id: 'records-compliance', name: 'Records & Compliance', description: 'Monitor the centralized company-wide asset register and compliance status.', icon: ClipboardCheck, views: ['records-compliance'], entryView: 'records-compliance', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'RNC', group: 'Records & Compliance' },
  { id: 'employees', name: 'Employee Records', description: 'Maintain the employee directory used for asset assignments and forms.', icon: Contact, views: ['employees'], entryView: 'employees', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'EMP', group: 'Records & Compliance' },
  { id: 'users', name: 'User Settings', description: 'Add, edit, and manage system users, roles, and access.', icon: KeyRound, views: ['users'], entryView: 'users', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'USR', group: 'Administration' },
  { id: 'deleted', name: 'Deleted Device / Archived Records', description: 'Review soft-deleted devices and restore them when needed.', icon: Archive, views: ['deleted'], entryView: 'deleted', adminOnly: true, accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'ARC', group: 'Records & Compliance' },
  { id: 'history', name: 'Activity Log', description: 'Audit trail of every asset change, transfer, and action.', icon: ScrollText, views: ['history'], entryView: 'history', accent: 'bg-white text-[#0b5c96] ring-gray-200', code: 'LOG', group: 'Records & Compliance' },
];

export const getModuleForView = (view: string) => MODULES.find((m) => m.views.includes(view));

export const MODULE_GROUPS = ['Asset Registers', 'Records & Compliance', 'Administration'] as const;
