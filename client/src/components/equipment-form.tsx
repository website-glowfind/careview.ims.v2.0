import { useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Printer, Upload, Loader2, FileText, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { assetServices } from '@/services/assetServices';
import type { ITAsset, Company, AssetStatus, AssetAttachment } from '@/types/inventory';
import { EQUIPMENT_KINDS, EQUIPMENT_DOC_TYPES, RISK_CLASSES, RISK_LABEL, addMonthsIso, titleCase, type EquipmentKind } from '@/config/equipment';

interface Props {
  kind: EquipmentKind;
  asset?: ITAsset;
  assets: ITAsset[];
  categories: string[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onSave: (asset: any) => void;
  onCancel: () => void;
}

const STEPS = ['Basic Information', 'Purchase Details', 'Assignment & Location', 'Service & Calibration', 'Condition', 'Documents'];
const COMPANY_PREFIX: Record<string, string> = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
export const EQUIPMENT_STATUS: { value: string; core: AssetStatus }[] = [
  { value: 'Available', core: 'available' }, { value: 'Assigned', core: 'active' }, { value: 'In Use', core: 'active' },
  { value: 'Under Repair', core: 'in-maintenance' }, { value: 'For Disposal', core: 'in-storage' }, { value: 'Disposed', core: 'disposed' },
];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'] as const;
const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';

function TextField({ label, required, value, onChange, placeholder, hint, type = 'text' }: {
  label: string; required?: boolean; value: any; onChange: (v: string) => void; placeholder?: string; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT} />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{children} {required && <span className="text-red-500">*</span>}</label>;
}
function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 dark:border-[#1e3a5f] overflow-hidden">
      {[true, false].map((val) => <button key={String(val)} type="button" onClick={() => onChange(val)} className={`px-5 py-2 text-sm font-medium ${value === val ? 'bg-[#0b5c96] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{val ? 'Yes' : 'No'}</button>)}
    </div>
  );
}

export function EquipmentForm({ kind, asset, assets, categories, onAddCategory, onDeleteCategory, onSave, onCancel }: Props) {
  const cfg = EQUIPMENT_KINDS[kind];
  const isEdit = !!asset?._id;
  const eq: Record<string, any> = asset?.equipment ?? {};
  const cats = categories.length ? categories : cfg.categories;

  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  const [f, setF] = useState<Record<string, any>>(() => ({
    company: asset?.company ?? 'KHEALTH', name: asset?.name ?? '', category: asset?.category ?? cats[0] ?? '',
    equipmentType: eq.equipmentType ?? '', brand: asset?.brand ?? '', model: asset?.model ?? '', serialNumber: asset?.serialNumber ?? '',
    manufacturer: eq.manufacturer ?? '', specification: eq.specification ?? '', description: eq.description ?? asset?.specifications ?? '',
    quantity: eq.quantity ?? 1, unit: eq.unit ?? 'unit', statusLabel: eq.statusLabel ?? 'Available',
    regulatoryNo: eq.regulatoryNo ?? '', regulatoryExpiry: eq.regulatoryExpiry ?? '', riskClass: eq.riskClass ?? '',
    purchaseDate: asset?.purchaseDate?.slice(0, 10) ?? '', supplier: eq.supplier ?? '', poNumber: eq.poNumber ?? '', invoiceNumber: eq.invoiceNumber ?? '',
    currency: eq.currency ?? '₱', acquisitionCost: eq.acquisitionCost != null ? String(eq.acquisitionCost) : '',
    hasWarranty: eq.hasWarranty ?? false, warrantyExpiry: asset?.warrantyExpiry?.slice(0, 10) ?? '',
    assignedTo: asset?.assignedTo ?? '', employeeId: asset?.employeeId ?? '', department: asset?.department ?? '', position: asset?.position ?? '', dateAssigned: eq.dateAssigned ?? '',
    site: eq.site ?? '', building: eq.building ?? '', floor: eq.floor ?? '', room: eq.room ?? '', specificLocation: eq.specificLocation ?? '',
    serviceIntervalMonths: eq.serviceIntervalMonths ?? 0, lastServiceDate: eq.lastServiceDate ?? '', nextServiceDue: eq.nextServiceDue ?? '',
    calibrationRequired: eq.calibrationRequired ?? cfg.calibrationDefault, calibrationIntervalMonths: eq.calibrationIntervalMonths ?? (cfg.calibrationDefault ? 12 : 0),
    lastCalibrationDate: eq.lastCalibrationDate ?? '', nextCalibrationDue: eq.nextCalibrationDue ?? '',
    condition: asset?.condition ?? 'New', conditionRemarks: eq.conditionRemarks ?? '', lastInspectionDate: eq.lastInspectionDate ?? '', inspectedBy: eq.inspectedBy ?? '',
    notes: asset?.notes ?? '', documentType: eq.documentType ?? 'Invoice',
  }));
  const set = (k: string) => (v: any) => setF((p) => ({ ...p, [k]: v }));
  const [attachments, setAttachments] = useState<AssetAttachment[]>(asset?.attachments ?? []);

  const previewCode = useMemo(() => {
    if (asset?.deviceCode) return asset.deviceCode;
    const re = new RegExp(`^[A-Z]{2}-${cfg.codeSegment}-(\\d+)$`);
    let maxN = 0;
    assets.forEach((a) => { const m = a.deviceCode?.match(re); if (m) maxN = Math.max(maxN, parseInt(m[1], 10)); });
    return `${COMPANY_PREFIX[f.company] ?? 'XX'}-${cfg.codeSegment}-${String(maxN + 1).padStart(4, '0')}`;
  }, [assets, f.company, asset, cfg.codeSegment]);

  const copyCode = () => { navigator.clipboard?.writeText(previewCode); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setError(null);
    try { const up = await assetServices.uploadFiles(Array.from(files)); setAttachments((p) => [...p, ...up]); }
    catch (e: any) { setError(e?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };
  const addCategoryPrompt = () => {
    const n = window.prompt(`New ${cfg.label} category name:`);
    if (n && n.trim()) { onAddCategory(n.trim()); set('category')(n.trim().toLowerCase()); }
  };
  const deleteCategoryPrompt = () => {
    if (!f.category) return;
    if (window.confirm(`Delete category "${titleCase(f.category)}"?`)) { onDeleteCategory(f.category); set('category')(cats.find((c) => c !== f.category) ?? ''); }
  };

  // Next due = last date + interval, unless the user typed a date
  const nextService = f.nextServiceDue || addMonthsIso(f.lastServiceDate, Number(f.serviceIntervalMonths) || 0);
  const nextCalibration = f.nextCalibrationDue || addMonthsIso(f.lastCalibrationDate, Number(f.calibrationIntervalMonths) || 0);

  const validate = (): { step: number; msg: string } | null => {
    if (!f.name.trim()) return { step: 0, msg: 'Equipment Name is required.' };
    if (!f.category) return { step: 0, msg: 'Category is required.' };
    if (!f.description.trim()) return { step: 0, msg: 'Description is required.' };
    if (!f.quantity || Number(f.quantity) < 1) return { step: 0, msg: 'Quantity must be at least 1.' };
    if (!f.purchaseDate) return { step: 1, msg: 'Purchase Date is required.' };
    if (f.acquisitionCost === '' || isNaN(Number(f.acquisitionCost))) return { step: 1, msg: 'Acquisition Cost is required.' };
    if (f.hasWarranty && !f.warrantyExpiry) return { step: 1, msg: 'Warranty Expiry Date is required when there is a warranty.' };
    if (!f.site.trim()) return { step: 2, msg: 'Site / Branch is required.' };
    if (f.calibrationRequired && !(Number(f.calibrationIntervalMonths) > 0)) return { step: 3, msg: 'Calibration Interval is required when calibration is required.' };
    if (!f.condition) return { step: 4, msg: 'Current Condition is required.' };
    return null;
  };

  const handleSave = () => {
    const bad = validate();
    if (bad) { setStep(bad.step); setError(bad.msg); return; }
    setError(null);
    const location = [f.room, f.floor, f.building, f.site].map((s: string) => (s || '').trim()).filter(Boolean).join(' · ') || f.specificLocation || f.site || 'N/A';
    const core = EQUIPMENT_STATUS.find((s) => s.value === f.statusLabel)?.core ?? 'available';
    const details = {
      ...eq, // keep histories (maintenance, calibration, transfers, disposal…)
      equipmentType: f.equipmentType, manufacturer: f.manufacturer, specification: f.specification, description: f.description,
      quantity: Number(f.quantity), unit: f.unit, statusLabel: f.statusLabel,
      regulatoryNo: f.regulatoryNo, regulatoryExpiry: f.regulatoryExpiry, riskClass: f.riskClass,
      supplier: f.supplier, poNumber: f.poNumber, invoiceNumber: f.invoiceNumber, currency: f.currency,
      acquisitionCost: f.acquisitionCost === '' ? undefined : Number(f.acquisitionCost), hasWarranty: f.hasWarranty,
      dateAssigned: f.dateAssigned, site: f.site, building: f.building, floor: f.floor, room: f.room, specificLocation: f.specificLocation,
      serviceIntervalMonths: Number(f.serviceIntervalMonths) || 0, lastServiceDate: f.lastServiceDate, nextServiceDue: nextService,
      calibrationRequired: f.calibrationRequired, calibrationIntervalMonths: f.calibrationRequired ? Number(f.calibrationIntervalMonths) || 0 : 0,
      lastCalibrationDate: f.calibrationRequired ? f.lastCalibrationDate : '', nextCalibrationDue: f.calibrationRequired ? nextCalibration : '',
      conditionRemarks: f.conditionRemarks, lastInspectionDate: f.lastInspectionDate, inspectedBy: f.inspectedBy, documentType: f.documentType,
    };
    onSave({
      ...(isEdit ? { _id: asset!._id, deviceCode: asset!.deviceCode } : {}),
      name: f.name.trim(), category: f.category, company: f.company as Company, brand: f.brand, model: f.model, serialNumber: f.serialNumber,
      specifications: f.description, status: core, condition: f.condition,
      assignedTo: f.assignedTo, employeeId: f.employeeId, department: f.department, position: f.position,
      purchaseDate: f.purchaseDate, warrantyExpiry: f.hasWarranty ? f.warrantyExpiry : undefined,
      location, notes: f.notes, attachments, equipment: details, assetType: cfg.assetType,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-4xl shadow-xl max-h-[94vh] flex flex-col">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? `Edit ${asset!.name}` : cfg.addLabel}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Fields marked <span className="text-red-500">*</span> are required. The asset code and QR code are generated automatically.</p>
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

            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-6">
                  <div className="space-y-4">
                    <div><Label required>Company</Label>
                      <select value={f.company} onChange={(e) => set('company')(e.target.value)} disabled={isEdit} className={INPUT}><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option></select>
                    </div>
                    <div><Label required>Asset Code</Label>
                      <div className="flex gap-2">
                        <input value={previewCode} readOnly className={`${INPUT} font-mono bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} />
                        <button type="button" onClick={copyCode} className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{isEdit ? 'Permanent asset code — cannot be changed.' : 'Auto-generated — KHealth and Careview share one sequence.'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <Label>QR Code</Label>
                    <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3 flex flex-col items-center">
                      <QRCodeDisplay deviceCode={previewCode} size={110} showDownload={false} showLabel={false} />
                      <button type="button" onClick={() => window.print()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0b5c96] dark:text-blue-400 hover:underline"><Printer className="w-3.5 h-3.5" /> Print QR</button>
                    </div>
                  </div>
                </div>

                <TextField label="Equipment Name" required value={f.name} onChange={set('name')} placeholder={cfg.namePlaceholder} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Category</Label>
                    <div className="flex gap-2">
                      <select value={f.category} onChange={(e) => set('category')(e.target.value)} className={`${INPUT} capitalize`}>{cats.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select>
                      <button type="button" onClick={addCategoryPrompt} title="Add category" className="px-2.5 rounded-lg bg-[#0b5c96]/10 text-[#0b5c96] hover:bg-[#0b5c96]/20"><Plus className="w-4 h-4" /></button>
                      <button type="button" onClick={deleteCategoryPrompt} title="Delete category" className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <TextField label="Equipment Type" value={f.equipmentType} onChange={set('equipmentType')} placeholder="e.g. Benchtop, portable" />
                  <TextField label="Brand" value={f.brand} onChange={set('brand')} />
                  <TextField label="Model" value={f.model} onChange={set('model')} />
                  <TextField label="Serial Number" value={f.serialNumber} onChange={set('serialNumber')} />
                  <TextField label="Manufacturer" value={f.manufacturer} onChange={set('manufacturer')} />
                </div>
                <TextField label="Specification" value={f.specification} onChange={set('specification')} placeholder="e.g. 5 kVA, 220V" hint="Capacity, power rating, or key specs" />

                {cfg.medical && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-[#0f1729] border border-gray-100 dark:border-[#1e3a5f]">
                    <TextField label="Regulatory Registration No." value={f.regulatoryNo} onChange={set('regulatoryNo')} hint="FDA / CMDR license or equivalent" />
                    <TextField label="Registration Expiry" type="date" value={f.regulatoryExpiry} onChange={set('regulatoryExpiry')} />
                    <div><Label>Risk Classification</Label><select value={f.riskClass} onChange={(e) => set('riskClass')(e.target.value)} className={INPUT}>{RISK_CLASSES.map((r) => <option key={r} value={r}>{RISK_LABEL[r]}</option>)}</select></div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label required>Status</Label><select value={f.statusLabel} onChange={(e) => set('statusLabel')(e.target.value)} className={INPUT}>{EQUIPMENT_STATUS.map((s) => <option key={s.value}>{s.value}</option>)}</select></div>
                  <div><Label required>Quantity</Label><input type="number" min={1} value={f.quantity} onChange={(e) => set('quantity')(e.target.value)} className={INPUT} /></div>
                  <div><Label>Unit</Label><select value={f.unit} onChange={(e) => set('unit')(e.target.value)} className={INPUT}><option value="unit">unit</option><option value="pc">pc</option><option value="set">set</option></select></div>
                </div>
                <div><Label required>Description</Label><textarea value={f.description} onChange={(e) => set('description')(e.target.value)} rows={3} className={INPUT} /></div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Purchase Date" required type="date" value={f.purchaseDate} onChange={set('purchaseDate')} />
                  <TextField label="Supplier" value={f.supplier} onChange={set('supplier')} />
                  <TextField label="Purchase Order Number" value={f.poNumber} onChange={set('poNumber')} />
                  <TextField label="Invoice / OR Number" value={f.invoiceNumber} onChange={set('invoiceNumber')} />
                </div>
                <div><Label required>Acquisition Cost</Label>
                  <div className="flex gap-2">
                    <select value={f.currency} onChange={(e) => set('currency')(e.target.value)} className={`${INPUT} w-24`}><option value="₱">₱</option><option value="$">$</option></select>
                    <input type="number" min={0} step="0.01" value={f.acquisitionCost} onChange={(e) => set('acquisitionCost')(e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-6">
                  <div><Label>Warranty</Label><YesNo value={f.hasWarranty} onChange={set('hasWarranty')} /></div>
                  {f.hasWarranty && <div className="w-56"><TextField label="Warranty Expiry Date" required type="date" value={f.warrantyExpiry} onChange={set('warrantyExpiry')} /></div>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Assignment Details</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Leave blank if the equipment is not currently assigned.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Assigned To" value={f.assignedTo} onChange={set('assignedTo')} />
                    <TextField label="Employee ID" value={f.employeeId} onChange={set('employeeId')} />
                    <TextField label="Department" value={f.department} onChange={set('department')} />
                    <TextField label="Position" value={f.position} onChange={set('position')} />
                    <TextField label="Date Assigned" type="date" value={f.dateAssigned} onChange={set('dateAssigned')} />
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-[#1e3a5f] pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Location Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Site / Branch" required value={f.site} onChange={set('site')} placeholder="e.g. Main Office" />
                    <TextField label="Building" value={f.building} onChange={set('building')} />
                    <TextField label="Floor" value={f.floor} onChange={set('floor')} placeholder="e.g. 2nd Floor" />
                    <TextField label="Room / Area" value={f.room} onChange={set('room')} />
                  </div>
                  <div className="mt-4"><TextField label="Specific Location" value={f.specificLocation} onChange={set('specificLocation')} /></div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Preventive Maintenance</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Next Service Due defaults to the last service date plus the interval.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextField label="Service Interval (months)" type="number" value={f.serviceIntervalMonths || ''} onChange={set('serviceIntervalMonths')} />
                    <TextField label="Last Service Date" type="date" value={f.lastServiceDate} onChange={set('lastServiceDate')} />
                    <TextField label="Next Service Due" type="date" value={nextService} onChange={set('nextServiceDue')} />
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-[#1e3a5f] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Calibration</h3>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"><input type="checkbox" checked={f.calibrationRequired} onChange={(e) => set('calibrationRequired')(e.target.checked)} className="w-4 h-4 accent-[#0b5c96]" /> Calibration required</label>
                  </div>
                  {f.calibrationRequired ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <TextField label="Calibration Interval (months)" required type="number" value={f.calibrationIntervalMonths || ''} onChange={set('calibrationIntervalMonths')} />
                      <TextField label="Last Calibration Date" type="date" value={f.lastCalibrationDate} onChange={set('lastCalibrationDate')} />
                      <TextField label="Next Calibration Due" type="date" value={nextCalibration} onChange={set('nextCalibrationDue')} />
                    </div>
                  ) : <p className="text-sm text-gray-400">This equipment does not need calibration.</p>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
                <div className="space-y-4">
                  <div><Label required>Current Condition</Label>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map((c) => <button key={c} type="button" onClick={() => set('condition')(c)} className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${f.condition === c ? 'bg-[#0b5c96]/10 border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{c}</button>)}
                    </div>
                  </div>
                  <div><Label>Condition Remarks</Label><textarea value={f.conditionRemarks} onChange={(e) => set('conditionRemarks')(e.target.value)} rows={3} className={INPUT} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Last Inspection Date" type="date" value={f.lastInspectionDate} onChange={set('lastInspectionDate')} />
                    <TextField label="Inspected By" value={f.inspectedBy} onChange={set('inspectedBy')} />
                  </div>
                  <div><Label>Notes</Label><textarea value={f.notes} onChange={(e) => set('notes')(e.target.value)} rows={2} className={INPUT} /></div>
                </div>
                <div>
                  <Label>Current Photo</Label>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <button type="button" onClick={() => photoInput.current?.click()} disabled={uploading} className="w-full aspect-square border-2 border-dashed border-gray-300 dark:border-[#1e3a5f] rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#0b5c96]">
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-7 h-7" />}<span className="text-xs mt-1">Upload photo</span>
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 max-w-xs"><Label>Document Type</Label><select value={f.documentType} onChange={(e) => set('documentType')(e.target.value)} className={INPUT}>{EQUIPMENT_DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select></div>
                  <input ref={docInput} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                  <button type="button" onClick={() => docInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload File</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Photos, invoices, calibration certificates, service reports, manuals, or regulatory licenses.</p>
                <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4 min-h-[140px]">
                  {attachments.length === 0 ? <p className="text-center text-sm text-gray-400 py-10">No documents attached yet</p> : (
                    <ul className="space-y-2">
                      {attachments.map((att, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 text-sm">
                          <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#0b5c96] dark:text-blue-400 hover:underline truncate"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">{att.name}</span></a>
                          <button type="button" onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
            <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
            {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Back</button>}
            {step < STEPS.length - 1 && <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg border border-[#0b5c96] text-sm font-medium text-[#0b5c96] hover:bg-[#0b5c96]/5">Next</button>}
            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">{isEdit ? 'Update Equipment' : 'Save Equipment'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
