import { useRef } from 'react';
import { X, ArrowRightLeft, Building2, Printer } from 'lucide-react';
import { getCompanyBadgeClasses, getCompanyLogo } from '@/utils/device-code';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface TransferFormViewerProps {
  formData: any;
  onClose: () => void;
  isReadOnly?: boolean;
}

export function TransferFormViewer({ formData, onClose, isReadOnly = true }: TransferFormViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    if (!printRef.current) return;

    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Transfer-Form-${formData.deviceCode}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const fromCompanyColor =
    formData.fromCompany === 'KHEALTH'
      ? 'rgb(59, 130, 246)'
      : formData.fromCompany === 'CAREVIEW'
      ? 'rgb(34, 197, 94)'
      : 'rgb(249, 115, 22)';

  const toCompanyColor =
    formData.toCompany === 'KHEALTH'
      ? 'rgb(59, 130, 246)'
      : formData.toCompany === 'CAREVIEW'
      ? 'rgb(34, 197, 94)'
      : 'rgb(249, 115, 22)';

  const fromCompanyLogo = COMPANY_LOGOS[formData.fromCompany] ?? null;
  const toCompanyLogo = COMPANY_LOGOS[formData.toCompany] ?? null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">IT Asset Transfer Form - View Mode</h2>
              <p className="text-sm text-blue-100">
                {isReadOnly ? 'This is a read-only record from Form Masterlist' : 'Form Preview'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div ref={printRef} className="bg-white max-w-4xl mx-auto">
            {/* Form Header */}
            <div className="border-4 border-gray-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src={fromCompanyLogo} alt={formData.fromCompany} className="h-12 w-auto" />
                  <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                  <img src={toCompanyLogo} alt={formData.toCompany} className="h-12 w-auto" />
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-gray-900">IT ASSET TRANSFER FORM</h1>
                  <p className="text-sm text-gray-600 mt-1">Asset Code: {formData.deviceCode}</p>
                </div>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Transfer Date:</label>
                    <p className="text-sm font-semibold text-gray-900">{new Date(formData.transferDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Document ID:</label>
                    <p className="text-sm font-mono font-semibold text-gray-900">TRF-{formData.deviceCode}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">TRANSFER DETAILS</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">
                      From Company:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold" style={{ color: fromCompanyColor }}>
                      {formData.fromCompany}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      To Company:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold" style={{ color: toCompanyColor }}>
                      {formData.toCompany}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Transfer Date:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {new Date(formData.transferDate).toLocaleDateString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Asset Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">ASSET INFORMATION</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">
                      Asset Code:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-mono font-semibold text-gray-900">
                      {formData.deviceCode}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Asset Name:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">{formData.assetName}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Category:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 capitalize">{formData.category}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Brand & Model:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.brand} {formData.model}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Serial Number:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-gray-900">{formData.serialNumber}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Assigned To:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">{formData.assignedTo || 'Unassigned'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Department:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">{formData.department || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Transfer Reason & Details */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">TRANSFER REASON & AUTHORIZATION</h3>
              <table className="w-full border-collapse border-2 border-gray-800">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700 w-1/3">
                      Reason for Transfer:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.reason || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Transferred By:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.transferredBy || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Approved By:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.approvedBy || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Received By:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {formData.receivedBy || 'N/A'}
                    </td>
                  </tr>
                  {formData.notes && (
                    <tr>
                      <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                        Additional Notes:
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-900">
                        {formData.notes}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-4 text-center">
              <p className="text-xs text-gray-600">
                Asset Code: {formData.deviceCode}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
