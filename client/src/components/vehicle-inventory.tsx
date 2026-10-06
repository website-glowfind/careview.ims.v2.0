import { useMemo, useState } from 'react';
import { Search, Eye, Edit, MoreHorizontal, Plus, Download, Car, CalendarClock, ShieldCheck, Wrench, Bell, SlidersHorizontal } from 'lucide-react';
import type { ITAsset, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface Props {
  assets: ITAsset[];
  onAdd: () => void;
  onEdit: (a: ITAsset) => void;
  onView: (a: ITAsset) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  canEdit?: boolean;
}

const PILL = {
  green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700', teal: 'bg-teal-100 text-teal-700', orange: 'bg-orange-100 text-orange-700', gray: 'bg-gray-100 text-gray-600',
};
const CONDITION_PILL: Record<string, keyof typeof PILL> = { Excellent: 'teal', Good: 'green', Fair: 'amber', Poor: 'orange', Damaged: 'red' };
const STATUS_PILL: Record<string, keyof typeof PILL> = {
  Available: 'green', Assigned: 'blue', Active: 'green', 'Under Maintenance': 'amber', 'Under Repair': 'amber',
  Inactive: 'gray', 'For Disposal': 'orange', Disposed: 'red',
};

// Registration / insurance expiry → label + pill
function expiryState(expiry?: string, stored?: string): { label: string; pill: keyof typeof PILL; attention: boolean } {
  if (expiry) {
    const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: 'Expired', pill: 'red', attention: true };
    if (days <= 30) return { label: 'Expiring Soon', pill: 'amber', attention: true };
    return { label: 'Active', pill: 'green', attention: false };
  }
  if (stored) {
    const att = /expir/i.test(stored);
    return { label: stored, pill: att ? (/soon/i.test(stored) ? 'amber' : 'red') : 'green', attention: att };
  }
  return { label: '—', pill: 'gray', attention: false };
}

