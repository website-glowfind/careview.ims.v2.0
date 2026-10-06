import { useState } from 'react';
import {
  Search, Eye, Edit, ArrowRightLeft, Plus, Download, Upload,
  Package, UserCheck, CircleCheck, Wrench, Trash,
  MoreHorizontal, UserPlus, Recycle, Printer, Archive as ArchiveIcon,
} from 'lucide-react';
import type { ITAsset, AssetStatus, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { FurnitureUploadModal, type FurnitureImportRow, type ImportResult } from '@/components/furniture-upload-modal';
import { FurnitureExportModal } from '@/components/furniture-export-modal';

interface FurnitureInventoryProps {
  assets: ITAsset[];
  selectedCompany: Company | 'all';
  onCompanyChange: (company: Company | 'all') => void;
  onEdit: (asset: ITAsset) => void;
  onDelete: (id: string) => void;
  onViewDetails: (asset: ITAsset) => void;
  onTransfer: (asset: ITAsset) => void;
  onAdd: () => void;
  onImport?: (rows: FurnitureImportRow[]) => Promise<ImportResult>;
  onMenuAction?: (asset: ITAsset, action: string) => void;
  isAdmin: boolean;
  canEdit?: boolean;
}

const STATUS_PILL: Record<AssetStatus, string> = {
  active: 'bg-blue-100 text-blue-700',
  available: 'bg-green-100 text-green-700',
  'in-storage': 'bg-purple-100 text-purple-700',
  'in-maintenance': 'bg-amber-100 text-amber-700',
  disposed: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<AssetStatus, string> = {
  active: 'In Use',
  available: 'Available',
  'in-storage': 'In Storage',
  'in-maintenance': 'Under Repair',
  disposed: 'Disposed',
};
const CONDITION_PILL: Record<string, string> = {
  New: 'bg-green-100 text-green-700',
  Good: 'bg-blue-100 text-blue-700',
  Fair: 'bg-amber-100 text-amber-700',
  Poor: 'bg-orange-100 text-orange-700',
  Damaged: 'bg-red-100 text-red-700',
};

export function FurnitureInventory({
  assets, selectedCompany, onCompanyChange, onEdit, onDelete, onViewDetails, onTransfer, onAdd, onImport, onMenuAction, isAdmin, canEdit,
}: FurnitureInventoryProps) {
  const allowEdit = canEdit ?? isAdmin;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const act = (a: ITAsset, action: string) => {
    setMenuFor(null);
    if (onMenuAction) { onMenuAction(a, action); return; }
    // Fallbacks when no handler is wired
    if (action === 'view') onViewDetails(a);
    else if (action === 'edit') onEdit(a);
    else if (action === 'transfer') onTransfer(a);
    else if (action === 'archive') onDelete(a._id!);
    else if (action === 'print') window.print();
  };
  const MENU: { key: string; label: string; icon: any; danger?: boolean; admin?: boolean }[] = [
    { key: 'view', label: 'View Details', icon: Eye },
    { key: 'edit', label: 'Edit', icon: Edit },
    { key: 'assign', label: 'Assign', icon: UserPlus },
    { key: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
    { key: 'maintenance', label: 'Maintenance', icon: Wrench },
    { key: 'disposal', label: 'Request Disposal', icon: Recycle },
    { key: 'print', label: 'Print QR', icon: Printer },
    { key: 'archive', label: 'Archive', icon: ArchiveIcon, danger: true, admin: true },
  ];

  const nonDeleted = assets.filter((a) => !a.isDeleted);

  // ── Stat tiles ──
  const stats = {
    total: nonDeleted.length,
    assigned: nonDeleted.filter((a) => !!a.assignedTo?.trim()).length,
    available: nonDeleted.filter((a) => a.status === 'available').length,
    repair: nonDeleted.filter((a) => a.status === 'in-maintenance').length,
    disposal: nonDeleted.filter((a) => a.status === 'disposed').length,
  };

  const categories = Array.from(new Set(nonDeleted.map((a) => a.category))).filter(Boolean);

  const companyScoped = selectedCompany === 'all' ? nonDeleted : nonDeleted.filter((a) => a.company === selectedCompany);
  const filtered = companyScoped.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || a.deviceCode.toLowerCase().includes(q)
      || a.name.toLowerCase().includes(q)
      || (a.brand || '').toLowerCase().includes(q)
      || (a.serialNumber || '').toLowerCase().includes(q)
      || (a.assignedTo || '').toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchCondition = conditionFilter === 'all' || a.condition === conditionFilter;
    return matchSearch && matchCategory && matchStatus && matchCondition;
  }).sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);

  const companyTabs: { id: Company | 'all'; label: string }[] = [
    { id: 'all', label: 'All Companies' },
    { id: 'KHEALTH', label: 'KHEALTH' },
    { id: 'CAREVIEW', label: 'CAREVIEW' },
  ];
  const countFor = (id: Company | 'all') => (id === 'all' ? nonDeleted.length : nonDeleted.filter((a) => a.company === id).length);

  const StatTile = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: string }) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Furniture Inventory</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Manage company furniture, assignments, locations, maintenance, and disposal records.</p>
        </div>
        <div className="flex items-center gap-2">
          {allowEdit && onImport && (
            <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
              <Upload className="w-4 h-4" /> Upload Excel
            </button>
          )}
          <button onClick={() => setShowExport(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
            <Download className="w-4 h-4" /> Export Report
          </button>
          {allowEdit && (
            <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79]">
              <Plus className="w-4 h-4" /> Add Furniture Asset
            </button>
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatTile icon={Package} label="Total Assets" value={stats.total} />
        <StatTile icon={UserCheck} label="Assigned / In Use" value={stats.assigned} />
        <StatTile icon={CircleCheck} label="Available" value={stats.available} />
        <StatTile icon={Wrench} label="Under Repair" value={stats.repair} accent="text-amber-600" />
        <StatTile icon={Trash} label="For Disposal" value={stats.disposal} />
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        {/* Company tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-100 dark:border-[#1e3a5f]">
          {companyTabs.map((c) => (
            <button
              key={c.id}
              onClick={() => onCompanyChange(c.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedCompany === c.id
                  ? 'border-[#0b5c96] text-[#0b5c96]'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              {c.label} <span className="text-xs text-gray-400">{countFor(c.id)}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-6 flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset code, name, brand, serial, employee..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300 capitalize">
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'all')} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300">
            <option value="all">All Statuses</option>
            <option value="active">In Use</option>
            <option value="available">Available</option>
            <option value="in-storage">In Storage</option>
            <option value="in-maintenance">Under Repair</option>
          </select>
          <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300">
            <option value="all">All Conditions</option>
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
            <option value="Damaged">Damaged</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Asset Code</th>
                <th className="px-5 py-3">Furniture Name</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Brand</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Condition</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {pageItems.length === 0 ? (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No furniture assets found</td></tr>
              ) : pageItems.map((a) => (
                <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-slate-200 max-w-[180px] truncate" title={a.name}>{a.name}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400 capitalize">{a.category || '-'}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{a.brand || '-'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${getCompanyBadgeClasses(a.company)}`}>{a.company}</span></td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{a.assignedTo || <span className="text-gray-400">Unassigned</span>}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{a.department || '-'}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400 max-w-[160px] truncate" title={a.location}>{a.location || '-'}</td>
                  <td className="px-5 py-3">{a.condition ? <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${CONDITION_PILL[a.condition] ?? 'bg-gray-100 text-gray-600'}`}>{a.condition}</span> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_PILL[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[a.status] ?? a.status}</span></td>
                  <td className="px-5 py-3 text-right whitespace-nowrap relative">
                    <button onClick={() => onViewDetails(a)} className="p-1.5 text-gray-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                    {allowEdit && <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-green-600" title="Edit"><Edit className="w-4 h-4" /></button>}
                    <button onClick={() => setMenuFor(menuFor === a._id ? null : a._id!)} className="p-1.5 text-gray-400 hover:text-gray-700" title="More"><MoreHorizontal className="w-4 h-4" /></button>
                    {menuFor === a._id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                        <div className="absolute right-4 top-10 z-20 w-48 bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl shadow-lg py-1 text-left">
                          {MENU.filter((m) => (!m.admin || isAdmin) && (m.key === 'view' || m.key === 'print' || allowEdit)).map((m) => (
                            <button key={m.key} onClick={() => act(a, m.key)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1e2d4a] ${m.danger ? 'text-red-600' : 'text-gray-700 dark:text-slate-200'}`}>
                              <m.icon className="w-4 h-4" /> {m.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]">
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="furniture assets" />
          </div>
        )}
      </div>

      {showUpload && onImport && (
        <FurnitureUploadModal onClose={() => setShowUpload(false)} onImport={onImport} />
      )}
      {showExport && (
        <FurnitureExportModal assets={nonDeleted} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
