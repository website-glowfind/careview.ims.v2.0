import { useState, useEffect, useRef } from 'react';
import { Trash2, Search, FileText, X, Download, Printer, Plus, ArrowLeft, Save } from 'lucide-react';
import type { ITAsset, FormRecord, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DisposalFormProps {
  assets: ITAsset[];
  currentUser: string;
  onSaveFormRecord: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
}

interface DisposalItem {
  asset: ITAsset;
  quantity: number;
  reason: string;
}

const COMPANY_LOGOS: Record<string, string> = {
  KHEALTH: '/khealthlogo.png',
  CAREVIEW: '/logo.png',
  GLOWFIND: '/glowfindName.png',
};

const COMPANY_COLORS: Record<string, string> = {
  KHEALTH: '#3B82F6',
  CAREVIEW: '#10B981',
  GLOWFIND: '#F97316',
};

const COMPANY_BG: Record<string, string> = {
  KHEALTH: 'bg-blue-600',
  CAREVIEW: 'bg-green-600',
  GLOWFIND: 'bg-orange-600',
};

const MIN_ROWS = 5;

export function DisposalForm({ assets, currentUser, onSaveFormRecord }: DisposalFormProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<DisposalItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [disposalMethod, setDisposalMethod] = useState('');
  const [disposalReason, setDisposalReason] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employeePosition, setEmployeePosition] = useState('');
  const [employeeDepartment, setEmployeeDepartment] = useState('');
  const [employeeCompany, setEmployeeCompany] = useState<Company | ''>('');
  const [employeeLocation, setEmployeeLocation] = useState('');
  const [isBlankForm, setIsBlankForm] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');

  const [blankFormData, setBlankFormData] = useState({
    name: '',
    employeeId: '',
    position: '',
    company: '',
    location: '',
    department: '',
    reason: '',
    method: '',
    date: new Date().toISOString().split('T')[0],
    assets: Array(MIN_ROWS).fill(null).map(() => ({
      assetTag: '',
      brandModel: '',
      serialNumber: '',
      condition: '',
      remarks: '',
    })),
  });

  const filteredAssets = assets.filter(asset => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      asset.deviceCode.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query) ||
      asset.serialNumber.toLowerCase().includes(query) ||
      (asset.assignedTo?.toLowerCase().includes(query) ?? false);
    const matchesCompany = companyFilter === 'ALL' || asset.company === companyFilter;
    return matchesSearch && matchesCompany;
  });

  // Auto-populate employee info from first selected asset
  useEffect(() => {
    if (selectedAssets.length === 0) {
      setEmployeeName('');
      setEmployeeId('');
      setEmployeePosition('');
      setEmployeeDepartment('');
      setEmployeeCompany('');
      setEmployeeLocation('');
    } else {
      const first = selectedAssets[0].asset;
      setEmployeeName(first.assignedTo || '');
      setEmployeeId(first.employeeId || '');
      setEmployeePosition(first.position || '');
      setEmployeeDepartment(first.department || '');
      setEmployeeCompany(first.company || '');
      setEmployeeLocation(first.location || '');
    }
  }, [selectedAssets]);

  const handleAddAsset = (asset: ITAsset) => {
    if (!selectedAssets.find(item => item.asset._id === asset._id)) {
      setSelectedAssets(prev => [...prev, { asset, quantity: 1, reason: '' }]);
    }
  };

  const handleRemoveAsset = (assetId: string) => {
    setSelectedAssets(prev => prev.filter(item => item.asset._id !== assetId));
  };

  const handleGeneratePreview = () => {
    if (selectedAssets.length === 0) {
      alert('Please select at least one asset for disposal');
      return;
    }
    if (!disposalMethod || !disposalReason) {
      alert('Please fill in disposal method and reason for disposal');
      return;
    }
    if (!employeeName) {
      alert('Please fill in employee name');
      return;
    }
    setIsBlankForm(false);
    setShowPreview(true);
  };

  const handleGenerateBlankForm = () => {
    setIsBlankForm(true);
    setShowPreview(true);
  };

  const updateBlankFormField = (field: string, value: string) => {
    setBlankFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateBlankFormAsset = (index: number, field: string, value: string) => {
    setBlankFormData(prev => ({
      ...prev,
      assets: prev.assets.map((a, i) => i === index ? { ...a, [field]: value } : a),
    }));
  };

  const generatePDF = async (): Promise<jsPDF | null> => {
    const element = previewRef.current;
    if (!element) return null;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let y = 0;
      while (y < imgHeight) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, pageWidth, imgHeight);
        y += pageHeight;
      }
      return pdf;
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(`PDF error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };

  const handlePrint = async () => {
    const pdf = await generatePDF();
    if (!pdf) return;
    const url = pdf.output('bloburl');
    const win = window.open(url as unknown as string, '_blank');
    if (win) win.focus();
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (!pdf) return;
    pdf.save(`IT-Asset-Disposal-Form-${disposalDate}.pdf`);
  };

  const handleSaveToMasterlist = () => {
    if (isBlankForm) {
      alert('Cannot save blank form to masterlist. Please use Issue Disposal Form with selected assets.');
      return;
    }
    selectedAssets.forEach(item => {
      onSaveFormRecord({
        formType: 'Asset Disposal',
        assetTag: item.asset.deviceCode,
        referenceId: `DIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeName: employeeName || item.asset.assignedTo,
        department: employeeDepartment || item.asset.department,
        company: item.asset.company,
        status: 'Disposed',
        details: `Disposal Method: ${disposalMethod} | Reason: ${disposalReason} | Date: ${new Date(disposalDate).toLocaleDateString()}`,
        createdBy: currentUser,
        relatedAssetId: item.asset._id,
        relatedSubscriptionId: undefined,
        formData: {
          assetCode: item.asset.deviceCode,
          assetName: item.asset.name,
          brand: item.asset.brand,
          model: item.asset.model,
          serialNumber: item.asset.serialNumber,
          company: item.asset.company,
          employeeName: employeeName || item.asset.assignedTo,
          employeePosition,
          department: employeeDepartment || item.asset.department,
          disposalDate,
          disposalMethod,
          disposalReason,
          quantity: item.quantity,
          itemReason: item.reason,
        },
      });
    });
    alert(`✅ Successfully saved ${selectedAssets.length} disposal form${selectedAssets.length > 1 ? 's' : ''} to Form Masterlist!`);
  };

  // Build table rows — never mutate state directly
  const primaryCompany = isBlankForm ? 'KHEALTH' : (selectedAssets[0]?.asset.company ?? '');
  const primaryLocation = isBlankForm ? '' : (selectedAssets[0]?.asset.location ?? '');
  const companyLogo = COMPANY_LOGOS[primaryCompany] ?? null;
  const companyColor = COMPANY_COLORS[primaryCompany] ?? '#6B7280';
  const companyBgColor = COMPANY_BG[primaryCompany] ?? 'bg-gray-600';

  const filledRows = isBlankForm ? blankFormData.assets : selectedAssets;
  const emptyCount = Math.max(0, MIN_ROWS - filledRows.length);
  const emptyRows = Array(emptyCount).fill(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Disposal Form</h1>
        <p className="text-gray-600">Create disposal forms for IT assets with proper documentation</p>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Asset Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Assets for Disposal</h2>

            {/* Company Filter */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Company:</label>
              <div className="flex flex-wrap gap-2">
                {(['ALL', 'KHEALTH', 'CAREVIEW', 'GLOWFIND'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setCompanyFilter(c)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border ${
                      companyFilter === c
                        ? c === 'ALL' ? 'bg-gray-600 text-white border-gray-600'
                          : c === 'KHEALTH' ? 'bg-blue-600 text-white border-blue-600'
                          : c === 'CAREVIEW' ? 'bg-green-600 text-white border-green-600'
                          : 'bg-orange-600 text-white border-orange-600'
                        : c === 'ALL' ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          : c === 'KHEALTH' ? 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                          : c === 'CAREVIEW' ? 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                          : 'bg-white text-orange-600 border-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    {c === 'ALL' ? 'All Companies' : c}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAssets.map(asset => (
                <div
                  key={asset._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAddAsset(asset)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900">{asset.deviceCode}</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(asset.company)}`}>
                        {asset.company}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    <p className="text-xs text-gray-600">S/N: {asset.serialNumber}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleAddAsset(asset); }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {filteredAssets.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No assets found</p>
              )}
            </div>
          </div>

          {/* Right: Disposal Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Disposal Details</h2>

            {/* Employee Information */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Employee Information</h3>
              <div className="space-y-3">
                {[
                  { placeholder: 'Employee Name', value: employeeName, onChange: setEmployeeName },
                  { placeholder: 'Employee ID', value: employeeId, onChange: setEmployeeId },
                  { placeholder: 'Position', value: employeePosition, onChange: setEmployeePosition },
                  { placeholder: 'Department', value: employeeDepartment, onChange: setEmployeeDepartment },
                  { placeholder: 'Location', value: employeeLocation, onChange: setEmployeeLocation },
                ].map(({ placeholder, value, onChange }) => (
                  <input
                    key={placeholder}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                ))}
                <input
                  type="text"
                  placeholder="Company"
                  value={employeeCompany}
                  onChange={e => setEmployeeCompany(e.target.value as Company)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Selected Assets */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Assets ({selectedAssets.length})</h3>
              {selectedAssets.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No assets selected</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedAssets.map(item => (
                    <div key={item.asset._id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-semibold">{item.asset.deviceCode}</span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(item.asset.company)}`}>
                            {item.asset.company}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{item.asset.name}</p>
                      </div>
                      <button onClick={() => handleRemoveAsset(item.asset._id!)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disposal Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Disposal</label>
                <textarea
                  value={disposalReason}
                  onChange={e => setDisposalReason(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for disposal..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disposal Method</label>
                <select
                  value={disposalMethod}
                  onChange={e => setDisposalMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select method...</option>
                  <option>Recycle</option>
                  <option>Donate</option>
                  <option>Sell</option>
                  <option>Trash</option>
                  <option>E-Waste Facility</option>
                  <option>Return to Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disposal Date</label>
                <input
                  type="date"
                  value={disposalDate}
                  onChange={e => setDisposalDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleGeneratePreview}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Issue Disposal Form
              </button>
              <button
                onClick={handleGenerateBlankForm}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Disposal Request Form
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Action Bar */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Edit
            </button>
            <div className="flex gap-2">
              {!isBlankForm && (
                <button
                  onClick={handleSaveToMasterlist}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save to Masterlist
                </button>
              )}
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>

          {/* Preview */}
          <div ref={previewRef} className="bg-white p-8 rounded-lg border border-gray-300">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 mb-2" style={{ borderBottom: `2px solid ${companyColor}` }}>
              {companyLogo && <img src={companyLogo} alt="Company Logo" className="h-16 w-auto" />}
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-900">IT ASSET DISPOSAL FORM</h1>
                <p className="text-sm text-gray-600 mt-1">Asset Retirement and Disposal Documentation</p>
              </div>
            </div>

            {/* 1. Employee Information */}
            <h3 className="text-sm font-bold mb-3 pb-1 mt-4" style={{ borderBottom: `2px solid ${companyColor}` }}>
              1. EMPLOYEE INFORMATION
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-5">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">Name:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="text" value={blankFormData.name} onChange={e => updateBlankFormField('name', e.target.value)} className="w-full px-1 border-b border-gray-400 focus:outline-none" placeholder="Enter name" />
                      : employeeName || '___________________________'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">Employee ID:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="text" value={blankFormData.employeeId} onChange={e => updateBlankFormField('employeeId', e.target.value)} className="w-full px-1 border-b border-gray-400 focus:outline-none" placeholder="Enter ID" />
                      : employeeId || '___________________________'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Position:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="text" value={blankFormData.position} onChange={e => updateBlankFormField('position', e.target.value)} className="w-full px-1 border-b border-gray-400 focus:outline-none" placeholder="Enter position" />
                      : employeePosition || '___________________________'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Department:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="text" value={blankFormData.department} onChange={e => updateBlankFormField('department', e.target.value)} className="w-full px-1 border-b border-gray-400 focus:outline-none" placeholder="Enter department" />
                      : employeeDepartment || '___________________________'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Company:</td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold" style={{ color: companyColor }}>
                    {isBlankForm
                      ? <input type="text" value={blankFormData.company} onChange={e => updateBlankFormField('company', e.target.value)} className="w-full px-1 border-b border-gray-400 focus:outline-none" placeholder="Enter company" />
                      : primaryCompany}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Location:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="text" value={blankFormData.location} onChange={e => updateBlankFormField('location', e.target.value)} className="w-full px-1 border-b border-gray-400 focus:outline-none" placeholder="Enter location" />
                      : primaryLocation || '___________________________'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. List of IT Assets for Disposal */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              2. LIST OF IT ASSETS FOR DISPOSAL
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-5">
              <thead>
                <tr className={`${companyBgColor} text-white`}>
                  <th className="border border-gray-300 px-3 py-2 text-left">Asset Tag</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Brand/Model</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Serial Number</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Condition</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filledRows.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-2 font-mono">
                      {isBlankForm
                        ? <input type="text" value={(item as any).assetTag} onChange={e => updateBlankFormAsset(index, 'assetTag', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                        : (item as DisposalItem).asset.deviceCode || ''}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {isBlankForm
                        ? <input type="text" value={(item as any).brandModel} onChange={e => updateBlankFormAsset(index, 'brandModel', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                        : (() => { const a = (item as DisposalItem).asset; return a.brand && a.model ? `${a.brand} - ${a.model}` : ''; })()}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 font-mono">
                      {isBlankForm
                        ? <input type="text" value={(item as any).serialNumber} onChange={e => updateBlankFormAsset(index, 'serialNumber', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                        : (item as DisposalItem).asset.serialNumber || ''}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {isBlankForm
                        ? <input type="text" value={(item as any).condition} onChange={e => updateBlankFormAsset(index, 'condition', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                        : (item as DisposalItem).asset.status || ''}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      {isBlankForm
                        ? <input type="text" value={(item as any).remarks} onChange={e => updateBlankFormAsset(index, 'remarks', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                        : (item as DisposalItem).asset.notes || ''}
                    </td>
                  </tr>
                ))}
                {emptyRows.map((_, i) => (
                  <tr key={`empty-${i}`} className={(filledRows.length + i) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-2">&nbsp;</td>
                    <td className="border border-gray-300 px-3 py-2"></td>
                    <td className="border border-gray-300 px-3 py-2"></td>
                    <td className="border border-gray-300 px-3 py-2"></td>
                    <td className="border border-gray-300 px-3 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 3. Disposal Details */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              3. DISPOSAL DETAILS
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-5">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">Reason for Disposal:</td>
                  <td className="border border-gray-300 px-3 py-2 whitespace-pre-wrap">
                    {isBlankForm
                      ? <textarea value={blankFormData.reason} onChange={e => updateBlankFormField('reason', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" rows={2} />
                      : disposalReason}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Disposal Method:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="text" value={blankFormData.method} onChange={e => updateBlankFormField('method', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                      : disposalMethod}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Disposal Date:</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isBlankForm
                      ? <input type="date" value={blankFormData.date} onChange={e => updateBlankFormField('date', e.target.value)} className="w-full border-b border-gray-300 focus:outline-none" />
                      : new Date(disposalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. Terms and Acknowledgment */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              4. TERMS AND ACKNOWLEDGMENT
            </h3>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-xs text-gray-800 mb-5">
              <p className="mb-2">By signing this disposal form, all parties acknowledge and confirm the following:</p>
              <ol className="list-decimal ml-5 space-y-0.5">
                <li>All sensitive data has been securely wiped from the devices using industry-standard methods.</li>
                <li>Software licenses and subscriptions have been deactivated and documented.</li>
                <li>Asset tags and identification labels have been removed or marked as disposed.</li>
                <li>The disposal method complies with environmental regulations and company policies.</li>
                <li>Documentation of disposal has been maintained for audit and compliance purposes.</li>
                <li>Any salvageable parts or components have been properly inventoried.</li>
                <li>The disposed assets have been removed from the active inventory system.</li>
                <li>Proper chain of custody has been maintained throughout the disposal process.</li>
              </ol>
            </div>

            {/* 5. Signatories */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              5. SIGNATORIES
            </h3>
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <div className="bg-blue-900 text-white text-center font-bold py-1 px-3 mb-3">Disposal Approval:</div>
                {['Supervisor', 'IT Personnel', 'Admin Manager'].map(role => (
                  <div key={role} className="mb-4">
                    <span>- {role} Signature: __________________________</span>
                    <span className="text-gray-600 ml-2">Date: _______</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="bg-blue-900 text-white text-center font-bold py-1 px-3 mb-3">Disposal Confirmation:</div>
                <div className="mb-4">
                  <span>- IT Head Signature: ____________________________</span>
                  <span className="text-gray-600 ml-2">Date: _______</span>
                  <p className="italic text-gray-500 mt-0.5">(Data Sanitization Verified)</p>
                </div>
                <div className="mb-4">
                  <span>- Disposal Officer Signature: _________________</span>
                  <span className="text-gray-600 ml-2">Date: _______</span>
                  <p className="italic text-gray-500 mt-0.5">(Disposal Executed and Documented)</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-gray-300 text-xs text-gray-500 text-left">
              <p className="font-bold">
                Asset Codes: {selectedAssets.length > 0 ? selectedAssets.map(i => i.asset.deviceCode).join(', ') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
