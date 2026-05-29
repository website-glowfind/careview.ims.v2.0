import { useState, useEffect, useRef } from 'react';
import { X, Printer, ArrowLeft, Save, Download, Lock } from 'lucide-react';
import type { ITAsset, AssetStatus, AssetCategory, Company, FormRecord } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { CategorySelector } from '@/components/category-selector';
import { DatePickerInput } from '@/components/ui/date-picker-input';
const COMPANY_LOGOS: Record<string, string> = {
  KHEALTH: '/khealthlogo.png',
  CAREVIEW: '/logo.png',
  GLOWFIND: '/glowfindName.png',
};
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface AssetRecordFormProps {
  formRecord?: FormRecord; // For viewing existing records
  subscriptionData?: {
    name: string;
    referenceCode: string;
    type: 'License' | 'Subscription';
    company: Company;
    status: string;
    renewalDate: string;
    cost: number;
    billingCycle: string;
    accountName?: string;
    accountEmail?: string;
    employeeName?: string;
    department?: string;
    branch?: string;
  };
  categories: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  defaultCategories: string[];
  onSave: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  onCancel: () => void;
  currentUser: string;
}

interface AssetFormData {
  name: string;
  category: AssetCategory | string;
  company: Company;
  brand: string;
  model: string;
  serialNumber: string;
  specifications: string;
  status: AssetStatus;
  assignedTo: string;
  position: string;
  department: string;
  purchaseDate: string;
  warrantyExpiry: string;
  location: string;
  notes: string;
  deviceCode?: string;
  employeeId?: string;
}

