import { useMemo, useRef, useState } from 'react';
import { X, Copy, Check, Upload, Loader2, FileText, Trash2 } from 'lucide-react';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { assetServices } from '@/services/assetServices';
import type { ITAsset, Company, AssetStatus, AssetAttachment, VehicleDetails } from '@/types/inventory';

interface Props {
  asset?: ITAsset;
  assets: ITAsset[];
  onSave: (asset: ITAsset | Omit<ITAsset, 'id' | 'deviceCode'>, subscriptionData?: any) => void;
  onCancel: () => void;
  onBack?: () => void;
}

const STEPS = ['Basic Information', 'Registration', 'Insurance', 'Assignment', 'Purchase Details', 'Documents'];
const COMPANY_PREFIX: Record<string, string> = { KHEALTH: 'KH', CAREVIEW: 'CV', GLOWFIND: 'GF' };
const VEHICLE_STATUSES = ['Available', 'Assigned', 'Active', 'Under Maintenance', 'Under Repair', 'Inactive', 'For Disposal', 'Disposed'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

// Vehicle display status → core Asset status enum
const STATUS_MAP: Record<string, AssetStatus> = {
  Available: 'available', Assigned: 'active', Active: 'active',
  'Under Maintenance': 'in-maintenance', 'Under Repair': 'in-maintenance',
  Inactive: 'in-storage', 'For Disposal': 'in-storage', Disposed: 'disposed',
};

const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';

function TextField({ label, required, value, onChange, placeholder, type = 'text' }: {
  label: string; required?: boolean; value: any; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT} />
    </div>
  );
}

