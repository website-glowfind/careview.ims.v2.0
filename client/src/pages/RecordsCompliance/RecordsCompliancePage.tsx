import { useEffect, useMemo, useState } from 'react';
import { Download, Search, Eye, SlidersHorizontal, ClipboardList, CheckCircle2, Clock, AlertTriangle, XCircle, Check, AlertCircle, X } from 'lucide-react';
import { useAssetStore } from '@/store/assetStore';
import { useHighlightStore } from '@/store/highlightStore';
import { useWarehouseStore } from '@/store/warehouseStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { REGISTERS, assetRegisterId, type RegisterId } from '@/utils/assetRegister';
import { evaluateCompliance, warehouseAsRecord, COMPLIANCE_PILL, REGISTER_VIEW, type ComplianceStatus } from '@/utils/compliance';
import type { ITAsset, Company } from '@/types/inventory';

const titleCase = (s: string) => (s || '').replace(/\b\w/g, (m) => m.toUpperCase());
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const companyLabel = (c: Company) => c === 'KHEALTH' ? 'KHealth' : c === 'CAREVIEW' ? 'Careview' : 'Glowfind';
const companyBadge = (c: Company) => c === 'KHEALTH' ? 'bg-blue-50 text-blue-700' : c === 'CAREVIEW' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700';
const STATUS_PILL: Record<string, string> = { active: 'bg-green-50 text-green-700', available: 'bg-green-50 text-green-700', 'in-maintenance': 'bg-amber-50 text-amber-700', 'in-storage': 'bg-slate-100 text-slate-600', disposed: 'bg-red-50 text-red-700' };
const COMPLIANCE_FILTERS: (ComplianceStatus | 'All Compliance')[] = ['All Compliance', 'Compliant', 'For Review', 'Expiring Soon', 'Missing Requirement', 'Non-Compliant', 'Not Applicable'];

