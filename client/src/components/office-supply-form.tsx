import { useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Printer, Upload, Loader2, FileText, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { assetServices } from '@/services/assetServices';
import type { ITAsset, Company, AssetStatus, AssetAttachment, OfficeSupplyDetails } from '@/types/inventory';

interface Props {
  asset?: ITAsset;
  assets: ITAsset[];
  categories: string[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onSave: (asset: ITAsset | Omit<ITAsset, 'id' | 'deviceCode'>) => void;
  onCancel: () => void;
  onBack?: () => void;
}

const STEPS = ['Item Details', 'Purchase Details', 'Location / Assignment', 'Condition / Stock', 'Documents'];
const COMPANY_PREFIX: Record<string, string> = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
const STATUS_OPTIONS: { value: string; core: AssetStatus }[] = [
  { value: 'Available', core: 'available' }, { value: 'Assigned', core: 'active' }, { value: 'In Use', core: 'active' },
  { value: 'Under Repair', core: 'in-maintenance' }, { value: 'For Disposal', core: 'in-storage' }, { value: 'Disposed', core: 'disposed' },
];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'] as const;
const DOC_TYPES = ['Asset Photo', 'Purchase Order', 'Invoice / OR', 'Warranty', 'Other'];
const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());

const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';

function TextField({ label, required, value, onChange, placeholder, hint, type = 'text' }: {
  label: string; required?: boolean; value: any; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT} />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function OfficeSupplyForm({ asset, assets, categories, onAddCategory, onDeleteCategory, onSave, onCancel, onBack }: Props) {
  const isEdit = !!asset?._id;
  const os: OfficeSupplyDetails = asset?.officeSupply ?? {};
  const cats = categories.length ? categories : ['other'];

  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  // Item Details
  const [company, setCompany] = useState<Company>(asset?.company ?? 'KHEALTH');
  const [name, setName] = useState(asset?.name ?? '');
  const [category, setCategory] = useState(asset?.category ?? (cats[0] || ''));
  const [itemType, setItemType] = useState<'reusable' | 'consumable'>(os.itemType ?? 'reusable');
  const [brand, setBrand] = useState(asset?.brand ?? '');
  const [model, setModel] = useState(asset?.model ?? '');
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? '');
  const [description, setDescription] = useState(os.description ?? asset?.specifications ?? '');

  // Purchase
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate?.slice(0, 10) ?? '');
  const [supplier, setSupplier] = useState(os.supplier ?? '');
  const [poNumber, setPoNumber] = useState(os.poNumber ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(os.invoiceNumber ?? '');
  const [currency, setCurrency] = useState(os.currency ?? '₱');
  const [unitCost, setUnitCost] = useState<string>(os.unitCost != null ? String(os.unitCost) : '');
  const [quantity, setQuantity] = useState<number>(os.quantity ?? 1);
  const [warranty, setWarranty] = useState<boolean>(os.warranty ?? false);

  // Location / Assignment
  const [centerBranch, setCenterBranch] = useState(os.centerBranch ?? '');
  const [department, setDepartment] = useState(asset?.department ?? '');
  const [locationRoom, setLocationRoom] = useState(os.locationRoom ?? '');
  const [assignedTo, setAssignedTo] = useState(asset?.assignedTo ?? '');
  const [custodian, setCustodian] = useState(os.custodian ?? '');

  // Condition / Stock
  const [condition, setCondition] = useState<string>(asset?.condition ?? 'Good');
  const [statusLabel, setStatusLabel] = useState(os.statusLabel ?? 'Available');
  const [currentStock, setCurrentStock] = useState<string>(os.currentStock != null ? String(os.currentStock) : '');
  const [minStock, setMinStock] = useState<string>(os.minStock != null ? String(os.minStock) : '');
  const [conditionRemarks, setConditionRemarks] = useState(os.conditionRemarks ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');

  // Documents
  const [documentType, setDocumentType] = useState(os.documentType ?? 'Invoice / OR');
  const [attachments, setAttachments] = useState<AssetAttachment[]>(asset?.attachments ?? []);

  const totalCost = useMemo(() => {
    const u = Number(unitCost); const q = Number(quantity);
    return !isNaN(u) && !isNaN(q) ? u * q : 0;
  }, [unitCost, quantity]);

  const previewCode = useMemo(() => {
    if (asset?.deviceCode) return asset.deviceCode;
    let maxN = 0;
    assets.forEach((a) => { const m = a.deviceCode?.match(/^[A-Z]{2}-OS-(\d+)$/); if (m) { const n = parseInt(m[1], 10); if (n > maxN) maxN = n; } });
    return `${COMPANY_PREFIX[company] ?? 'XX'}-OS-${(maxN + 1).toString().padStart(4, '0')}`;
  }, [assets, company, asset]);

  const previewPurchaseNo = useMemo(() => {
    if (os.purchaseNumber) return os.purchaseNumber;
    const year = (purchaseDate ? new Date(purchaseDate) : new Date()).getFullYear();
    let maxN = 0;
    assets.forEach((a) => { const m = (a.officeSupply as any)?.purchaseNumber?.match(new RegExp(`^PUR-${year}-(\\d+)$`)); if (m) { const n = parseInt(m[1], 10); if (n > maxN) maxN = n; } });
    return `PUR-${year}-${(maxN + 1).toString().padStart(5, '0')}`;
  }, [assets, purchaseDate, os.purchaseNumber]);

  const copyCode = () => { navigator.clipboard?.writeText(previewCode); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setError(null);
    try { const up = await assetServices.uploadFiles(Array.from(files)); setAttachments((p) => [...p, ...up]); }
    catch (e: any) { setError(e?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const addCategoryPrompt = () => {
    const n = window.prompt('New office supply category name:');
    if (n && n.trim()) { onAddCategory(n.trim()); setCategory(n.trim().toLowerCase()); }
  };
  const deleteCategoryPrompt = () => {
    if (!category) return;
    if (window.confirm(`Delete category "${titleCase(category)}"?`)) { onDeleteCategory(category); setCategory(cats.find((c) => c !== category) ?? ''); }
  };

  const validate = (): { step: number; msg: string } | null => {
    if (!company) return { step: 0, msg: 'Company is required.' };
    if (!name.trim()) return { step: 0, msg: 'Item Name is required.' };
    if (!category) return { step: 0, msg: 'Category is required.' };
    if (!purchaseDate) return { step: 1, msg: 'Purchase Date is required.' };
    if (unitCost === '' || isNaN(Number(unitCost))) return { step: 1, msg: 'Unit Cost is required.' };
    if (!condition) return { step: 3, msg: 'Current Condition is required.' };
    if (itemType === 'consumable') {
      if (currentStock === '' || isNaN(Number(currentStock))) return { step: 3, msg: 'Current Stock is required for consumables.' };
      if (minStock === '' || isNaN(Number(minStock))) return { step: 3, msg: 'Minimum Stock is required for consumables.' };
    }
    return null;
  };

  const handleSave = () => {
    const bad = validate();
    if (bad) { setStep(bad.step); setError(bad.msg); return; }
    setError(null);

    const details: OfficeSupplyDetails = {
      itemType, description,
      purchaseNumber: previewPurchaseNo, supplier, poNumber, invoiceNumber,
      unitCost: unitCost === '' ? undefined : Number(unitCost), quantity, totalCost, currency, warranty,
      centerBranch, custodian, locationRoom,
      currentStock: itemType === 'consumable' && currentStock !== '' ? Number(currentStock) : undefined,
      minStock: itemType === 'consumable' && minStock !== '' ? Number(minStock) : undefined,
      conditionRemarks, documentType, statusLabel,
    };
    const location = [locationRoom, centerBranch].map((s) => (s || '').trim()).filter(Boolean).join(' · ') || '—';
    const core = STATUS_OPTIONS.find((s) => s.value === statusLabel)?.core ?? 'available';

    const payload: any = {
      ...(isEdit ? { _id: asset!._id, deviceCode: asset!.deviceCode } : {}),
      name: name.trim(), category, company, brand, model, serialNumber,
      specifications: description, status: core, condition,
      assignedTo, department,
      purchaseDate, location, notes, attachments,
      officeSupply: { ...(asset?.officeSupply ?? {}), ...details }, // keep stock log, maintenance, transfers, disposal
      assetType: 'OfficeSupply',
    };
    onSave(payload);
  };

  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{children} {required && <span className="text-red-500">*</span>}</label>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-4xl shadow-xl max-h-[94vh] flex flex-col">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Office Supply Item' : 'Add Office Supply Item'}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Fields marked <span className="text-red-500">*</span> are required. Item code and QR are auto-generated on save.</p>
          </div>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 shrink-0 border-r border-gray-100 dark:border-[#1e3a5f] p-4 space-y-1 overflow-y-auto">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => setStep(i)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${step === i ? 'bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${step === i ? 'bg-[#0b5c96] text-white' : 'bg-gray-200 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300'}`}>{i + 1}</span>
                {s}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 p-6 overflow-y-auto">
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-400">{error}</div>}

            {/* STEP 1 — Item Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-6">
                  <div className="space-y-4">
                    <div><Label>Company</Label>
                      <select value={company} onChange={(e) => setCompany(e.target.value as Company)} className={INPUT}><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option></select>
                      <p className="text-xs text-gray-400 mt-1">KHealth &amp; Careview share one sequential code series.</p>
                    </div>
                    <div><Label>Item Code</Label>
                      <div className="flex gap-2">
                        <input value={previewCode} readOnly className={`${INPUT} font-mono bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} />
                        <button onClick={copyCode} className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Auto-generated on save.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <Label>QR Code</Label>
                    <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3 flex flex-col items-center">
                      <QRCodeDisplay deviceCode={previewCode} size={110} showDownload={false} showLabel={false} />
                      <p className="text-[11px] text-gray-400">Generated on save</p>
                    </div>
                  </div>
                </div>

                <TextField label="Item Name" required value={name} onChange={setName} placeholder="e.g. HP 85A Toner Cartridge" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Category</Label>
                    <div className="flex gap-2">
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${INPUT} capitalize`}><option value="">Select category...</option>{cats.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select>
                      <button type="button" onClick={addCategoryPrompt} title="Add category" className="px-2.5 rounded-lg bg-[#0b5c96]/10 text-[#0b5c96] hover:bg-[#0b5c96]/20"><Plus className="w-4 h-4" /></button>
                      <button type="button" onClick={deleteCategoryPrompt} title="Delete category" className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <Label>Item Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setItemType('reusable')} className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${itemType === 'reusable' ? 'bg-[#0b5c96] text-white border-[#0b5c96]' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>Reusable</button>
                      <button type="button" onClick={() => setItemType('consumable')} className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${itemType === 'consumable' ? 'bg-[#0b5c96] text-white border-[#0b5c96]' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>Controlled Consumable</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{itemType === 'reusable' ? 'Equipment tracked individually with condition.' : 'Stock-tracked with current and minimum levels.'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Brand" value={brand} onChange={setBrand} placeholder="e.g. HP" />
                  <TextField label="Model" value={model} onChange={setModel} placeholder="e.g. CE285A" />
                </div>

                <TextField label="Serial Number" value={serialNumber} onChange={setSerialNumber} />
                <div><Label>Description</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief note about this item..." className={INPUT} /></div>
              </div>
            )}

            {/* STEP 2 — Purchase Details */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Purchase Number</Label><input value={previewPurchaseNo} readOnly className={`${INPUT} font-mono bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} /></div>
                  <TextField label="Purchase Date" required type="date" value={purchaseDate} onChange={setPurchaseDate} />
                  <TextField label="Supplier" value={supplier} onChange={setSupplier} placeholder="e.g. National Bookstore" />
                  <TextField label="Purchase Order No." value={poNumber} onChange={setPoNumber} />
                </div>
                <TextField label="Invoice / OR No." value={invoiceNumber} onChange={setInvoiceNumber} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label required>Unit Cost</Label>
                    <div className="flex gap-2">
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${INPUT} w-20`}><option value="₱">₱</option><option value="$">$</option></select>
                      <input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" className={INPUT} />
                    </div>
                  </div>
                  <div><Label>Quantity</Label><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={INPUT} /></div>
                </div>
                <div><Label>Total Cost</Label><input value={`${currency}${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className={`${INPUT} bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} /><p className="text-xs text-gray-400 mt-1">Auto-calculated · Unit Cost × Quantity</p></div>
                <div><Label>Warranty</Label>
                  <div className="inline-flex rounded-lg border border-gray-300 dark:border-[#1e3a5f] overflow-hidden">
                    {[false, true].map((val) => <button key={String(val)} onClick={() => setWarranty(val)} className={`px-5 py-2 text-sm font-medium ${warranty === val ? 'bg-[#0b5c96] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{val ? 'Yes' : 'No'}</button>)}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Location / Assignment */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Center / Branch" value={centerBranch} onChange={setCenterBranch} placeholder="e.g. Main Office" />
                  <TextField label="Department" value={department} onChange={setDepartment} placeholder="e.g. Finance" />
                </div>
                <TextField label="Location / Room" value={locationRoom} onChange={setLocationRoom} placeholder="e.g. Cabinet 3, Finance Dept" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Assigned To" value={assignedTo} onChange={setAssignedTo} />
                  <TextField label="Custodian" value={custodian} onChange={setCustodian} placeholder="Person responsible" />
                </div>
              </div>
            )}

            {/* STEP 4 — Condition / Stock */}
            {step === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
                <div className="space-y-4">
                  <div><Label required>Current Condition</Label>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map((c) => <button key={c} onClick={() => setCondition(c)} className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${condition === c ? 'bg-[#0b5c96]/10 border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{c}</button>)}
                    </div>
                  </div>
                  <div><Label>Status</Label><select value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} className={INPUT}>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}</select></div>
                  {itemType === 'consumable' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label required>Current Stock</Label><input type="number" min={0} value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} className={INPUT} /></div>
                      <div><Label required>Minimum Stock</Label><input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={INPUT} /><p className="text-xs text-gray-400 mt-1">Low-stock alert threshold</p></div>
                    </div>
                  )}
                  <div><Label>Condition Remarks</Label><textarea value={conditionRemarks} onChange={(e) => setConditionRemarks(e.target.value)} rows={2} className={INPUT} /></div>
                  <div><Label>Notes</Label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT} /></div>
                </div>
                <div>
                  <Label>Item Photo</Label>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <button onClick={() => photoInput.current?.click()} disabled={uploading} className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-[#1e3a5f] rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#0b5c96]">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-7 h-7" />}<span className="text-xs mt-1">Upload photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5 — Documents */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-xs"><Label>Document Type</Label><select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className={INPUT}>{DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select></div>
                  <input ref={docInput} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <button onClick={() => docInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload File</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Supports: images, PDF, Word, Excel</p>
                <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4 min-h-[140px]">
                  {attachments.length === 0 ? <p className="text-center text-sm text-gray-400 py-10">No documents attached yet</p> : (
                    <ul className="space-y-2">
                      {attachments.map((att, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 text-sm">
                          <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#0b5c96] dark:text-blue-400 hover:underline truncate"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">{att.name}</span></a>
                          <button onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f]">
          <span className="text-sm text-gray-500 dark:text-slate-400">Step {step + 1} of {STEPS.length}</span>
          <div className="flex items-center gap-3">
            <button onClick={onBack ?? onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
            {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Back</button>}
            {step < STEPS.length - 1 && <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg border border-[#0b5c96] text-sm font-medium text-[#0b5c96] hover:bg-[#0b5c96]/5">Next →</button>}
            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">{isEdit ? 'Update Item' : 'Save Item'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
