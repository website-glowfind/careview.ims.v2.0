// ─────────────────────────────────────────────────────────────────────────
// Permission catalog — the source of truth for module-level access control.
// Each module has a set of granular actions. A user's `permissions` map stores
// which action keys are granted per module id. Admins always have full access.
// Module ids match client/src/config/modules.ts so enforcement stays in sync.
// ─────────────────────────────────────────────────────────────────────────

export interface PermAction { key: string; label: string }
export interface PermModule { id: string; name: string; actions: PermAction[] }

const A = {
  view: { key: 'view', label: 'View' },
  create: { key: 'create', label: 'Create' },
  edit: { key: 'edit', label: 'Edit' },
  del: { key: 'delete', label: 'Delete' },
  assign: { key: 'assign', label: 'Assign' },
  transfer: { key: 'transfer', label: 'Transfer' },
  maintenance: { key: 'maintenance', label: 'Maintenance' },
  dispose: { key: 'dispose', label: 'Dispose' },
  restock: { key: 'restock', label: 'Restock' },
  export: { key: 'export', label: 'Export' },
  import: { key: 'import', label: 'Import' },
  print: { key: 'print', label: 'Print QR' },
  categories: { key: 'manage_categories', label: 'Manage Categories' },
  subscriptions: { key: 'manage_subscriptions', label: 'Manage Subscriptions' },
  approve: { key: 'approve', label: 'Approve' },
  restore: { key: 'restore', label: 'Restore' },
  purge: { key: 'purge', label: 'Permanent Delete' },
  clear: { key: 'clear', label: 'Clear Log' },
  manageAccess: { key: 'manage_access', label: 'Manage Access' },
  resetPw: { key: 'reset_password', label: 'Reset Password' },
} as const;

export const PERMISSION_CATALOG: PermModule[] = [
  { id: 'it-assets', name: 'IT Assets', actions: [A.view, A.create, A.edit, A.del, A.assign, A.transfer, A.dispose, A.export, A.import, A.print, A.subscriptions, A.categories] },
  { id: 'furniture', name: 'Furniture', actions: [A.view, A.create, A.edit, A.del, A.assign, A.transfer, A.maintenance, A.dispose, A.export, A.import, A.categories] },
  { id: 'mw', name: 'MW (Maintenance / Equipment)', actions: [A.view, A.create, A.edit, A.del, A.export] },
  { id: 'vehicle', name: 'Company Vehicle', actions: [A.view, A.create, A.edit, A.del, A.assign, A.transfer, A.maintenance, A.dispose, A.export, A.import] },
  { id: 'staff-house', name: 'Staff House', actions: [A.view, A.create, A.edit, A.del, A.assign, A.transfer, A.maintenance, A.dispose, A.export, A.import, A.categories] },
  { id: 'office-supplies', name: 'Office Supplies', actions: [A.view, A.create, A.edit, A.del, A.restock, A.export, A.import, A.categories] },
  { id: 'records-compliance', name: 'Records & Compliance', actions: [A.view, A.export] },
  { id: 'disposal', name: 'Disposal Form', actions: [A.view, A.create, A.edit, A.del, A.approve] },
  { id: 'employees', name: 'Employee Records', actions: [A.view, A.create, A.edit, A.del, A.import, A.export] },
  { id: 'deleted', name: 'Deleted Device / Archive', actions: [A.view, A.restore, A.purge] },
  { id: 'history', name: 'Activity Log', actions: [A.view, A.export, A.clear] },
  { id: 'users', name: 'User Settings', actions: [A.view, A.create, A.edit, A.del, A.manageAccess, A.resetPw] },
];

export const PERMISSION_MODULE_IDS = PERMISSION_CATALOG.map((m) => m.id);
export const TOTAL_MODULES = PERMISSION_CATALOG.length;

export type PermissionMap = Record<string, string[]>;

const moduleById = (id: string) => PERMISSION_CATALOG.find((m) => m.id === id);
const allActionKeys = (id: string) => (moduleById(id)?.actions ?? []).map((a) => a.key);

/** Full-access map (every action of every module). */
export function fullAccessMap(): PermissionMap {
  const map: PermissionMap = {};
  for (const m of PERMISSION_CATALOG) map[m.id] = m.actions.map((a) => a.key);
  return map;
}

