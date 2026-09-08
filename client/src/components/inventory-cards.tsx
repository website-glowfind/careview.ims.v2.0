import { useState } from 'react';
import {
  Search, MoreVertical, Eye, Edit, Trash2, ArrowRightLeft,
  Monitor, Keyboard, Mouse, Printer, Server, Wifi, Smartphone,
  Laptop, AlertTriangle,
  Sofa, Refrigerator, Lightbulb, Wrench, Car, Package,
} from 'lucide-react';
import type { ITAsset, AssetStatus, AssetCategory, Company, AssetType } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';

interface InventoryCardsProps {
  assets: ITAsset[];
  selectedCompany: Company | 'all';
  onCompanyChange: (company: Company | 'all') => void;
  onEdit: (asset: ITAsset) => void;
  onDelete: (id: string) => void;
  onViewDetails: (asset: ITAsset) => void;
  onTransfer: (asset: ITAsset) => void;
  isAdmin: boolean;
  canEdit?: boolean;
  assetType?: AssetType;
}

type CategoryTab = string;

const IT_TABS: { id: CategoryTab; label: string }[] = [
  { id: 'all',        label: 'All Devices' },
  { id: 'laptop',     label: 'Laptop' },
  { id: 'desktop',    label: 'Desktop' },
  { id: 'monitor',    label: 'Monitor' },
  { id: 'printer',    label: 'Printer' },
  { id: 'networking', label: 'Network' },
  { id: 'mobile',     label: 'Mobile' },
];
const GENERAL_TABS: { id: CategoryTab; label: string }[] = [
  { id: 'all',        label: 'All Assets' },
  { id: 'furniture',  label: 'Furniture' },
  { id: 'appliance',  label: 'Appliance' },
  { id: 'fixture',    label: 'Fixture' },
  { id: 'equipment',  label: 'Equipment' },
  { id: 'vehicle',    label: 'Vehicle' },
];

const CATEGORY_ICON: Record<string, React.ElementType> = {
  laptop:     Laptop,
  desktop:    Monitor,
  monitor:    Monitor,
  keyboard:   Keyboard,
  mouse:      Mouse,
  printer:    Printer,
  server:     Server,
  networking: Wifi,
  phone:      Smartphone,
  tablet:     Smartphone,
  other:      Package,
  furniture:  Sofa,
  appliance:  Refrigerator,
  fixture:    Lightbulb,
  equipment:  Wrench,
  vehicle:    Car,
};

const COMPANY_ICON_BG: Record<string, string> = {
  KHEALTH:  'bg-blue-500/20 text-blue-400',
  CAREVIEW: 'bg-green-500/20 text-green-400',
  GLOWFIND: 'bg-orange-500/20 text-orange-400',
};

const STATUS_COLORS: Record<string, string> = {
  active:         'bg-green-500/20 text-green-400',
  available:      'bg-teal-500/20 text-teal-400',
  'in-storage':   'bg-purple-500/20 text-purple-400',
  'in-maintenance':'bg-orange-500/20 text-orange-400',
  disposed:       'bg-red-500/20 text-red-400',
};

function isWarrantyExpiringSoon(warrantyExpiry?: string): boolean {
  if (!warrantyExpiry) return false;
  const expiry = new Date(warrantyExpiry);
  const today = new Date();
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 && days <= 30;
}

