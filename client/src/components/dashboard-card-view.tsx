import { useEffect, useState } from 'react';
import {
  Search, Monitor, Laptop, Keyboard, Mouse, Printer,
  Server, Wifi, Smartphone, MoreVertical, Eye, Edit,
  Trash2, ArrowRightLeft, AlertTriangle, History,
} from 'lucide-react';
import type { ITAsset, AssetStatus, AssetCategory, Company } from '@/types/inventory';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { AssetDetails } from './asset-details';
import { AssetActivityLogModal } from './asset-activity-log-modal';

// ── helpers ───────────────────────────────────────────────────────────────
type CategoryFilter = 'all' | AssetCategory;

const CATEGORY_ICON: Record<string, React.ElementType> = {
  laptop: Laptop, desktop: Monitor, monitor: Monitor,
  keyboard: Keyboard, mouse: Mouse, printer: Printer,
  server: Server, networking: Wifi, phone: Smartphone,
  tablet: Smartphone, other: Monitor,
};

const COMPANY_ICON_BG: Record<string, string> = {
  KHEALTH:  'bg-blue-500/20 text-blue-400',
  CAREVIEW: 'bg-green-500/20 text-green-400',
  GLOWFIND: 'bg-orange-500/20 text-orange-400',
};

const STATUS_COLORS: Record<string, string> = {
  active:          'bg-green-500/20 text-green-400',
  available:       'bg-teal-500/20 text-teal-400',
  'in-storage':    'bg-purple-500/20 text-purple-400',
  'in-maintenance':'bg-orange-500/20 text-orange-400',
  disposed:        'bg-red-500/20 text-red-400',
};

function warrantyExpiringSoon(w?: string) {
  if (!w) return false;
  const days = Math.ceil((new Date(w).getTime() - Date.now()) / 86_400_000);
  return days > 0 && days <= 30;
}

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all',        label: 'All Categories' },
  { id: 'laptop',     label: 'Laptop' },
  { id: 'desktop',    label: 'Desktop' },
  { id: 'monitor',    label: 'Monitor' },
  { id: 'printer',    label: 'Printer' },
  { id: 'networking', label: 'Network' },
  { id: 'mobile',     label: 'Mobile' },
  { id: 'mobile + subscription', label: 'Mobile + Subscription' },
  { id: 'tablet',     label: 'Tablet' },
  { id: 'other',      label: 'Other' },
];

interface DashboardCardViewProps {
  onEdit?: (asset: ITAsset) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (asset: ITAsset) => void;
}