/** Role-based default permissions (used when a user has no custom permissions). */
export function roleDefaults(role?: string): PermissionMap {
  if (role === 'admin') return fullAccessMap();

  const map: PermissionMap = {};
  const assetModules = ['it-assets', 'furniture', 'mw', 'vehicle', 'staff-house', 'office-supplies'];
  const keep = (id: string, keys: string[]) => { const avail = allActionKeys(id); map[id] = keys.filter((k) => avail.includes(k)); };

  if (role === 'encoder') {
    for (const id of assetModules) keep(id, ['view', 'create', 'edit', 'assign', 'transfer', 'maintenance', 'restock', 'export', 'import', 'print', 'manage_categories', 'manage_subscriptions']);
    keep('records-compliance', ['view', 'export']);
    keep('disposal', ['view', 'create', 'edit']);
    keep('employees', ['view', 'create', 'edit', 'import', 'export']);
    keep('deleted', ['view']);
    keep('history', ['view', 'export']);
  } else {
    // employee — read-only on the registers
    for (const id of assetModules) keep(id, ['view']);
    keep('records-compliance', ['view']);
    keep('history', ['view']);
  }
  // Drop empty entries so "no access" modules are absent
  for (const k of Object.keys(map)) if (map[k].length === 0) delete map[k];
  return map;
}

// ── Access templates (modal presets) ──────────────────────────────────────
export interface AccessTemplate { key: string; label: string }
export const ACCESS_TEMPLATES: AccessTemplate[] = [
  { key: 'super_admin', label: 'Super Admin' },
  { key: 'admin', label: 'Admin' },
  { key: 'editor', label: 'Editor' },
  { key: 'staff', label: 'Staff' },
  { key: 'viewer', label: 'Viewer' },
];

const ASSET_MODULES = ['it-assets', 'furniture', 'mw', 'vehicle', 'staff-house', 'office-supplies'];

/** Permission preset for an access template. */
export function templatePermissions(key: string): PermissionMap {
  const map: PermissionMap = {};
  const pick = (id: string, keys: string[]) => { const avail = allActionKeys(id); const got = keys.filter((k) => avail.includes(k)); if (got.length) map[id] = got; };
  const viewAll = () => { for (const m of PERMISSION_CATALOG) if (m.id !== 'users') pick(m.id, ['view']); };

  switch (key) {
    case 'super_admin':
      return fullAccessMap();
    case 'admin':
      for (const m of PERMISSION_CATALOG) map[m.id] = m.actions.map((a) => a.key);
      // Admin: not the system-level user controls or permanent delete / log clear
      pick('users', ['view', 'create', 'edit', 'reset_password']);
      pick('deleted', ['view', 'restore']);
      pick('history', ['view', 'export']);
      return map;
    case 'editor':
      for (const id of ASSET_MODULES) pick(id, ['view', 'create', 'edit', 'assign', 'transfer', 'maintenance', 'restock', 'export', 'import', 'print', 'manage_categories', 'manage_subscriptions']);
      pick('records-compliance', ['view', 'export']);
      pick('disposal', ['view', 'create', 'edit']);
      pick('employees', ['view', 'create', 'edit', 'import', 'export']);
      pick('deleted', ['view']);
      pick('history', ['view', 'export']);
      return map;
    case 'staff':
      for (const id of ASSET_MODULES) pick(id, ['view', 'assign', 'transfer', 'restock', 'print', 'export']);
      pick('records-compliance', ['view']);
      pick('employees', ['view']);
      pick('history', ['view']);
      return map;
    case 'viewer':
      viewAll();
      return map;
    default:
      return {};
  }
}

export interface PermUser { role?: string; permissions?: PermissionMap | null }

const hasCustom = (u?: PermUser | null) => !!u?.permissions && Object.keys(u.permissions).length > 0;

/** The permissions actually in effect for a user (custom if set, else role defaults). */
export function effectivePermissions(u?: PermUser | null): PermissionMap {
  if (!u) return {};
  if (u.role === 'admin') return fullAccessMap(); // admins always full — never locked out
  return hasCustom(u) ? (u.permissions as PermissionMap) : roleDefaults(u.role);
}

/** Whether a user can open a module at all (has at least one action there). */
export function canAccessModule(u: PermUser | null | undefined, moduleId: string): boolean {
  if (u?.role === 'admin') return true;
  const perms = effectivePermissions(u);
  return (perms[moduleId]?.length ?? 0) > 0;
}

/** Whether a user can perform a specific action within a module. */
export function can(u: PermUser | null | undefined, moduleId: string, action: string): boolean {
  if (u?.role === 'admin') return true;
  const perms = effectivePermissions(u);
  return perms[moduleId]?.includes(action) ?? false;
}

/** Access level label for the users table. */
export function accessLevelLabel(u: PermUser): string {
  if (u.role === 'admin' && !hasCustom(u)) return 'Default (admin)';
  if (hasCustom(u)) return 'Custom';
  return `Default (${u.role ?? 'employee'})`;
}

/** Count granted modules (module with ≥1 action) out of the catalog total. */
export function grantedModuleCount(perms: PermissionMap): number {
  return PERMISSION_CATALOG.filter((m) => (perms[m.id]?.length ?? 0) > 0).length;
}
