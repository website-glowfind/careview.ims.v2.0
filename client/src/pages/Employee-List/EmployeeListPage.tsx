import { useEffect, useRef, useState } from 'react';
import { Upload, Search, Users, X, CheckCircle, AlertCircle, UserPlus, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEmployeeStore, type Employee } from '@/store/employeeStore';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import type { Company } from '@/types/inventory';

// Sheet name → Company mapping
const SHEET_COMPANY_MAP: Record<string, Company> = {
  KH: 'KHEALTH',
  CV: 'CAREVIEW',
  GF: 'GLOWFIND',
};

function getCompanyFromSheet(sheetName: string): Company | null {
  const prefix = sheetName.trim().substring(0, 2).toUpperCase();
  return SHEET_COMPANY_MAP[prefix] ?? null;
}

interface ImportSummary {
  total: number;
  upserted: number;
  modified: number;
  skipped: number;
  companies: string[];
}

export function EmployeeListPage() {
  const {
    employees, pagination, selectedCompany, isLoading, isImporting, error,
    setSelectedCompany, fetchEmployees, bulkImport,
  } = useEmployeeStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch]               = useState('');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError]     = useState<string | null>(null);
  const [showPreview, setShowPreview]     = useState(false);
  const [previewData, setPreviewData]     = useState<Omit<Employee, '_id'>[]>([]);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [addError, setAddError]           = useState<string | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const emptyForm = { fullName: '', employeeId: '', department: '', position: '', company: 'KHEALTH' as Company };
  const [addForm, setAddForm]             = useState<Omit<Employee, '_id'>>(emptyForm);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm]           = useState<Omit<Employee, '_id'>>(emptyForm);
  const [editError, setEditError]         = useState<string | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting]       = useState(false);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({
      fullName:   emp.fullName,
      employeeId: emp.employeeId,
      department: emp.department,
      position:   emp.position,
      company:    emp.company,
    });
    setEditError(null);
    setViewingEmployee(null);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?._id) return;
    setEditError(null);
    try {
      await useEmployeeStore.getState().updateEmployee(editingEmployee._id, editForm);
      setEditingEmployee(null);
    } catch (err: any) {
      setEditError(err.message);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee?._id) return;
    setIsDeleting(true);
    try {
      await useEmployeeStore.getState().deleteEmployee(deletingEmployee._id);
      setDeletingEmployee(null);
      setViewingEmployee(null);
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    try {
      await useEmployeeStore.getState().addEmployee(addForm);
      setShowAddModal(false);
      setAddForm(emptyForm);
    } catch (err: any) {
      setAddError(err.message);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    fetchEmployees(e.target.value, 1);
  };

  const handlePageChange = (page: number) => {
    fetchEmployees(search || undefined, page);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const parsed: Omit<Employee, '_id'>[] = [];
      const unknownSheets: string[] = [];

      for (const sheetName of wb.SheetNames) {
        const company = getCompanyFromSheet(sheetName);
        if (!company) {
          unknownSheets.push(sheetName);
          continue;
        }

        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Skip header row (row 0), data starts at row 1
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Columns: 0=row#, 1=FULL NAME, 2=ID No., 3=DEPT., 4=POSITION
          const fullName   = String(row[1] ?? '').trim();
          const employeeId = String(row[2] ?? '').trim();
          const department = String(row[3] ?? '').trim();
          const position   = String(row[4] ?? '').trim();

          if (!fullName || !employeeId) continue; // skip empty rows

          parsed.push({ fullName, employeeId, department, position, company });
        }
      }

      if (parsed.length === 0) {
        setImportError('No valid employee data found. Make sure sheets start with KH, CV, or GF.');
        return;
      }

      if (unknownSheets.length > 0) {
        setImportError(`Skipped sheets (unknown prefix): ${unknownSheets.join(', ')}`);
      }

      setPreviewData(parsed);
      setShowPreview(true);
    } catch (err: any) {
      setImportError(`Failed to parse Excel file: ${err.message}`);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    try {
      const result = await bulkImport(previewData);
      const companies = [...new Set(previewData.map(e => e.company))];
      setImportSummary({ ...result, skipped: 0, companies });
      setShowPreview(false);
      setPreviewData([]);
    } catch (err: any) {
      setImportError(err.message);
      setShowPreview(false);
    }
  };

  const COMPANIES: { id: Company | 'ALL'; label: string }[] = [
    { id: 'ALL',      label: 'All Companies' },
    { id: 'KHEALTH',  label: 'KHEALTH' },
    { id: 'CAREVIEW', label: 'CAREVIEW' },
    { id: 'GLOWFIND', label: 'GLOWFIND' },
  ];

  // Preview grouped by company
  const previewByCompany = previewData.reduce<Record<string, number>>((acc, e) => {
    acc[e.company] = (acc[e.company] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee List</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            {pagination.total.toLocaleString()} employees
          </p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => { setShowAddModal(true); setAddError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import Excel'}
          </button>
        </div>
      </div>

      {/* Import success */}
      {importSummary && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-400">Import successful!</p>
            <p className="text-sm text-green-700 dark:text-green-400/80 mt-0.5">
              {importSummary.total.toLocaleString()} employees processed —{' '}
              {importSummary.upserted} new, {importSummary.modified} updated.
              Companies: {importSummary.companies.join(', ')}
            </p>
          </div>
          <button onClick={() => setImportSummary(null)} className="text-green-600 dark:text-green-400 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import error */}
      {(importError || error) && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 flex-1">{importError || error}</p>
          <button onClick={() => { setImportError(null); }} className="text-red-600 dark:text-red-400 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Company tabs */}
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompany(c.id as Company | 'ALL')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                selectedCompany === c.id
                  ? c.id === 'ALL'      ? 'bg-slate-600 text-white border-slate-600'
                  : c.id === 'KHEALTH'  ? 'bg-blue-600 text-white border-blue-600'
                  : c.id === 'CAREVIEW' ? 'bg-green-600 text-white border-green-600'
                  :                       'bg-orange-600 text-white border-orange-600'
                  : 'bg-white dark:bg-[#162236] text-gray-700 dark:text-slate-300 border-gray-300 dark:border-[#1e3a5f] hover:border-gray-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, department, position..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-xl bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white mb-1">No Employees Found</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Import an Excel file to add employees
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-b border-gray-200 dark:border-[#1e3a5f]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ID No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                {employees.map((emp, idx) => (
                  <tr
                    key={emp._id ?? idx}
                    onClick={() => setViewingEmployee(emp)}
                    className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-500 w-10">
                      {((pagination.page - 1) * pagination.limit) + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-200 max-w-[200px]">{emp.fullName}</td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-slate-300 whitespace-nowrap">{emp.employeeId}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{emp.department || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-[160px]">
                      <span className="block truncate" title={emp.position || ''}>{emp.position || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(emp.company)}`}>
                        {emp.company}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-gray-900 dark:text-white">{pagination.total.toLocaleString()}</span> employees
          </p>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-400 dark:text-slate-500">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p as number)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      pagination.page === p
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            {/* Next */}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-md w-full shadow-2xl border dark:border-[#1e3a5f]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a5f]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                  viewingEmployee.company === 'KHEALTH' ? 'bg-blue-600' :
                  viewingEmployee.company === 'CAREVIEW' ? 'bg-green-600' : 'bg-orange-600'
                }`}>
                  {viewingEmployee.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{viewingEmployee.fullName}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getCompanyBadgeClasses(viewingEmployee.company)}`}>
                    {viewingEmployee.company}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingEmployee(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              {[
                { label: 'Employee ID', value: viewingEmployee.employeeId, mono: true },
                { label: 'Full Name',   value: viewingEmployee.fullName },
                { label: 'Department',  value: viewingEmployee.department || '—' },
                { label: 'Position',    value: viewingEmployee.position   || '—' },
                { label: 'Company',     value: viewingEmployee.company },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-start gap-4">
                  <span className="text-sm text-gray-500 dark:text-slate-400 flex-shrink-0 w-28">{label}</span>
                  <span className={`text-sm font-medium text-gray-900 dark:text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => setDeletingEmployee(viewingEmployee)}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => openEditModal(viewingEmployee)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Update
              </button>
              <button
                onClick={() => setViewingEmployee(null)}
                className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-[#243352] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-md w-full shadow-2xl border dark:border-[#1e3a5f]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a5f]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Employee</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                  ⚠️ {addError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.fullName}
                  onChange={e => setAddForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g., Dela Cruz, Juan M."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.employeeId}
                  onChange={e => setAddForm(p => ({ ...p, employeeId: e.target.value }))}
                  placeholder="e.g., 2024010101"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={addForm.company}
                  onChange={e => setAddForm(p => ({ ...p, company: e.target.value as Company }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="KHEALTH">KHEALTH</option>
                  <option value="CAREVIEW">CAREVIEW</option>
                  <option value="GLOWFIND">GLOWFIND</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={addForm.department}
                  onChange={e => setAddForm(p => ({ ...p, department: e.target.value }))}
                  placeholder="e.g., Admin-Accounting"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Position</label>
                <input
                  type="text"
                  value={addForm.position}
                  onChange={e => setAddForm(p => ({ ...p, position: e.target.value }))}
                  placeholder="e.g., Accounting Supervisor"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-md w-full shadow-2xl border dark:border-[#1e3a5f]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a5f]">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update Employee</h3>
              </div>
              <button onClick={() => setEditingEmployee(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                  ⚠️ {editError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g., Dela Cruz, Juan M."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.employeeId}
                  onChange={e => setEditForm(p => ({ ...p, employeeId: e.target.value }))}
                  placeholder="e.g., 2024010101"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.company}
                  onChange={e => setEditForm(p => ({ ...p, company: e.target.value as Company }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="KHEALTH">KHEALTH</option>
                  <option value="CAREVIEW">CAREVIEW</option>
                  <option value="GLOWFIND">GLOWFIND</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                  placeholder="e.g., Admin-Accounting"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Position</label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))}
                  placeholder="e.g., Accounting Supervisor"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-md w-full shadow-2xl border dark:border-[#1e3a5f] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Employee</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deletingEmployee.fullName}</strong>{' '}
              (<span className="font-mono">{deletingEmployee.employeeId}</span>)? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingEmployee(null)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-lg w-full p-6 shadow-2xl border dark:border-[#1e3a5f]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Import</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              The following employees will be imported (new records inserted, existing records updated by Employee ID):
            </p>

            {/* Breakdown per company */}
            <div className="space-y-2 mb-5">
              {Object.entries(previewByCompany).map(([company, count]) => (
                <div key={company} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1e2d4a] rounded-lg">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(company as Company)}`}>
                    {company}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{count.toLocaleString()} employees</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
                <span className="font-semibold text-blue-800 dark:text-blue-400">Total</span>
                <span className="font-bold text-blue-800 dark:text-blue-400">{previewData.length.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPreview(false); setPreviewData([]); }}
                className="flex-1 py-2 bg-gray-100 dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
