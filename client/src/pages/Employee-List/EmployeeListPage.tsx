import { useEffect, useRef, useState } from 'react';
import { Upload, Search, Users, X, CheckCircle, AlertCircle, UserPlus, Pencil, Trash2, Building2, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEmployeeStore, type Employee } from '@/store/employeeStore';
import { Pagination } from '@/components/ui/Pagination';
import type { Company } from '@/types/inventory';

const SHEET_COMPANY_MAP: Record<string, Company> = { KH: 'KHEALTH', CV: 'CAREVIEW', GF: 'GLOWFIND' };
function getCompanyFromSheet(sheetName: string): Company | null {
  const prefix = sheetName.trim().substring(0, 2).toUpperCase();
  return SHEET_COMPANY_MAP[prefix] ?? null;
}

const companyLabel = (c: Company) => c === 'KHEALTH' ? 'KHealth' : c === 'CAREVIEW' ? 'Careview' : 'Glowfind';
const companyBadge = (c: Company) => c === 'KHEALTH' ? 'bg-blue-50 text-blue-700 border-blue-200' : c === 'CAREVIEW' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200';

interface NameParts { lastName: string; firstName: string; middleName: string }
function parseName(fullName: string): NameParts {
  const s = (fullName || '').trim();
  if (s.includes(',')) {
    const [last, rest] = [s.slice(0, s.indexOf(',')).trim(), s.slice(s.indexOf(',') + 1).trim()];
    const parts = rest.split(/\s+/).filter(Boolean);
    return { lastName: last, firstName: parts[0] ?? '', middleName: parts.slice(1).join(' ') };
  }
  const parts = s.split(/\s+/).filter(Boolean);
  return { lastName: '', firstName: parts[0] ?? '', middleName: parts.slice(1).join(' ') };
}
function composeName({ lastName, firstName, middleName }: NameParts): string {
  const rest = [firstName.trim(), middleName.trim()].filter(Boolean).join(' ');
  return lastName.trim() ? `${lastName.trim()}, ${rest}`.replace(/,\s*$/, '') : rest;
}

interface ImportSummary { total: number; upserted: number; modified: number; companies: string[] }
const EMPTY_FORM = { lastName: '', firstName: '', middleName: '', employeeId: '', department: '', position: '', centerBranch: '', company: 'KHEALTH' as Company };
type FormState = typeof EMPTY_FORM;

const INPUT = 'w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#0b5c96]/40 focus:outline-none';

// Module-scope so inputs don't remount (and lose focus) on each parent render.
function Field({ label, required, value, onChange, placeholder }: { label: string; required?: boolean; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={INPUT} />
    </div>
  );
}

