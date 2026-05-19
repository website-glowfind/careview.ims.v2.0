import { X, Printer, ArrowLeft, Download, FileDown, Save } from 'lucide-react';
import type { ITAsset, FormRecord } from '@/types/inventory';
import html2canvas from 'html2canvas';
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
  // Use assetData if provided (contains latest updates), otherwise use asset
  const data = assetData || asset;

  if (!data) {
    return null;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // Get the form element
    const element = document.getElementById('issuance-agreement-content');
    
    if (!element) return;
    
    try {
      // Clone the element to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 210mm;
        background: white;
      `;
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);
      
      // Force inline styles with explicit RGB colors
      const walkAndStyle = (node: Element) => {
        if (node instanceof HTMLElement) {
          const computed = window.getComputedStyle(node);
          
          // Apply explicit RGB colors based on class names and computed styles
          if (node.classList.contains('bg-white')) {
            node.style.backgroundColor = 'rgb(255, 255, 255)';
          } else if (node.classList.contains('bg-gray-50')) {
            node.style.backgroundColor = 'rgb(249, 250, 251)';
          } else if (node.classList.contains('bg-blue-900')) {
            node.style.backgroundColor = 'rgb(30, 58, 138)';
          } else if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            // Try to extract RGB from computed style
            const bgColor = computed.backgroundColor;
            if (bgColor.startsWith('rgb')) {
              node.style.backgroundColor = bgColor;
            } else {
              node.style.backgroundColor = 'transparent';
            }
          }
          
          // Text colors
          if (node.classList.contains('text-white')) {
            node.style.color = 'rgb(255, 255, 255)';
          } else if (node.classList.contains('text-gray-500')) {
            node.style.color = 'rgb(107, 114, 128)';
          } else if (node.classList.contains('text-gray-600')) {
            node.style.color = 'rgb(75, 85, 99)';
          } else if (node.classList.contains('text-gray-700')) {
            node.style.color = 'rgb(55, 65, 81)';
          } else if (node.classList.contains('text-gray-800')) {
            node.style.color = 'rgb(31, 41, 55)';
          } else if (node.classList.contains('text-gray-900')) {
            node.style.color = 'rgb(17, 24, 39)';
          } else if (computed.color) {
            const color = computed.color;
            if (color.startsWith('rgb')) {
              node.style.color = color;
            } else {
              node.style.color = 'rgb(17, 24, 39)';
            }
          }
          
          // Border colors
          if (node.classList.contains('border-gray-200')) {
            node.style.borderColor = 'rgb(229, 231, 235)';
          } else if (node.classList.contains('border-gray-300')) {
            node.style.borderColor = 'rgb(209, 213, 219)';
          } else if (node.classList.contains('border-gray-400')) {
            node.style.borderColor = 'rgb(156, 163, 175)';
          } else if (computed.borderTopColor && computed.borderTopColor.startsWith('rgb')) {
            node.style.borderColor = computed.borderTopColor;
          }
          
          // Copy other important styles
          node.style.fontFamily = computed.fontFamily;
          node.style.fontSize = computed.fontSize;
          node.style.fontWeight = computed.fontWeight;
          node.style.lineHeight = computed.lineHeight;
        }
        
        // Recursively style children
        Array.from(node.children).forEach(walkAndStyle);
      };
      
      walkAndStyle(clonedElement);
      
      // Wait for styles to settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capture with html2canvas
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        windowHeight: 1132
      });
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Download the PDF
      pdf.save(`Asset_Issuance_${data.deviceCode}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try using Print instead.');
    }
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
      formData: data, // Store complete asset data for viewing
    };

    onSaveFormRecord(formRecord);
    alert('Form record saved successfully!');
  };

  // Company logo and color mapping
  const companyLogo = data.company === 'KHEALTH' ? '/khealthlogo.png' : 
                       data.company === 'CAREVIEW' ? '/careviewlogo.png' : 
                       '/khealthlogo.png';
  
  const companyColor = data.company === 'KHEALTH' ? '#2563eb' : 
                        data.company === 'CAREVIEW' ? '#16a34a' : 
                        '#ea580c';

  const companyName = data.company === 'KHEALTH' ? 'KHEALTH CORPORATION' :
                       data.company === 'CAREVIEW' ? 'CAREVIEW COMMUNICATIONS' :
                       'GLOWFIND';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header - No Print */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden bg-gray-50">
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Printable Content */}
          <div id="issuance-agreement-content" className="bg-white print:p-8">
            {/* Header Section */}
            <div className="mb-6 pb-4 border-b-2" style={{ borderColor: companyColor }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img src={companyLogo} alt="Company Logo" className="h-16 w-auto" />
                </div>
                
                {/* QR Code in Header - Print Optimized */}
                <div className="print:block hidden">
                  <QRCodeDisplay
                    deviceCode={data.deviceCode || ''}
                    size={80}
                    showDownload={false}
                    showLabel={false}
                  />
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-1">IT ASSET ISSUANCE AGREEMENT</h2>
                <p className="text-sm text-gray-600">Acknowledgement Form</p>
              </div>
            </div>

            {/* 1. Employee Information */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                1. EMPLOYEE INFORMATION
              </h3>
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50 w-1/4">
                      Name:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {data.assignedTo || '___________________________'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50 w-1/4">
                      ID No.:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {(data as any).employeeId || '___________________________'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                      Position:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {data.position || '___________________________'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                      Department:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {data.department || '___________________________'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                      Company:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {data.company}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                      Location:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {data.location || '___________________________'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Device Information with QR Code */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                2. DEVICE INFORMATION
              </h3>
              <div className="flex gap-4">
                {/* Device Details Table */}
                <div className="flex-1">
                  <table className="w-full border-collapse border border-gray-300">
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50 w-1/3">
                          Asset/Tag Number:
                        </td>
                        <td className="border border-gray-300 px-4 py-2" colSpan={3}>
                          <div className="bg-white border rounded-md px-3 py-2" style={{ borderColor: `${companyColor}33` }}>
                            <p className="text-lg font-mono font-bold" style={{ color: companyColor }}>
                              {data.deviceCode}
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                          Item Description:
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                          {data.name}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                          Brand/Model:
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                          {data.brand} - {data.model}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                          Serial Number:
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-900 font-mono" colSpan={3}>
                          {data.serialNumber}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                          Device Specs:
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-900 whitespace-pre-wrap" colSpan={3}>
                          {data.specifications || '___________________________'}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                          Remarks:
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-gray-900" colSpan={3}>
                          {data.notes || '___________________________'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* QR Code Section - Screen Only */}
                <div className="print:hidden flex-shrink-0">
                  <QRCodeDisplay
                    deviceCode={data.deviceCode || ''}
                    size={140}
                    showDownload={true}
                    showLabel={true}
                  />
                </div>
              </div>
            </div>

            {/* 3. Terms and Conditions */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                3. TERMS AND CONDITIONS
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  I acknowledge receipt of the above-mentioned IT asset(s) and agree to the following terms and conditions:
                </p>
                <ol className="list-decimal ml-6 space-y-1">
                  <li>The asset remains the property of {companyName} and is issued for official use only.</li>
                  <li>I will take reasonable care of the asset and protect it from damage, loss, or theft.</li>
                  <li>I will not make unauthorized modifications, installations, or removal of hardware/software.</li>
                  <li>I will report any malfunction, damage, or loss immediately to the IT Department.</li>
                  <li>I will return the asset in good working condition upon request or upon termination of employment.</li>
                  <li>I understand that I may be held liable for any loss, damage, or unauthorized use of the asset.</li>
                  <li>I will comply with all company IT policies and procedures regarding the use of this asset.</li>
                </ol>
              </div>
            </div>

            {/* 4. Acknowledgement and Signatures */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: companyColor }}>
                4. ACKNOWLEDGEMENT
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {/* Employee Signature */}
                <div>
                  <div className="mb-12 flex flex-col gap-2">
                    <div className='px-4 py-1 mb-2 bg-blue-900 text-center'>
                      <span className='text-white font-bold'> Issuance Approval: </span>
                    </div>
                    <div className=" flex flex-row gap-1 mb-2 border-gray-400 w-full">
                        <span className=" text-sm text-gray-900">- Supervisor Signature: ________________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                    </div>
                    <div className=" flex flex-row gap-1 mb-2 border-gray-400  w-full">
                        <span className=" text-sm text-gray-900">- IT Personnel Signature: ______________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                    </div>
                    <div className=" flex flex-row gap-1 mb-2 border-gray-400  w-full">
                        <span className=" text-sm text-gray-900">- Admin Manager Signature: ___________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                    </div>
                    <div className=" flex flex-row gap-1 mb-2 border-gray-400  w-full">
                        <span className=" text-sm text-gray-900">- Employee Signature: _________________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                    </div>
                  </div>
                </div>

                {/* IT Department Representative */}
                <div>
                  <div className="mb-12 flex flex-col gap-2">
                    <div className='px-4 py-1 mb-2 bg-blue-900 text-center'>
                      <span className='text-white font-bold '> Return Clearance: </span>
                    </div>
                    <div className=" flex flex-row gap-1 mb-2 border-gray-400  w-full">
                        <span className=" text-sm text-gray-900">- Employee Signature: _________________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                    </div>
                    <div className=" flex flex-row gap-1 mb-2 border-gray-400  w-full">
                        <span className=" text-sm text-gray-900">- IT Personnel Signature: ______________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                    </div>
                    <div className=" flex relative flex-row gap-1 mb-2 border-gray-400  w-full">
                        <span className=" text-sm text-gray-900">- Admin Manager Signature: ___________________  </span>
                        <span className="text-sm text-gray-600 ">Date: _______</span>
                        <p className='absolute top-4 italic font-bold'>(Review and Confirmation)</p>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>Asset Code: {data.deviceCode}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons - No Print */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 bg-gray-50 print:hidden">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
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

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #issuance-agreement-content,
          #issuance-agreement-content * {
            visibility: visible;
          }
          #issuance-agreement-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}