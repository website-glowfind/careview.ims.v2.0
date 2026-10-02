import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, CalendarDays } from 'lucide-react';
import { useAssetStore } from '@/store/assetStore';
import { useCategoryStore } from '@/store/categoryStore';
import { exportToCSV, exportDetailedDevicesPDF } from '@/utils/exportUtils';
import type { ITAsset } from '@/types/inventory';

type DateField = 'created' | 'purchase' | 'warranty';
type QuickFilter = 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';
type ReportFormat = 'excel' | 'pdf' | 'csv';

const DATE_FIELD_LABEL: Record<DateField, string> = {
  created: 'Date Encoded / Record Created',
  purchase: 'Purchase Date',
  warranty: 'Warranty Expiry',
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);

/** Returns [from, to] ISO dates for a quick filter (relative to today). */
function rangeFor(filter: QuickFilter): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const start = (dt: Date) => toISO(dt);
  switch (filter) {
    case 'today':
      return { from: start(new Date(y, m, d)), to: start(new Date(y, m, d)) };
    case 'week': {
      const day = now.getDay(); // 0=Sun
      const monday = new Date(y, m, d - ((day + 6) % 7));
      return { from: toISO(monday), to: toISO(new Date(y, m, d)) };
    }
    case 'month':
      return { from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m + 1, 0)) };
    case 'lastMonth':
      return { from: toISO(new Date(y, m - 1, 1)), to: toISO(new Date(y, m, 0)) };
    case 'year':
      return { from: toISO(new Date(y, 0, 1)), to: toISO(new Date(y, 11, 31)) };
    default:
      return { from: '', to: '' };
  }
}

function assetDate(a: ITAsset, field: DateField): string | undefined {
  if (field === 'created') return (a as any).createdAt;
  if (field === 'purchase') return a.purchaseDate;
  return a.warrantyExpiry;
}

export function ITExportReportsTab() {
  const { assets, fetchAssets } = useAssetStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [category, setCategory] = useState('all');
  const [dateField, setDateField] = useState<DateField>('created');
  const [quick, setQuick] = useState<QuickFilter>('year');
  const [from, setFrom] = useState(() => rangeFor('year').from);
  const [to, setTo] = useState(() => rangeFor('year').to);
  const [format, setFormat] = useState<ReportFormat>('excel');

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, [fetchAssets, fetchCategories]);

  const setQuickFilter = (q: QuickFilter) => {
    setQuick(q);
    if (q !== 'custom') {
      const r = rangeFor(q);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  // IT assets only (exclude deleted + general)
  const itAssets = useMemo(
    () => assets.filter((a) => (a.assetType ?? 'IT') === 'IT' && !a.isDeleted),
    [assets],
  );

  const matched = useMemo(() => {
    return itAssets.filter((a) => {
      if (category !== 'all' && a.category !== category) return false;
      const ds = assetDate(a, dateField);
      if (from || to) {
        if (!ds) return false;
        const day = ds.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [itAssets, category, dateField, from, to]);

  const periodLabel = useMemo(() => {
    const fmt = (s: string) =>
      s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
    return `${fmt(from)} – ${fmt(to)}`;
  }, [from, to]);

  const doExport = (fmt: ReportFormat) => {
    if (matched.length === 0) {
      alert('No records match the selected filters.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === 'pdf') {
      exportDetailedDevicesPDF(matched, `it-assets-report-${stamp}.pdf`);
    } else {
      // Excel opens CSV natively; both routes share the CSV writer
      exportToCSV(matched, `it-assets-report-${stamp}.csv`);
    }
  };

  const quickBtns: { id: QuickFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom Date' },
  ];

  const inputCls =
    'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';

  return (
    <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Reports</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">Download comprehensive inventory reports</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => doExport('csv')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => doExport('pdf')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0b5c96] text-white text-sm font-medium hover:bg-[#094a79] transition-colors"
          >
            <FileText className="w-4 h-4" /> Export PDF Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Filters */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400 mb-1.5">
                ASSET CATEGORY
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400 mb-1.5">
                FILTER DATE BY
              </label>
              <select value={dateField} onChange={(e) => setDateField(e.target.value as DateField)} className={inputCls}>
                {(Object.keys(DATE_FIELD_LABEL) as DateField[]).map((k) => (
                  <option key={k} value={k}>
                    {DATE_FIELD_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400 mb-2">
              QUICK FILTERS
            </label>
            <div className="flex flex-wrap gap-2">
              {quickBtns.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setQuickFilter(b.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    quick === b.id
                      ? 'bg-[#0b5c96] text-white border-[#0b5c96]'
                      : 'bg-white dark:bg-[#0f1729] text-gray-600 dark:text-slate-300 border-gray-300 dark:border-[#1e3a5f] hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400 mb-2">
              DATE RANGE
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setQuick('custom');
                }}
                className={inputCls}
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setQuick('custom');
                }}
                className={inputCls}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
              Select "Custom Date" to pick your own Date From and Date To.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400 mb-2">
              REPORT FORMAT
            </label>
            <div className="inline-flex rounded-xl border border-gray-300 dark:border-[#1e3a5f] overflow-hidden">
              {([
                { id: 'excel', label: 'Excel', icon: FileText },
                { id: 'pdf', label: 'PDF', icon: FileText },
                { id: 'csv', label: 'CSV', icon: Download },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    format === f.id
                      ? 'bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                  }`}
                >
                  <f.icon className="w-4 h-4" /> {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-5 h-fit">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400 mb-3">
            <CalendarDays className="w-4 h-4" /> REPORT PREVIEW
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white leading-none">{matched.length}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">records match</p>

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-gray-400 dark:text-slate-500">Category</dt>
              <dd className="text-gray-800 dark:text-slate-200">{category === 'all' ? 'All Categories' : category}</dd>
            </div>
            <div>
              <dt className="text-gray-400 dark:text-slate-500">Date Filter</dt>
              <dd className="text-gray-800 dark:text-slate-200">{DATE_FIELD_LABEL[dateField]}</dd>
            </div>
            <div>
              <dt className="text-gray-400 dark:text-slate-500">Period</dt>
              <dd className="text-gray-800 dark:text-slate-200">{periodLabel}</dd>
            </div>
            <div>
              <dt className="text-gray-400 dark:text-slate-500">Company</dt>
              <dd className="text-gray-800 dark:text-slate-200">All Companies</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-[#1e3a5f]">
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {matched.length} record{matched.length !== 1 ? 's' : ''} ready to export
        </span>
        <button
          onClick={() => doExport(format)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] transition-colors"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>
    </div>
  );
}