export function InventoryCards({
  assets,
  selectedCompany,
  onCompanyChange,
  onEdit,
  onDelete,
  onViewDetails,
  onTransfer,
  isAdmin,
  canEdit,
  assetType = 'IT',
}: InventoryCardsProps) {
  const allowEdit = canEdit ?? isAdmin;
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [categoryTab, setCategoryTab]   = useState<CategoryTab>('all');
  const [openMenu, setOpenMenu]         = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete]     = useState<ITAsset | null>(null);

  const getCategoriesForTab = (tab: CategoryTab): AssetCategory[] => {
    const itMap: Record<string, AssetCategory[]> = {
      laptop:     ['laptop'],
      printer:    ['printer'],
      desktop:    ['desktop'],
      keyboard:   ['keyboard'],
      mouse:      ['mouse'],
      monitor:    ['monitor'],
      networking: ['networking','server'],
      mobile:     ['mobile','mobile + subscription','tablet'],
    };
    const generalMap: Record<string, AssetCategory[]> = {
      furniture:  ['furniture'],
      appliance:  ['appliance'],
      fixture:    ['fixture'],
      equipment:  ['equipment'],
      vehicle:    ['vehicle'],
    };
    const map = assetType === 'General' ? generalMap : itMap;
    return map[tab] ?? [];
  };

  const nonDeleted  = assets.filter(a => !a.isDeleted);
  const byCompany   = selectedCompany === 'all' ? nonDeleted : nonDeleted.filter(a => a.company === selectedCompany);

  const filtered = byCompany.filter(a => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      a.deviceCode.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.brand.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      (a.assignedTo?.toLowerCase().includes(q) ?? false);
    const matchStatus   = statusFilter === 'all' || a.status === statusFilter;
    const matchCategory = categoryTab === 'all' || getCategoriesForTab(categoryTab).includes(a.category);
    return matchSearch && matchStatus && matchCategory;
  }).sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));

  // Stats
  const countFor = (company: Company) => nonDeleted.filter(a => a.company === company);

  const tabs = assetType === 'General' ? GENERAL_TABS : IT_TABS;

  const companies: { id: Company | 'all'; label: string; dot?: string }[] = [
    { id: 'all',      label: 'All Companies' },
    { id: 'KHEALTH',  label: 'KHEALTH',  dot: 'bg-blue-500' },
    { id: 'CAREVIEW', label: 'CAREVIEW', dot: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Company Filter */}
      <div className="flex flex-wrap gap-3">
        {companies.map(c => (
          <button
            key={c.id}
            onClick={() => onCompanyChange(c.id as Company | 'all')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all border ${
              selectedCompany === c.id
                ? c.id === 'all'      ? 'bg-slate-600 text-white border-slate-600'
                : c.id === 'KHEALTH'  ? 'bg-blue-600 text-white border-blue-600'
                : c.id === 'CAREVIEW' ? 'bg-green-600 text-white border-green-600'
                :                       'bg-orange-600 text-white border-orange-600'
                : 'bg-white dark:bg-[#162236] text-gray-700 dark:text-slate-300 border-gray-300 dark:border-[#1e3a5f] hover:border-gray-400 dark:hover:border-slate-500'
            }`}
          >
            {c.dot && <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />}
            {c.label}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['KHEALTH','CAREVIEW'] as Company[]).map(c => {
          const count  = countFor(c);
          const active = count.filter(a => a.status === 'active').length;
          const colors: Record<Company, string> = {
            KHEALTH:  'text-blue-400',
            CAREVIEW: 'text-green-400',
            GLOWFIND: 'text-orange-400',
          };
          const iconBg: Record<Company, string> = {
            KHEALTH:  'bg-blue-500/20',
            CAREVIEW: 'bg-green-500/20',
            GLOWFIND: 'bg-orange-500/20',
          };
          return (
            <div key={c} className="bg-white dark:bg-[#162236] rounded-2xl p-5 border border-gray-200 dark:border-[#1e3a5f] shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-sm font-bold ${colors[c]}`}>{c} Total</span>
                <div className={`p-2 rounded-lg ${iconBg[c]}`}>
                  <Monitor className={`w-5 h-5 ${colors[c]}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{count.length}</p>
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

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCategoryTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              categoryTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-[#243352]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Device name, code, manufacturer, user..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-[#1e3a5f] rounded-xl bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as AssetStatus | 'all')}
          className="px-4 py-2.5 border border-gray-300 dark:border-[#1e3a5f] rounded-xl bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="available">Available</option>
          <option value="in-storage">In Storage</option>
          <option value="in-maintenance">In Maintenance</option>
        </select>
        {(searchTerm || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
            className="px-4 py-2.5 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-[#243352] transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Asset Count */}
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Showing <span className="font-semibold text-gray-700 dark:text-slate-300">{filtered.length}</span> assets
      </p>

      {/* Cards Grid */}
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
            const statusCls = STATUS_COLORS[asset.status] ?? 'bg-gray-500/20 text-gray-400';
            const expiring  = isWarrantyExpiringSoon(asset.warrantyExpiry);

            return (
              <div
                key={asset._id}
                className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-2xl p-5 hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all cursor-pointer group"
                onClick={() => onViewDetails(asset)}
              >
                {/* Card Header */}
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#0f1729] text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-[#1e3a5f]">
                      {asset.deviceCode}
                    </span>
                  </div>
                </div>

                {/* Company Badge */}
                <div className="mb-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getCompanyBadgeClasses(asset.company)}`}>
                    {asset.company}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs mb-4">
                  <p className="text-gray-500 dark:text-slate-400">
                    Manufacturer: <span className="font-semibold text-gray-700 dark:text-slate-300">{asset.brand}</span>
                  </p>
                  <p className="text-gray-500 dark:text-slate-400">
                    Model: <span className="font-semibold text-gray-700 dark:text-slate-300">{asset.model}</span>
                  </p>
                  <p className="text-gray-500 dark:text-slate-400">
                    S/N: <span className="font-mono font-semibold text-gray-700 dark:text-slate-300">{asset.serialNumber}</span>
                  </p>
                  <p className="text-gray-500 dark:text-slate-400">
                    Assigned to: <span className="font-semibold text-gray-700 dark:text-slate-300">{asset.assignedTo || '—'}</span>
                  </p>
                  <p className="text-gray-500 dark:text-slate-400">
                    Location: <span className="font-semibold text-gray-700 dark:text-slate-300">{asset.location}</span>
                  </p>
                </div>

                {/* Notes */}
                {asset.notes && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 italic mb-3 truncate">{asset.notes}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e3a5f]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusCls}`}>
                      {asset.status.replace('-', ' ')}
                    </span>
                    {expiring && (
                      <span className="flex items-center gap-1 text-[10px] text-orange-500 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Warranty expiring
                      </span>
                    )}
                  </div>

                  {/* Action menu */}
                  {allowEdit && (
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenu(openMenu === asset._id ? null : asset._id!)}
                        className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-[#1e2d4a] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === asset._id && (
                        <div className="absolute right-0 bottom-8 z-10 w-40 bg-white dark:bg-[#1e2d4a] border border-gray-200 dark:border-[#1e3a5f] rounded-xl shadow-lg overflow-hidden">
                          <button
                            onClick={() => { onViewDetails(asset); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#243352]"
                          >
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          <button
                            onClick={() => { onEdit(asset); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#243352]"
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => { onTransfer(asset); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#243352]"
                          >
                            <ArrowRightLeft className="w-4 h-4" /> Transfer
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => { setAssetToDelete(asset); setShowDeleteModal(true); setOpenMenu(null); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
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
              Are you sure you want to delete <span className="font-bold">{assetToDelete.deviceCode}</span>?
              This will move the asset to "Deleted Devices".
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(assetToDelete._id!); setShowDeleteModal(false); }}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