export function RecordsCompliancePage({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { assets, fetchAssets, isLoading, setSelectedCompany } = useAssetStore();
  const setHighlight = useHighlightStore((s) => s.set);

  const [tab, setTab] = useState<RegisterId>('all');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<Company | 'all'>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'All Compliance'>('All Compliance');
  const [showMore, setShowMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewing, setViewing] = useState<ITAsset | null>(null);

  const { items: warehouseItems, fetchItems: fetchWarehouse } = useWarehouseStore();
  useEffect(() => { fetchAssets(); fetchWarehouse(); }, [fetchAssets, fetchWarehouse]);

  // Asset registers plus MW warehouse stock items (presented as MW records)
  const records = useMemo(() => [...assets.filter((a) => !a.isDeleted), ...warehouseItems.map(warehouseAsRecord)]
    .map((a) => ({ a, reg: assetRegisterId(a), comp: evaluateCompliance(a) })), [assets, warehouseItems]);

  const stats = useMemo(() => ({
    total: records.length,
    compliant: records.filter((r) => r.comp.status === 'Compliant').length,
    review: records.filter((r) => r.comp.status === 'For Review').length,
    expiring: records.filter((r) => r.comp.status === 'Expiring Soon').length,
    missing: records.filter((r) => r.comp.status === 'Missing Requirement').length,
    nonCompliant: records.filter((r) => r.comp.status === 'Non-Compliant').length,
  }), [records]);

  const departments = useMemo(() => Array.from(new Set(records.map((r) => r.a.department).filter(Boolean))) as string[], [records]);
  const moreActive = statusFilter !== 'all' || deptFilter !== 'all' || !!locationFilter.trim() || !!dateFrom || !!dateTo;

  const filtered = records.filter(({ a, reg, comp }) => {
    if (tab !== 'all' && reg !== tab) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || a.deviceCode.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.brand || '').toLowerCase().includes(q) || (a.assignedTo || '').toLowerCase().includes(q);
    const matchCompany = companyFilter === 'all' || a.company === companyFilter;
    const matchCompliance = complianceFilter === 'All Compliance' || comp.status === complianceFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchDept = deptFilter === 'all' || a.department === deptFilter;
    const matchLocation = !locationFilter.trim() || (a.location || '').toLowerCase().includes(locationFilter.trim().toLowerCase());
    const day = a.purchaseDate ? a.purchaseDate.slice(0, 10) : '';
    const matchDate = (!dateFrom || (day && day >= dateFrom)) && (!dateTo || (day && day <= dateTo));
    return matchSearch && matchCompany && matchCompliance && matchStatus && matchDept && matchLocation && matchDate;
  }).sort((x, y) => x.a.deviceCode.localeCompare(y.a.deviceCode));

  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);

  const countFor = (id: RegisterId) => id === 'all' ? records.length : records.filter((r) => r.reg === id).length;
  const regLabel = (id: RegisterId) => REGISTERS.find((r) => r.id === id)?.label ?? id;

  const exportCsv = () => {
    if (filtered.length === 0) { alert('No records to export'); return; }
    const headers = ['Asset Code', 'Asset Name', 'Category', 'Source Module', 'Company', 'Assigned To', 'Location', 'Status', 'Compliance', 'Acquisition'];
    const csv = [headers.join(','), ...filtered.map(({ a, reg, comp }) => [
      a.deviceCode, a.name, a.category, regLabel(reg), a.company, a.assignedTo || 'Unassigned', a.location, a.status, comp.status, a.purchaseDate?.slice(0, 10) || '',
    ].map((s) => `"${String(s ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `records-compliance-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  };

  const StatTile = ({ icon: Icon, label, value, accent, iconColor }: any) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className={`w-4 h-4 ${iconColor ?? ''}`} /> {label}</div>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  const SELECT = 'px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300';
  const viewingComp = viewing ? evaluateCompliance(viewing) : null;
  const viewingReg = viewing ? assetRegisterId(viewing) : 'all';

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0b5c96] dark:text-blue-400 uppercase tracking-wide"><ClipboardList className="w-4 h-4" /> Centralized Master Record</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-1">Records &amp; Compliance</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Live monitoring across every asset register. Records remain owned by their source module.</p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a] whitespace-nowrap"><Download className="w-4 h-4" /> Export Report</button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatTile icon={ClipboardList} label="Total Assets" value={stats.total} iconColor="text-[#0b5c96]" />
        <StatTile icon={CheckCircle2} label="Compliant" value={stats.compliant} accent="text-green-600" iconColor="text-green-500" />
        <StatTile icon={Clock} label="For Review" value={stats.review} accent="text-blue-600" iconColor="text-blue-500" />
        <StatTile icon={Clock} label="Expiring Soon" value={stats.expiring} accent="text-amber-600" iconColor="text-amber-500" />
        <StatTile icon={AlertTriangle} label="Missing" value={stats.missing} accent="text-orange-600" iconColor="text-orange-500" />
        <StatTile icon={XCircle} label="Non-Compliant" value={stats.nonCompliant} accent="text-red-600" iconColor="text-red-500" />
      </div>

      {/* Register tabs */}
      <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl px-4 py-2 flex gap-1 overflow-x-auto">
        {REGISTERS.map((r) => (
          <button key={r.id} onClick={() => { setTab(r.id); setPage(1); }} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === r.id ? 'bg-[#0b5c96] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#1e2d4a]'}`}>
            {r.label} <span className={`text-xs ${tab === r.id ? 'text-blue-100' : 'text-gray-400'}`}>{countFor(r.id)}</span>
          </button>
        ))}
      </div>

      {/* Filters + table */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="p-5 flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, brand, assignee..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value as any)} className={SELECT}><option value="all">All Company</option><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option><option value="GLOWFIND">Glowfind</option></select>
          <select value={complianceFilter} onChange={(e) => setComplianceFilter(e.target.value as any)} className={SELECT}>{COMPLIANCE_FILTERS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <button onClick={() => setShowMore((s) => !s)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium whitespace-nowrap ${showMore || moreActive ? 'border-[#0b5c96] text-[#0b5c96] bg-[#0b5c96]/5' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300'}`}><SlidersHorizontal className="w-4 h-4" /> More Filters</button>
        </div>

        {showMore && (
          <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={SELECT}><option value="all">All Asset Status</option>{['active', 'available', 'in-maintenance', 'in-storage', 'disposed'].map((s) => <option key={s} value={s}>{titleCase(s.replace('-', ' '))}</option>)}</select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={SELECT}><option value="all">All Department</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            <input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Location" className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-900 dark:text-white" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={SELECT} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={SELECT} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Asset Code</th><th className="px-3 py-3">QR</th><th className="px-5 py-3">Asset</th><th className="px-5 py-3">Source Module</th><th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Assignment / Location</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Compliance</th><th className="px-5 py-3">Acquisition</th><th className="px-5 py-3">Last Updated</th><th className="px-5 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {pageItems.length === 0 ? (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-gray-400 dark:text-slate-500">No records found</td></tr>
              ) : pageItems.map(({ a, reg, comp }) => (
                <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                  <td className="px-3 py-3 text-gray-300">—</td>
                  <td className="px-5 py-3"><div className="font-medium text-gray-900 dark:text-slate-200">{a.name}</div><div className="text-xs text-gray-400 capitalize">{a.category}{a.model ? ` · ${a.model}` : ''}</div></td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{regLabel(reg)}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${companyBadge(a.company)}`}>{companyLabel(a.company)}</span></td>
                  <td className="px-5 py-3"><div className="text-gray-700 dark:text-slate-300">{a.assignedTo || <span className="text-gray-400">Unassigned</span>}</div>{a.location && a.location !== '—' && <div className="text-xs text-gray-400">{a.location}</div>}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STATUS_PILL[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span></td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${COMPLIANCE_PILL[comp.status]}`}>{comp.status === 'Missing Requirement' ? 'Missing' : comp.status}</span></td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">{fmtDate(comp.acquisition)}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(comp.lastUpdated)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={() => setViewing(a)} className="p-1.5 text-gray-400 hover:text-blue-600" title="View compliance"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="records" /></div>}
      </div>

      {isLoading && records.length === 0 && <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b5c96]" /></div>}

      {/* Compliance detail modal */}
      {viewing && viewingComp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-[#1e3a5f]">
              <div><h3 className="text-base font-bold text-gray-900 dark:text-white">Asset Compliance Details</h3><p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{viewing.deviceCode} · {regLabel(viewingReg)}</p></div>
              <button onClick={() => setViewing(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <div><div className="text-xs text-gray-400">Asset</div><div className="font-medium text-gray-900 dark:text-slate-200">{viewing.name}</div></div>
                <div><div className="text-xs text-gray-400">Source Module</div><div className="font-medium text-gray-900 dark:text-slate-200">{regLabel(viewingReg)}</div></div>
                <div><div className="text-xs text-gray-400">Company</div><div className="font-medium text-gray-900 dark:text-slate-200">{companyLabel(viewing.company)}</div></div>
                <div><div className="text-xs text-gray-400">Compliance Status</div><div className="font-medium text-gray-900 dark:text-slate-200">{viewingComp.status === 'Missing Requirement' ? 'Missing' : viewingComp.status}</div></div>
                <div><div className="text-xs text-gray-400">Location</div><div className="font-medium text-gray-900 dark:text-slate-200">{viewing.location || '—'}</div></div>
                <div><div className="text-xs text-gray-400">Last Updated</div><div className="font-medium text-gray-900 dark:text-slate-200">{fmtDate(viewingComp.lastUpdated)}</div></div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Compliance Checklist</h4>
                <ul className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                  {viewingComp.checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-3 px-4 py-3 text-sm">
                      {c.state === 'pass' ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : c.state === 'warn' ? <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span className="text-gray-700 dark:text-slate-300">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
              <button onClick={() => setViewing(null)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Close</button>
              <button onClick={() => { const v = REGISTER_VIEW[viewingReg]; if (v && v !== 'hub') { setSelectedCompany('all'); setHighlight(viewing.deviceCode); onNavigate?.(v); } setViewing(null); }} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">Open Source Module</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
