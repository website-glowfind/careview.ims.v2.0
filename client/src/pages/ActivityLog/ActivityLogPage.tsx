import { useState } from 'react';
import { Activity, Plus, Edit, Trash2, ArrowRightLeft, Search, RefreshCw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { HistoryAction, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useAssetStore } from '@/store/assetStore';

const ACTION_ICON: Record<HistoryAction, LucideIcon> = {
  added:       Plus,
  edited:      Edit,
  deleted:     Trash2,
  transferred: ArrowRightLeft,
  disposed:    Trash2,
};

const ACTION_BADGE: Record<HistoryAction, string> = {
  added:       'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400',
  edited:      'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400',
  deleted:     'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400',
  transferred: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400',
  disposed:    'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400',
};

export function ActivityLog() {
  const { history, clearHistory } = useActivityLogStore();
  const { selectedCompany, setSelectedCompany } = useAssetStore();

  const [searchQuery, setSearchQuery]     = useState('');
  const [actionFilter, setActionFilter]   = useState<HistoryAction | 'all'>('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const COMPANIES: { id: Company | 'all'; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'KHEALTH',  label: 'KHEALTH' },
    { id: 'CAREVIEW', label: 'CAREVIEW' },
    { id: 'GLOWFIND', label: 'GLOWFIND' },
  ];

  const ACTIONS: { id: HistoryAction | 'all'; label: string }[] = [
    { id: 'all',         label: 'All Actions' },
    { id: 'added',       label: 'Added' },
    { id: 'edited',      label: 'Edited' },
    { id: 'deleted',     label: 'Deleted' },
    { id: 'transferred', label: 'Transferred' },
    { id: 'disposed',    label: 'Disposed' },
  ];

  const filtered = history.filter(entry => {
    const matchesCompany = selectedCompany === 'all' || entry.company === selectedCompany;
    const matchesAction  = actionFilter === 'all' || entry.action === actionFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch  =
      entry.deviceCode.toLowerCase().includes(q) ||
      entry.deviceName.toLowerCase().includes(q) ||
      (entry.details?.toLowerCase().includes(q) ?? false);
    return matchesCompany && matchesAction && matchesSearch;
  });

  const formatTimestamp = (ts: string) =>
    new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Tracking all device actions and changes</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear Log
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by device code, name, or details..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Company filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Company</p>
            <div className="flex flex-wrap gap-2">
              {COMPANIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompany(c.id as Company | 'all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    selectedCompany === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#243352]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Action</p>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setActionFilter(a.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    actionFilter === a.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#243352]'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-slate-500">
          Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{history.length}</span> entries
        </p>
      </div>

      {/* Log entries */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] divide-y divide-gray-200 dark:divide-[#1e3a5f]">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Activity className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white mb-1">No Activity Yet</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {history.length > 0
                ? 'No entries match your current filters'
                : 'Actions on assets will appear here'}
            </p>
          </div>
        ) : (
          filtered.map(entry => {
            const ActionIcon = ACTION_ICON[entry.action] ?? Plus;
            return (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${ACTION_BADGE[entry.action]}`}>
                    <ActionIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${ACTION_BADGE[entry.action]}`}>
                        {entry.action}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-semibold text-gray-900 dark:text-slate-200">
                        {entry.deviceCode}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500">—</span>
                      <span className="text-gray-900 dark:text-slate-200">{entry.deviceName}</span>
                    </div>

                    {entry.action === 'transferred' && entry.fromCompany && entry.toCompany ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(entry.fromCompany)}`}>
                          {entry.fromCompany}
                        </span>
                        <ArrowRightLeft className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(entry.toCompany)}`}>
                          {entry.toCompany}
                        </span>
                      </div>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(entry.company)}`}>
                        {entry.company}
                      </span>
                    )}

                    {entry.details && (
                      <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{entry.details}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clear confirm modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-sm w-full p-6 shadow-2xl border dark:border-[#1e3a5f]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Clear Activity Log?</h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
              This will permanently remove all {history.length} log entries. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearHistory(); setShowConfirmClear(false); }}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
