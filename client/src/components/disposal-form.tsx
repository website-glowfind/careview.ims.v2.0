import { useState, useEffect } from 'react';
import { Search, FileText, X, Download, Printer, Plus, ArrowLeft, Save } from 'lucide-react';
import type { ITAsset, FormRecord, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const COMPANY_LOGOS: Record<string, string> = {
  KHEALTH: '/khealthlogo.png',
  CAREVIEW: '/logo.png',
  GLOWFIND: '/glowfindName.png',
};

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

interface BlankFormRow {
  assetTag: string;
  brandModel: string;
  serialNumber: string;
  condition: string;
  remarks: string;
}

export function DisposalForm({ assets, currentUser, onSaveFormRecord }: DisposalFormProps) {
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

  // Blank form editable fields
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
    assets: Array(5).fill(null).map(() => ({
      assetTag: '',
      brandModel: '',
      serialNumber: '',
      condition: '',
      remarks: ''
    }))
  });

  const filteredAssets = assets.filter(asset => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      asset.deviceCode.toLowerCase().includes(query) ||
      asset.name.toLowerCase().includes(query) ||
      asset.serialNumber.toLowerCase().includes(query) ||
      asset.assignedTo?.toLowerCase().includes(query)
    );
    const matchesCompany = companyFilter === 'ALL' || asset.company === companyFilter;
    return matchesSearch && matchesCompany;
  });

  // Auto-update employee information when assets change
  useEffect(() => {
    if (selectedAssets.length === 0) {
      // Clear employee information when no assets are selected
      setEmployeeName('');
      setEmployeeId('');
      setEmployeePosition('');
      setEmployeeDepartment('');
      setEmployeeCompany('');
      setEmployeeLocation('');
    } else {
      // Update employee information from the first remaining asset
      const firstAsset = selectedAssets[0].asset;
      setEmployeeName(firstAsset.assignedTo || '');
      setEmployeeId((firstAsset as any).employeeId || '');
      setEmployeePosition(firstAsset.position || '');
      setEmployeeDepartment(firstAsset.department || '');
      setEmployeeCompany(firstAsset.company || '');
      setEmployeeLocation(firstAsset.location || '');
    }
  }, [selectedAssets]);

  const handleAddAsset = (asset: ITAsset) => {
    const existing = selectedAssets.find(item => item.asset._id === asset._id);
    if (!existing) {
      setSelectedAssets([...selectedAssets, { asset, quantity: 1, reason: '' }]);
    }
  };

  const handleRemoveAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(item => item.asset._id !== assetId));
  };

  const handleQuantityChange = (assetId: string, delta: number) => {
    setSelectedAssets(selectedAssets.map(item => {
      if (item.asset._id === assetId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const handleReasonChange = (assetId: string, reason: string) => {
    setSelectedAssets(selectedAssets.map(item => {
      if (item.asset._id === assetId) {
        return { ...item, reason };
      }
      return item;
    }));
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
    setBlankFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateBlankFormAsset = (index: number, field: string, value: string) => {
    setBlankFormData(prev => ({
      ...prev,
      assets: prev.assets.map((asset, i) =>
        i === index ? { ...asset, [field]: value } : asset
      )
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToMasterlist = () => {
    if (isBlankForm) {
      alert('Cannot save blank form to masterlist. Please use Issue Disposal Form with selected assets.');
      return;
    }

    // Save each selected asset as a form record
    selectedAssets.forEach((item) => {
      // Prepare comprehensive form data for viewing
      const formData = {
        assetCode: item.asset.deviceCode,
        assetName: item.asset.name,
        brand: item.asset.brand,
        model: item.asset.model,
        serialNumber: item.asset.serialNumber,
        company: item.asset.company,
        employeeName: employeeName || item.asset.assignedTo,
        employeePosition: employeePosition,
        department: employeeDepartment || item.asset.department,
        disposalDate: disposalDate,
        disposalMethod: disposalMethod,
        disposalReason: disposalReason,
        quantity: item.quantity,
        itemReason: item.reason,
      };

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
        formData: formData, // Store full form data for viewing
      });
    });

    alert(`✅ Successfully saved ${selectedAssets.length} disposal form${selectedAssets.length > 1 ? 's' : ''} to Form Masterlist!`);
  };

  const handleDownloadPDF = async () => {
    const previewElement = document.getElementById('disposal-preview');
    if (!previewElement) return;

    try {
      // Clone the element and convert oklch colors to standard colors
      const clone = previewElement.cloneNode(true) as HTMLElement;
      document.body.appendChild(clone);
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';

      // Force standard colors on all elements
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        const computed = window.getComputedStyle(element);

        // Convert colors to rgb format
        if (computed.color) element.style.color = computed.color;
        if (computed.backgroundColor) element.style.backgroundColor = computed.backgroundColor;
        if (computed.borderColor) element.style.borderColor = computed.borderColor;
      });

      const canvas = await html2canvas(clone, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Remove clone
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`IT-Asset-Disposal-Form-${disposalDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getCompanyLogo = (company: string) => COMPANY_LOGOS[company] ?? null;

  const getCompanyColor = (company: string) => {
    switch (company) {
      case 'KHEALTH':
        return '#3B82F6'; // blue
      case 'CAREVIEW':
        return '#10B981'; // green
      case 'GLOWFIND':
        return '#F97316'; // orange
      default:
        return '#6B7280'; // gray
    }
  };

  const getCompanyBgColor = (company: string) => {
    switch (company) {
      case 'KHEALTH':
        return 'bg-blue-600';
      case 'CAREVIEW':
        return 'bg-green-600';
      case 'GLOWFIND':
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Get primary company from selected assets or use default for blank form
  const primaryCompany = isBlankForm ? 'KHEALTH' : (selectedAssets.length > 0 ? selectedAssets[0].asset.company : '');
  const primaryLocation = isBlankForm ? '' : (selectedAssets.length > 0 ? selectedAssets[0].asset.location : '');
  const companyLogo = getCompanyLogo(primaryCompany);
  const companyColor = getCompanyColor(primaryCompany);
  const companyBgColor = getCompanyBgColor(primaryCompany);

  // Create minimum 5 rows for the assets table
  const minRows = 5;
  const blankTableRows: BlankFormRow[] = [...blankFormData.assets];
  while (blankTableRows.length < minRows) {
    blankTableRows.push({ assetTag: '', brandModel: '', serialNumber: '', condition: '', remarks: '' });
  }
  const disposalTableRows: DisposalItem[] = [...selectedAssets];
  while (disposalTableRows.length < minRows) {
    disposalTableRows.push({ asset: {} as ITAsset, quantity: 0, reason: '' });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Disposal Form</h1>
        <p className="text-gray-600">Create disposal forms for IT assets with proper documentation</p>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Asset Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Assets for Disposal</h2>

            {/* Company Filter */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Company:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCompanyFilter('ALL')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    companyFilter === 'ALL'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Companies
                </button>
                <button
                  onClick={() => setCompanyFilter('KHEALTH')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border ${
                    companyFilter === 'KHEALTH'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                  }`}
                >
                  KHEALTH
                </button>
                <button
                  onClick={() => setCompanyFilter('CAREVIEW')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border ${
                    companyFilter === 'CAREVIEW'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                  }`}
                >
                  CAREVIEW
                </button>
                <button
                  onClick={() => setCompanyFilter('GLOWFIND')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors border ${
                    companyFilter === 'GLOWFIND'
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-white text-orange-600 border-orange-600 hover:bg-orange-50'
                  }`}
                >
                  GLOWFIND
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredAssets.map((asset) => (
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddAsset(asset);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Assets and Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Disposal Details</h2>

            {/* Employee Information */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Employee Information</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Employee Name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Position"
                  value={employeePosition}
                  onChange={(e) => setEmployeePosition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={employeeDepartment}
                  onChange={(e) => setEmployeeDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={employeeCompany}
                  onChange={(e) => setEmployeeCompany(e.target.value as Company)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={employeeLocation}
                  onChange={(e) => setEmployeeLocation(e.target.value)}
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
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedAssets.map((item) => (
                    <div key={item.asset._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-semibold text-gray-900">{item.asset.deviceCode}</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(item.asset.company)}`}>
                              {item.asset.company}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{item.asset.name}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAsset(item.asset?._id!)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disposal Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Disposal</label>
                <textarea
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for disposal..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disposal Method</label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select method...</option>
                  <option value="Recycle">Recycle</option>
                  <option value="Donate">Donate</option>
                  <option value="Sell">Sell</option>
                  <option value="Trash">Trash</option>
                  <option value="E-Waste Facility">E-Waste Facility</option>
                  <option value="Return to Vendor">Return to Vendor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disposal Date</label>
                <input
                  type="date"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
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
          <div className="mb-4 flex items-center justify-between print:hidden">
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Edit
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSaveToMasterlist}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save to Masterlist
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>

          {/* Preview */}
          <div id="disposal-preview" className="bg-white p-8 rounded-lg border border-gray-300">
            {/* Header */}
            <div className="text-center mb-8 pb-6">
              {companyLogo && (
                <div className="flex justify-center mb-4">
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="h-15 object-contain"
                  />
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                IT ASSET DISPOSAL FORM
              </h1>
              <p className="text-gray-600">Asset Retirement and Disposal Documentation</p>
            </div>

            {/* 1. Employee Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                1. EMPLOYEE INFORMATION
              </h3>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100 w-1/4">
                      Name:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.name}
                          onChange={(e) => updateBlankFormField('name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter name"
                        />
                      ) : (
                        employeeName || '___________________________'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Employee ID:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.employeeId}
                          onChange={(e) => updateBlankFormField('employeeId', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter employee ID"
                        />
                      ) : (
                        employeeId || '___________________________'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Position:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.position}
                          onChange={(e) => updateBlankFormField('position', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter position"
                        />
                      ) : (
                        employeePosition || '___________________________'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Company:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 font-semibold" style={{ color: companyColor }}>
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.company}
                          onChange={(e) => updateBlankFormField('company', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter company"
                        />
                      ) : (
                        primaryCompany
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Location:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.location}
                          onChange={(e) => updateBlankFormField('location', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter location"
                        />
                      ) : (
                        primaryLocation
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Department:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.department}
                          onChange={(e) => updateBlankFormField('department', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter department"
                        />
                      ) : (
                        employeeDepartment || '___________________________'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. List of IT Assets for Disposal */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                2. LIST OF IT ASSETS FOR DISPOSAL
              </h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className={`${companyBgColor} text-white`}>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Asset Tag</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Brand/Model</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Serial Number</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Condition</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {isBlankForm
                    ? blankTableRows.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 text-sm font-mono">
                            <input type="text" value={item.assetTag} onChange={(e) => updateBlankFormAsset(index, 'assetTag', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Asset tag" />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            <input type="text" value={item.brandModel} onChange={(e) => updateBlankFormAsset(index, 'brandModel', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Brand/Model" />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm font-mono">
                            <input type="text" value={item.serialNumber} onChange={(e) => updateBlankFormAsset(index, 'serialNumber', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Serial number" />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            <input type="text" value={item.condition} onChange={(e) => updateBlankFormAsset(index, 'condition', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Condition" />
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            <input type="text" value={item.remarks} onChange={(e) => updateBlankFormAsset(index, 'remarks', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Remarks" />
                          </td>
                        </tr>
                      ))
                    : disposalTableRows.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{item.asset.deviceCode || ''}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">{item.asset.brand && item.asset.model ? `${item.asset.brand} - ${item.asset.model}` : ''}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{item.asset.serialNumber || ''}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">{item.asset.status || ''}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">{item.asset.notes || ''}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>

            {/* 3. Disposal Details */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                3. DISPOSAL DETAILS
              </h3>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100 w-1/4">
                      Reason for Disposal:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 whitespace-pre-wrap">
                      {isBlankForm ? (
                        <textarea
                          value={blankFormData.reason}
                          onChange={(e) => updateBlankFormField('reason', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter reason for disposal"
                          rows={3}
                        />
                      ) : (
                        disposalReason
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Disposal Method:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="text"
                          value={blankFormData.method}
                          onChange={(e) => updateBlankFormField('method', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter disposal method"
                        />
                      ) : (
                        disposalMethod
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Disposal Date:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {isBlankForm ? (
                        <input
                          type="date"
                          value={blankFormData.date}
                          onChange={(e) => updateBlankFormField('date', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        new Date(disposalDate).toLocaleDateString()
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. Terms and Acknowledgment */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                4. TERMS AND ACKNOWLEDGMENT
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-800 leading-relaxed mb-3">
                  By signing this disposal form, all parties acknowledge and confirm the following:
                </p>
                <ul className="text-sm text-gray-800 space-y-2 list-disc list-inside">
                  <li>All sensitive data has been securely wiped from the devices using industry-standard methods.</li>
                  <li>Software licenses and subscriptions have been deactivated and documented.</li>
                  <li>Asset tags and identification labels have been removed or marked as disposed.</li>
                  <li>The disposal method complies with environmental regulations and company policies.</li>
                  <li>Documentation of disposal has been maintained for audit and compliance purposes.</li>
                  <li>Any salvageable parts or components have been properly inventoried.</li>
                  <li>The disposed assets have been removed from the active inventory system.</li>
                  <li>Proper chain of custody has been maintained throughout the disposal process.</li>
                </ul>
              </div>
            </div>

            {/* 5. Signatories */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                5. SIGNATORIES
              </h3>

              {/* Two-column layout for signatures */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Disposal Approval */}
                <div>
                  <div className="bg-blue-600 text-white text-center font-bold py-2 mb-4">
                    Disposal Approval:
                  </div>

                  {/* Supervisor Signature */}
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- Supervisor Signature:</span>
                    </div>
                    <div className="border-b-2 border-gray-900 mt-8 mb-1"></div>
                  </div>

                  {/* IT Personnel Signature */}
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- IT Personnel Signature:</span>
                    </div>
                    <div className="border-b-2 border-gray-900 mt-8 mb-1"></div>
                  </div>

                  {/* Admin Manager Signature */}
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- Admin Manager Signature:</span>
                    </div>
                    <div className="border-b-2 border-gray-900 mt-8 mb-1"></div>
                  </div>
                </div>

                {/* Right Column - Disposal Confirmation */}
                <div>
                  <div className="bg-blue-600 text-white text-center font-bold py-2 mb-4">
                    Disposal Confirmation:
                  </div>

                  {/* IT Head Signature */}
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- IT Head Signature:</span>
                    </div>
                    <p className="text-xs italic text-gray-600 ml-4 mt-1">(Data Sanitization Verified)</p>
                    <div className="border-b-2 border-gray-900 mt-6 mb-1"></div>
                  </div>

                  {/* Disposal Officer Signature */}
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- Disposal Officer Signature:</span>
                    </div>
                    <p className="text-xs italic text-gray-600 ml-4 mt-1">(Disposal Executed and Documented)</p>
                    <div className="border-b-2 border-gray-900 mt-6 mb-1"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-left text-xs text-gray-900 mt-8 pt-6 border-t border-gray-200">
              <p className="font-bold">
                Asset Codes: {selectedAssets.length > 0
                  ? selectedAssets.map(item => item.asset.deviceCode).join(', ')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #disposal-preview, #disposal-preview * {
            visibility: visible;
          }
          #disposal-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}
