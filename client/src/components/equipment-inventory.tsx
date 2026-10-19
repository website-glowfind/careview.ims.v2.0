import { useMemo, useState } from 'react';
import {
  Search, Eye, Edit, MoreHorizontal, Plus, Download, Upload, Package, UserCheck, CircleCheck, Wrench, CalendarClock,
  SlidersHorizontal, UserPlus, ArrowRightLeft, Recycle, Printer, Gauge, Archive as ArchiveIcon,
} from 'lucide-react';
import type { ITAsset, Company } from '@/types/inventory';
import { usePagination } from '@/hooks/usePagination';
import { useRowHighlight, HIGHLIGHT_ROW } from '@/hooks/useRowHighlight';
import { Pagination } from '@/components/ui/Pagination';
import { FurnitureUploadModal, type FurnitureImportRow, type ImportResult } from '@/components/furniture-upload-modal';
import { menuPosition } from '@/utils/menuPosition';
import { EQUIPMENT_KINDS, scheduleState, dueState, DUE_PILL, DUE_LABEL, titleCase, type EquipmentKind } from '@/config/equipment';

interface Props {
  kind: EquipmentKind;
  assets: ITAsset[];
  selectedCompany: Company | 'all';
  onCompanyChange: (c: Company | 'all') => void;
  onAdd: () => void;
  onEdit: (a: ITAsset) => void;
  onView: (a: ITAsset) => void;
  onDelete: (id: string) => void;
  onImport?: (rows: FurnitureImportRow[]) => Promise<ImportResult>;
  onMenuAction: (asset: ITAsset, action: string) => void;
  isAdmin: boolean;
  canEdit?: boolean;
}

const MENU: { key: string; label: string; icon: any; danger?: boolean; admin?: boolean; calibration?: boolean }[] = [
  { key: 'view', label: 'View Details', icon: Eye }, { key: 'edit', label: 'Edit', icon: Edit },
  { key: 'assign', label: 'Assign', icon: UserPlus }, { key: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench }, { key: 'calibration', label: 'Log Calibration', icon: Gauge, calibration: true },
  { key: 'disposal', label: 'Request Disposal', icon: Recycle }, { key: 'print', label: 'Print QR', icon: Printer },
  { key: 'archive', label: 'Archive', icon: ArchiveIcon, danger: true, admin: true },
];
const PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
};
const CONDITION_PILL: Record<string, string> = {
  New: 'bg-green-100 text-green-700', Good: 'bg-blue-100 text-blue-700', Fair: 'bg-amber-100 text-amber-700', Poor: 'bg-orange-100 text-orange-700', Damaged: 'bg-red-100 text-red-700',
};
export const equipmentStatusLabel = (a: ITAsset) => (a.equipment?.disposal ? 'For Disposal' : a.equipment?.statusLabel)
  || ({ active: 'In Use', available: 'Available', 'in-maintenance': 'Under Repair', 'in-storage': 'For Disposal', disposed: 'Disposed' } as any)[a.status]
  || a.status;
const fmtShort = (d?: string) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const SELECT = 'px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300';

/** Earliest upcoming service/calibration date, for the "Next Due" column. */
function nextDue(eq: Record<string, any> = {}): string {
  const dates = [eq.nextServiceDue, eq.calibrationRequired ? eq.nextCalibrationDue : ''].filter(Boolean).sort();
  return dates[0] || '';
}

