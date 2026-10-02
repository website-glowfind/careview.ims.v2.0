import { useMemo, useState } from 'react';
import { X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import type { ITAsset, AssetStatus, Company } from '@/types/inventory';
import { exportFurnitureCSV, exportFurniturePDF } from '@/utils/exportUtils';

type DateField = 'created' | 'purchase';
type Quick = 'all' | 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';
type Format = 'excel' | 'pdf' | 'csv';

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'active', label: 'In Use' },
  { value: 'available', label: 'Available' },
  { value: 'in-storage', label: 'In Storage' },
  { value: 'in-maintenance', label: 'Under Repair' },
  { value: 'disposed', label: 'Disposed' },
];

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function quickRange(q: Quick): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const today = toISO(new Date(y, m, d));
  switch (q) {
    case 'today': return { from: today, to: today };
    case '7d': return { from: toISO(new Date(y, m, d - 6)), to: today };
    case '30d': return { from: toISO(new Date(y, m, d - 29)), to: today };
    case 'month': return { from: toISO(new Date(y, m, 1)), to: today };
    case 'year': return { from: toISO(new Date(y, 0, 1)), to: today };
    default: return { from: '', to: '' };
  }
}

interface Props {
  assets: ITAsset[]; // furniture (general) assets, non-deleted
  onClose: () => void;
}

export function FurnitureExportModal({ assets, onClose }: Props) {
  const [company, setCompany] = useState<Company | 'all'>('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<AssetStatus | 'all'>('all');
  const [condition, setCondition] = useState('all');
  const [department, setDepartment] = useState('all');
  const [employee, setEmployee] = useState('all');
  const [location, setLocation] = useState('');
  const [dateField, setDateField] = useState<DateField>('created');
  const [quick, setQuick] = useState<Quick>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [format, setFormat] = useState<Format>('excel');

  const categories = useMemo(() => Array.from(new Set(assets.map((a) => a.category).filter(Boolean))).sort(), [assets]);
  const departments = useMemo(() => Array.from(new Set(assets.map((a) => a.department).filter(Boolean))).sort() as string[], [assets]);
  const employees = useMemo(() => Array.from(new Set(assets.map((a) => a.assignedTo).filter(Boolean))).sort() as string[], [assets]);

  const setQuickFilter = (q: Quick) => {
    setQuick(q);
    if (q !== 'custom') { const r = quickRange(q); setFrom(r.from); setTo(r.to); }
  };

  const matched = useMemo(() => {
    return assets.filter((a) => {
      if (company !== 'all' && a.company !== company) return false;
      if (category !== 'all' && a.category !== category) return false;
      if (status !== 'all' && a.status !== status) return false;
      if (condition !== 'all' && a.condition !== condition) return false;
      if (department !== 'all' && a.department !== department) return false;
      if (employee !== 'all' && a.assignedTo !== employee) return false;
      if (location.trim() && !(a.location || '').toLowerCase().includes(location.trim().toLowerCase())) return false;
      if (from || to) {
        const ds = (dateField === 'created' ? (a as any).createdAt : a.purchaseDate) as string | undefined;
        if (!ds) return false;
        const day = ds.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [assets, company, category, status, condition, department, employee, location, from, to, dateField]);

  const doExport = () => {
    if (matched.length === 0) { alert('No records match the selected filters.'); return; }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'pdf') exportFurniturePDF(matched, `furniture-report-${stamp}.pdf`);
    else exportFurnitureCSV(matched, `furniture-report-${stamp}.csv`);
    onClose();
  };

  const selectCls = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{children}</label>
  );

  const quickBtns: { id: Quick; label: string }[] = [
    { id: 'all', label: 'All Time' }, { id: 'today', label: 'Today' }, { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' }, { id: 'month', label: 'This Month' }, { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
  ];
  const formats: { id: Format; label: string; icon: typeof FileText }[] = [
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet }, { id: 'pdf', label: 'PDF', icon: FileText }, { id: 'csv', label: 'CSV', icon: Download },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Export Furniture Report</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Filter records, choose a date basis, and export.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="px-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Company</Label>
              <select value={company} onChange={(e) => setCompany(e.target.value as Company | 'all')} className={selectCls}>
                <option value="all">All Companies</option><option value="KHEALTH">KHEALTH</option><option value="CAREVIEW">CAREVIEW</option>
              </select>
            </div>
            <div><Label>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                <option value="all">All Categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus | 'all')} className={selectCls}>
                <option value="all">All Statuses</option>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><Label>Condition</Label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className={selectCls}>
                <option value="all">All Conditions</option><option>New</option><option>Good</option><option>Fair</option><option>Poor</option><option>Damaged</option>
              </select>
            </div>
            <div><Label>Department</Label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
                <option value="all">All Departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><Label>Assigned Employee</Label>
              <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={selectCls}>
                <option value="all">All Employees</option>{employees.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div><Label>Location</Label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site, building, floor, room..." className={selectCls} />
          </div>

          <div className="border-t border-gray-200 dark:border-[#1e3a5f] pt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>Filter Date By</Label>
              <select value={dateField} onChange={(e) => setDateField(e.target.value as DateField)} className={selectCls}>
                <option value="created">Date Encoded</option><option value="purchase">Purchase Date</option>
              </select>
            </div>
            <div><Label>Date From</Label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setQuick('custom'); }} className={selectCls} />
            </div>
            <div><Label>Date To</Label>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setQuick('custom'); }} className={selectCls} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickBtns.map((b) => (
              <button key={b.id} onClick={() => setQuickFilter(b.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  quick === b.id ? 'bg-[#0b5c96] text-white border-[#0b5c96]' : 'bg-white dark:bg-[#0f1729] text-gray-600 dark:text-slate-300 border-gray-300 dark:border-[#1e3a5f] hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                }`}>{b.label}</button>
            ))}
          </div>

          <div><Label>Format</Label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((f) => (
                <button key={f.id} onClick={() => setFormat(f.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    format === f.id ? 'border-[#0b5c96] bg-[#0b5c96]/5 text-[#0b5c96] dark:text-blue-400' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                  }`}>
                  <f.icon className="w-4 h-4" /> {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 mt-4 border-t border-gray-200 dark:border-[#1e3a5f]">
          <span className="text-sm text-gray-500 dark:text-slate-400">{matched.length} record{matched.length !== 1 ? 's' : ''} match</span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
            <button onClick={doExport} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
