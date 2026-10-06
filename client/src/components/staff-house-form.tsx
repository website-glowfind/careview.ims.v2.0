import { useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Printer, Upload, Loader2, FileText, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { assetServices } from '@/services/assetServices';
import type { ITAsset, Company, AssetStatus, AssetAttachment, StaffHouseDetails } from '@/types/inventory';

interface Props {
  asset?: ITAsset;
  assets: ITAsset[];
  categories: string[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onSave: (asset: ITAsset | Omit<ITAsset, 'id' | 'deviceCode'>, subscriptionData?: any) => void;
  onCancel: () => void;
  onBack?: () => void;
}

const STEPS = ['Basic Information', 'Purchase Details', 'Assignment & Location', 'Condition', 'Documents'];
const COMPANY_PREFIX: Record<string, string> = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
const STATUS_OPTIONS: { value: string; core: AssetStatus }[] = [
  { value: 'Available', core: 'available' }, { value: 'Assigned', core: 'active' }, { value: 'In Use', core: 'active' },
  { value: 'Under Repair', core: 'in-maintenance' }, { value: 'For Disposal', core: 'in-storage' }, { value: 'Disposed', core: 'disposed' },
];
const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'] as const;
const OCCUPANCY = ['Vacant', 'Partially Occupied', 'Fully Occupied', 'Under Maintenance', 'Inactive'];
const DOC_TYPES = ['Asset Photo', 'Invoice', 'Official Receipt', 'Purchase Order', 'Warranty Document', 'Transfer Document', 'Maintenance Document', 'Disposal Document', 'Other'];

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

export function StaffHouseForm({ asset, assets, categories, onAddCategory, onDeleteCategory, onSave, onCancel, onBack }: Props) {
  const isEdit = !!asset?._id;
  const sh: StaffHouseDetails = asset?.staffHouse ?? {};
  const cats = categories.length ? categories : ['Bed', 'Other'];

  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  // Basic
  const [company, setCompany] = useState<Company>(asset?.company ?? 'KHEALTH');
  const [name, setName] = useState(asset?.name ?? '');
  const [category, setCategory] = useState(asset?.category ?? (cats[0] || ''));
  const [typeText, setTypeText] = useState(sh.assetType ?? '');
  const [brand, setBrand] = useState(asset?.brand ?? '');
  const [model, setModel] = useState(asset?.model ?? '');
  const [serialNumber, setSerialNumber] = useState(asset?.serialNumber ?? '');
  const [statusLabel, setStatusLabel] = useState('Available');
  const [description, setDescription] = useState(sh.description ?? asset?.specifications ?? '');
  const [material, setMaterial] = useState(sh.material ?? '');
  const [color, setColor] = useState(sh.color ?? '');
  const [dimensions, setDimensions] = useState(sh.dimensions ?? '');
  const [quantity, setQuantity] = useState<number>(sh.quantity ?? 1);
  const [unit, setUnit] = useState(sh.unit ?? 'pc');

  // Purchase
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchaseDate?.slice(0, 10) ?? '');
  const [supplier, setSupplier] = useState(sh.supplier ?? '');
  const [poNumber, setPoNumber] = useState(sh.poNumber ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState(sh.invoiceNumber ?? '');
  const [currency, setCurrency] = useState(sh.currency ?? '₱');
  const [acquisitionCost, setAcquisitionCost] = useState<string>(sh.acquisitionCost != null ? String(sh.acquisitionCost) : '');
  const [warranty, setWarranty] = useState<boolean>(sh.warranty ?? false);

  // Assignment
  const [assignedTo, setAssignedTo] = useState(asset?.assignedTo ?? '');
  const [employeeId, setEmployeeId] = useState(asset?.employeeId ?? '');
  const [department, setDepartment] = useState(asset?.department ?? '');
  const [position, setPosition] = useState(asset?.position ?? '');
  const [dateAssigned, setDateAssigned] = useState(sh.dateAssigned ?? '');
  const [assignedResident, setAssignedResident] = useState(sh.assignedResident ?? '');
  const [assignedRoom, setAssignedRoom] = useState(sh.assignedRoom ?? '');
  const [bedNumber, setBedNumber] = useState(sh.bedNumber ?? '');
  // Staff house location
  const [staffHouseName, setStaffHouseName] = useState(sh.staffHouseName ?? '');
  const [staffHouseCode, setStaffHouseCode] = useState(sh.staffHouseCode ?? '');
  const [completeLocation, setCompleteLocation] = useState(sh.completeLocation ?? '');
  const [building, setBuilding] = useState(sh.building ?? '');
  const [floor, setFloor] = useState(sh.floor ?? '');
  const [roomNumber, setRoomNumber] = useState(sh.roomNumber ?? '');
  const [roomName, setRoomName] = useState(sh.roomName ?? '');
  const [capacity, setCapacity] = useState(sh.capacity ?? '');
  const [occupancyStatus, setOccupancyStatus] = useState(sh.occupancyStatus ?? 'Vacant');
  const [specificArea, setSpecificArea] = useState(sh.specificArea ?? '');

  // Condition
  const [condition, setCondition] = useState<string>(asset?.condition ?? 'New');
  const [conditionRemarks, setConditionRemarks] = useState(sh.conditionRemarks ?? '');
  const [lastInspectionDate, setLastInspectionDate] = useState(sh.lastInspectionDate ?? '');
  const [inspectedBy, setInspectedBy] = useState(sh.inspectedBy ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');

  // Documents
  const [documentType, setDocumentType] = useState(sh.documentType ?? 'Invoice');
  const [attachments, setAttachments] = useState<AssetAttachment[]>(asset?.attachments ?? []);

  const previewCode = useMemo(() => {
    if (asset?.deviceCode) return asset.deviceCode;
    let maxN = 0;
    assets.forEach((a) => { const m = a.deviceCode?.match(/^[A-Z]{2}-SH-(\d+)$/); if (m) { const n = parseInt(m[1], 10); if (n > maxN) maxN = n; } });
    return `${COMPANY_PREFIX[company] ?? 'XX'}-SH-${(maxN + 1).toString().padStart(4, '0')}`;
  }, [assets, company, asset]);

  const copyCode = () => { navigator.clipboard?.writeText(previewCode); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setError(null);
    try { const up = await assetServices.uploadFiles(Array.from(files)); setAttachments((p) => [...p, ...up]); }
    catch (e: any) { setError(e?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const addCategoryPrompt = () => {
    const n = window.prompt('New Staff House category name:');
    if (n && n.trim()) { onAddCategory(n.trim()); setCategory(n.trim()); }
  };
  const deleteCategoryPrompt = () => {
    if (!category) return;
    if (window.confirm(`Delete category "${category}"?`)) { onDeleteCategory(category); setCategory(cats.find((c) => c !== category) ?? ''); }
  };

  const validate = (): { step: number; msg: string } | null => {
    if (!company) return { step: 0, msg: 'Company is required.' };
    if (!name.trim()) return { step: 0, msg: 'Asset Name is required.' };
    if (!category) return { step: 0, msg: 'Asset Category is required.' };
    if (!description.trim()) return { step: 0, msg: 'Description is required.' };
    if (!quantity || quantity < 1) return { step: 0, msg: 'Quantity must be at least 1.' };
    if (!purchaseDate) return { step: 1, msg: 'Purchase Date is required.' };
    if (acquisitionCost === '' || isNaN(Number(acquisitionCost))) return { step: 1, msg: 'Acquisition Cost is required.' };
    if (!staffHouseName.trim()) return { step: 2, msg: 'Staff House Name is required.' };
    if (!condition) return { step: 3, msg: 'Current Condition is required.' };
    return null;
  };

  const handleSave = () => {
    const bad = validate();
    if (bad) { setStep(bad.step); setError(bad.msg); return; }
    setError(null);

    const details: StaffHouseDetails = {
      assetType: typeText, description, material, color, dimensions, quantity, unit,
      supplier, poNumber, invoiceNumber, currency, acquisitionCost: acquisitionCost === '' ? undefined : Number(acquisitionCost), warranty,
      dateAssigned, assignedResident, assignedRoom, bedNumber,
      staffHouseName, staffHouseCode, completeLocation, building, floor, roomNumber, roomName, capacity, occupancyStatus, specificArea,
      conditionRemarks, lastInspectionDate, inspectedBy, documentType,
    };
    const locParts = [roomNumber ? `Room ${roomNumber}` : '', roomName, specificArea].map((s) => s.trim()).filter(Boolean);
    const location = locParts.join(' · ') || completeLocation || staffHouseName || 'N/A';
    const core = STATUS_OPTIONS.find((s) => s.value === statusLabel)?.core ?? 'available';

    const payload: any = {
      ...(isEdit ? { _id: asset!._id, deviceCode: asset!.deviceCode } : {}),
      name: name.trim(), category, company, brand, model, serialNumber,
      specifications: description, status: core, condition,
      assignedTo, employeeId, department, position,
      purchaseDate, location, notes, attachments,
      staffHouse: { ...details, statusLabel },
      assetType: 'StaffHouse',
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Staff House Asset' : 'Add Staff House Asset'}</h2>
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

            {/* STEP 1 — Basic */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-6">
                  <div className="space-y-4">
                    <div><Label required>Company</Label>
                      <select value={company} onChange={(e) => setCompany(e.target.value as Company)} className={INPUT}><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option></select>
                    </div>
                    <div><Label required>Asset Code</Label>
                      <div className="flex gap-2">
                        <input value={previewCode} readOnly className={`${INPUT} font-mono bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} />
                        <button onClick={copyCode} className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Auto-generated — cannot be manually edited. KHealth and Careview share one sequence.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <Label>QR Code</Label>
                    <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3 flex flex-col items-center">
                      <QRCodeDisplay deviceCode={previewCode} size={110} showDownload={false} showLabel={false} />
                      <button onClick={() => window.print()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0b5c96] dark:text-blue-400 hover:underline"><Printer className="w-3.5 h-3.5" /> Print QR</button>
                      <p className="text-[11px] text-gray-400">Generated on save</p>
                    </div>
                  </div>
                </div>

                <TextField label="Asset Name" required value={name} onChange={setName} placeholder="e.g. Double-Deck Bed Frame" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Asset Category</Label>
                    <div className="flex gap-2">
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                      <button onClick={addCategoryPrompt} title="Add category" className="px-2.5 rounded-lg bg-[#0b5c96]/10 text-[#0b5c96] hover:bg-[#0b5c96]/20"><Plus className="w-4 h-4" /></button>
                      <button onClick={deleteCategoryPrompt} title="Delete category" className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Add a custom category for other Staff House assets.</p>
                  </div>
                  <TextField label="Asset Type" value={typeText} onChange={setTypeText} placeholder="e.g. Split type inverter" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Brand" value={brand} onChange={setBrand} />
                  <TextField label="Model" value={model} onChange={setModel} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Serial Number</Label><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={INPUT} /><p className="text-xs text-gray-400 mt-1">If applicable</p></div>
                  <div><Label required>Status</Label><select value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} className={INPUT}>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}</select></div>
                </div>

                <div><Label required>Description</Label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={INPUT} /></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Material" value={material} onChange={setMaterial} placeholder="e.g. Steel, Wood" />
                  <TextField label="Color" value={color} onChange={setColor} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Dimensions</Label><input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g. 120 × 60 × 75 cm" className={INPUT} /><p className="text-xs text-gray-400 mt-1">W × D × H</p></div>
                  <div><Label required>Quantity</Label><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={INPUT} /></div>
                  <div><Label>Unit</Label><select value={unit} onChange={(e) => setUnit(e.target.value)} className={INPUT}><option value="pc">pc</option><option value="set">set</option><option value="unit">unit</option></select></div>
                </div>
              </div>
            )}

            {/* STEP 2 — Purchase */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="Purchase Date" required type="date" value={purchaseDate} onChange={setPurchaseDate} />
                  <TextField label="Supplier" value={supplier} onChange={setSupplier} />
                  <TextField label="Purchase Order Number" value={poNumber} onChange={setPoNumber} />
                  <TextField label="Invoice / OR Number" value={invoiceNumber} onChange={setInvoiceNumber} />
                </div>
                <div><Label required>Acquisition Cost</Label>
                  <div className="flex gap-2">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${INPUT} w-24`}><option value="₱">₱</option><option value="$">$</option></select>
                    <input type="number" min={0} step="0.01" value={acquisitionCost} onChange={(e) => setAcquisitionCost(e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div><Label>Warranty</Label>
                  <div className="inline-flex rounded-lg border border-gray-300 dark:border-[#1e3a5f] overflow-hidden">
                    {[true, false].map((val) => <button key={String(val)} onClick={() => setWarranty(val)} className={`px-5 py-2 text-sm font-medium ${warranty === val ? 'bg-[#0b5c96] text-white' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{val ? 'Yes' : 'No'}</button>)}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Assignment & Location */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Assignment Details</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Leave blank if the asset is not currently assigned.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Assigned To" value={assignedTo} onChange={setAssignedTo} />
                    <TextField label="Employee ID" value={employeeId} onChange={setEmployeeId} />
                    <TextField label="Department" value={department} onChange={setDepartment} />
                    <TextField label="Position" value={position} onChange={setPosition} />
                    <TextField label="Date Assigned" type="date" value={dateAssigned} onChange={setDateAssigned} />
                    <TextField label="Assigned Resident" value={assignedResident} onChange={setAssignedResident} hint="Staff House occupant using this asset" />
                    <TextField label="Assigned Room" value={assignedRoom} onChange={setAssignedRoom} placeholder="e.g. 201" hint="Room Number below" />
                    <TextField label="Bed Number" value={bedNumber} onChange={setBedNumber} placeholder="e.g. Bed A" hint="If applicable" />
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-[#1e3a5f] pt-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Staff House Information</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">Where the asset is physically located.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Staff House Name" required value={staffHouseName} onChange={setStaffHouseName} placeholder="e.g. Makati Staff House" />
                    <TextField label="Staff House Code" value={staffHouseCode} onChange={setStaffHouseCode} placeholder="e.g. SH-MKT" />
                  </div>
                  <div className="mt-4"><TextField label="Complete Location" value={completeLocation} onChange={setCompleteLocation} placeholder="Street, barangay, city" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <TextField label="Building" value={building} onChange={setBuilding} />
                    <TextField label="Floor" value={floor} onChange={setFloor} placeholder="e.g. 2nd Floor" />
                    <TextField label="Room Number" value={roomNumber} onChange={setRoomNumber} placeholder="e.g. 201" />
                    <TextField label="Room Name" value={roomName} onChange={setRoomName} placeholder="e.g. Bedroom 1" />
                    <TextField label="Capacity" value={capacity} onChange={setCapacity} hint="Number of occupants" />
                    <div><Label>Occupancy Status</Label><select value={occupancyStatus} onChange={(e) => setOccupancyStatus(e.target.value)} className={INPUT}>{OCCUPANCY.map((o) => <option key={o}>{o}</option>)}</select></div>
                  </div>
                  <div className="mt-4"><TextField label="Specific Area" value={specificArea} onChange={setSpecificArea} placeholder="e.g. Bedroom 1, Kitchen, Laundry Area" /></div>
                </div>
              </div>
            )}

            {/* STEP 4 — Condition */}
            {step === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6">
                <div className="space-y-4">
                  <div><Label required>Current Condition</Label>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map((c) => <button key={c} onClick={() => setCondition(c)} className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${condition === c ? 'bg-[#0b5c96]/10 border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>{c}</button>)}
                    </div>
                  </div>
                  <div><Label>Condition Remarks</Label><textarea value={conditionRemarks} onChange={(e) => setConditionRemarks(e.target.value)} rows={3} className={INPUT} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Last Inspection Date" type="date" value={lastInspectionDate} onChange={setLastInspectionDate} />
                    <TextField label="Inspected By" value={inspectedBy} onChange={setInspectedBy} />
                  </div>
                  <div><Label>Notes</Label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={INPUT} /></div>
                </div>
                <div>
                  <Label>Current Asset Photo</Label>
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
                <p className="text-xs text-gray-500 dark:text-slate-400">Asset Photo, Invoice, Official Receipt, Purchase Order, Warranty Document, or other supporting documents.</p>
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
            {step < STEPS.length - 1 && <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-lg border border-[#0b5c96] text-sm font-medium text-[#0b5c96] hover:bg-[#0b5c96]/5">Next</button>}
            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">{isEdit ? 'Update Asset' : 'Save Asset'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