export function DashboardCardView({ onEdit, onDelete, onViewDetails }: DashboardCardViewProps) {
  const {
    assets, selectedCompany, setSelectedCompany,
    fetchAssets, fetchSubscriptions,
    getWarrantyExpiringAssets, getExpiringSubscriptions,
    isLoading, deleteAsset,
  } = useAssetStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const allowEdit = isAdmin || user?.role === 'encoder';

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState<AssetStatus | 'all'>('all');
  const [categoryFilter, setCategory] = useState<CategoryFilter>('all');
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete]     = useState<ITAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<ITAsset | undefined>(undefined);
  const [viewingAsset, setViewingAsset] = useState<ITAsset | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [viewingActivityLog, setViewingActivityLog] = useState<ITAsset | undefined>(undefined);

  useEffect(() => {
    fetchAssets();
    fetchSubscriptions();
  }, [fetchAssets, fetchSubscriptions]);

  const nonDeleted   = assets.filter(a => !a.isDeleted);
  const byCompany    = selectedCompany === 'all'
    ? nonDeleted
    : nonDeleted.filter(a => a.company === selectedCompany);

  const filtered = byCompany.filter(a => {
    const q = search.toLowerCase();
    const matchSearch =
      a.deviceCode.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.brand.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      (a.assignedTo?.toLowerCase().includes(q) ?? false);
    const matchStatus   = statusFilter === 'all'   || a.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  }).sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));

  const countFor  = (c: Company) => nonDeleted.filter(a => a.company === c);
  const expiringW = getWarrantyExpiringAssets();
  const expiringS = getExpiringSubscriptions();

  const COMPANIES: { id: Company | 'all'; label: string; dot?: string }[] = [
    { id: 'all',      label: 'All Companies' },
    { id: 'KHEALTH',  label: 'KHEALTH',  dot: 'bg-blue-500' },
    { id: 'CAREVIEW', label: 'CAREVIEW', dot: 'bg-green-500' },
  ];

  const handleView = (asset: ITAsset) => {
    setViewingAsset(asset);
  };

  const handleViewClose = () => {
    setViewingAsset(undefined);
  };

  const handleViewEdit = () => {
    if (viewingAsset) {
      setEditingAsset(viewingAsset);
      setShowForm(true);
      setViewingAsset(undefined);
    }
  };

  const handleViewActivityLog = (asset: ITAsset) => {
    setViewingActivityLog(asset);
  };


  const handleDelete = async (id: string) => {
    if (onDelete) {
      onDelete(id);
    } else {
      await deleteAsset(id);
    }
  };

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="ml-3 text-gray-600 dark:text-slate-400 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {expiringW.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-500/10 border-l-4 border-yellow-400 dark:border-yellow-500/50 p-4 rounded-r-lg">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 uppercase tracking-wider mb-2">
            ⚠️ Warranties Expiring Soon ({expiringW.length})
          </h3>
          <ul className="space-y-1">
            {expiringW.map(a => (
              <li key={a._id} className="text-sm text-yellow-700 dark:text-yellow-400/80 flex justify-between border-b border-yellow-200/50 dark:border-yellow-500/20 pb-1">
                <span><span className="font-medium">{a.deviceCode}</span> – {a.name}</span>
                <span className="italic font-semibold">Expires: {new Date(a.warrantyExpiry!).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expiringS.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-400 dark:border-blue-500/50 p-4 rounded-r-lg">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">
            📅 Subscriptions Renewing Soon ({expiringS.length})
          </h3>
          <ul className="space-y-1">
            {expiringS.map(s => (
              <li key={s.id} className="text-sm text-blue-700 dark:text-blue-400/80 flex justify-between border-b border-blue-200/50 dark:border-blue-500/20 pb-1">
                <span><span className="font-medium">{s.referenceCode}</span> – {s.name}</span>
                <span className="italic font-semibold">Renews: {new Date(s.renewalDate).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Company Filter ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {COMPANIES.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCompany(c.id as Company | 'all')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all border ${
              selectedCompany === c.id
                ? c.id === 'all'      ? 'bg-slate-600  text-white border-slate-600'
                : c.id === 'KHEALTH'  ? 'bg-blue-600   text-white border-blue-600'
                : c.id === 'CAREVIEW' ? 'bg-green-600  text-white border-green-600'
                :                       'bg-orange-600 text-white border-orange-600'
                : 'bg-white dark:bg-[#162236] text-gray-700 dark:text-slate-300 border-gray-300 dark:border-[#1e3a5f] hover:border-gray-400'
            }`}
          >
            {c.dot && <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />}
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['KHEALTH', 'CAREVIEW'] as Company[]).map(c => {
          const list   = countFor(c);
          const active = list.filter(a => a.status === 'active').length;
          const color  = c === 'KHEALTH' ? 'text-blue-400' : c === 'CAREVIEW' ? 'text-green-400' : 'text-orange-400';
          const iconBg = c === 'KHEALTH' ? 'bg-blue-500/20' : c === 'CAREVIEW' ? 'bg-green-500/20' : 'bg-orange-500/20';
          return (
            <div key={c} className="bg-white dark:bg-[#162236] rounded-2xl p-5 border border-gray-200 dark:border-[#1e3a5f] shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-sm font-bold ${color}`}>{c} Total</span>
                <div className={`p-2 rounded-lg ${iconBg}`}>
                  <Monitor className={`w-5 h-5 ${color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{list.length}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{active} active</p>
            </div>
          );
        })}
        <div className="bg-white dark:bg-[#162236] rounded-2xl p-5 border border-gray-200 dark:border-[#1e3a5f] shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <span className="text-sm font-bold text-gray-500 dark:text-slate-400">Total Devices</span>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700">
              <Monitor className="w-5 h-5 text-gray-500 dark:text-slate-300" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{nonDeleted.length}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">All companies</p>
        </div>
      </div>

      {/* ── Category Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setCategory(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === t.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-[#243352]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-[#1e3a5f] text-sm font-semibold text-gray-700 dark:text-slate-300 bg-white dark:bg-[#162236] hover:bg-gray-50 dark:hover:bg-[#1e2d4a] whitespace-nowrap transition-colors">
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* ── Search + Status ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Device name, code, manufacturer, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-[#1e3a5f] rounded-xl bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value as AssetStatus | 'all')}
          className="px-4 py-2.5 border border-gray-300 dark:border-[#1e3a5f] rounded-xl bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="available">Available</option>
          <option value="in-storage">In Storage</option>
          <option value="in-maintenance">In Maintenance</option>
        </select>
        {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); setCategory('all'); }}
            className="px-4 py-2.5 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-[#243352] transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Asset Count ─────────────────────────────────────────────────── */}
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Showing <span className="font-semibold text-gray-700 dark:text-slate-300">{filtered.length}</span> of{' '}
        <span className="font-semibold">{nonDeleted.length}</span> assets
      </p>

      {/* ── Card Grid ───────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(asset => {
            const Icon      = CATEGORY_ICON[asset.category] ?? Monitor;
            const iconBg    = COMPANY_ICON_BG[asset.company] ?? 'bg-gray-500/20 text-gray-400';
            const statusCls = STATUS_COLORS[asset.status]   ?? 'bg-gray-500/20 text-gray-400';
            const expiring  = warrantyExpiringSoon(asset.warrantyExpiry);

            return (
              <div
                key={asset._id}
                onClick={() => onViewDetails?.(asset)}
                className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-2xl p-5 hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[140px]">
                        {asset.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{asset.category}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#0f1729] text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-[#1e3a5f] flex-shrink-0">
                    {asset.deviceCode}
                  </span>
                </div>

                {/* Company */}
                <div className="mb-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getCompanyBadgeClasses(asset.company)}`}>
                    {asset.company}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs mb-4">
                  {[
                    ['Manufacturer', asset.brand],
                    ['Model', asset.model],
                    ['S/N', asset.serialNumber],
                    ['Assigned to', asset.assignedTo || '—'],
                    ['Location', asset.location],
                  ].map(([label, value]) => (
                    <p key={label} className="text-gray-500 dark:text-slate-400">
                      {label}: <span className="font-semibold text-gray-700 dark:text-slate-300">{value}</span>
                    </p>
                  ))}
                </div>

                {asset.notes && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic mb-3 truncate">{asset.notes}</p>
                )}

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e3a5f]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusCls}`}>
                      {asset.status.replace('-', ' ')}
                    </span>
                    {expiring && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold">
                        <AlertTriangle className="w-3 h-3" /> Warranty expiring
                      </span>
                    )}
                  </div>

                  {allowEdit && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === asset._id ? null : asset._id!)}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-[#1e2d4a] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === asset._id && (
                        <div className="absolute right-0 bottom-8 z-10 w-40 bg-white dark:bg-[#1e2d4a] border border-gray-200 dark:border-[#1e3a5f] rounded-xl shadow-lg overflow-hidden">
                          <button onClick={() => handleView(asset)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#243352]">
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          {onEdit && (
                            <button onClick={() => { onEdit(asset); setOpenMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#243352]">
                              <Edit className="w-4 h-4" /> Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && assetToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 dark:border-[#1e3a5f]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to delete{' '}
              <span className="font-bold">{assetToDelete.deviceCode}</span>?
              This will move the asset to "Deleted Devices".
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold">
                Cancel
              </button>
              <button
                onClick={() => { handleDelete(assetToDelete._id!); setShowDeleteModal(false); }}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {viewingAsset && (
        <AssetDetails
          asset={viewingAsset}
          onClose={handleViewClose}
          onEdit={handleViewEdit}
          onViewActivityLog={() => handleViewActivityLog(viewingAsset)}
          isAdmin={isAdmin}
          canEdit={allowEdit}
        />
      )}
      {viewingActivityLog && (
        <AssetActivityLogModal
          asset={viewingActivityLog}
          onClose={() => setViewingActivityLog(undefined)}
        />
      )}
    </div>
    
  );
}
