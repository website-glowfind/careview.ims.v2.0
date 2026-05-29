import { X, Download, Printer } from 'lucide-react';
const COMPANY_LOGOS: Record<string, string> = {
  KHEALTH: '/khealthlogo.png',
  CAREVIEW: '/logo.png',
  GLOWFIND: '/glowfindName.png',
};
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DisposalFormViewerProps {
  formData: any;
  onClose: () => void;
  isReadOnly?: boolean;
}

export function DisposalFormViewer({ formData, onClose, isReadOnly = false }: DisposalFormViewerProps) {
  const handleDownloadPDF = async () => {
    const previewElement = document.getElementById('disposal-form-view');
    if (!previewElement) return;

    try {
      const clone = previewElement.cloneNode(true) as HTMLElement;
      document.body.appendChild(clone);
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        const element = el as HTMLElement;
        const computed = window.getComputedStyle(element);
        
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
      pdf.save(`IT-Asset-Disposal-Form-${formData.disposalDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCompanyLogo = (company: string): string | null => COMPANY_LOGOS[company] ?? null;

  const getCompanyColor = (company: string) => {
    switch (company) {
      case 'KHEALTH':
        return '#3B82F6';
      case 'CAREVIEW':
        return '#10B981';
      case 'GLOWFIND':
        return '#F97316';
      default:
        return '#6B7280';
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

  const company = formData.company || 'KHEALTH';
  const companyLogo = getCompanyLogo(company);
  const companyColor = getCompanyColor(company);
  const companyBgColor = getCompanyBgColor(company);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">IT Asset Disposal Form - View Mode</h2>
            <p className="text-sm text-gray-600">
              {isReadOnly ? 'This is a read-only record from Form Masterlist' : 'Form Preview'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div id="disposal-form-view" className="bg-white p-8 max-w-4xl mx-auto">
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
                  {/* Row 1: Assigned To & ID No. */}
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100 w-1/4">
                      Assigned To:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 w-1/4">
                      {formData.employeeName || '___________________________'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100 w-1/4">
                      ID No.:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 w-1/4">
                      {(formData as any).employeeId || '___________________________'}
                    </td>
                  </tr>
                  {/* Row 2: Position & Company */}
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Position:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.employeePosition || '___________________________'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Company:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 font-semibold" style={{ color: companyColor }}>
                      {company}
                    </td>
                  </tr>
                  {/* Row 3: Department & Location */}
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Department:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.department || '___________________________'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Location:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.location || '___________________________'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Asset Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                2. ASSET INFORMATION
              </h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className={`${companyBgColor} text-white`}>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Asset Code</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Asset Name</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Brand/Model</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold">Serial Number</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-300 px-4 py-2 text-sm font-mono font-semibold">
                      {formData.assetCode || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {formData.assetName || '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm">
                      {formData.brand && formData.model ? `${formData.brand} - ${formData.model}` : '-'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-sm font-mono">
                      {formData.serialNumber || '-'}
                    </td>
                  </tr>
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
                      {formData.disposalReason || formData.itemReason || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Disposal Method:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.disposalMethod || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                      Disposal Date:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.disposalDate ? new Date(formData.disposalDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                  {formData.quantity && (
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-100">
                        Quantity:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {formData.quantity}
                      </td>
                    </tr>
                  )}
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

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="bg-blue-600 text-white text-center font-bold py-2 mb-4">
                    Disposal Approval:
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- Supervisor Signature:</span>
                    </div>
                    <div className="border-b-2 border-gray-900 mt-8 mb-1"></div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- IT Personnel Signature:</span>
                    </div>
                    <div className="border-b-2 border-gray-900 mt-8 mb-1"></div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- Admin Manager Signature:</span>
                    </div>
                    <div className="border-b-2 border-gray-900 mt-8 mb-1"></div>
                  </div>
                </div>

                <div>
                  <div className="bg-blue-600 text-white text-center font-bold py-2 mb-4">
                    Disposal Confirmation:
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm">
                      <span>- IT Head Signature:</span>
                    </div>
                    <p className="text-xs italic text-gray-600 ml-4 mt-1">(Data Sanitization Verified)</p>
                    <div className="border-b-2 border-gray-900 mt-6 mb-1"></div>
                  </div>

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
              <p className="font-bold">KHC-CVC-PM-003</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #disposal-form-view, #disposal-form-view * {
            visibility: visible;
          }
          #disposal-form-view {
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