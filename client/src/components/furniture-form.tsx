import { useMemo, useRef, useState } from 'react';
import {
  X, Copy, Check, Printer, Upload, Loader2, FileText, Trash2, Image as ImageIcon,
} from 'lucide-react';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { assetServices } from '@/services/assetServices';
import type { ITAsset, Company, AssetStatus, AssetAttachment, FurnitureDetails } from '@/types/inventory';

interface Props {
  asset?: ITAsset;
  assets: ITAsset[];
  categories: string[];
  onSave: (asset: ITAsset | Omit<ITAsset, 'id' | 'deviceCode'>, subscriptionData?: any) => void;
  onCancel: () => void;
  onBack?: () => void;
  currentUser?: string;
}

const STEPS = ['Basic Information', 'Purchase Details', 'Assignment & Location', 'Condition', 'Documents'];
const DEFAULT_CATEGORIES = ['Office Chair', 'Desk', 'Table', 'Cabinet', 'Sofa', 'Shelf', 'Whiteboard', 'Partition', 'Other'];
const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'active', label: 'In Use' },
  { value: 'in-storage', label: 'In Storage' },
  { value: 'in-maintenance', label: 'Under Repair' },
];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'] as const;
const COMPANY_PREFIX: Record<string, string> = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
const DOC_TYPES = ['Invoice', 'Official Receipt', 'Purchase Order', 'Warranty Document', 'Asset Photo', 'Other'];

const FURN_INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';

// Module-scope so inputs keep focus across keystrokes (a component defined inside
// the render would remount its <input> on every change).
function TextField({ label, required, value, onChange, placeholder, type = 'text' }: {
  label: string; required?: boolean; value: any; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={FURN_INPUT} />
    </div>
  );
}