export function VehicleInventory({ assets, onAdd, onEdit, onView, onDelete, isAdmin, canEdit }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const [search, setSearch] = useState('');
  const [company, setCompany] = useState<Company | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const list = assets.filter((a) => !a.isDeleted);

  const rows = useMemo(() => list.map((a) => {
    const v = a.vehicle ?? {};
    return { a, v, reg: expiryState(v.registrationExpiry, v.ltoStatus), ins: expiryState(v.insuranceExpiry, v.insuranceStatus) };
  }), [list]);

  const stats = useMemo(() => {
    const regAtt = rows.filter((r) => r.reg.attention).length;
    const insAtt = rows.filter((r) => r.ins.attention).length;
    const pms = rows.filter((r) => /maintenance|repair/i.test(r.v.vehicleStatus || '')).length;
    const alerts = rows.filter((r) => r.reg.attention || r.ins.attention || /maintenance|repair/i.test(r.v.vehicleStatus || '')).length;
    return { fleet: rows.length, regAtt, insAtt, pms, alerts };
  }, [rows]);

  const filtered = rows.filter(({ a, v }) => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.deviceCode.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
      || (v.plateNumber || '').toLowerCase().includes(q) || (a.assignedTo || '').toLowerCase().includes(q);
    const matchCompany = company === 'all' || a.company === company;
    const matchType = typeFilter === 'all' || v.vehicleType === typeFilter;
    const matchStatus = statusFilter === 'all' || v.vehicleStatus === statusFilter;
    return matchSearch && matchCompany && matchType && matchStatus;
  }).sort((x, y) => x.a.deviceCode.localeCompare(y.a.deviceCode));

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);

  const exportCsv = () => {
    if (filtered.length === 0) { alert('No vehicles to export'); return; }
    const headers = ['Asset Code', 'Vehicle', 'Type', 'Plate Number', 'Company', 'Assigned Driver', 'Branch / Center', 'Registration', 'Insurance', 'Condition', 'Status'];
    const csv = [headers.join(','), ...filtered.map(({ a, v, reg, ins }) => [
      a.deviceCode, a.name, v.vehicleType, v.plateNumber, a.company, a.assignedTo || 'Unassigned', v.branchCenter || '', reg.label, ins.label, v.condition || '', v.vehicleStatus || '',
    ].map((s) => `"${String(s ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `vehicles-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  };

  const StatTile = ({ icon: Icon, label, value, danger }: any) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className="w-4 h-4" /> {label}</div>
      <p className={`text-3xl font-bold mt-1 ${danger && value > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  const Pill = ({ label, pill }: { label: string; pill: keyof typeof PILL }) => (
    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${PILL[pill]}`}>{label}</span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#0b5c96] dark:text-blue-400 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> FLEET REGISTER</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Company Vehicle Inventory</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-0.5">Manage cars and motorcycles, from acquisition to disposal.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Download className="w-4 h-4" /> Export Report</button>
          {allowEdit && <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79]"><Plus className="w-4 h-4" /> Add Vehicle</button>}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatTile icon={Car} label="Fleet vehicles" value={stats.fleet} />
        <StatTile icon={CalendarClock} label="Registration attention" value={stats.regAtt} danger />
        <StatTile icon={ShieldCheck} label="Insurance attention" value={stats.insAtt} danger />
        <StatTile icon={Wrench} label="PMS / repairs" value={stats.pms} danger />
        <StatTile icon={Bell} label="Active alerts" value={stats.alerts} danger />
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={company} onChange={(e) => setCompany(e.target.value as any)} className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300">
              <option value="all">Company</option><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option>
            </select>
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300 min-w-[160px]">
            <option value="all">All Vehicle Type</option><option>Car</option><option>Motorcycle</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300 min-w-[160px]">
            <option value="all">All Vehicle Status</option>
            {['Available', 'Assigned', 'Active', 'Under Maintenance', 'Under Repair', 'Inactive', 'For Disposal', 'Disposed'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="flex-1 relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, plate, driver..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-900 dark:text-white" />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg text-sm text-gray-600 dark:text-slate-300"><SlidersHorizontal className="w-4 h-4" /> More Filters</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Asset Code</th><th className="px-5 py-3">Vehicle</th><th className="px-5 py-3">Plate Number</th><th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Assigned Driver</th><th className="px-5 py-3">Branch / Center</th><th className="px-5 py-3">Registration</th><th className="px-5 py-3">Insurance</th>
                <th className="px-5 py-3">Condition</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {pageItems.length === 0 ? (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No vehicles found</td></tr>
              ) : pageItems.map(({ a, v, reg, ins }) => (
                <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                  <td className="px-5 py-3"><div className="font-medium text-gray-900 dark:text-slate-200">{a.name}</div><div className="text-xs text-gray-400">{v.vehicleType}{v.yearModel ? ` · ${v.yearModel}` : ''}</div></td>
                  <td className="px-5 py-3 text-gray-700 dark:text-slate-300 font-mono">{v.plateNumber || '-'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${getCompanyBadgeClasses(a.company)}`}>{a.company}</span></td>
                  <td className="px-5 py-3"><div className="text-gray-700 dark:text-slate-300">{a.assignedTo || <span className="text-gray-400">Unassigned</span>}</div>{a.department && <div className="text-xs text-gray-400">{a.department}</div>}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{v.branchCenter || '-'}</td>
                  <td className="px-5 py-3"><Pill label={reg.label} pill={reg.pill} /></td>
                  <td className="px-5 py-3"><Pill label={ins.label} pill={ins.pill} /></td>
                  <td className="px-5 py-3">{v.condition ? <Pill label={v.condition} pill={CONDITION_PILL[v.condition] ?? 'gray'} /> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-5 py-3">{v.vehicleStatus ? <Pill label={v.vehicleStatus} pill={STATUS_PILL[v.vehicleStatus] ?? 'gray'} /> : <span className="text-gray-400">-</span>}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap relative">
                    <button onClick={() => onView(a)} className="p-1.5 text-gray-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                    {allowEdit && <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-green-600" title="Edit"><Edit className="w-4 h-4" /></button>}
                    {isAdmin && (
                      <>
                        <button onClick={() => setMenuFor(menuFor === a._id ? null : a._id!)} className="p-1.5 text-gray-400 hover:text-gray-700" title="More"><MoreHorizontal className="w-4 h-4" /></button>
                        {menuFor === a._id && (
                          <div className="absolute right-4 top-10 z-10 bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-lg shadow-lg py-1 text-left">
                            <button onClick={() => { setMenuFor(null); if (confirm(`Delete ${a.deviceCode}?`)) onDelete(a._id!); }} className="block w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Delete</button>
                          </div>
                        )}
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
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="vehicles" />
          </div>
        )}
      </div>
    </div>
  );
}
