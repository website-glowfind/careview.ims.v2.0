import { useRef } from 'react';
import { X, Printer, ArrowLeft, Download, Save } from 'lucide-react';
import type { ITAsset, FormRecord } from '@/types/inventory';
import { getCompanyLogo, getCompanyHexColor } from '@/utils/device-code';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { QRCodeDisplay } from '@/components/qr-code-display';

interface IssuanceAgreementProps {
  asset?: ITAsset;
  assetData?: Omit<ITAsset, 'id'>;
  onClose: () => void;
  currentUser?: string;
  onSaveFormRecord?: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  isReadOnly?: boolean;
}

export function IssuanceAgreement({ asset, assetData, onClose, currentUser, onSaveFormRecord, isReadOnly }: IssuanceAgreementProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const data = assetData || asset;

  if (!data) return null;

  // GLOWFIND uses the same form/branding as CAREVIEW
  const brandCompany = data.company === 'GLOWFIND' ? 'CAREVIEW' : data.company;

  const companyLogo  = getCompanyLogo(brandCompany) ?? '/logo.png';
  const companyColor = getCompanyHexColor(brandCompany);

  const companyName = brandCompany === 'KHEALTH' ? 'KHEALTH CORPORATION' :
                       brandCompany === 'CAREVIEW' ? 'CAREVIEW COMMUNICATIONS' :
                       'GLOWFIND';

  const generatePDF = async (): Promise<jsPDF | null> => {
    const element = contentRef.current;
    if (!element) { console.error('contentRef not attached'); return null; }

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

      if (imgHeight <= pageHeight * 1.15) {
        // The form fits (or nearly fits) one page — scale it onto a single page
        // so nothing gets split across the page boundary (e.g. the Asset Code footer).
        const h = Math.min(imgHeight, pageHeight);
        const w = pageWidth * (h / imgHeight);
        const x = (pageWidth - w) / 2;
        pdf.addImage(imgData, 'PNG', x, 0, w, h);
      } else {
        // Genuinely multi-page content — slice across pages.
        let y = 0;
        while (y < imgHeight) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -y, pageWidth, imgHeight);
          y += pageHeight;
        }
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

  const handleDownload = async () => {
    const pdf = await generatePDF();
    if (!pdf) return;
    pdf.save(`Asset_Issuance_${data.deviceCode}_${data.assignedTo}.pdf`);
  };

  const handleSaveRecord = () => {
    if (!onSaveFormRecord || !currentUser) return;

    const formRecord: Omit<FormRecord, 'id' | 'dateCreated'> = {
      formType: 'Asset Issuance',
      assetTag: data.deviceCode || '',
      referenceId: `ISS-${data.deviceCode}-${Date.now()}`,
      employeeName: data.assignedTo || '',
      department: data.department || '',
      company: data.company,
      status: 'Active',
      details: `Asset: ${data.name} | Category: ${data.category} | S/N: ${data.serialNumber}`,
      createdBy: currentUser,
      relatedAssetId: asset?._id,
      formData: data,
    };

    onSaveFormRecord(formRecord);
    alert('Form record saved successfully!');
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">IT Asset Issuance Agreement</h2>
              <p className="text-sm text-gray-600">Review and print asset issuance form</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
          <div ref={contentRef} className="bg-white px-8 pt-3 pb-8">
            {/* Header Section — logo, title, and QR aligned on one row */}
            <div className="flex justify-between items-center gap-4 pb-4 mb-6" style={{ borderBottom: `2px solid ${companyColor}` }}>
              <img src={companyLogo} alt="Company Logo" className="h-16 w-auto flex-shrink-0" />
              <div className="text-center">
                <h2 className="text-base font-bold leading-tight">IT ASSET ISSUANCE AGREEMENT</h2>
                <p className="text-xs text-gray-500 mt-1">Acknowledgement Form</p>
              </div>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <QRCodeDisplay asset={data as ITAsset} size={90} showDownload={false} showLabel={false} />
              </div>
            </div>

            {/* 1. Employee Information */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              1. EMPLOYEE INFORMATION
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-5">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">Name:</td>
                  <td className="border border-gray-300 px-3 py-2">{data.assignedTo || '___________________________'}</td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">ID No.:</td>
                  <td className="border border-gray-300 px-3 py-2">{data.employeeId || '___________________________'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Position:</td>
                  <td className="border border-gray-300 px-3 py-2">{data.position || '___________________________'}</td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Department:</td>
                  <td className="border border-gray-300 px-3 py-2">{data.department || '___________________________'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Company:</td>
                  <td className="border border-gray-300 px-3 py-2">{data.company}</td>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Location:</td>
                  <td className="border border-gray-300 px-3 py-2">{data.location || '___________________________'}</td>
                </tr>
              </tbody>
            </table>

            {/* 2. Device Information */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              2. DEVICE INFORMATION
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-xs mb-5">
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">Asset/Tag Number:</td>
                  <td className="border border-gray-300 px-3 py-2 font-mono font-bold" style={{ color: companyColor }} colSpan={3}>
                    {data.deviceCode}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Item Description:</td>
                  <td className="border border-gray-300 px-3 py-2" colSpan={3}>{data.name}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Brand/Model:</td>
                  <td className="border border-gray-300 px-3 py-2" colSpan={3}>{data.brand} / {data.model}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Serial Number:</td>
                  <td className="border border-gray-300 px-3 py-2 font-mono" colSpan={3}>{data.serialNumber}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Device Specs:</td>
                  <td className="border border-gray-300 px-3 py-2 whitespace-pre-wrap" colSpan={3}>
                    {data.specifications || '___________________________'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">Remarks:</td>
                  <td className="border border-gray-300 px-3 py-2" colSpan={3}>{data.notes || '___________________________'}</td>
                </tr>
              </tbody>
            </table>

            {/* 3. Terms and Conditions */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              3. TERMS AND CONDITIONS
            </h3>
            <div className="text-xs text-gray-700 mb-5 space-y-1">
              <p>I acknowledge receipt of the above-mentioned IT asset(s) and agree to the following terms and conditions:</p>
              <ol className="list-decimal ml-5 space-y-0.5">
                <li>The asset remains the property of {companyName} and is issued for official use only.</li>
                <li>I will take reasonable care of the asset and protect it from damage, loss, or theft.</li>
                <li>I will not make unauthorized modifications, installations, or removal of hardware/software.</li>
                <li>I will report any malfunction, damage, or loss immediately to the IT Department.</li>
                <li>I will return the asset in good working condition upon request or upon termination of employment.</li>
                <li>I understand that I may be held liable for any loss, damage, or unauthorized use of the asset.</li>
                <li>I will comply with all company IT policies and procedures regarding the use of this asset.</li>
              </ol>
            </div>

            {/* 4. Acknowledgement */}
            <h3 className="text-sm font-bold mb-3 pb-1" style={{ borderBottom: `2px solid ${companyColor}` }}>
              4. ACKNOWLEDGEMENT
            </h3>
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <div className="bg-blue-900 text-white text-center font-bold py-1 px-3 mb-3">Issuance Approval:</div>
                {['Supervisor Signature', 'IT Personnel Signature', 'Admin Manager Signature', 'Employee Signature'].map((role) => (
                  <div key={role} className="flex items-end gap-2 mb-2.5">
                    <span className="whitespace-nowrap">- {role}:</span>
                    <span className="flex-1 border-b border-gray-500" />
                    <span className="text-gray-600 whitespace-nowrap">Date:</span>
                    <span className="w-12 border-b border-gray-500" />
                  </div>
                ))}
              </div>
              <div>
                <div className="bg-blue-900 text-white text-center font-bold py-1 px-3 mb-3">Return Clearance:</div>
                {['Employee Signature', 'IT Personnel Signature', 'Admin Manager Signature'].map((role) => (
                  <div key={role} className="flex items-end gap-2 mb-2.5">
                    <span className="whitespace-nowrap">- {role}:</span>
                    <span className="flex-1 border-b border-gray-500" />
                    <span className="text-gray-600 whitespace-nowrap">Date:</span>
                    <span className="w-12 border-b border-gray-500" />
                  </div>
                ))}
                <div className="italic font-bold mt-1">(Review and Confirmation)</div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-3 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>Asset Code: {data.deviceCode}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex gap-2">
            {!isReadOnly && onSaveFormRecord && currentUser && (
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Record
              </button>
            )}
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
      </div>
    </div>
  );
}