export function AssetRecordForm({
  formRecord,
  subscriptionData,
  categories,
  onAddCategory,
  onDeleteCategory,
  defaultCategories,
  onSave,
  onCancel,
  currentUser,
}: AssetRecordFormProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const isViewMode = !!formRecord;

  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    category: 'laptop',
    company: 'KHEALTH',
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
  });

  useEffect(() => {
    if (formRecord?.formData) {
      setFormData(formRecord.formData);
    }
  }, [formRecord]);

  const handleInputChange = (field: keyof AssetFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.brand || !formData.model || !formData.serialNumber || !formData.location) {
      alert('Please fill in all required fields (Name, Brand, Model, Serial Number, Location)');
      return;
    }

    // Determine form type based on whether this is a subscription-related record
    const formType: 'Inventory Management' | 'Subscription Management' = subscriptionData 
      ? 'Subscription Management' 
      : 'Inventory Management';

    const newRecord: Omit<FormRecord, 'id' | 'dateCreated'> = {
      formType: formType,
      assetTag: formData.deviceCode || `${formData.company}-${formData.category.toUpperCase()}-XXXXX`,
      referenceId: subscriptionData?.referenceCode,
      employeeName: formData.assignedTo || 'Unassigned',
      department: formData.department,
      company: formData.company,
      status: formData.status === 'active' ? 'Active' : 'Completed',
      details: `${formData.brand} ${formData.model} - ${formData.name}`,
      createdBy: currentUser,
      relatedSubscriptionId: subscriptionData ? `subscription-${Date.now()}` : undefined,
      formData: {
        ...formData,
        subscription: subscriptionData || undefined
      },
    };

    onSave(newRecord);
    alert('Asset Record Form saved successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('asset-record-content');
    
    if (!element) return;
    
    try {
      // Create a style element to override all potentially problematic colors
      const styleOverride = document.createElement('style');
      styleOverride.textContent = `
        #asset-record-content-clone * {
          border-color: ${companyColor} !important;
        }
        #asset-record-content-clone h3 {
          border-bottom-color: ${companyColor} !important;
        }
        #asset-record-content-clone [style*="borderColor"] {
          border-color: ${companyColor} !important;
        }
        #asset-record-content-clone [style*="backgroundColor"][style*="${companyColor}"],
        #asset-record-content-clone [style*="background-color"][style*="${companyColor}"] {
          background-color: ${companyColor} !important;
        }
        #asset-record-content-clone [style*="color: rgb"] {
          color: ${companyColor} !important;
        }
      `;
      document.head.appendChild(styleOverride);
      
      // Clone the element
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'asset-record-content-clone';
      
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = element.offsetWidth + 'px';
      container.style.backgroundColor = '#ffffff';
      document.body.appendChild(container);
      container.appendChild(clone);
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Remove all inline styles that might contain oklch
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = htmlEl.getAttribute('style');
        
        if (style) {
          // Remove the entire style attribute and re-apply only safe colors
          htmlEl.removeAttribute('style');
          
          // Check if this element needs company color styling
          if (style.includes('borderColor') || style.includes('border-color')) {
            htmlEl.style.borderColor = companyColor;
          }
          if (style.includes('backgroundColor') || style.includes('background-color')) {
            htmlEl.style.backgroundColor = companyColor;
          }
          if (style.includes('color:') && !style.includes('background')) {
            htmlEl.style.color = companyColor;
          }
        }
      });
      
      // Capture as canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        foreignObjectRendering: false,
      });
      
      // Cleanup
      document.body.removeChild(container);
      document.head.removeChild(styleOverride);
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pageHeight = 297;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `IT-Subscription-Form_${timestamp}.pdf`;
      
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

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

  const getCompanyLogo = (company: string): string | null => COMPANY_LOGOS[company] ?? null;

  const companyColor = getCompanyColor(formData.company);
  const companyLogo = getCompanyLogo(formData.company);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Hidden on print */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold">
                {isViewMode ? 'View IT Subscription Form' : 'IT Subscription Form'}
              </h2>
              <p className="text-sm text-gray-600">
                {isViewMode
                  ? `Created on ${new Date(formRecord.dateCreated).toLocaleDateString()}`
                  : 'License/Subscription Documentation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {!isViewMode && (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 print:p-12" id="asset-record-content">
            {/* Company Header */}
            <div className="text-center mb-8 pb-6">
              {companyLogo && (
                <div className="flex justify-center mb-4">
                  <img src={companyLogo} alt={`${formData.company} Logo`} className="h-15 object-contain" />
                </div>
              )}
              <h1 className="text-3xl font-bold mb-2 text-gray-900">
                IT SUBSCRIPTION FORM
              </h1>
              <p className="text-gray-600">License/Subscription Documentation</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Employee Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                  1. EMPLOYEE INFORMATION
                </h3>
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    {/* Row 1: Assigned to & ID No. */}
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100 w-1/4">
                        Assigned To:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900 w-1/4">
                        {isViewMode ? (
                          formData.assignedTo || '___________________________'
                        ) : (
                          <input
                            type="text"
                            value={formData.assignedTo}
                            onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            placeholder="Employee name"
                          />
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100 w-1/4">
                        ID No.:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900 w-1/4">
                        {isViewMode ? (
                          (formData as any).employeeId || '___________________________'
                        ) : (
                          <input
                            type="text"
                            value={(formData as any).employeeId || ''}
                            onChange={(e) => handleInputChange('employeeId', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            placeholder="Employee ID"
                          />
                        )}
                      </td>
                    </tr>
                    {/* Row 2: Position & Company */}
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                        Position:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {isViewMode ? (
                          formData.position || '___________________________'
                        ) : (
                          <input
                            type="text"
                            value={formData.position}
                            onChange={(e) => handleInputChange('position', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            placeholder="e.g., Software Engineer"
                          />
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                        Company:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900 font-semibold" style={{ color: companyColor }}>
                        {isViewMode ? (
                          formData.company
                        ) : (
                          <select
                            value={formData.company}
                            onChange={(e) => handleInputChange('company', e.target.value as Company)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none font-semibold"
                            style={{ color: companyColor }}
                          >
                            <option value="KHEALTH">KHEALTH</option>
                            <option value="CAREVIEW">CAREVIEW</option>
                            <option value="GLOWFIND">GLOWFIND</option>
                          </select>
                        )}
                      </td>
                    </tr>
                    {/* Row 3: Department & Location */}
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                        Department:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {isViewMode ? (
                          formData.department || '___________________________'
                        ) : (
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => handleInputChange('department', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            placeholder="e.g., IT Department"
                          />
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                        Location:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {isViewMode ? (
                          formData.location
                        ) : (
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            placeholder="e.g., Office - 3rd Floor"
                            required
                          />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Device Information */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                  2. DEVICE INFORMATION
                </h3>
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50 w-1/4">
                        Asset/Tag Number:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900 font-mono font-semibold" colSpan={3}>
                        {formData.deviceCode || `${formData.company}-${formData.category.toUpperCase()}-XXXXX (Auto-generated)`}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Item Description:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                        {isViewMode ? (
                          formData.name
                        ) : (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            placeholder="e.g., MacBook Pro 16&quot;"
                            required
                          />
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Brand/Model:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                        {isViewMode ? (
                          `${formData.brand} - ${formData.model}`
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={formData.brand}
                              onChange={(e) => handleInputChange('brand', e.target.value)}
                              className="flex-1 px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                              placeholder="Brand (e.g., Apple, Dell)"
                              required
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="text"
                              value={formData.model}
                              onChange={(e) => handleInputChange('model', e.target.value)}
                              className="flex-1 px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                              placeholder="Model (e.g., M3 Pro)"
                              required
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Serial Number:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900 font-mono" colSpan={3}>
                        {isViewMode ? (
                          formData.serialNumber
                        ) : (
                          <input
                            type="text"
                            value={formData.serialNumber}
                            onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none font-mono"
                            placeholder="Device serial number"
                            required
                          />
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Category:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                        {isViewMode ? (
                          <span className="capitalize">{formData.category}</span>
                        ) : (
                          <CategorySelector
                            value={formData.category}
                            onChange={(value) => handleInputChange('category', value)}
                            categories={categories}
                            onAddCategory={onAddCategory}
                            onDeleteCategory={onDeleteCategory}
                            defaultCategories={defaultCategories}
                          />
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Device Specs:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900 whitespace-pre-wrap" colSpan={3}>
                        {isViewMode ? (
                          formData.specifications || '___________________________'
                        ) : (
                          <textarea
                            value={formData.specifications}
                            onChange={(e) => handleInputChange('specifications', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            rows={2}
                            placeholder="e.g., 16GB RAM, 512GB SSD, M3 Pro Chip"
                          />
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Purchase Date:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {isViewMode ? (
                          new Date(formData.purchaseDate).toLocaleDateString()
                        ) : (
                          <DatePickerInput
                            value={formData.purchaseDate}
                            onChange={(value) => handleInputChange('purchaseDate', value)}
                            required
                          />
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Warranty Expiry:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {isViewMode ? (
                          formData.warrantyExpiry ? new Date(formData.warrantyExpiry).toLocaleDateString() : '_______________'
                        ) : (
                          <DatePickerInput
                            value={formData.warrantyExpiry}
                            onChange={(value) => handleInputChange('warrantyExpiry', value)}
                          />
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                        Remarks:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                        {isViewMode ? (
                          formData.notes || '___________________________'
                        ) : (
                          <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            className="w-full px-2 py-1 border-0 focus:ring-0 focus:outline-none"
                            rows={2}
                            placeholder="Additional notes or linked subscription/license information"
                          />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Terms and Agreement */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                  3. TERMS AND AGREEMENT
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-800 leading-relaxed mb-3">
                    By signing this form, I acknowledge and agree to the following terms and conditions regarding the licenses, subscriptions, and IT assets issued to me:
                  </p>
                  <ul className="text-sm text-gray-800 space-y-2 list-disc list-inside">
                    <li>I will use all issued licenses, subscriptions, and equipment solely for authorized work-related purposes in accordance with company policies.</li>
                    <li>I am responsible for maintaining the confidentiality of all login credentials, license keys, and subscription account information.</li>
                    <li>I will not share, transfer, or disclose license keys, subscription accounts, or equipment with unauthorized individuals.</li>
                    <li>I will immediately report any security incidents, unauthorized access attempts, or compromised credentials to the IT Department.</li>
                    <li>I understand that licenses and subscriptions are assigned to me personally and must not be used by others without authorization.</li>
                    <li>I will comply with all software license agreements, terms of service, and usage restrictions imposed by service providers.</li>
                    <li>I am responsible for the safekeeping and proper maintenance of any physical assets linked to these licenses/subscriptions.</li>
                    <li>I will return all equipment and surrender access to all licenses/subscriptions upon termination of employment or when requested by management.</li>
                    <li>I understand that misuse, unauthorized distribution, or violation of license terms may result in disciplinary action and financial liability.</li>
                    <li>All licenses, subscriptions, and equipment remain the property of {formData.company} and must be returned or deactivated upon request.</li>
                  </ul>
                </div>
              </div>

              {/* 4. Signatories */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                  4. SIGNATORIES
                </h3>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This form serves as proof of clearance from the IT Department for license/subscription accountability. 
                    Once both the IT personnel and Admin Manager have signed the Return Clearance section, the employee will be considered cleared of responsibility.
                  </p>
                </div>

                {/* Two-column layout for signatures */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - Issuance Approval */}
                  <div>
                    <div className="text-white text-center font-bold py-2 mb-4" style={{ backgroundColor: companyColor }}>
                      Issuance Approval:
                    </div>
                    
                    {/* Supervisor Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- Supervisor Signature: _______________________________</span>
                      </div>
                    </div>

                    {/* IT Personnel Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- IT Personnel Signature: _______________________________</span>
                      </div>
                    </div>

                    {/* Admin Manager Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- Admin Manager Signature: _______________________________</span>
                      </div>
                    </div>

                    {/* Employee Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- Employee Signature: _______________________________</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Return Clearance */}
                  <div>
                    <div className="text-white text-center font-bold py-2 mb-4" style={{ backgroundColor: companyColor }}>
                      Return Clearance:
                    </div>
                    
                    {/* Employee Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- Employee Signature: _______________________________</span>
                      </div>
                    </div>

                    {/* IT Personnel Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- IT Personnel Signature: _______________________________</span>
                      </div>
                      <p className="text-xs italic text-gray-600 ml-4 mt-1">(License/Subscription Deactivation Confirmed)</p>
                    </div>

                    {/* Admin Manager Signature */}
                    <div className="mb-3">
                      <div className="text-sm">
                        <span>- Admin Manager Signature: _______________________________</span>
                      </div>
                      <p className="text-xs italic text-gray-600 ml-4 mt-1">(Review and Confirmation)</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="text-left text-xs text-gray-900 mt-8 pt-6 border-t border-gray-200">
              <p className="font-bold">Asset Code: {formData.deviceCode || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0 {
            position: static;
          }
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .fixed {
            position: static;
          }
          .bg-black {
            background: transparent !important;
          }
          .rounded-lg {
            border-radius: 0;
          }
          .shadow-xl {
            box-shadow: none;
          }
          .max-w-4xl {
            max-width: 100%;
          }
          .overflow-y-auto {
            overflow: visible;
          }
          .max-h-\\[95vh\\] {
            max-height: none;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}