export function EquipmentInventory({ kind, assets, selectedCompany, onCompanyChange, onAdd, onEdit, onView, onDelete, onImport, onMenuAction, isAdmin, canEdit }: Props) {
  const cfg = EQUIPMENT_KINDS[kind];
  const allowEdit = canEdit ?? isAdmin;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'attention' | 'overdue' | 'soon'>('all');
  const [showMore, setShowMore] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const nonDeleted = assets.filter((a) => !a.isDeleted);
  const companyScoped = selectedCompany === 'all' ? nonDeleted : nonDeleted.filter((a) => a.company === selectedCompany);

  const stats = {
    total: companyScoped.length,
    assigned: companyScoped.filter((a) => ['Assigned', 'In Use'].includes(equipmentStatusLabel(a))).length,
    available: companyScoped.filter((a) => equipmentStatusLabel(a) === 'Available').length,
    repair: companyScoped.filter((a) => equipmentStatusLabel(a) === 'Under Repair').length,
    due: companyScoped.filter((a) => ['overdue', 'soon'].includes(scheduleState(a.equipment))).length,
    overdue: companyScoped.filter((a) => scheduleState(a.equipment) === 'overdue').length,
  };

  const categories = useMemo(() => Array.from(new Set(nonDeleted.map((a) => a.category).filter(Boolean))), [nonDeleted]);
  const departments = useMemo(() => Array.from(new Set(nonDeleted.map((a) => a.department).filter(Boolean))) as string[], [nonDeleted]);
  const assignees = useMemo(() => Array.from(new Set(nonDeleted.map((a) => a.assignedTo).filter(Boolean))) as string[], [nonDeleted]);
  const moreActive = deptFilter !== 'all' || assigneeFilter !== 'all' || !!locationFilter.trim() || !!dateFrom || !!dateTo || scheduleFilter !== 'all';

  const filtered = companyScoped.filter((a) => {
    const eq = a.equipment ?? {};
    const q = search.toLowerCase();
    const matchSearch = !q || [a.deviceCode, a.name, a.brand, a.model, a.serialNumber, a.assignedTo, eq.manufacturer, eq.regulatoryNo].some((v) => (v || '').toLowerCase().includes(q));
    const s = scheduleState(eq);
    const matchSchedule = scheduleFilter === 'all' || (scheduleFilter === 'attention' ? s === 'overdue' || s === 'soon' : s === scheduleFilter);
    const day = a.purchaseDate ? a.purchaseDate.slice(0, 10) : '';
    return matchSearch && matchSchedule
      && (categoryFilter === 'all' || a.category === categoryFilter)
      && (statusFilter === 'all' || equipmentStatusLabel(a) === statusFilter)
      && (conditionFilter === 'all' || a.condition === conditionFilter)
      && (deptFilter === 'all' || a.department === deptFilter)
      && (assigneeFilter === 'all' || a.assignedTo === assigneeFilter)
      && (!locationFilter.trim() || (a.location || '').toLowerCase().includes(locationFilter.trim().toLowerCase()))
      && (!dateFrom || (!!day && day >= dateFrom)) && (!dateTo || (!!day && day <= dateTo));
  }).sort((x, y) => x.deviceCode.localeCompare(y.deviceCode));

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);
  const hlCode = useRowHighlight(filtered, (x: any) => x.deviceCode, setPage, pageSize);

  const companyTabs: { id: Company | 'all'; label: string }[] = [{ id: 'all', label: 'All Companies' }, { id: 'KHEALTH', label: 'KHealth' }, { id: 'CAREVIEW', label: 'Careview' }];
  const countFor = (id: Company | 'all') => (id === 'all' ? nonDeleted.length : nonDeleted.filter((a) => a.company === id).length);

  const exportCsv = () => {
    if (filtered.length === 0) { alert('No equipment to export'); return; }
    const headers = ['Asset Code', 'Equipment', 'Category', 'Brand', 'Model', 'Serial No.', 'Company', 'Assigned To', 'Department', 'Location', 'Condition', 'Status', 'Next Service Due', 'Next Calibration Due', ...(cfg.medical ? ['Regulatory No.', 'Registration Expiry', 'Risk Class'] : [])];
    const rows = filtered.map((a) => { const eq = a.equipment ?? {}; return [
      a.deviceCode, a.name, titleCase(a.category), a.brand, a.model, a.serialNumber, a.company, a.assignedTo || 'Unassigned', a.department, a.location, a.condition, equipmentStatusLabel(a),
      eq.nextServiceDue || '', eq.calibrationRequired ? eq.nextCalibrationDue || '' : 'N/A', ...(cfg.medical ? [eq.regulatoryNo || '', eq.regulatoryExpiry || '', eq.riskClass || ''] : []),
    ]; });
    const csv = [headers, ...rows].map((r) => r.map((s) => `"${String(s ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `${cfg.kind === 'mw' ? 'mw-equipment' : 'medical-equipment'}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const StatTile = ({ icon: Icon, label, value, accent, onClick, active }: any) => (
    <button type="button" onClick={onClick} disabled={!onClick} className={`text-left bg-white dark:bg-[#162236] border rounded-xl p-4 ${active ? 'border-[#0b5c96] ring-1 ring-[#0b5c96]' : 'border-gray-200 dark:border-[#1e3a5f]'} ${onClick ? 'hover:bg-gray-50 dark:hover:bg-[#1e2d4a]' : 'cursor-default'}`}>
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className="w-4 h-4" /> {label}</div>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cfg.title}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">{cfg.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {allowEdit && onImport && <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Upload className="w-4 h-4" /> Upload Excel</button>}
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Download className="w-4 h-4" /> Export Report</button>
          {allowEdit && <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79]"><Plus className="w-4 h-4" /> {cfg.addLabel}</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatTile icon={Package} label="Total Assets" value={stats.total} />
        <StatTile icon={UserCheck} label="Assigned / In Use" value={stats.assigned} />
        <StatTile icon={CircleCheck} label="Available" value={stats.available} />
        <StatTile icon={Wrench} label="Under Repair" value={stats.repair} accent={stats.repair ? 'text-amber-600' : undefined} />
        <StatTile icon={CalendarClock} label={`Service / Calibration Due${stats.overdue ? ` · ${stats.overdue} overdue` : ''}`} value={stats.due}
          accent={stats.overdue ? 'text-red-600' : stats.due ? 'text-amber-600' : undefined} active={scheduleFilter === 'attention'}
          onClick={() => { setScheduleFilter(scheduleFilter === 'attention' ? 'all' : 'attention'); setShowMore(true); setPage(1); }} />
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search asset code, name, brand, serial${cfg.medical ? ', registration' : ''}...`} className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${SELECT} capitalize`}><option value="all">All Categories</option>{categories.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={SELECT}><option value="all">All Statuses</option>{Object.keys(PILL).map((s) => <option key={s}>{s}</option>)}</select>
          <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className={SELECT}><option value="all">All Conditions</option>{Object.keys(CONDITION_PILL).map((c) => <option key={c}>{c}</option>)}</select>
          <button onClick={() => setShowMore((s) => !s)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium whitespace-nowrap ${showMore || moreActive ? 'border-[#0b5c96] text-[#0b5c96] bg-[#0b5c96]/5' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300'}`}><SlidersHorizontal className="w-4 h-4" /> More Filters</button>
        </div>

        {showMore && (
          <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value as any)} className={SELECT}><option value="all">All Schedules</option><option value="attention">Needs Attention</option><option value="overdue">Overdue</option><option value="soon">Due Soon</option></select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={SELECT}><option value="all">All Departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select>
            <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className={SELECT}><option value="all">All Assignees</option>{assignees.map((d) => <option key={d}>{d}</option>)}</select>
            <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Location" className={SELECT} />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={SELECT} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={SELECT} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Asset Code</th><th className="px-5 py-3">Equipment</th><th className="px-5 py-3">Brand / Model</th><th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Assigned To</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Next Service / Calibration</th>
                <th className="px-5 py-3">Condition</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {pageItems.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No {cfg.label.toLowerCase()} records found</td></tr>
              ) : pageItems.map((a) => {
                const eq = a.equipment ?? {};
                const label = equipmentStatusLabel(a);
                const sched = scheduleState(eq);
                const due = nextDue(eq);
                const regState = cfg.medical && eq.regulatoryNo ? dueState(eq.regulatoryExpiry) : 'none';
                return (
                  <tr key={a._id} data-row={a.deviceCode} className={`hover:bg-gray-50 dark:hover:bg-[#1e2d4a] ${hlCode === a.deviceCode ? HIGHLIGHT_ROW : ''}`}>
                    <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                    <td className="px-5 py-3"><div className="font-medium text-gray-900 dark:text-slate-200">{a.name}</div><div className="text-xs text-gray-400 capitalize">{a.category}</div></td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{[a.brand, a.model].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-5 py-3"><span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-gray-100 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300">{a.company === 'KHEALTH' ? 'KHealth' : a.company === 'CAREVIEW' ? 'Careview' : a.company}</span></td>
                    <td className="px-5 py-3 text-gray-700 dark:text-slate-300">{a.assignedTo || <span className="text-gray-400">Unassigned</span>}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400 max-w-[180px] truncate" title={a.location}>{a.location || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${DUE_PILL[sched]}`}>{DUE_LABEL[sched]}</span>
                      {due && <div className="text-xs text-gray-400 mt-0.5">{fmtShort(due)}</div>}
                      {regState === 'overdue' && <div className="text-[11px] text-red-600 mt-0.5">Registration expired</div>}
                    </td>
                    <td className="px-5 py-3">{a.condition ? <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${CONDITION_PILL[a.condition] ?? 'bg-gray-100 text-gray-600'}`}>{a.condition}</span> : '—'}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${PILL[label] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => onView(a)} className="p-1.5 text-gray-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                      {allowEdit && <button onClick={() => onEdit(a)} className="p-1.5 text-gray-400 hover:text-green-600" title="Edit"><Edit className="w-4 h-4" /></button>}
                      <button onClick={(e) => { setMenuRect(e.currentTarget.getBoundingClientRect()); setMenuFor(menuFor === a._id ? null : a._id!); }} className="p-1.5 text-gray-400 hover:text-gray-700" title="More"><MoreHorizontal className="w-4 h-4" /></button>
                      {menuFor === a._id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} onWheel={() => setMenuFor(null)} />
                          <div style={menuPosition(menuRect, 340)} className="fixed z-50 w-52 bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl shadow-lg py-1 text-left">
                            {MENU.filter((m) => (!m.admin || isAdmin) && (m.key === 'view' || m.key === 'print' || allowEdit) && (!m.calibration || eq.calibrationRequired)).map((m) => (
                              <button key={m.key} onClick={() => { setMenuFor(null); if (m.key === 'archive') { if (confirm(`Archive ${a.deviceCode}?`)) onDelete(a._id!); } else onMenuAction(a, m.key); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#1e2d4a] ${m.danger ? 'text-red-600' : 'text-gray-700 dark:text-slate-200'}`}>
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

        {filtered.length > 0 && <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label={cfg.medical ? 'medical equipment' : 'equipment'} /></div>}
      </div>

      {showUpload && onImport && (
        <FurnitureUploadModal
          onClose={() => setShowUpload(false)}
          onImport={onImport}
          title={`Upload ${cfg.label} from Excel`}
          templateFileName={`${cfg.kind === 'mw' ? 'mw-equipment' : 'medical-equipment'}-upload-template.xlsx`}
          templateHeaders={['Asset Name', 'Category', 'Brand', 'Model', 'Serial Number', 'Company', 'Assigned To', 'Department', 'Location', 'Condition', 'Status', 'Purchase Date', 'Notes']}
          templateExampleRow={cfg.medical
            ? ['Digital BP Monitor', 'BP monitor (Digital)', 'Omron', 'HEM-7120', 'SN-0001', 'KHEALTH', 'Nurse Station', 'Clinic', 'Main Clinic · Room 2', 'New', 'In Use', '2026-01-10', '']
            : ['Portable Generator 5 kVA', 'Generator', 'Honda', 'EU70is', 'SN-0001', 'KHEALTH', '', 'FMD', 'Warehouse · Bay 1', 'Good', 'Available', '2026-01-10', '']}
        />
      )}
    </div>
  );
}
