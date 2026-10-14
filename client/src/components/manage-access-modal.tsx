import { useMemo, useState } from 'react';
import { X, Shield, ChevronRight, Check, Loader2, Eye, LayoutGrid, Grid3x3 } from 'lucide-react';
import type { User } from '@/types/inventory';
import {
  PERMISSION_CATALOG, type PermissionMap, fullAccessMap, roleDefaults,
  effectivePermissions, grantedModuleCount, TOTAL_MODULES,
} from '@/config/permissions';

interface Props {
  user: User;
  allUsers: User[];
  onClose: () => void;
  onSave: (permissions: PermissionMap) => Promise<void> | void;
}

const prune = (m: PermissionMap): PermissionMap => {
  const out: PermissionMap = {};
  for (const k of Object.keys(m)) if (m[k] && m[k].length) out[k] = [...m[k]];
  return out;
};

export function ManageAccessModal({ user, allUsers, onClose, onSave }: Props) {
  const isAdminTarget = user.role === 'admin';
  const initial = useMemo<PermissionMap>(() => {
    if (isAdminTarget) return fullAccessMap();
    return user.permissions && Object.keys(user.permissions).length ? JSON.parse(JSON.stringify(user.permissions)) : roleDefaults(user.role);
  }, [user, isAdminTarget]);

  const [working, setWorking] = useState<PermissionMap>(initial);
  const [view, setView] = useState<'modules' | 'matrix'>('modules');
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [saving, setSaving] = useState(false);

  const granted = grantedModuleCount(working);

  const actionsOf = (id: string) => PERMISSION_CATALOG.find((m) => m.id === id)?.actions ?? [];
  const isOn = (mid: string, key: string) => working[mid]?.includes(key) ?? false;
  const moduleCount = (mid: string) => working[mid]?.length ?? 0;

  const setModule = (mid: string, keys: string[]) => setWorking((w) => {
    const next = { ...w };
    if (keys.length) next[mid] = keys; else delete next[mid];
    return next;
  });
  const toggleAction = (mid: string, key: string) => {
    const cur = working[mid] ?? [];
    setModule(mid, cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]);
  };
  const toggleModule = (mid: string) => {
    const all = actionsOf(mid).map((a) => a.key);
    setModule(mid, moduleCount(mid) === all.length ? [] : all);
  };
  const fullModule = (mid: string) => setModule(mid, actionsOf(mid).map((a) => a.key));
  const clearModule = (mid: string) => setModule(mid, []);

  const selectAll = () => setWorking(fullAccessMap());
  const clearAll = () => setWorking({});
  const applyTemplate = (role: string) => { setTemplate(role); if (role) setWorking(role === 'admin' ? fullAccessMap() : roleDefaults(role)); };
  const applyCopy = (id: string) => { setCopyFrom(id); const u = allUsers.find((x) => x.id === id); if (u) setWorking(JSON.parse(JSON.stringify(effectivePermissions(u)))); };

  const toggleExpand = (mid: string) => setExpanded((s) => { const n = new Set(s); n.has(mid) ? n.delete(mid) : n.add(mid); return n; });

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(prune(working)); onClose(); }
    catch { /* error surfaced by caller */ }
    finally { setSaving(false); }
  };

  const SELECT = 'px-2.5 py-1.5 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-xs text-gray-700 dark:text-slate-300';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400 flex items-center justify-center"><Shield className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Manage Access</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">{user.fullName} · {user.role} {user.department ? `· ${user.department}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-[#1e3a5f] space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={template} onChange={(e) => applyTemplate(e.target.value)} className={SELECT}>
              <option value="">— Apply Template —</option>
              <option value="admin">Administrator (full)</option>
              <option value="encoder">Encoder</option>
              <option value="employee">Employee (view only)</option>
            </select>
            <button onClick={selectAll} className={SELECT}>Select All</button>
            <button onClick={clearAll} className={SELECT}>Clear All</button>
            <select value={copyFrom} onChange={(e) => applyCopy(e.target.value)} className={SELECT}>
              <option value="">Copy From User…</option>
              {allUsers.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setPreview((p) => !p)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${preview ? 'border-[#0b5c96] text-[#0b5c96] bg-[#0b5c96]/5' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300'}`}><Eye className="w-3.5 h-3.5" /> Preview Access</button>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-[#1e3a5f] overflow-hidden">
                <button onClick={() => setView('modules')} title="Modules" className={`px-2 py-1.5 ${view === 'modules' ? 'bg-[#0b5c96] text-white' : 'text-gray-500 dark:text-slate-400'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                <button onClick={() => setView('matrix')} title="Matrix" className={`px-2 py-1.5 ${view === 'matrix' ? 'bg-[#0b5c96] text-white' : 'text-gray-500 dark:text-slate-400'}`}><Grid3x3 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {isAdminTarget && <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-1.5">Administrators always have full access at runtime — changes here are for record only.</div>}

          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 mb-1"><span>Access granted to <strong className="text-gray-900 dark:text-white">{granted}</strong> of {TOTAL_MODULES} modules</span></div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#0f1729] overflow-hidden"><div className="h-full bg-[#0b5c96] rounded-full transition-all" style={{ width: `${(granted / TOTAL_MODULES) * 100}%` }} /></div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {preview ? (
            <div className="space-y-2">
              {PERMISSION_CATALOG.filter((m) => moduleCount(m.id) > 0).length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No access granted.</p>
              ) : PERMISSION_CATALOG.filter((m) => moduleCount(m.id) > 0).map((m) => (
                <div key={m.id} className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</span><span className="text-xs text-gray-400">{moduleCount(m.id)}/{m.actions.length}</span></div>
                  <div className="flex flex-wrap gap-1.5 mt-2">{m.actions.filter((a) => isOn(m.id, a.key)).map((a) => <span key={a.key} className="px-2 py-0.5 text-[11px] rounded-full bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">{a.label}</span>)}</div>
                </div>
              ))}
            </div>
          ) : view === 'matrix' ? (
            <div className="space-y-1.5">
              {PERMISSION_CATALOG.map((m) => (
                <div key={m.id} className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</span>
                    <span className="text-xs text-gray-400">{moduleCount(m.id)}/{m.actions.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <button key={a.key} onClick={() => toggleAction(m.id, a.key)} className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors ${isOn(m.id, a.key) ? 'bg-[#0b5c96] text-white border-[#0b5c96]' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{a.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            PERMISSION_CATALOG.map((m) => {
              const count = moduleCount(m.id);
              const total = m.actions.length;
              const open = expanded.has(m.id);
              return (
                <div key={m.id} className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <input type="checkbox" checked={count > 0} onChange={() => toggleModule(m.id)} className="w-4 h-4 accent-[#0b5c96]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{m.name}</div>
                      <div className="text-xs text-gray-400">{count}/{total} actions</div>
                    </div>
                    <button onClick={() => fullModule(m.id)} className="text-xs font-medium text-[#0b5c96] dark:text-blue-400 hover:underline">Full Access</button>
                    <button onClick={() => clearModule(m.id)} className="text-xs font-medium text-gray-400 hover:text-red-600">Clear</button>
                    <button onClick={() => toggleExpand(m.id)} className="p-1 text-gray-400 hover:text-gray-700"><ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} /></button>
                  </div>
                  {open && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-[#1e3a5f] grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {m.actions.map((a) => (
                        <label key={a.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer px-1 py-0.5">
                          <input type="checkbox" checked={isOn(m.id, a.key)} onChange={() => toggleAction(m.id, a.key)} className="w-3.5 h-3.5 accent-[#0b5c96]" />
                          {a.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Permissions</button>
        </div>
      </div>
    </div>
  );
}
