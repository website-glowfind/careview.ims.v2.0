import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface FurnitureImportRow {
  name: string;
  category: string;
  company: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  assignedTo?: string;
  department?: string;
  location: string;
  condition?: string;
  status: string;
  purchaseDate: string;
  notes?: string;
}

export interface ImportResult {
  created: number;
  failed: number;
  errors: string[];
}

interface Props {
  onClose: () => void;
  /** Creates the parsed assets; returns a summary. */
  onImport: (rows: FurnitureImportRow[]) => Promise<ImportResult>;
}

// Status label → DB enum
const STATUS_MAP: Record<string, string> = {
  'in use': 'active', active: 'active',
  available: 'available',
  'in storage': 'in-storage', 'in-storage': 'in-storage',
  'under repair': 'in-maintenance', 'in-maintenance': 'in-maintenance', maintenance: 'in-maintenance',
  disposed: 'disposed',
};
const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged'];

const norm = (k: string) => k.toLowerCase().replace(/[\s_]+/g, '');

/** Map a raw sheet row (arbitrary headers) to a normalized import row. */
function mapRow(raw: Record<string, any>): FurnitureImportRow {
  const get = (...keys: string[]) => {
    for (const want of keys) {
      const hit = Object.keys(raw).find((k) => norm(k) === want);
      if (hit != null && String(raw[hit]).trim() !== '') return String(raw[hit]).trim();
    }
    return '';
  };

  const rawStatus = get('status');
  const rawCond = get('condition');
  const matchedCond = CONDITIONS.find((c) => c.toLowerCase() === rawCond.toLowerCase());

  return {
    name: get('furniturename', 'name', 'assetname', 'item'),
    category: get('category', 'type'),
    company: get('company').toUpperCase(),
    brand: get('brand', 'manufacturer'),
    model: get('model'),
    serialNumber: get('serialnumber', 'serial', 'sn'),
    assignedTo: get('assignedto', 'assignee', 'employee', 'assignedemployee'),
    department: get('department', 'dept'),
    location: get('location', 'site'),
    condition: matchedCond || '',
    status: STATUS_MAP[rawStatus.toLowerCase()] || 'available',
    purchaseDate: get('purchasedate', 'datepurchased', 'dateencoded'),
    notes: get('notes', 'remarks'),
  };
}

const TEMPLATE_HEADERS = [
  'Furniture Name', 'Category', 'Brand', 'Model', 'Serial Number', 'Company',
  'Assigned To', 'Department', 'Location', 'Condition', 'Status', 'Purchase Date', 'Notes',
];

export function FurnitureUploadModal({ onClose, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<FurnitureImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ['Executive Office Chair', 'Office Chair', 'Ergohuman', 'V2', 'SN-0001', 'KHEALTH',
       'Juan Dela Cruz', 'IT Department', 'Main Office · Tower B · 5F', 'New', 'In Use', '2026-01-15', ''],
    ]);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Furniture');
    XLSX.writeFile(wb, 'furniture-upload-template.xlsx');
  };

  const parseFile = async (f: File) => {
    setParseError(null);
    setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      const mapped = json.map(mapRow).filter((r) => r.name || r.category || r.company);
      if (mapped.length === 0) {
        setParseError('No rows found. Make sure the first sheet has a header row and at least one data row.');
        setRows([]);
      } else {
        setRows(mapped);
      }
      setFile(f);
    } catch (err: any) {
      setParseError(`Could not read the file: ${err.message}`);
      setRows([]);
      setFile(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const invalid = rows.filter((r) => !r.name || !r.category || !r.company).length;

  const runImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await onImport(rows);
      setResult(res);
    } catch (err: any) {
      setResult({ created: 0, failed: rows.length, errors: [err.message || 'Import failed'] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upload Furniture from Excel</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Asset codes and QR codes are generated automatically on import.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Template row */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-4">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Use the template for the correct column format. Older templates are still accepted.
            </p>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a] whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Download Template
            </button>
          </div>

          {/* Result banner */}
          {result ? (
            <div className={`rounded-xl border p-5 ${result.failed === 0 ? 'border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-500/30' : 'border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30'}`}>
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                {result.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                Imported {result.created} of {result.created + result.failed} items
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600 dark:text-slate-400 list-disc list-inside max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                  {result.errors.length > 8 && <li>…and {result.errors.length - 8} more</li>}
                </ul>
              )}
            </div>
          ) : (
            /* Dropzone */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging ? 'border-[#0b5c96] bg-[#0b5c96]/5' : 'border-gray-300 dark:border-[#1e3a5f] hover:border-gray-400'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-1">
                  <FileSpreadsheet className="w-8 h-8 text-[#0b5c96]" />
                  <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {rows.length} row{rows.length !== 1 ? 's' : ''} detected
                    {invalid > 0 && <span className="text-amber-600"> · {invalid} missing required fields</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Click to choose a different file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">Drop your Excel file here</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">or click to browse — .xlsx, .xls, .csv supported</p>
                </div>
              )}
            </div>
          )}

          {parseError && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {parseError}
            </p>
          )}
          {invalid > 0 && !result && (
            <p className="text-xs text-amber-600">
              {invalid} row{invalid !== 1 ? 's' : ''} missing Furniture Name, Category, or Company will be skipped.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={runImport}
              disabled={rows.length === 0 || importing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {importing ? 'Importing…' : 'Import Items'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