export function VehicleForm({ asset, assets, onSave, onCancel, onBack }: Props) {
  const isEdit = !!asset?._id;
  const v: VehicleDetails = asset?.vehicle ?? {};

  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docInput = useRef<HTMLInputElement>(null);

  // Basic
  const [company, setCompany] = useState<Company>(asset?.company ?? 'KHEALTH');
  const [vehicleType, setVehicleType] = useState<'Car' | 'Motorcycle'>(v.vehicleType ?? 'Car');
  const [plateNumber, setPlateNumber] = useState(v.plateNumber ?? '');
  const [brand, setBrand] = useState(asset?.brand ?? '');
  const [model, setModel] = useState(asset?.model ?? '');
  const [variant, setVariant] = useState(v.variant ?? '');
  const [yearModel, setYearModel] = useState(v.yearModel ?? '');
  const [color, setColor] = useState(v.color ?? '');
  const [vehicleStatus, setVehicleStatus] = useState(v.vehicleStatus ?? 'Available');
  const [mvFileNumber, setMvFileNumber] = useState(v.mvFileNumber ?? '');
  const [engineNumber, setEngineNumber] = useState(v.engineNumber ?? '');
  const [chassisNumber, setChassisNumber] = useState(v.chassisNumber ?? '');
  const [conductionSticker, setConductionSticker] = useState(v.conductionSticker ?? '');
  const [engineDisplacement, setEngineDisplacement] = useState(v.engineDisplacement ?? '');
  const [seatingCapacity, setSeatingCapacity] = useState(v.seatingCapacity ?? '');
  const [fuelType, setFuelType] = useState(v.fuelType ?? 'Gasoline');
  const [transmission, setTransmission] = useState(v.transmission ?? 'Automatic');
  const [bodyType, setBodyType] = useState(v.bodyType ?? '');
  const [condition, setCondition] = useState(v.condition ?? 'Excellent');

  // Registration
  const [orNumber, setOrNumber] = useState(v.orNumber ?? '');
  const [crNumber, setCrNumber] = useState(v.crNumber ?? '');
  const [registrationDate, setRegistrationDate] = useState(v.registrationDate ?? '');
  const [registrationExpiry, setRegistrationExpiry] = useState(v.registrationExpiry ?? '');
  const [ltoStatus, setLtoStatus] = useState(v.ltoStatus ?? 'Active');
  const [emissionTestDate, setEmissionTestDate] = useState(v.emissionTestDate ?? '');
  const [emissionExpiry, setEmissionExpiry] = useState(v.emissionExpiry ?? '');
  const [registrationRemarks, setRegistrationRemarks] = useState(v.registrationRemarks ?? '');

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState(v.insuranceProvider ?? '');
  const [policyNumber, setPolicyNumber] = useState(v.policyNumber ?? '');
  const [coverageType, setCoverageType] = useState(v.coverageType ?? 'Comprehensive');
  const [insuranceStart, setInsuranceStart] = useState(v.insuranceStart ?? '');
  const [insuranceExpiry, setInsuranceExpiry] = useState(v.insuranceExpiry ?? '');
  const [premiumCost, setPremiumCost] = useState<string>(v.premiumCost != null ? String(v.premiumCost) : '');
  const [insuranceStatus, setInsuranceStatus] = useState(v.insuranceStatus ?? 'Active');
  const [insuranceRemarks, setInsuranceRemarks] = useState(v.insuranceRemarks ?? '');

  // Assignment
  const [assignedTo, setAssignedTo] = useState(asset?.assignedTo ?? '');
  const [employeeId, setEmployeeId] = useState(asset?.employeeId ?? '');
  const [department, setDepartment] = useState(asset?.department ?? '');
  const [position, setPosition] = useState(asset?.position ?? '');
  const [branchCenter, setBranchCenter] = useState(v.branchCenter ?? '');
  const [assignmentDate, setAssignmentDate] = useState(v.assignmentDate ?? '');
  const [custodian, setCustodian] = useState(v.custodian ?? '');
  const [officeSite, setOfficeSite] = useState(v.officeSite ?? '');
  const [parkingLocation, setParkingLocation] = useState(v.parkingLocation ?? '');
  const [currentLocation, setCurrentLocation] = useState(v.currentLocation ?? '');

  // Purchase
  const [acquisitionDate, setAcquisitionDate] = useState(v.acquisitionDate ?? asset?.purchaseDate?.slice(0, 10) ?? '');
  const [purchasePrice, setPurchasePrice] = useState<string>(v.purchasePrice != null ? String(v.purchasePrice) : '');
  const [supplierDealer, setSupplierDealer] = useState(v.supplierDealer ?? '');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState(v.purchaseOrderNumber ?? '');
  const [invoiceOrNumber, setInvoiceOrNumber] = useState(v.invoiceOrNumber ?? '');
  const [ownershipType, setOwnershipType] = useState(v.ownershipType ?? 'Company Owned');
  const [financingCompany, setFinancingCompany] = useState(v.financingCompany ?? '');
  const [purchaseRemarks, setPurchaseRemarks] = useState(v.purchaseRemarks ?? '');

  const [attachments, setAttachments] = useState<AssetAttachment[]>(asset?.attachments ?? []);

  const previewCode = useMemo(() => {
    if (asset?.deviceCode) return asset.deviceCode;
    let maxN = 0;
    assets.forEach((a) => { const m = a.deviceCode?.match(/^[A-Z]{2}-VH-(\d+)$/); if (m) { const n = parseInt(m[1], 10); if (n > maxN) maxN = n; } });
    return `${COMPANY_PREFIX[company] ?? 'XX'}-VH-${(maxN + 1).toString().padStart(4, '0')}`;
  }, [assets, company, asset]);

  const copyCode = () => { navigator.clipboard?.writeText(previewCode); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true); setError(null);
    try { const up = await assetServices.uploadFiles(Array.from(files)); setAttachments((p) => [...p, ...up]); }
    catch (e: any) { setError(e?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const validate = (): { step: number; msg: string } | null => {
    if (!company) return { step: 0, msg: 'Company is required.' };
    if (!vehicleType) return { step: 0, msg: 'Vehicle Type is required.' };
    if (!plateNumber.trim()) return { step: 0, msg: 'Plate Number is required.' };
    if (!brand.trim()) return { step: 0, msg: 'Brand is required.' };
    if (!model.trim()) return { step: 0, msg: 'Model is required.' };
    return null;
  };

  const handleSave = () => {
    const bad = validate();
    if (bad) { setStep(bad.step); setError(bad.msg); return; }
    setError(null);

    const details: VehicleDetails = {
      vehicleType, plateNumber, variant, yearModel, color, vehicleStatus, mvFileNumber, engineNumber, chassisNumber,
      conductionSticker, engineDisplacement, seatingCapacity, fuelType, transmission, bodyType, condition,
      orNumber, crNumber, registrationDate, registrationExpiry, ltoStatus, emissionTestDate, emissionExpiry, registrationRemarks,
      insuranceProvider, policyNumber, coverageType, insuranceStart, insuranceExpiry,
      premiumCost: premiumCost === '' ? undefined : Number(premiumCost), insuranceStatus, insuranceRemarks,
      branchCenter, assignmentDate, custodian, officeSite, parkingLocation, currentLocation,
      acquisitionDate, purchasePrice: purchasePrice === '' ? undefined : Number(purchasePrice),
      supplierDealer, purchaseOrderNumber, invoiceOrNumber, ownershipType, financingCompany, purchaseRemarks,
    };
    const location = branchCenter || officeSite || currentLocation || 'N/A';
    const payload: any = {
      ...(isEdit ? { _id: asset!._id, deviceCode: asset!.deviceCode } : {}),
      name: `${brand} ${model}`.trim(),
      category: vehicleType,
      company, brand, model,
      status: STATUS_MAP[vehicleStatus] ?? 'available',
      location,
      purchaseDate: acquisitionDate || new Date().toISOString().slice(0, 10),
      assignedTo, employeeId, department, position,
      attachments,
      vehicle: details,
      assetType: 'Vehicle',
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Fields marked in the workflow are saved to the permanent vehicle record. Asset code and QR code are generated automatically.</p>
          </div>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-52 shrink-0 border-r border-gray-100 dark:border-[#1e3a5f] p-4 space-y-1 overflow-y-auto">
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
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_180px] gap-4">
                  <div><Label required>Company</Label>
                    <select value={company} onChange={(e) => setCompany(e.target.value as Company)} className={INPUT}><option value="KHEALTH">KHealth</option><option value="CAREVIEW">Careview</option></select>
                  </div>
                  <div><Label required>Vehicle Type</Label>
                    <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as any)} className={INPUT}><option>Car</option><option>Motorcycle</option></select>
                  </div>
                  <div className="row-span-2 flex flex-col items-center">
                    <Label>QR Code</Label>
                    <QRCodeDisplay deviceCode={previewCode} size={96} showDownload={false} showLabel={false} />
                    <p className="text-[11px] text-gray-400 mt-1">Linked permanently on save</p>
                  </div>
                  <div className="lg:col-span-2"><Label required>Asset Code</Label>
                    <div className="flex gap-2">
                      <input value={previewCode} readOnly className={`${INPUT} font-mono bg-gray-50 dark:bg-[#0b1322] cursor-not-allowed`} />
                      <button onClick={copyCode} className="px-2.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TextField label="Plate Number" required value={plateNumber} onChange={setPlateNumber} />
                  <TextField label="Brand" required value={brand} onChange={setBrand} />
                  <div><Label>Vehicle Status</Label><select value={vehicleStatus} onChange={(e) => setVehicleStatus(e.target.value)} className={INPUT}>{VEHICLE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
                  <TextField label="Model" required value={model} onChange={setModel} />
                  <TextField label="Variant" value={variant} onChange={setVariant} />
                  <div />
                  <TextField label="Year Model" value={yearModel} onChange={setYearModel} />
                  <TextField label="Color" value={color} onChange={setColor} />
                  <div />
                  <TextField label="MV File Number" value={mvFileNumber} onChange={setMvFileNumber} />
                  <TextField label="Engine Number" value={engineNumber} onChange={setEngineNumber} />
                  <div />
                  <TextField label="Chassis Number" value={chassisNumber} onChange={setChassisNumber} />
                  <TextField label="Conduction Sticker" value={conductionSticker} onChange={setConductionSticker} />
                  <div />
                  <TextField label="Engine Displacement" value={engineDisplacement} onChange={setEngineDisplacement} />
                  <TextField label="Seating Capacity" value={seatingCapacity} onChange={setSeatingCapacity} />
                  <div />
                  <div><Label>Fuel Type</Label><select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className={INPUT}><option>Gasoline</option><option>Diesel</option><option>Electric</option><option>Hybrid</option></select></div>
                  <div><Label>Transmission</Label><select value={transmission} onChange={(e) => setTransmission(e.target.value)} className={INPUT}><option>Automatic</option><option>Manual</option><option>CVT</option></select></div>
                  <div />
                  <TextField label="Body Type" value={bodyType} onChange={setBodyType} />
                  <div><Label>Vehicle Condition</Label><select value={condition} onChange={(e) => setCondition(e.target.value)} className={INPUT}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
                </div>
              </div>
            )}

            {/* STEP 2 — Registration */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">Expiry dates power renewal alerts in the fleet dashboard.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField label="OR Number" value={orNumber} onChange={setOrNumber} />
                  <TextField label="CR Number" value={crNumber} onChange={setCrNumber} />
                  <TextField label="Registration Date" type="date" value={registrationDate} onChange={setRegistrationDate} />
                  <TextField label="Registration Expiry Date" type="date" value={registrationExpiry} onChange={setRegistrationExpiry} />
                  <div><Label>LTO Status</Label><select value={ltoStatus} onChange={(e) => setLtoStatus(e.target.value)} className={INPUT}><option>Active</option><option>Expired</option><option>Expiring Soon</option><option>Pending</option></select></div>
                  <TextField label="Emission Test Date" type="date" value={emissionTestDate} onChange={setEmissionTestDate} />
                  <TextField label="Emission Expiry Date" type="date" value={emissionExpiry} onChange={setEmissionExpiry} />
                  <TextField label="Registration Remarks" value={registrationRemarks} onChange={setRegistrationRemarks} />
                </div>
              </div>
            )}

            {/* STEP 3 — Insurance */}
            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Insurance Provider" value={insuranceProvider} onChange={setInsuranceProvider} />
                <TextField label="Policy Number" value={policyNumber} onChange={setPolicyNumber} />
                <div><Label>Coverage Type</Label><select value={coverageType} onChange={(e) => setCoverageType(e.target.value)} className={INPUT}><option>Comprehensive</option><option>TPL</option><option>Own Damage</option></select></div>
                <TextField label="Insurance Start Date" type="date" value={insuranceStart} onChange={setInsuranceStart} />
                <TextField label="Insurance Expiry Date" type="date" value={insuranceExpiry} onChange={setInsuranceExpiry} />
                <TextField label="Premium Cost" type="number" value={premiumCost} onChange={setPremiumCost} />
                <div><Label>Insurance Status</Label><select value={insuranceStatus} onChange={(e) => setInsuranceStatus(e.target.value)} className={INPUT}><option>Active</option><option>Expiring Soon</option><option>Expired</option><option>None</option></select></div>
                <TextField label="Remarks" value={insuranceRemarks} onChange={setInsuranceRemarks} />
              </div>
            )}

            {/* STEP 4 — Assignment */}
            {step === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Assigned Driver" value={assignedTo} onChange={setAssignedTo} />
                <TextField label="Employee ID" value={employeeId} onChange={setEmployeeId} />
                <TextField label="Department" value={department} onChange={setDepartment} />
                <TextField label="Position" value={position} onChange={setPosition} />
                <TextField label="Branch / Center" value={branchCenter} onChange={setBranchCenter} />
                <TextField label="Assignment Date" type="date" value={assignmentDate} onChange={setAssignmentDate} />
                <TextField label="Custodian" value={custodian} onChange={setCustodian} />
                <TextField label="Office / Site" value={officeSite} onChange={setOfficeSite} />
                <TextField label="Parking Location" value={parkingLocation} onChange={setParkingLocation} />
                <TextField label="Current Location" value={currentLocation} onChange={setCurrentLocation} />
              </div>
            )}

            {/* STEP 5 — Purchase */}
            {step === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="Acquisition Date" type="date" value={acquisitionDate} onChange={setAcquisitionDate} />
                <TextField label="Purchase Price" type="number" value={purchasePrice} onChange={setPurchasePrice} />
                <TextField label="Supplier / Dealer" value={supplierDealer} onChange={setSupplierDealer} />
                <TextField label="Purchase Order Number" value={purchaseOrderNumber} onChange={setPurchaseOrderNumber} />
                <TextField label="Invoice / Official Receipt Number" value={invoiceOrNumber} onChange={setInvoiceOrNumber} />
                <div><Label>Ownership Type</Label><select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} className={INPUT}><option>Company Owned</option><option>Financed</option><option>Leased</option></select></div>
                <TextField label="Financing Company" value={financingCompany} onChange={setFinancingCompany} />
                <TextField label="Remarks" value={purchaseRemarks} onChange={setPurchaseRemarks} />
              </div>
            )}

            {/* STEP 6 — Documents */}
            {step === 5 && (
              <div className="space-y-3">
                <input ref={docInput} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
                <button onClick={() => docInput.current?.click()} disabled={uploading} className="w-full border-2 border-dashed border-gray-300 dark:border-[#1e3a5f] rounded-xl py-4 text-sm text-gray-600 dark:text-slate-300 hover:border-[#0b5c96] flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload OR, CR, insurance, assignment, maintenance, fuel, incident, or vehicle photo
                </button>
                <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4 min-h-[140px]">
                  {attachments.length === 0 ? <p className="text-center text-sm text-gray-400 py-10">No supporting documents uploaded.</p> : (
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
            <button onClick={handleSave} className="px-5 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79]">{isEdit ? 'Update Vehicle' : 'Save Vehicle'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