export function FurnitureForm({ asset, assets, categories, onSave, onCancel, onBack, currentUser }: Props) {
  const isEdit = !!asset?._id;
  const cats = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const f = asset?.furniture ?? {};

  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  // ── Form state ──
  const [company, setCompany] = useState<Company>(asset?.company ?? 'KHEALTH');
  const [name, setName] = useState(asset?.name ?? '');
  const [category, setCategory] = useState(asset?.category ?? (cats[0] || ''));
  const [type, setType] = useState(f.type ?? '');
  const [brand, setBrand] = useState(asset?.brand ?? '');
  const [model, setModel] = useState(asset?.model ?? '');
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? '');
  const [status, setStatus] = useState<AssetStatus>(asset?.status ?? 'available');
  const [description, setDescription] = useState(f.description ?? asset?.specifications ?? '');
  const [material, setMaterial] = useState(f.material ?? '');
  const [color, setColor] = useState(f.color ?? '');
  const [dimensions, setDimensions] = useState(f.dimensions ?? '');
  const [quantity, setQuantity] = useState<number>(f.quantity ?? 1);
  const [unit, setUnit] = useState(f.unit ?? 'pc');

  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate?.slice(0, 10) ?? '');
  const [supplier, setSupplier] = useState(f.supplier ?? '');
  const [poNumber, setPoNumber] = useState(f.poNumber ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(f.invoiceNumber ?? '');
  const [currency, setCurrency] = useState(f.currency ?? '₱');
  const [acquisitionCost, setAcquisitionCost] = useState<string>(f.acquisitionCost != null ? String(f.acquisitionCost) : '');
  const [warranty, setWarranty] = useState<boolean>(f.warranty ?? false);

  const [assignedTo, setAssignedTo] = useState(asset?.assignedTo ?? '');
  const [employeeId, setEmployeeId] = useState(asset?.employeeId ?? '');
  const [department, setDepartment] = useState(asset?.department ?? '');
  const [position, setPosition] = useState(asset?.position ?? '');
  const [dateAssigned, setDateAssigned] = useState(f.dateAssigned ?? '');
  const [siteBranch, setSiteBranch] = useState(f.siteBranch ?? '');
  const [building, setBuilding] = useState(f.building ?? '');
  const [floor, setFloor] = useState(f.floor ?? '');
  const [roomArea, setRoomArea] = useState(f.roomArea ?? '');
  const [specificLocation, setSpecificLocation] = useState(f.specificLocation ?? '');

  const [condition, setCondition] = useState<string>(asset?.condition ?? 'New');
  const [conditionRemarks, setConditionRemarks] = useState(f.conditionRemarks ?? '');
  const [lastInspectionDate, setLastInspectionDate] = useState(f.lastInspectionDate ?? '');
  const [inspectedBy, setInspectedBy] = useState(f.inspectedBy ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');

  const [documentType, setDocumentType] = useState(f.documentType ?? 'Invoice');
  const [attachments, setAttachments] = useState<AssetAttachment[]>(asset?.attachments ?? []);

  // ── Asset code preview (server generates on save; FN + 4-digit shared sequence) ──
  const previewCode = useMemo(() => {
    if (asset?.deviceCode) return asset.deviceCode;
    let maxFn = 0;
    assets.forEach((a) => {
      const m = a.deviceCode?.match(/^[A-Z]{2}-FN-(\d+)$/);
      if (m) { const n = parseInt(m[1], 10); if (n > maxFn) maxFn = n; }
    });
    return `${COMPANY_PREFIX[company] ?? 'XX'}-FN-${(maxFn + 1).toString().padStart(4, '0')}`;
  }, [assets, company, asset]);

  const copyCode = () => {
    navigator.clipboard?.writeText(previewCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await assetServices.uploadFiles(Array.from(files));
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  // ── Validation (returns the step to jump to + message, or null) ──
  const validate = (): { step: number; msg: string } | null => {
    if (!company) return { step: 0, msg: 'Company is required.' };
    if (!name.trim()) return { step: 0, msg: 'Furniture Name is required.' };
    if (!category) return { step: 0, msg: 'Furniture Category is required.' };
    if (!status) return { step: 0, msg: 'Status is required.' };
    if (!description.trim()) return { step: 0, msg: 'Description is required.' };
    if (!quantity || quantity < 1) return { step: 0, msg: 'Quantity must be at least 1.' };
    if (!purchaseDate) return { step: 1, msg: 'Purchase Date is required.' };
    if (acquisitionCost === '' || isNaN(Number(acquisitionCost))) return { step: 1, msg: 'Acquisition Cost is required.' };
    if (!siteBranch.trim()) return { step: 2, msg: 'Site / Branch is required.' };
    if (!condition) return { step: 3, msg: 'Current Condition is required.' };
    return null;
  };

  const handleSave = () => {
    const bad = validate();
    if (bad) { setStep(bad.step); setError(bad.msg); return; }
    setError(null);

    const details: FurnitureDetails = {
      type, description, material, color, dimensions, quantity, unit,
      supplier, poNumber, invoiceNumber, currency,
      acquisitionCost: acquisitionCost === '' ? undefined : Number(acquisitionCost),
      warranty, dateAssigned, siteBranch, building, floor, roomArea, specificLocation,
      conditionRemarks, lastInspectionDate, inspectedBy, documentType,
    };
    const location = [siteBranch, building, floor, roomArea, specificLocation].map((s) => s.trim()).filter(Boolean).join(' · ');

    const payload: any = {
      ...(isEdit ? { _id: asset!._id, deviceCode: asset!.deviceCode } : {}),
      name: name.trim(),
      category,
      company,
      brand, model, serialNumber,
      specifications: description,
      status,
      condition,
      assignedTo, employeeId, department, position,
      purchaseDate,
      location,
      notes,
      attachments,
      furniture: details,
      assetType: 'General',
    };
    onSave(payload);
  };

  // ── Field primitives ──
  const inputCls = FURN_INPUT;
  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-4xl shadow-xl max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Furniture Asset' : 'Add Furniture Asset'}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              Fields marked <span className="text-red-500">*</span> are required. The asset code and QR code are generated automatically.
            </p>
          </div>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Step rail */}
          <div className="w-56 shrink-0 border-r border-gray-100 dark:border-[#1e3a5f] p-4 space-y-1 overflow-y-auto">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                  step === i ? 'bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                }`}
              >
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === i ? 'bg-[#0b5c96] text-white' : 'bg-gray-200 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300'
                }`}>{i + 1}</span>
                {s}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-6 overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* STEP 1 — Basic Information */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label required>Company</Label>
                      <select value={company} onChange={(e) => setCompany(e.target.value as Company)} className={inputCls}>
                        <option value="KHEALTH">KHealth</option>
                        <option value="CAREVIEW">Careview</option>
                      </select>
                    </div>
                    <div>
                      <Label required>Asset Code</Label>
                      <div className="flex gap-2">
                        <input value={previewCode} readOnly className={`${inputCls} font-mono bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} />
                        <button onClick={copyCode} title="Copy" className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                        Auto-generated — cannot be manually edited. KHealth and Careview share one sequence.
                      </p>
                    </div>
                  </div>
                  {/* QR */}
                  <div className="flex flex-col items-center">
                    <Label>QR Code</Label>
                    <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3 flex flex-col items-center">
                      <QRCodeDisplay deviceCode={previewCode} size={120} showDownload={false} showLabel={false} />
                      <button onClick={() => window.print()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0b5c96] dark:text-blue-400 hover:underline">
                        <Printer className="w-3.5 h-3.5" /> Print QR
                      </button>
                      <p className="text-[11px] text-gray-400 mt-0.5">Generated on save</p>
                    </div>
                  </div>
                </div>

                <TextField label="Furniture Name" required value={name} onChange={setName} placeholder="e.g. Ergonomic Office Chair" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Furniture Category</Label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <TextField label="Furniture Type" value={type} onChange={setType} placeholder="e.g. High-back, mesh" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Brand" value={brand} onChange={setBrand} />
                  <TextField label="Model" value={model} onChange={setModel} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={inputCls} />
                    <p className="text-xs text-gray-400 mt-1">If applicable</p>
                  </div>
                  <div>
                    <Label required>Status</Label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)} className={inputCls}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <Label required>Description</Label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Material" value={material} onChange={setMaterial} placeholder="e.g. Steel, Wood" />
                  <TextField label="Color" value={color} onChange={setColor} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Dimensions</Label>
                    <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 120 × 60 × 75 cm" className={inputCls} />
                    <p className="text-xs text-gray-400 mt-1">W × D × H</p>
                  </div>
                  <div>
                    <Label required>Quantity</Label>
                    <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                      <option value="pc">pc</option><option value="set">set</option><option value="unit">unit</option><option value="box">box</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Purchase Details */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Purchase Date" required type="date" value={purchaseDate} onChange={setPurchaseDate} />
                  <TextField label="Supplier" value={supplier} onChange={setSupplier} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Purchase Order Number" value={poNumber} onChange={setPoNumber} />
                  <TextField label="Invoice / OR Number" value={invoiceNumber} onChange={setInvoiceNumber} />
                </div>
                <div>
                  <Label required>Acquisition Cost</Label>
                  <div className="flex gap-2">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} w-24`}>
                      <option value="₱">₱</option><option value="$">$</option>
                    </select>
                    <input type="number" min={0} step="0.01" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <Label>Warranty</Label>
                  <div className="inline-flex rounded-lg border border-gray-300 dark:border-[#1e3a5f] overflow-hidden">
                    {[true, false].map((v) => (
                      <button key={String(v)} onClick={() => setWarranty(v)}
                        className={`px-5 py-2 text-sm font-medium ${warranty === v ? 'bg-[#0b5c96] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>
                        {v ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Assignment & Location */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Assignment Details</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Leave blank if the furniture is not currently assigned.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Assigned To" value={assignedTo} onChange={setAssignedTo} />
                    <TextField label="Employee ID" value={employeeId} onChange={setEmployeeId} />
                    <TextField label="Department" value={department} onChange={setDepartment} />
                    <TextField label="Position" value={position} onChange={setPosition} />
                    <TextField label="Date Assigned" type="date" value={dateAssigned} onChange={setDateAssigned} />
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-[#1e3a5f] pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Location Details</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Where the furniture is physically located.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Site / Branch" required value={siteBranch} onChange={setSiteBranch} placeholder="e.g. Main Office" />
                    <TextField label="Building" value={building} onChange={setBuilding} />
                    <TextField label="Floor" value={floor} onChange={setFloor} placeholder="e.g. 3rd Floor" />
                    <TextField label="Room / Area" value={roomArea} onChange={setRoomArea} placeholder="e.g. Accounting Department" />
                  </div>
                  <div className="mt-4">
                    <TextField label="Specific Location" value={specificLocation} onChange={setSpecificLocation} placeholder="e.g. Beside window, Desk 14" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — Condition */}
            {step === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
                <div className="space-y-4">
                  <div>
                    <Label required>Current Condition</Label>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map((c) => (
                        <button key={c} onClick={() => setCondition(c)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            condition === c ? 'bg-[#0b5c96]/10 border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'
                          }`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Condition Remarks</Label>
                    <textarea value={conditionRemarks} onChange={(e) => setConditionRemarks(e.target.value)} rows={3} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Last Inspection Date" type="date" value={lastInspectionDate} onChange={setLastInspectionDate} />
                    <TextField label="Inspected By" value={inspectedBy} onChange={setInspectedBy} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
                  </div>
                </div>
                {/* Photo */}
                <div>
                  <Label>Current Asset Photo</Label>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <button onClick={() => photoInput.current?.click()} disabled={uploading}
                    className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-[#1e3a5f] rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#0b5c96] transition-colors">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-7 h-7" />}
                    <span className="text-xs mt-1">Upload photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 — Documents */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-xs">
                    <Label>Document Type</Label>
                    <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={inputCls}>
                      {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <input ref={docInput} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <button onClick={() => docInput.current?.click()} disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload File
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Asset Photo, Invoice, Official Receipt, Purchase Order, Warranty Document, or other supporting documents.
                </p>
                <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4 min-h-[140px]">
                  {attachments.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-10">No documents attached yet</p>
                  ) : (
                    <ul className="space-y-2">
                      {attachments.map((att, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 text-sm">
                          <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#0b5c96] dark:text-blue-400 hover:underline truncate">
                            <FileText className="w-4 h-4 shrink-0" /> <span className="truncate">{att.name}</span>
                          </a>
                          <button onClick={() => removeAttachment(idx)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f]">
          <span className="text-sm text-gray-500 dark:text-slate-400">Step {step + 1} of {STEPS.length}{currentUser ? '' : ''}</span>
          <div className="flex items-center gap-3">
            <button onClick={onBack ?? onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
              Cancel
            </button>
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg border border-[#0b5c96] text-sm font-medium text-[#0b5c96] hover:bg-[#0b5c96]/5">
                Next
              </button>
            )}
            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">
              {isEdit ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
