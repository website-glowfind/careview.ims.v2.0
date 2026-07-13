import { useEffect, useState } from 'react';
import {
  X, Search, Filter, ChevronDown, ChevronRight,
  Download, FileText, Lock, RefreshCw,
} from 'lucide-react';
import type { ITAsset, HistoryEntry, HistoryAction } from '@/types/inventory';
import { useActivityLogStore } from '@/store/activityLogStore';

interface Props {
  asset: ITAsset;
  onClose: () => void;
}

const ACTION_BADGE: Record<HistoryAction, { label: string; cls: string }> = {
  added:       { label: 'Add',      cls: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  edited:      { label: 'Edit',     cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  deleted:     { label: 'Delete',   cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  transferred: { label: 'Transfer', cls: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  disposed:    { label: 'Dispose',  cls: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  restored:    { label: 'Restore',  cls: 'bg-teal-500/20 text-teal-400 border border-teal-500/30' },
};

function getActionBadge(entry: HistoryEntry) {
  const hasAssignChange = entry.changes?.some(c => c.field === 'assignedTo');
  if (hasAssignChange && entry.action === 'edited') {
    const change = entry.changes!.find(c => c.field === 'assignedTo')!;
    if (!change.oldValue && change.newValue)
      return { label: 'Assign', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' };
    if (change.oldValue && !change.newValue)
      return { label: 'Unassign', cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' };
  }
  return ACTION_BADGE[entry.action] ?? { label: entry.action, cls: 'bg-gray-500/20 text-gray-400' };
}

function formatFieldName(field: string) {
  const map: Record<string, string> = {
    assignedTo: 'Assigned To', name: 'Asset Name', brand: 'Brand',
    model: 'Model', serialNumber: 'Serial Number', status: 'Status',
    location: 'Location', warrantyExpiry: 'Warranty Expiry', notes: 'Notes',
    department: 'Department', position: 'Position', employeeId: 'Employee ID',
  };
  return map[field] ?? field;
}

function groupByDate(entries: HistoryEntry[]): { date: string; items: HistoryEntry[] }[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const d = new Date(e.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function exportCSV(entries: HistoryEntry[], asset: ITAsset) {
  const rows = [['Date', 'Time', 'Performed By', 'Action', 'Description']];
  for (const e of entries) {
    const d = new Date(e.timestamp);
    rows.push([
      d.toLocaleDateString(),
      d.toLocaleTimeString(),
      e.performedBy ?? 'System',
      e.action,
      e.details ?? '',
    ]);
  }
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-log-${asset.deviceCode}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AssetActivityLogModal({ asset, onClose }: Props) {
  const { deviceHistory, fetchHistoryByDevice, isLoading } = useActivityLogStore();

  const [search, setSearch]           = useState('');
  const [actionFilter, setActionFilter] = useState<HistoryAction | 'all'>('all');
  const [userFilter, setUserFilter]   = useState('all');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHistoryByDevice(asset.deviceCode);
  }, [asset.deviceCode, fetchHistoryByDevice]);

  const allUsers = Array.from(new Set(deviceHistory.map(e => e.performedBy ?? 'System')));

  const filtered = deviceHistory.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (e.details ?? '').toLowerCase().includes(q)
      || (e.performedBy ?? '').toLowerCase().includes(q);
    const matchAction = actionFilter === 'all' || e.action === actionFilter;
    const matchUser   = userFilter === 'all'   || (e.performedBy ?? 'System') === userFilter;
    const ts = new Date(e.timestamp).getTime();
    const matchFrom = !dateFrom || ts >= new Date(dateFrom).getTime();
    const matchTo   = !dateTo   || ts <= new Date(dateTo + 'T23:59:59').getTime();
    return matchSearch && matchAction && matchUser && matchFrom && matchTo;
  });

  const groups = groupByDate(filtered);

  const lastUpdated = deviceHistory[0]
    ? new Date(deviceHistory[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-[#0f1729] rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-gray-200 dark:border-[#1e3a5f]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a5f] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Activity Log
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 font-mono">
              {asset.deviceCode} · {asset.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-[#1e2d4a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1e3a5f] flex-shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search description or user..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#162236] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value as HistoryAction | 'all')}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#162236] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="added">Added</option>
              <option value="edited">Edited</option>
              <option value="deleted">Deleted</option>
              <option value="transferred">Transferred</option>
              <option value="disposed">Disposed</option>
              <option value="restored">Restored</option>
            </select>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#162236] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#162236] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#162236] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(search || actionFilter !== 'all' || userFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setActionFilter('all'); setUserFilter('all'); setDateFrom(''); setDateTo(''); }}
                className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-[#1e3a5f] rounded-lg hover:bg-gray-100 dark:hover:bg-[#1e2d4a]"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Showing <span className="font-semibold text-gray-700 dark:text-slate-300 mx-1">{filtered.length}</span> of{' '}
            <span className="font-semibold text-gray-700 dark:text-slate-300 mx-1">{deviceHistory.length}</span> activities
          </p>
        </div>

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Loading activity...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No activity found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            groups.map(({ date, items }) => (
              <div key={date}>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-4 h-px bg-gray-300 dark:bg-slate-600 flex-shrink-0" />
                  {date}
                  <span className="w-full h-px bg-gray-100 dark:bg-[#1e3a5f]" />
                </p>
                <div className="space-y-1">
                  {items.map(entry => {
                    const badge   = getActionBadge(entry);
                    const isOpen  = expanded.has(entry.id);
                    const hasChanges = (entry.changes?.length ?? 0) > 0;
                    const time    = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    return (
                      <div key={entry.id} className="rounded-lg border border-gray-100 dark:border-[#1e3a5f] overflow-hidden">
                        <div
                          className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#162236] ${hasChanges ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e2d4a]' : ''}`}
                          onClick={() => hasChanges && toggleExpand(entry.id)}
                        >
                          {/* Expand toggle */}
                          <span className="w-4 flex-shrink-0 text-gray-400 dark:text-slate-500">
                            {hasChanges ? (
                              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            ) : null}
                          </span>

                          {/* Time */}
                          <span className="text-xs text-gray-500 dark:text-slate-400 w-20 flex-shrink-0 font-mono">
                            {time}
                          </span>

                          {/* User */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-blue-400">
                                {(entry.performedBy ?? 'S').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 hidden sm:block">
                              {entry.performedBy ?? 'System'}
                            </span>
                          </div>

                          {/* Action badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>

                          {/* Description */}
                          <span className="flex-1 text-sm text-gray-700 dark:text-slate-300 truncate">
                            {entry.details ?? `${entry.action} action`}
                          </span>

                          {/* Platform */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                            WEB
                          </span>
                        </div>

                        {/* Field Changes */}
                        {isOpen && hasChanges && (
                          <div className="border-t border-gray-100 dark:border-[#1e3a5f] bg-gray-50 dark:bg-[#0f1729]">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-[#1e3a5f]">
                                  <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/3">Field</th>
                                  <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/3">Old Value</th>
                                  <th className="text-left px-4 py-2 font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-1/3">New Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entry.changes!.map((c, i) => (
                                  <tr key={i} className="border-b border-gray-100 dark:border-[#1e3a5f] last:border-0">
                                    <td className="px-4 py-2 font-medium text-gray-700 dark:text-slate-300">{formatFieldName(c.field)}</td>
                                    <td className="px-4 py-2 text-gray-400 dark:text-slate-500">{c.oldValue ?? <span className="italic">—</span>}</td>
                                    <td className="px-4 py-2 text-green-600 dark:text-green-400 font-medium">{c.newValue ?? <span className="italic text-red-400">Removed</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-[#1e3a5f] flex items-center justify-between flex-shrink-0 bg-gray-50 dark:bg-[#0f1729] rounded-b-xl">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-only log
            </span>
            <span className="flex items-center gap-1">
              ↑ {deviceHistory.length} total activities
            </span>
            <span>Last updated: {lastUpdated}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(filtered, asset)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1e2d4a] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