export function EmployeeListPage() {
  const {
    employees, pagination, stats, selectedCompany, selectedDepartment, isLoading, isImporting, error,
    setSelectedCompany, setSelectedDepartment, fetchEmployees, fetchStats, bulkImport,
    addEmployee, updateEmployee, deleteEmployee,
  } = useEmployeeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Omit<Employee, '_id'>[]>([]);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchEmployees(); fetchStats(); }, [fetchEmployees, fetchStats]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(undefined); setFormError(null); setModalMode('add'); };
  const openEdit = (emp: Employee) => {
    setForm({ ...parseName(emp.fullName), employeeId: emp.employeeId, department: emp.department, position: emp.position, centerBranch: emp.centerBranch ?? '', company: emp.company });
    setEditingId(emp._id); setFormError(null); setModalMode('edit');
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const fullName = composeName(form);
    if (!fullName) { setFormError('First and last name are required.'); return; }
    const payload = { fullName, employeeId: form.employeeId.trim(), department: form.department, position: form.position, centerBranch: form.centerBranch, company: form.company };
    try {
      if (modalMode === 'edit' && editingId) await updateEmployee(editingId, payload);
      else await addEmployee(payload);
      setModalMode(null);
    } catch (err: any) { setFormError(err.message); }
  };

  const handleDelete = async () => {
    if (!deleting?._id) return;
    setIsDeleting(true);
    try { await deleteEmployee(deleting._id); setDeleting(null); }
    catch (err: any) { alert(err.message); }
    finally { setIsDeleting(false); }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); fetchEmployees(e.target.value, 1); };
  const handlePageChange = (page: number) => fetchEmployees(search || undefined, page);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null); setImportSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const parsed: Omit<Employee, '_id'>[] = [];
      const unknownSheets: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const company = getCompanyFromSheet(sheetName);
        if (!company) { unknownSheets.push(sheetName); continue; }
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const fullName = String(row[1] ?? '').trim();
          const employeeId = String(row[2] ?? '').trim();
          const department = String(row[3] ?? '').trim();
          const position = String(row[4] ?? '').trim();
          const centerBranch = String(row[5] ?? '').trim();
          if (!fullName || !employeeId) continue;
          parsed.push({ fullName, employeeId, department, position, centerBranch, company });
        }
      }
      if (parsed.length === 0) { setImportError('No valid employee data found. Make sure sheets start with KH, CV, or GF.'); return; }
      if (unknownSheets.length > 0) setImportError(`Skipped sheets (unknown prefix): ${unknownSheets.join(', ')}`);
      setPreviewData(parsed); setShowPreview(true);
    } catch (err: any) { setImportError(`Failed to parse Excel file: ${err.message}`); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    try {
      const result = await bulkImport(previewData);
      const companies = [...new Set(previewData.map((e) => e.company))];
      setImportSummary({ ...result, companies });
      setShowPreview(false); setPreviewData([]);
    } catch (err: any) { setImportError(err.message); setShowPreview(false); }
  };

  const companyTabs: { id: Company | 'ALL'; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Companies', count: stats?.total ?? pagination.total },
    { id: 'KHEALTH', label: 'KHealth', count: stats?.byCompany.KHEALTH ?? 0 },
    { id: 'CAREVIEW', label: 'Careview', count: stats?.byCompany.CAREVIEW ?? 0 },
  ];
  const previewByCompany = previewData.reduce<Record<string, number>>((acc, e) => { acc[e.company] = (acc[e.company] ?? 0) + 1; return acc; }, {});

  const StatTile = ({ icon: Icon, label, value }: any) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className="w-4 h-4" /> {label}</div>
      <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Employee Records</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Employee directory used for asset assignments, transfers, and forms.</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a] disabled:opacity-50"><Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import File'}</button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79]"><UserPlus className="w-4 h-4" /> Add Employee</button>
        </div>
      </div>

      {importSummary && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1"><p className="font-semibold text-green-800 dark:text-green-400">Import successful!</p><p className="text-sm text-green-700 dark:text-green-400/80 mt-0.5">{importSummary.total.toLocaleString()} processed — {importSummary.upserted} new, {importSummary.modified} updated. Companies: {importSummary.companies.join(', ')}</p></div>
          <button onClick={() => setImportSummary(null)} className="text-green-600 dark:text-green-400 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}
      {(importError || error) && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{importError || error}</p>
          <button onClick={() => setImportError(null)} className="text-red-600 dark:text-red-400 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile icon={Users} label="Total Employees" value={(stats?.total ?? pagination.total).toLocaleString()} />
        <StatTile icon={Building2} label="Departments" value={stats?.departments ?? '—'} />
        <StatTile icon={MapPin} label="Centers / Branches" value={stats?.centers ?? '—'} />
      </div>

      {/* Card: tabs + filters + table */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="flex items-center gap-5 px-5 pt-4 border-b border-gray-100 dark:border-[#1e3a5f]">
          {companyTabs.map((c) => (
            <button key={c.id} onClick={() => setSelectedCompany(c.id)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${selectedCompany === c.id ? 'border-[#0b5c96] text-[#0b5c96]' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
              {c.label} <span className="text-xs text-gray-400">{c.count}</span>
            </button>
          ))}
        </div>

        <div className="p-5 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={handleSearch} placeholder="Search ID, name, position, center..." className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300">
            <option value="all">All Departments</option>
            {(stats?.departmentList ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Employee ID</th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Company</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Position</th><th className="px-5 py-3">Center / Branch</th><th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {isLoading && employees.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#0b5c96] mx-auto" /></td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-14 text-center"><Users className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" /><p className="font-medium text-gray-700 dark:text-slate-300">No employees found</p><p className="text-sm text-gray-400">Add an employee or import a file.</p></td></tr>
              ) : employees.map((emp) => (
                <tr key={emp._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                  <td className="px-5 py-3 font-mono font-semibold text-gray-900 dark:text-slate-200 whitespace-nowrap">{emp.employeeId}</td>
                  <td className="px-5 py-3 font-medium text-gray-900 dark:text-slate-200">{emp.fullName}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${companyBadge(emp.company)}`}>{companyLabel(emp.company)}</span></td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{emp.department || '—'}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{emp.position || '—'}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-400">{emp.centerBranch || '—'}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-[#0b5c96]" title="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleting(emp)} className="p-1.5 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.limit} onPageChange={handlePageChange} label="employees" />
        </div>
      </div>

      {/* Add / Edit modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-xl w-full shadow-2xl border dark:border-[#1e3a5f]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a5f]">
              <div><h3 className="text-lg font-bold text-gray-900 dark:text-white">{modalMode === 'edit' ? 'Edit Employee' : 'Add Employee'}</h3><p className="text-xs text-gray-500 dark:text-slate-400">Fields marked <span className="text-red-500">*</span> are required.</p></div>
              <button onClick={() => setModalMode(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitForm} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Employee ID" required value={form.employeeId} onChange={(v) => setForm((p) => ({ ...p, employeeId: v }))} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Company <span className="text-red-500">*</span></label>
                  <select value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value as Company }))} className={INPUT}><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option></select>
                </div>
                <Field label="Last Name" required value={form.lastName} onChange={(v) => setForm((p) => ({ ...p, lastName: v }))} />
                <Field label="First Name" required value={form.firstName} onChange={(v) => setForm((p) => ({ ...p, firstName: v }))} />
                <Field label="Middle Name" value={form.middleName} onChange={(v) => setForm((p) => ({ ...p, middleName: v }))} />
                <Field label="Department" value={form.department} onChange={(v) => setForm((p) => ({ ...p, department: v }))} />
                <Field label="Position" value={form.position} onChange={(v) => setForm((p) => ({ ...p, position: v }))} />
                <Field label="Center / Branch" value={form.centerBranch} onChange={(v) => setForm((p) => ({ ...p, centerBranch: v }))} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalMode(null)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">{isLoading ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-md w-full shadow-2xl border dark:border-[#1e3a5f] p-6">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" /></div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Employee</h3></div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">Delete <strong className="text-gray-900 dark:text-white">{deleting.fullName}</strong> (<span className="font-mono">{deleting.employeeId}</span>)? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} disabled={isDeleting} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-semibold text-gray-700 dark:text-slate-200 disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-lg w-full p-6 shadow-2xl border dark:border-[#1e3a5f]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Import</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">New records are inserted; existing records are updated by Employee ID.</p>
            <div className="space-y-2 mb-5">
              {Object.entries(previewByCompany).map(([company, count]) => (
                <div key={company} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1e2d4a] rounded-lg"><span className={`px-2 py-0.5 text-xs font-semibold rounded border ${companyBadge(company as Company)}`}>{companyLabel(company as Company)}</span><span className="font-semibold text-gray-900 dark:text-white">{count.toLocaleString()} employees</span></div>
              ))}
              <div className="flex items-center justify-between p-3 bg-[#0b5c96]/5 rounded-lg border border-[#0b5c96]/30"><span className="font-semibold text-[#0b5c96]">Total</span><span className="font-bold text-[#0b5c96]">{previewData.length.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowPreview(false); setPreviewData([]); }} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-semibold text-gray-700 dark:text-slate-200">Cancel</button>
              <button onClick={handleConfirmImport} disabled={isImporting} className="flex-1 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50 flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> {isImporting ? 'Importing...' : 'Import'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
