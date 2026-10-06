import { useMemo, useState } from 'react';
import { Search, Eye, Edit, MoreHorizontal, Plus, Download, Upload, Package, UserCheck, CircleCheck, Wrench, Trash, SlidersHorizontal } from 'lucide-react';
import type { ITAsset, Company } from '@/types/inventory';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { FurnitureUploadModal, type FurnitureImportRow, type ImportResult } from '@/components/furniture-upload-modal';

interface Props {
  assets: ITAsset[];
  selectedCompany: Company | 'all';
  onCompanyChange: (c: Company | 'all') => void;
  onAdd: () => void;
  onEdit: (a: ITAsset) => void;
  onView: (a: ITAsset) => void;
  onDelete: (id: string) => void;
  onImport?: (rows: FurnitureImportRow[]) => Promise<ImportResult>;
  isAdmin: boolean;
  canEdit?: boolean;
}

const PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
};
const statusLabelOf = (a: ITAsset) => (a.staffHouse as any)?.statusLabel
  || ({ active: 'In Use', available: 'Available', 'in-maintenance': 'Under Repair', 'in-storage': 'For Disposal', disposed: 'Disposed' } as any)[a.status]
  || a.status;

export function StaffHouseInventory({ assets, selectedCompany, onCompanyChange, onAdd, onEdit, onView, onDelete, onImport, isAdmin, canEdit }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const [search, setSearch] = useState('');
  const [houseFilter, setHouseFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const nonDeleted = assets.filter((a) => !a.isDeleted);

  const stats = {
    total: nonDeleted.length,
    assigned: nonDeleted.filter((a) => !!a.assignedTo?.trim()).length,
    available: nonDeleted.filter((a) => statusLabelOf(a) === 'Available').length,
    repair: nonDeleted.filter((a) => statusLabelOf(a) === 'Under Repair').length,
    disposal: nonDeleted.filter((a) => statusLabelOf(a) === 'For Disposal' || a.status === 'disposed').length,
  };

  const houses = useMemo(() => Array.from(new Set(nonDeleted.map((a) => (a.staffHouse as any)?.staffHouseName).filter(Boolean))) as string[], [nonDeleted]);
  const categories = useMemo(() => Array.from(new Set(nonDeleted.map((a) => a.category).filter(Boolean))), [nonDeleted]);

  const companyScoped = selectedCompany === 'all' ? nonDeleted : nonDeleted.filter((a) => a.company === selectedCompany);
  const filtered = companyScoped.filter((a) => {
    const sh: any = a.staffHouse ?? {};
    const q = search.toLowerCase();
    const matchSearch = !q || a.deviceCode.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      || (sh.staffHouseName || '').toLowerCase().includes(q) || (sh.roomName || '').toLowerCase().includes(q) || (a.assignedTo || '').toLowerCase().includes(q) || (sh.assignedResident || '').toLowerCase().includes(q);
    const matchHouse = houseFilter === 'all' || sh.staffHouseName === houseFilter;
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    const matchStatus = statusFilter === 'all' || statusLabelOf(a) === statusFilter;
    const matchCondition = conditionFilter === 'all' || a.condition === conditionFilter;
    return matchSearch && matchHouse && matchCategory && matchStatus && matchCondition;
  }).sort((x, y) => x.deviceCode.localeCompare(y.deviceCode));

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);

  const companyTabs: { id: Company | 'all'; label: string }[] = [
    { id: 'all', label: 'All Companies' }, { id: 'KHEALTH', label: 'KHealth' }, { id: 'CAREVIEW', label: 'Careview' },
  ];
  const countFor = (id: Company | 'all') => (id === 'all' ? nonDeleted.length : nonDeleted.filter((a) => a.company === id).length);

  const exportCsv = () => {
    if (filtered.length === 0) { alert('No assets to export'); return; }
    const headers = ['Asset Code', 'Asset Name', 'Category', 'Staff House', 'Staff House Code', 'Assigned To', 'Resident', 'Location', 'Status'];
    const csv = [headers.join(','), ...filtered.map((a) => { const sh: any = a.staffHouse ?? {}; return [
      a.deviceCode, a.name, a.category, sh.staffHouseName || '', sh.staffHouseCode || '', a.assignedTo || 'Unassigned', sh.assignedResident || '', a.location, statusLabelOf(a),
    ].map((s) => `"${String(s ?? '').replace(/"/g, '""')}"`).join(','); })].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `staff-house-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  };

  const StatTile = ({ icon: Icon, label, value, accent }: any) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className="w-4 h-4" /> {label}</div>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff House Inventory</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Manage and track Staff House properties, rooms, furniture, appliances, equipment, assignments, condition, maintenance, and disposal.</p>
        </div>
        <div className="flex items-center gap-2">
          {allowEdit && onImport && <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Upload className="w-4 h-4" /> Upload Excel</button>}
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Download className="w-4 h-4" /> Export Report</button>
          {allowEdit && <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79]"><Plus className="w-4 h-4" /> Add Staff House Asset</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatTile icon={Package} label="Total Assets" value={stats.total} />
        <StatTile icon={UserCheck} label="Assigned / In Use" value={stats.assigned} />
        <StatTile icon={CircleCheck} label="Available" value={stats.available} />
        <StatTile icon={Wrench} label="Under Repair" value={stats.repair} accent="text-amber-600" />
        <StatTile icon={Trash} label="For Disposal" value={stats.disposal} />
      </div>

      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="flex gap-2 px-6 pt-4 border-b border-gray-100 dark:border-[#1e3a5f]">
          {companyTabs.map((c) => (
            <button key={c.id} onClick={() => onCompanyChange(c.id)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedCompany === c.id ? 'border-[#0b5c96] text-[#0b5c96]' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
              {c.label} <span className="text-xs text-gray-400">{countFor(c.id)}</span>
            </button>
          ))}
        </div>

        <div className="p-6 flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search asset code, name, staff house, room, resident..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300"><option value="all">All Staff Houses</option>{houses.map((h) => <option key={h}>{h}</option>)}</select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300"><option value="all">All Categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300"><option value="all">All Statuses</option>{['Available', 'Assigned', 'In Use', 'Under Repair', 'For Disposal', 'Disposed'].map((s) => <option key={s}>{s}</option>)}</select>
          <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300"><option value="all">All Conditions</option>{['New', 'Good', 'Fair', 'Poor', 'Damaged'].map((c) => <option key={c}>{c}</option>)}</select>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg text-sm text-gray-600 dark:text-slate-300"><SlidersHorizontal className="w-4 h-4" /> More Filters</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Asset Code</th><th className="px-5 py-3">Asset Name</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Staff House</th>
                <th className="px-5 py-3">Assigned To</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {pageItems.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No staff house assets found</td></tr>
              ) : pageItems.map((a) => {
                const sh: any = a.staffHouse ?? {};
                const label = statusLabelOf(a);
                return (
                  <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                    <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-slate-200">{a.name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{a.category || '-'}</td>
                    <td className="px-5 py-3"><div className="text-gray-700 dark:text-slate-300">{sh.staffHouseName || '-'}</div>{sh.staffHouseCode && <div className="text-xs text-gray-400">{sh.staffHouseCode}</div>}</td>
                    <td className="px-5 py-3"><div className="text-gray-700 dark:text-slate-300">{a.assignedTo || sh.assignedResident || <span className="text-gray-400">Unassigned</span>}</div>{sh.bedNumber && <div className="text-xs text-gray-400">{sh.bedNumber}</div>}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400 max-w-[180px] truncate" title={a.location}>{a.location || '-'}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${PILL[label] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap relative">
                      <button onClick={() => onView(a)} className="p-1.5 text-gray-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                      {allowEdit && <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-green-600" title="Edit"><Edit className="w-4 h-4" /></button>}
                      {isAdmin && (
                        <>
                          <button onClick={() => setMenuFor(menuFor === a._id ? null : a._id!)} className="p-1.5 text-gray-400 hover:text-gray-700" title="More"><MoreHorizontal className="w-4 h-4" /></button>
                          {menuFor === a._id && (
                            <div className="absolute right-4 top-10 z-10 bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-lg shadow-lg py-1">
                              <button onClick={() => { setMenuFor(null); if (confirm(`Delete ${a.deviceCode}?`)) onDelete(a._id!); }} className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] text-left">Delete</button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="staff house assets" /></div>}
      </div>

      {showUpload && onImport && (
        <FurnitureUploadModal
          onClose={() => setShowUpload(false)}
          onImport={onImport}
          title="Upload Staff House Assets from Excel"
          templateFileName="staff-house-upload-template.xlsx"
          templateHeaders={['Asset Name', 'Category', 'Brand', 'Model', 'Serial Number', 'Company', 'Assigned To', 'Department', 'Location', 'Condition', 'Status', 'Purchase Date', 'Notes']}
          templateExampleRow={['Double-Deck Bed Frame', 'Bed', 'Uratex', '', '', 'KHEALTH', 'Mark Villanueva', 'Operations', 'Makati Staff House · Room 201', 'New', 'In Use', '2026-01-10', '']}
        />
      )}
    </div>
  );
}
