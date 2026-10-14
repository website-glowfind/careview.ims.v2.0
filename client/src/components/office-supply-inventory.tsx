import { useMemo, useState } from 'react';
import { Search, Eye, Edit, MoreHorizontal, Printer, Archive as ArchiveIcon, PackagePlus } from 'lucide-react';
import type { ITAsset, Company, OfficeSupplyDetails } from '@/types/inventory';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface Props {
  assets: ITAsset[];
  onEdit: (a: ITAsset) => void;
  onView: (a: ITAsset) => void;
  onDelete: (id: string) => void;
  onMenuAction?: (asset: ITAsset, action: string) => void;
  isAdmin: boolean;
  canEdit?: boolean;
}

const titleCase = (s: string) => (s || '').replace(/\b\w/g, (m) => m.toUpperCase());
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');

const PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
  'Low Stock': 'bg-orange-100 text-orange-700',
};

export const osOf = (a: ITAsset): OfficeSupplyDetails => (a.officeSupply ?? {}) as OfficeSupplyDetails;
export const isConsumable = (a: ITAsset) => osOf(a).itemType === 'consumable';
export const isLowStock = (a: ITAsset) => {
  const os = osOf(a);
  return os.itemType === 'consumable' && os.currentStock != null && os.minStock != null && os.currentStock <= os.minStock;
};
export const statusDisplay = (a: ITAsset) => {
  if (isConsumable(a)) return isLowStock(a) ? 'Low Stock' : 'Available';
  return osOf(a).statusLabel
    || ({ active: 'In Use', available: 'Available', 'in-maintenance': 'Under Repair', 'in-storage': 'For Disposal', disposed: 'Disposed' } as any)[a.status]
    || a.status;
};

const MENU: { key: string; label: string; icon: any; danger?: boolean; admin?: boolean; consumable?: boolean }[] = [
  { key: 'view', label: 'View Details', icon: Eye }, { key: 'edit', label: 'Edit', icon: Edit },
  { key: 'restock', label: 'Restock', icon: PackagePlus, consumable: true },
  { key: 'print', label: 'Print QR', icon: Printer }, { key: 'archive', label: 'Archive', icon: ArchiveIcon, danger: true, admin: true },
];

export function OfficeSupplyInventory({ assets, onEdit, onView, onDelete, onMenuAction, isAdmin, canEdit }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<Company | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reusable' | 'consumable'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const nonDeleted = assets.filter((a) => !a.isDeleted);
  const categories = useMemo(() => Array.from(new Set(nonDeleted.map((a) => a.category).filter(Boolean))), [nonDeleted]);

  const filtered = nonDeleted.filter((a) => {
    const os = osOf(a);
    const q = search.toLowerCase();
    const matchSearch = !q || a.deviceCode.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      || (a.brand || '').toLowerCase().includes(q) || (a.assignedTo || '').toLowerCase().includes(q) || (os.custodian || '').toLowerCase().includes(q);
    const matchCompany = companyFilter === 'all' || a.company === companyFilter;
    const matchType = typeFilter === 'all' || os.itemType === typeFilter;
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchSearch && matchCompany && matchType && matchCategory;
  }).sort((x, y) => x.deviceCode.localeCompare(y.deviceCode));

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);

  const companyBadge = (c: Company) => c === 'KHEALTH' ? 'bg-blue-50 text-blue-700' : c === 'CAREVIEW' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700';
  const companyLabel = (c: Company) => c === 'KHEALTH' ? 'KHealth' : c === 'CAREVIEW' ? 'Careview' : 'Glowfind';

  const SELECT = 'px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300';

  return (
    <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
      <div className="p-5 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, brand, assignee..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm" />
        </div>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value as any)} className={SELECT}><option value="all">All Companies</option><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option></select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={SELECT}><option value="all">All Types</option><option value="reusable">Reusable</option><option value="consumable">Controlled Consumable</option></select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${SELECT} capitalize`}><option value="all">All Categories</option>{categories.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3">Item Code</th><th className="px-5 py-3">Item Name</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Brand</th>
              <th className="px-5 py-3">Company</th><th className="px-5 py-3">Purchase Date</th><th className="px-5 py-3">Unit Cost</th><th className="px-5 py-3">Dept / Location</th>
              <th className="px-5 py-3">Condition / Stock</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
            {pageItems.length === 0 ? (
              <tr><td colSpan={11} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No office supply items found</td></tr>
            ) : pageItems.map((a) => {
              const os = osOf(a);
              const consumable = os.itemType === 'consumable';
              const label = statusDisplay(a);
              return (
                <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 dark:text-slate-200">{a.name}</div>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded ${consumable ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{consumable ? 'Controlled Consumable' : 'Reusable'}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400 capitalize">{a.category || '-'}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{a.brand || '-'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${companyBadge(a.company)}`}>{companyLabel(a.company)}</span></td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">{fmtDate(a.purchaseDate)}</td>
                  <td className="px-5 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap">{os.unitCost != null ? `${os.currency ?? '₱'}${Number(os.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-5 py-3">
                    {a.department || (a.location && a.location !== '—') ? (
                      <>{a.department && <div className="text-gray-700 dark:text-slate-300">{a.department}</div>}{a.location && a.location !== '—' && <div className="text-xs text-gray-400">{a.location}</div>}</>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {consumable ? (
                      <div><span className={`font-semibold ${isLowStock(a) ? 'text-orange-600' : 'text-gray-900 dark:text-slate-200'}`}>{os.currentStock ?? 0} / {os.minStock ?? 0}</span><div className="text-[11px] text-gray-400">curr / min</div></div>
                    ) : (
                      <span className="font-medium text-green-600">{a.condition || '-'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${PILL[label] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span></td>
                  <td className="px-5 py-3 text-right whitespace-nowrap relative">
                    <button onClick={() => onView(a)} className="p-1.5 text-gray-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                    {allowEdit && <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-green-600" title="Edit"><Edit className="w-4 h-4" /></button>}
                    <button onClick={() => window.print()} className="p-1.5 text-gray-400 hover:text-gray-700" title="Print QR"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => setMenuFor(menuFor === a._id ? null : a._id!)} className="p-1.5 text-gray-400 hover:text-gray-700" title="More"><MoreHorizontal className="w-4 h-4" /></button>
                    {menuFor === a._id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                        <div className="absolute right-4 top-10 z-20 w-44 bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl shadow-lg py-1 text-left">
                          {MENU.filter((m) => (!m.admin || isAdmin) && (m.key === 'view' || m.key === 'print' || allowEdit) && (!m.consumable || consumable)).map((m) => (
                            <button key={m.key} onClick={() => { setMenuFor(null); if (onMenuAction) onMenuAction(a, m.key); else if (m.key === 'view') onView(a); else if (m.key === 'edit') onEdit(a); else if (m.key === 'archive') { if (confirm(`Archive ${a.deviceCode}?`)) onDelete(a._id!); } else if (m.key === 'print') window.print(); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1e2d4a] ${m.danger ? 'text-red-600' : 'text-gray-700 dark:text-slate-200'}`}>
                              <m.icon className="w-4 h-4" /> {m.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="office supply items" /></div>}
    </div>
  );
}
