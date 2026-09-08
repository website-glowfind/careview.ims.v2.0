import { useState, useEffect, useRef } from 'react';
import { X, Hash, Users, Package, FileText, ArrowLeft, FileSignature, Smartphone, CheckCircle } from 'lucide-react';
import type { ITAsset, AssetStatus, AssetCategory, Company, FormRecord, AssetType } from '@/types/inventory';
import { generateDeviceCode } from '@/utils/device-code';
import { CategorySelector } from '@/components/category-selector';
import { IssuanceAgreement } from '@/components/issuance-agreement';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { employeeServices } from '@/services/employeeServices';

interface AssetFormProps {
  asset?: ITAsset;
  assets: ITAsset[];
  categories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  defaultCategories: string[];
  onSave: (asset: Omit<ITAsset, 'id' | 'deviceCode'> | ITAsset, subscriptionData?: any) => void;
  onCancel: () => void;
  onBack?: () => void;
  currentUser: string;
  onSaveFormRecord: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  assetType?: AssetType;
}

export function AssetForm({ asset, assets, categories, onAddCategory, onDeleteCategory, defaultCategories, onSave, onCancel, onBack, currentUser, onSaveFormRecord, assetType = 'IT' }: AssetFormProps) {
  const isGeneral = assetType === 'General';
  const [formData, setFormData] = useState<Omit<ITAsset, 'id' | 'deviceCode'>>(({
    _id: '',
    name: '',
    category: (categories[0] as AssetCategory) ?? 'laptop',
    company: 'KHEALTH',
    companyId: '',
    brand: '',
    model: '',
    serialNumber: '',
    specifications: '',
    status: 'active',
    assignedTo: '',
    position: '',
    department: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyExpiry: '',
    location: '',
    notes: '',
  }));

  const [previewCode, setPreviewCode] = useState<string>('');
  const [showAgreement, setShowAgreement] = useState(false);
  const [serialError, setSerialError] = useState<string>('');
  const [empLookupStatus, setEmpLookupStatus] = useState<'idle' | 'found' | 'not-found'>('idle');
  const [empLookupLoading, setEmpLookupLoading] = useState(false);
  const [showEmpNotFound, setShowEmpNotFound] = useState(false);
  // Name autocomplete
  const [nameSuggestions, setNameSuggestions] = useState<{ _id?: string; fullName: string; employeeId: string; position: string; department: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Subscription form data for phone category
  const [subscriptionData, setSubscriptionData] = useState({
    provider: '',
    planType: '',
    accountNumber: '',
    cost: '',
    currency: '$' as '$' | '₱',
    billingCycle: 'Monthly' as 'Monthly' | 'Quarterly' | 'Annually',
    renewalDate: '',
    notes: ''
  });

  // Subscription section only shows for "Mobile + Subscription" category
  const isPhoneCategory = formData.category.toLowerCase() === 'mobile + subscription';

  useEffect(() => {
    if (asset) {
setFormData({
        _id: asset._id,
        name: asset.name,
        category: asset.category,
        company: asset.company,
        companyId: asset.companyId,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        specifications: asset.specifications || '',
        status: asset.status,
        assignedTo: asset.assignedTo || '',
        position: asset.position || '',
        department: asset.department || '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
        location: asset.location,
        notes: asset.notes || '',
      });
      setPreviewCode(asset.deviceCode);
    } else {
      // Generate preview code for new asset
      const code = generateDeviceCode(formData.company, formData.category, assets);
      setPreviewCode(code);
    }
  }, [asset]);

  // Update preview code when company or category changes (only for new assets)
  useEffect(() => {
    if (!asset) {
      const code = generateDeviceCode(formData.company, formData.category, assets);
      setPreviewCode(code);
    }
  }, [formData.company, formData.category, assets, asset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSerialError('');

    // Check for duplicate serial number (exclude self when editing).
    // Skip when the serial is blank — General assets may leave it empty.
    const serialTrimmed = formData.serialNumber.trim();
    if (serialTrimmed) {
      const duplicate = assets.find(
        (a) =>
          (a.serialNumber || '').trim().toLowerCase() === serialTrimmed.toLowerCase() &&
          a._id !== asset?._id
      );
      if (duplicate) {
        setSerialError(`Serial number "${formData.serialNumber}" is already used by asset ${duplicate.deviceCode} (${duplicate.name}).`);
        return;
      }
    }

    if (!asset && isPhoneCategory) {
      if (!subscriptionData.provider || !subscriptionData.planType || !subscriptionData.cost || !subscriptionData.renewalDate) {
        alert('Please fill in all required subscription fields (Provider, Plan Type, Cost, and Renewal Date)');
        return;
      }
    }
    
    // 2. Prepare data with Device Code
    const dataToSubmit = {
      ...formData,
      deviceCode: previewCode,
    };

    if (!asset) {
      delete dataToSubmit._id;
      delete dataToSubmit._id;
    }

    // 4. Send to Parent (MainLayout or InventoryPage)
    onSave(dataToSubmit, isPhoneCategory ? subscriptionData : undefined);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, employeeId: e.target.value } as any));
    setEmpLookupStatus('idle');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, assignedTo: value }));
    setShowSuggestions(false);
    setNameSuggestions([]);

    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    if (!value.trim() || value.trim().length < 2) return;

    nameTimerRef.current = setTimeout(async () => {
      setNameSearchLoading(true);
      try {
        const data = await employeeServices.getEmployees({ search: value.trim(), limit: 8 });
        const list = data.employees ?? [];
        setNameSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setNameSuggestions([]);
      } finally {
        setNameSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = (emp: typeof nameSuggestions[0]) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: emp.fullName,
      position:   emp.position   || prev.position,
      department: emp.department || prev.department,
      employeeId: emp.employeeId,
    } as any));
    setEmpLookupStatus('found');
    setShowSuggestions(false);
    setNameSuggestions([]);
  };

  const handleEmployeeIdKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const employeeId = ((formData as any).employeeId || '').trim();
    if (!employeeId) return;

    setEmpLookupLoading(true);
    try {
      const match = await employeeServices.getByEmployeeId(employeeId);
      if (match) {
        setFormData(prev => ({
          ...prev,
          assignedTo: match.fullName   || prev.assignedTo,
          position:   match.position   || prev.position,
          department: match.department || prev.department,
        } as any));
        setEmpLookupStatus('found');
      } else {
        setEmpLookupStatus('not-found');
        setShowEmpNotFound(true);
      }
    } catch {
      setEmpLookupStatus('idle');
    } finally {
      setEmpLookupLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#162236] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border dark:border-[#1e3a5f]">
        <div className="sticky top-0 bg-white dark:bg-[#162236]/50 border-b border-gray-200 dark:border-[#1e3a5f] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold dark:text-white">
            {asset ? 'Edit Asset' : 'Add New Asset'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1e2d4a]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Auto-generated Device Code Preview with QR Code */}
          {!asset && (
            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
              <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                {/* Device Code Section */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300">Auto-Generated Device Code</h3>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    This code will be automatically assigned when you save:
                  </p>
                  <div className="font-mono text-lg font-bold text-blue-900 dark:text-blue-300 bg-white dark:bg-[#0f1729] px-4 py-2 rounded border border-blue-300 dark:border-blue-500/30">
                    {previewCode}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400/70 mt-2">
                    Format: Company Prefix + Category Code + Sequential Number
                  </p>
                </div>

                {/* QR Code Section */}
                <div className="mt-4 lg:mt-0">
                  <QRCodeDisplay
                    deviceCode={previewCode}
                    size={100}
                    showDownload={false}
                    showLabel={false}
                    className="bg-white dark:bg-[#0f1729] p-2 rounded-lg border border-blue-300 dark:border-blue-500/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Edit mode - show current device code with QR Code */}
          {asset && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
                {/* Device Code Section */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Device Code</h3>
                  </div>
                  <div className="font-mono text-lg font-bold text-gray-900 bg-white px-4 py-2 rounded border border-gray-300">
                    {previewCode}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ✓ Asset Codes are permanent and cannot be changed for the entire lifecycle of the device.
                  </p>
                </div>

                {/* QR Code Section */}
                <div className="mt-4 lg:mt-0">
                  <QRCodeDisplay
                    asset={asset}
                    size={100}
                    showDownload={true}
                    showLabel={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Employee Information Section */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Employee Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned To — autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned To:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleNameChange}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onFocus={() => nameSuggestions.length > 0 && setShowSuggestions(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Type name to search..."
                    autoComplete="off"
                  />
                  {nameSearchLoading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Dropdown suggestions */}
                {showSuggestions && nameSuggestions.length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-[#1e2d4a] border border-gray-200 dark:border-[#1e3a5f] rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {nameSuggestions.map(emp => (
                      <li
                        key={emp._id ?? emp.employeeId}
                        onMouseDown={() => handleSelectSuggestion(emp)}
                        className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#243352] border-b border-gray-100 dark:border-[#1e3a5f] last:border-0"
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{emp.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {emp.employeeId}
                          {emp.department ? ` · ${emp.department}` : ''}
                          {emp.position ? ` · ${emp.position}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ID No. */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID No.:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="employeeId"
                    value={(formData as any).employeeId || ''}
                    onChange={handleEmployeeIdChange}
                    onKeyDown={handleEmployeeIdKeyDown}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-9 ${
                      empLookupStatus === 'found' ? 'border-green-400 focus:ring-green-400' : 'border-gray-300'
                    }`}
                    placeholder="Type ID then press Enter"
                  />
                  {empLookupLoading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {!empLookupLoading && empLookupStatus === 'found' && (
                    <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                {empLookupStatus === 'found' && (
                  <p className="text-xs text-green-600 mt-1">✓ Employee found</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position:
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., Software Engineer"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company: <span className="text-red-500">*</span>
                </label>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  disabled={!!asset}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                >
                  <option value="KHEALTH">KHEALTH</option>
                  <option value="CAREVIEW">CAREVIEW</option>
                  <option value="GLOWFIND">GLOWFIND</option>
                </select>
                {asset && (
                  <p className="text-xs text-gray-500 mt-1">✓ Company is permanent. Use Transfer for company changes.</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department:
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., IT Department"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., Office 3rd Floor"
                />
              </div>
            </div>
          </div>

          {/* Device Specification Section */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">{isGeneral ? 'Asset Details' : 'Device Specification'}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., MacBook Pro 16 inch"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand {!isGeneral && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  required={!isGeneral}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder={isGeneral ? 'e.g., Uratex, Samsung (optional)' : 'e.g., Apple, Dell, HP'}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <CategorySelector
                  value={formData.category}
                  onChange={(value) => setFormData((prev) => ({ ...prev, category: value as AssetCategory }))}
                  categories={categories}
                  onAddCategory={onAddCategory}
                  onDeleteCategory={onDeleteCategory}
                  defaultCategories={defaultCategories}
                  required
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model {!isGeneral && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required={!isGeneral}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder={isGeneral ? 'e.g., 3-Seater (optional)' : 'e.g., M3 Pro'}
                />
              </div>

              {/* Serial Number / Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isGeneral ? 'Serial / Tag No.' : 'Serial Number'} {!isGeneral && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => { setSerialError(''); handleChange(e); }}
                  required={!isGeneral}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white ${serialError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                  placeholder={isGeneral ? 'Optional — auto-uses the asset code if blank' : 'e.g., SN123456789'}
                />
                {serialError && (
                  <p className="mt-1 text-xs text-red-600">{serialError}</p>
                )}
              </div>

              {/* Specifications */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specifications
                </label>
                <textarea
                  name="specifications"
                  value={formData.specifications}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Additional specifications about this asset..."
                />
              </div>
            </div>
          </div>

          {/* Conditional Subscription Form Section - Only for PHONE category */}
          {!asset && isPhoneCategory && (
            <div className="border border-blue-200 rounded-lg p-5 bg-blue-50">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-semibold text-blue-900">Subscription Information</h3>
                <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-medium">
                  Auto-linked to Subscription Management
                </span>
              </div>
              
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-900 font-medium mb-1">📋 Auto-Populated Fields (Read-Only)</p>
                <p className="text-xs text-blue-700">The following fields are automatically populated from the Employee Information section above</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Read-only auto-populated fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name / Assigned To
                  </label>
                  <input
                    type="text"
                    value={formData.assignedTo || 'Not Assigned'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position || 'Not Specified'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || 'Not Specified'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department || 'Not Specified'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Divider */}
                <div className="md:col-span-2 border-t border-blue-300 pt-4 mt-2">
                  <p className="text-sm text-blue-900 font-medium mb-3">📱 Subscription Details (Required)</p>
                </div>

                {/* Editable subscription fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subscriptionData.provider}
                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, provider: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="e.g., AT&T, Verizon, T-Mobile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subscriptionData.planType}
                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, planType: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="e.g., Unlimited Data, Business Plan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={subscriptionData.accountNumber}
                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Account or SIM number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Cycle <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subscriptionData.billingCycle}
                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, billingCycle: e.target.value as any }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Cost <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={subscriptionData.currency}
                      onChange={(e) => setSubscriptionData(prev => ({ ...prev, currency: e.target.value as '$' | '₱' }))}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="$">$</option>
                      <option value="₱">₱</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={subscriptionData.cost}
                      onChange={(e) => setSubscriptionData(prev => ({ ...prev, cost: e.target.value }))}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renewal Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={subscriptionData.renewalDate}
                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, renewalDate: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Notes
                  </label>
                  <textarea
                    value={subscriptionData.notes}
                    onChange={(e) => setSubscriptionData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Additional notes about the subscription..."
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ When you click "Add Asset", this mobile will be saved to inventory AND automatically create a linked subscription record.
                </p>
              </div>
            </div>
          )}

          {/* Other Information Section */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Other Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <DatePickerInput
                  value={formData.purchaseDate}
                  onChange={(value) => setFormData((prev) => ({ ...prev, purchaseDate: value }))}
                  required
                />
              </div>

              {/* Warranty Expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty Expiry
                </label>
                <DatePickerInput
                  value={formData?.warrantyExpiry!}
                  onChange={(value) => setFormData((prev) => ({ ...prev, warrantyExpiry: value }))}
                />
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">Active - Device is currently in use</option>
                  <option value="in-maintenance">In Maintenance - Device is being serviced</option>
                  <option value="in-storage">In Storage - Device is stored away</option>
                  <option value="available">Available - Device is ready to be used/assigned</option>
                </select>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Additional information about this asset..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4">
            <div>
              {!asset && (
                <button
                  type="button"
                  onClick={() => setShowAgreement(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FileSignature className="w-4 h-4" />
                  Asset Form
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {onBack && asset && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Details
                </button>
              )}
              {asset && (
                <button
                  type="button"
                  onClick={() => setShowAgreement(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FileSignature className="w-4 h-4" />
                  Generate Form
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {asset ? 'Update Asset' : 'Add Asset'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Issuance Agreement Modal */}
      {showAgreement && (
        <IssuanceAgreement
          asset={asset}
          assetData={{ ...formData, deviceCode: previewCode }}
          onClose={() => setShowAgreement(false)}
          currentUser={currentUser}
          onSaveFormRecord={onSaveFormRecord}
        />
      )}

      {/* Employee Not Found Modal */}
      {showEmpNotFound && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#162236] rounded-2xl max-w-sm w-full p-6 shadow-2xl border dark:border-[#1e3a5f] text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Employee Not Found</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">
              Employee ID <span className="font-mono font-bold text-gray-900 dark:text-white">"{(formData as any).employeeId}"</span> does not exist in the employee list.
            </p>
            <button
              onClick={() => setShowEmpNotFound(false)}
              className="w-full py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}