import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus, Search, Eye, Pencil, History, ArrowLeft, FileText, PackageSearch, Info, Upload, Download, FileSpreadsheet, DatabaseZap, X, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { useWarehouseStore, type WarehouseItem, type WarehouseItemInput, type ImportOutcome } from '@/store/warehouseStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79] disabled:opacity-50';
const BTN_GHOST = 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a] disabled:opacity-50';

/** Workbook column order — also the Excel template headers. */
export const WAREHOUSE_COLUMNS: { key: keyof WarehouseItemInput; label: string; numeric?: boolean }[] = [
  { key: 'itemCode', label: 'Item Code' }, { key: 'itemDescription', label: 'Item Description' }, { key: 'department', label: 'Department' },
  { key: 'unit', label: 'Unit' }, { key: 'beginningQty', label: 'Beginning Qty', numeric: true }, { key: 'received', label: 'Received', numeric: true },
  { key: 'issued', label: 'Issued', numeric: true }, { key: 'currentStock', label: 'Current Stock', numeric: true }, { key: 'location', label: 'Location' },
  { key: 'remarks', label: 'Remarks' }, { key: 'status', label: 'Status' },
];

export const show = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
export const sameDept = (a: string, b: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const statusPill = (s: string) => ((s || '').trim().toUpperCase() === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600');
const distinct = (items: WarehouseItem[], key: 'unit' | 'status' | 'location') => [...new Set(items.map((i) => (i[key] || '').trim()).filter(Boolean))].sort();

interface Props {
  isAdmin: boolean;
  canEdit: boolean;
  /** Set by later phases (Gate Pass / Stock Movement) */
  renderMovementTab?: (item: WarehouseItem) => React.ReactNode;
  onGatePass?: (item: WarehouseItem) => void;
}

export function WarehouseInventory({ isAdmin, canEdit, renderMovementTab, onGatePass }: Props) {
  const { items, meta, importWorkbook } = useWarehouseStore();
  const [dept, setDept] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ editing: WarehouseItem | null } | null>(null);
  const [viewing, setViewing] = useState<{ id: string; tab: 'overview' | 'movement' | 'activity' } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const deptTabs = useMemo(() => {
    const out: string[] = [];
    for (const d of [...(meta?.departmentTabs ?? []), ...items.map((i) => i.department)]) {
      if (d && !out.some((x) => sameDept(x, d))) out.push(d.trim());
    }
    return out;
  }, [meta, items]);

  const scoped = dept === 'ALL' ? items : items.filter((i) => sameDept(i.department, dept));
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? scoped.filter((i) => [i.itemCode, i.itemDescription, i.location, i.remarks, i.unit].some((v) => (v || '').toLowerCase().includes(q))) : scoped;
  }, [scoped, search]);
  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(filtered, 10);

  const notes = dept === 'ALL' ? (meta?.tabNotes?.FMD ?? []) : (meta?.tabNotes?.[deptTabs.find((d) => sameDept(d, dept)) ?? dept] ?? []);
  const remaining = meta ? meta.workbookCount - meta.workbookImported : 0;

  const runWorkbookImport = async () => {
    if (!meta) return;
    if (!confirm(`Import ${remaining} item(s) from the MW Warehouse Inventory 2026 workbook?\n\nItems whose code already exists are left unchanged.`)) return;
    setImporting(true); setNotice(null);
    try {
      const r = await importWorkbook();
      setNotice({ ok: true, text: `Workbook import done — ${r.inserted} added${r.skipped ? `, ${r.skipped} already existed (unchanged)` : ''}.` });
    } catch (e: any) { setNotice({ ok: false, text: e.message }); }
    finally { setImporting(false); }
  };

  const viewed = viewing ? items.find((i) => i._id === viewing.id) ?? null : null;
  if (viewed && viewing) {
    return (
      <>
        <WarehouseItemDetails item={viewed} tab={viewing.tab} onTab={(tab) => setViewing({ id: viewed._id, tab })} onBack={() => setViewing(null)}
          canEdit={canEdit} onEdit={() => setForm({ editing: viewed })} onGatePass={onGatePass ? () => onGatePass(viewed) : undefined} renderMovementTab={renderMovementTab} />
        {form && <ItemFormModal items={items} departments={deptTabs} editing={form.editing} onClose={() => setForm(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Warehouse Inventory</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">MW warehouse stock by department. Department tabs only filter the list — they never change a record.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && meta && remaining > 0 && (
            <button onClick={runWorkbookImport} disabled={importing} className={BTN_GHOST} title="Load the items from the MW Warehouse Inventory 2026 workbook">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />} Import Workbook Data ({remaining})
            </button>
          )}
          {canEdit && <button onClick={() => setShowUpload(true)} className={BTN_GHOST}><Upload className="w-4 h-4" /> Upload Excel</button>}
          {canEdit && <button onClick={() => setForm({ editing: null })} className={BTN_PRIMARY}><Plus className="w-4 h-4" /> Add Item</button>}
        </div>
      </div>

      {notice && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${notice.ok ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'}`}>
          {notice.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}<span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="flex items-center gap-1 px-4 border-b border-gray-100 dark:border-[#1e3a5f] overflow-x-auto">
          {['ALL', ...deptTabs].map((d) => (
            <button key={d} onClick={() => { setDept(d); setPage(1); }}
              className={`px-3 py-3 text-sm whitespace-nowrap border-b-2 -mb-px ${dept === d ? 'border-[#0b5c96] text-[#0b5c96] font-medium' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>
              {d === 'ALL' ? 'All' : d}
              <span className="ml-1.5 text-xs text-gray-400">{d === 'ALL' ? items.length : items.filter((i) => sameDept(i.department, d)).length}</span>
            </button>
          ))}
        </div>

        <div className="p-4 space-y-2 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search item code, description, location, remarks…" className={`${INPUT} pl-9`} />
          </div>
          {notes.map((t) => <p key={t} className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t}</p>)}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-b border-gray-200 dark:border-[#1e3a5f]">
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {WAREHOUSE_COLUMNS.map((c) => <th key={c.key} className={`px-3 py-3 whitespace-nowrap ${c.numeric ? 'text-right' : ''}`}>{c.label}</th>)}
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {pageItems.length === 0 ? (
                <tr><td colSpan={WAREHOUSE_COLUMNS.length + 1} className="py-14 text-center">
                  <PackageSearch className="w-7 h-7 text-gray-300 mx-auto" />
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mt-2">No warehouse items found</p>
                  <p className="text-xs text-gray-400 mt-1">{search ? 'Try a different search.' : items.length === 0 ? 'Use "Import Workbook Data", "Upload Excel", or "Add Item" to get started.' : 'This department has no items.'}</p>
                </td></tr>
              ) : pageItems.map((i) => (
                <tr key={i._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                  <td className="px-3 py-2.5 whitespace-nowrap"><button onClick={() => setViewing({ id: i._id, tab: 'overview' })} className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400 hover:underline">{i.itemCode}</button></td>
                  <td className="px-3 py-2.5 text-gray-900 dark:text-slate-200 min-w-[220px]">{i.itemDescription}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">{i.department}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">{i.unit}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{show(i.beginningQty)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{show(i.received)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{show(i.issued)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{show(i.currentStock)}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">{i.location}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-slate-400 min-w-[160px]">{i.remarks}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${statusPill(i.status)}`}>{i.status}</span></td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setViewing({ id: i._id, tab: 'overview' })} className="p-1.5 text-gray-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                    {canEdit && <button onClick={() => setForm({ editing: i })} className="p-1.5 text-gray-400 hover:text-green-600" title="Edit"><Pencil className="w-4 h-4" /></button>}
                    {onGatePass && <button onClick={() => onGatePass(i)} className="p-1.5 text-gray-400 hover:text-[#0b5c96]" title="New Gate Pass for this item"><FileText className="w-4 h-4" /></button>}
                    <button onClick={() => setViewing({ id: i._id, tab: 'movement' })} className="p-1.5 text-gray-400 hover:text-gray-700" title="Movement history"><History className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="items" /></div>}
      </div>

      {form && <ItemFormModal items={items} departments={deptTabs} editing={form.editing} onClose={() => setForm(null)} />}
      {showUpload && <WarehouseUploadModal onClose={() => setShowUpload(false)} />}
    </div>
  );
}

// ─── Add / edit ───────────────────────────────────────────────────────────────

function ItemFormModal({ items, departments, editing, onClose }: { items: WarehouseItem[]; departments: string[]; editing: WarehouseItem | null; onClose: () => void }) {
  const { createItem, updateItem } = useWarehouseStore();
  const [d, setD] = useState<Record<string, string>>(() => editing
    ? Object.fromEntries(WAREHOUSE_COLUMNS.map((c) => [c.key, c.numeric ? show(editing[c.key] as number | null) : String(editing[c.key] ?? '')]))
    : { itemCode: '', itemDescription: '', department: departments[0] ?? '', unit: '', beginningQty: '', received: '', issued: '', currentStock: '', location: '', remarks: '', status: 'AVAILABLE' });
  const [addingDept, setAddingDept] = useState(false);
  const [stockTouched, setStockTouched] = useState(!!editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setD((p) => {
    const next = { ...p, [k]: v };
    // Suggest Current Stock = Received − Issued until the user types their own value
    if (!stockTouched && (k === 'received' || k === 'issued')) next.currentStock = String(Number(next.received || 0) - Number(next.issued || 0));
    return next;
  });

  const submit = async () => {
    if (!d.itemCode.trim()) return setError('Item code is required.');
    if (!editing && items.some((i) => i.itemCode === d.itemCode.trim())) return setError('This item code already exists.');
    if (!d.itemDescription.trim()) return setError('Item description is required.');
    if (!d.department.trim()) return setError('Department is required.');
    for (const c of WAREHOUSE_COLUMNS) if (c.numeric && d[c.key].trim() !== '' && !(Number(d[c.key]) >= 0)) return setError(`${c.label} must be a number, 0 or more.`);
    const input = Object.fromEntries(WAREHOUSE_COLUMNS.map((c) => [c.key, c.numeric ? (d[c.key].trim() === '' ? null : Number(d[c.key])) : d[c.key]])) as unknown as WarehouseItemInput;
    setBusy(true); setError('');
    try { if (editing) await updateItem(editing._id, input); else await createItem({ ...input, itemCode: input.itemCode.trim() }); onClose(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const field = (key: string, label: string, opts: { type?: string; list?: string[]; span?: boolean; required?: boolean; disabled?: boolean } = {}) => (
    <div className={opts.span ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label} {opts.required && <span className="text-red-500">*</span>}</label>
      <input type={opts.type || 'text'} min={opts.type === 'number' ? 0 : undefined} list={opts.list ? `wh-${key}` : undefined} value={d[key]} disabled={opts.disabled}
        onChange={(e) => { if (key === 'currentStock') setStockTouched(true); set(key, e.target.value); }} className={`${INPUT} ${key === 'itemCode' ? 'font-mono' : ''} disabled:bg-gray-50 dark:disabled:bg-[#0b1322]`} />
      {opts.list && <datalist id={`wh-${key}`}>{opts.list.map((u) => <option key={u} value={u} />)}</datalist>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div><h3 className="text-base font-bold text-gray-900 dark:text-white">{editing ? `Edit ${editing.itemCode}` : 'Add Warehouse Item'}</h3><p className="text-xs text-gray-500 dark:text-slate-400">Same fields as the warehouse workbook.</p></div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4 overflow-y-auto">
          {error && <div className="sm:col-span-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">{error}</div>}
          {field('itemCode', 'Item Code', { required: true, disabled: !!editing })}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Department <span className="text-red-500">*</span></label>
              <button type="button" onClick={() => setAddingDept((v) => !v)} className="text-xs font-medium text-[#0b5c96] hover:underline">{addingDept ? 'Cancel' : '+ Add'}</button>
            </div>
            {addingDept
              ? <input autoFocus placeholder="New department name" onChange={(e) => set('department', e.target.value.trim().toUpperCase())} className={INPUT} />
              : <select value={d.department} onChange={(e) => set('department', e.target.value)} className={INPUT}>{[...new Set([...departments, d.department])].filter(Boolean).map((x) => <option key={x} value={x}>{x}</option>)}</select>}
          </div>
          {field('itemDescription', 'Item Description', { required: true, span: true })}
          {field('unit', 'Unit', { list: distinct(items, 'unit') })}
          {field('location', 'Location', { list: distinct(items, 'location') })}
          {field('beginningQty', 'Beginning Quantity', { type: 'number' })}
          {field('received', 'Received', { type: 'number' })}
          {field('issued', 'Issued', { type: 'number' })}
          {field('currentStock', 'Current Stock', { type: 'number' })}
          {field('status', 'Status', { list: distinct(items, 'status') })}
          <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Remarks</label><textarea rows={2} value={d.remarks} onChange={(e) => set('remarks', e.target.value)} className={INPUT} /></div>
          <p className="sm:col-span-2 text-xs text-gray-400">Current Stock defaults to Received − Issued until you type your own value.</p>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
          <button onClick={onClose} className={BTN_GHOST}>Cancel</button>
          <button onClick={submit} disabled={busy} className={BTN_PRIMARY}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}{editing ? 'Save Changes' : 'Save Item'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Excel upload + template ─────────────────────────────────────────────────

export function downloadWarehouseTemplate() {
  const header = WAREHOUSE_COLUMNS.map((c) => c.label);
  const sample = [
    ['FMD100', 'EXHAUST HOSE', 'FMD', 'BOX', 2, 2, '', 2, 'RW1', 'Sample row — replace or delete', 'AVAILABLE'],
    ['IT100', 'NETWORK CABLE CAT6 (305M)', 'IT', 'ROLL', 3, 3, 1, 2, 'C2', '', 'AVAILABLE'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...sample]);
  ws['!cols'] = [12, 36, 14, 10, 13, 10, 10, 13, 16, 28, 12].map((wch) => ({ wch }));
  const guide = XLSX.utils.aoa_to_sheet([
    ['Column', 'Required', 'Notes'],
    ['Item Code', 'Yes', 'Unique code, e.g. FMD1, IT12. Rows whose code already exists are skipped.'],
    ['Item Description', 'Yes', ''],
    ['Department', 'Yes', 'e.g. FMD, PRODUCTION, IT, CREATIVES, HR, ACCOUNTING'],
    ['Unit', 'No', 'e.g. BOX, PC/S, ROLL'],
    ['Beginning Qty / Received / Issued / Current Stock', 'No', 'Numbers, 0 or more. Leave blank if unknown.'],
    ['Location', 'No', 'Storage location, e.g. RW1, C2'],
    ['Remarks', 'No', ''],
    ['Status', 'No', 'Defaults to AVAILABLE when blank'],
  ]);
  guide['!cols'] = [{ wch: 44 }, { wch: 10 }, { wch: 70 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Warehouse Items');
  XLSX.utils.book_append_sheet(wb, guide, 'Instructions');
  XLSX.writeFile(wb, 'mw-warehouse-upload-template.xlsx');
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

function WarehouseUploadModal({ onClose }: { onClose: () => void }) {
  const { bulkImport } = useWarehouseStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Partial<WarehouseItemInput>[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportOutcome | null>(null);

  const parse = async (file?: File) => {
    if (!file) return;
    setError(''); setResult(null); setFileName(file.name);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const keyFor = Object.fromEntries(WAREHOUSE_COLUMNS.map((c) => [norm(c.label), c]));
      keyFor[norm('Beginning Quantity')] = keyFor[norm('Beginning Qty')];
      const parsed = raw.map((r) => {
        const out: Record<string, any> = {};
        for (const [h, v] of Object.entries(r)) {
          const col = keyFor[norm(h)];
          if (col) out[col.key] = col.numeric ? (String(v).trim() === '' ? null : Number(v)) : String(v).trim();
        }
        return out as Partial<WarehouseItemInput>;
      }).filter((r) => Object.values(r).some((v) => v !== '' && v !== null && v !== undefined));
      if (parsed.length === 0) { setError('No rows found. Use the template so the column headers match.'); setRows(null); return; }
      setRows(parsed);
    } catch (e: any) { setError(`Could not read the file: ${e.message}`); setRows(null); }
  };

  const submit = async () => {
    if (!rows) return;
    setBusy(true); setError('');
    try { setResult(await bulkImport(rows)); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div><h3 className="text-base font-bold text-gray-900 dark:text-white">Upload Warehouse Items</h3><p className="text-xs text-gray-500 dark:text-slate-400">Use the template so the columns match the warehouse workbook.</p></div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <button onClick={downloadWarehouseTemplate} className={`${BTN_GHOST} w-full justify-center`}><Download className="w-4 h-4" /> Download Template (.xlsx)</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { parse(e.target.files?.[0]); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 dark:border-[#1e3a5f] rounded-xl py-8 flex flex-col items-center text-gray-500 hover:border-[#0b5c96]">
            <FileSpreadsheet className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">{fileName || 'Choose an Excel file'}</span>
            {rows && <span className="text-xs text-gray-400 mt-1">{rows.length} row(s) ready to import</span>}
          </button>
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">{error}</div>}
          {result && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-sm text-green-800 dark:text-green-400 space-y-1">
              <p className="font-semibold">{result.inserted} item(s) added{result.skipped ? ` · ${result.skipped} skipped (code already exists)` : ''}.</p>
              {!!result.skippedCodes?.length && <p className="text-xs">Skipped: {result.skippedCodes.slice(0, 15).join(', ')}{result.skippedCodes.length > 15 ? '…' : ''}</p>}
              {!!result.errors?.length && <ul className="text-xs text-red-600 list-disc pl-4">{result.errors.slice(0, 10).map((e) => <li key={e}>{e}</li>)}</ul>}
            </div>
          )}
          <p className="text-xs text-gray-400">Only new item codes are added — existing items are never overwritten.</p>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
          <button onClick={onClose} className={BTN_GHOST}>{result ? 'Done' : 'Cancel'}</button>
          {!result && <button onClick={submit} disabled={!rows || busy} className={BTN_PRIMARY}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Import {rows ? rows.length : ''} Row(s)</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Details ──────────────────────────────────────────────────────────────────

function WarehouseItemDetails({ item, tab, onTab, onBack, canEdit, onEdit, onGatePass, renderMovementTab }: {
  item: WarehouseItem; tab: 'overview' | 'movement' | 'activity'; onTab: (t: 'overview' | 'movement' | 'activity') => void; onBack: () => void;
  canEdit: boolean; onEdit: () => void; onGatePass?: () => void; renderMovementTab?: (item: WarehouseItem) => React.ReactNode;
}) {
  const TABS = [{ id: 'overview', label: 'Overview' }, { id: 'movement', label: 'Stock Movement' }, { id: 'activity', label: `Activity Log ${item.activity?.length || ''}` }] as const;
  const DL = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div><dt className="text-xs text-gray-400">{label}</dt><dd className="text-sm font-medium text-gray-900 dark:text-slate-200 mt-0.5">{value === '' || value === undefined || value === null ? '—' : value}</dd></div>
  );
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to Warehouse Inventory</button>
      <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Warehouse Item Details</p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{item.itemDescription}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-sm font-semibold text-[#0b5c96] dark:text-blue-400">{item.itemCode}</span>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-gray-100 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300">{item.department}</span>
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${statusPill(item.status)}`}>{item.status}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={onEdit} className={BTN_GHOST}><Pencil className="w-4 h-4" /> Edit</button>
            {onGatePass && <button onClick={onGatePass} className={BTN_PRIMARY}>Gate Pass</button>}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-2xl">
        <nav className="flex gap-5 px-6 border-b border-gray-100 dark:border-[#1e3a5f]">
          {TABS.map((t) => <button key={t.id} onClick={() => onTab(t.id)} className={`py-3 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? 'border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400'}`}>{t.label}</button>)}
        </nav>
        <div className="p-6">
          {tab === 'overview' && (
            <div className="space-y-7">
              <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <DL label="Item Code" value={<span className="font-mono">{item.itemCode}</span>} /><DL label="Item Description" value={item.itemDescription} />
                <DL label="Department" value={item.department} /><DL label="Unit" value={item.unit} />
                <DL label="Beginning Quantity" value={show(item.beginningQty)} /><DL label="Received" value={show(item.received)} />
                <DL label="Issued" value={show(item.issued)} /><DL label="Current Stock" value={<span className="text-base font-bold">{show(item.currentStock)}</span>} />
                <DL label="Location" value={item.location} /><DL label="Remarks" value={item.remarks} /><DL label="Status" value={item.status} />
              </dl>
              <div className="pt-5 border-t border-gray-100 dark:border-[#1e3a5f]">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 mb-3">SYSTEM INFORMATION</h3>
                <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Date Encoded" value={fmtDateTime(item.createdAt)} /><DL label="Encoded By" value={item.createdBy} />
                  <DL label="Last Updated" value={fmtDateTime(item.updatedAt)} /><DL label="Updated By" value={item.updatedBy} />
                </dl>
              </div>
            </div>
          )}
          {tab === 'movement' && (renderMovementTab ? renderMovementTab(item) : (
            <div className="text-center py-10 text-gray-400"><History className="w-6 h-6 mx-auto mb-2" /><p className="font-medium text-gray-600 dark:text-slate-300">No stock movement yet</p><p className="text-xs mt-1">IN and OUT movements from Gate Passes will be listed here.</p></div>
          ))}
          {tab === 'activity' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-2 text-left">Date & Time</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Description</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{[...(item.activity || [])].reverse().map((a, idx) => <tr key={idx}><td className="px-4 py-2 whitespace-nowrap">{fmtDateTime(a.timestamp)}</td><td className="px-4 py-2">{a.user || '—'}</td><td className="px-4 py-2 font-medium whitespace-nowrap">{a.action}</td><td className="px-4 py-2 text-gray-600 dark:text-slate-400">{a.description}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
