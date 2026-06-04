import { X, Download, Printer, Key, Calendar, User, Building2, FileText, Package } from 'lucide-react';
import { getCompanyLogo, getCompanyBgClass } from '@/utils/device-code';
import { downloadPDF, printPDF } from '@/utils/pdf';
import type { Company } from '@/types/inventory';
import { useState, useRef } from 'react';

interface LicenseSubscriptionFormViewerProps {
  subscription: {
    id: string;
    referenceCode: string;
    type: 'License' | 'Subscription';
    employeeName?: string;
    position?: string;
    company: Company;
    branch?: string;
    department?: string;
    licenseKey?: string;
    numberOfSeats?: number;
    subscriptionName?: string;
    accountNumber?: string;
    accountDescription?: string;
    accountName?: string;
    accountEmail?: string;
    name: string;
    provider: string;
    planType?: string;
    deviceId?: string;
  };
  linkedAsset?: {
    deviceCode: string;
    name: string;
  };
  onClose: () => void;
}

export function LicenseSubscriptionFormViewer({ subscription, linkedAsset, onClose }: LicenseSubscriptionFormViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<'License' | 'Subscription'>(subscription.type);

  const handleDownloadPDF = async () => {
    if (contentRef.current)
      await downloadPDF(contentRef.current, `${subscription.type}-Form-${subscription.referenceCode}.pdf`);
  };

  const handlePrint = async () => {
    if (contentRef.current) await printPDF(contentRef.current);
  };

  const getCompanyBgColor = getCompanyBgClass;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {subscription.type === 'License' ? (
              <Key className="w-6 h-6 text-blue-600" />
            ) : (
              <Calendar className="w-6 h-6 text-purple-600" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {subscription.type} Form - View
              </h2>
              <p className="text-sm text-gray-600 font-mono">{subscription.referenceCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div ref={contentRef} className="bg-white max-w-4xl mx-auto">
            {/* Form Header */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-6">
              {/* Company Logo and Title */}
              <div className="flex items-center justify-between p-6 bg-gray-50 border-b-2 border-gray-300">
                <div className="flex items-center gap-4">
                  {getCompanyLogo(subscription.company) && (
                    <img 
                      src={getCompanyLogo(subscription.company)} 
                      alt={`${subscription.company} Logo`}
                      className="h-12 w-auto object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {subscription.company}
                    </h1>
                    <p className="text-sm text-gray-600 mt-0.5">IT Asset Management System</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-lg ${
                    selectedType === 'License' 
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-600' 
                      : 'bg-purple-100 text-purple-800 border-2 border-purple-600'
                  }`}>
                    {selectedType.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Type Selector */}
              <div className="px-6 py-4 bg-white border-b-2 border-gray-300">
                <div className="flex items-center justify-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">View Type:</label>
                  <div className="inline-flex rounded-lg border-2 border-gray-300 bg-gray-50 p-1">
                    <button
                      onClick={() => setSelectedType('License')}
                      className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                        selectedType === 'License'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        License
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedType('Subscription')}
                      className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                        selectedType === 'Subscription'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Subscription
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Title */}
              <div className={`p-4 text-white ${getCompanyBgColor(subscription.company)}`}>
                <h2 className="text-xl font-bold text-center">
                  {selectedType === 'License' 
                    ? 'SOFTWARE LICENSE AGREEMENT FORM' 
                    : 'SUBSCRIPTION SERVICE AGREEMENT FORM'}
                </h2>
              </div>

              {/* Reference Code */}
              <div className="p-4 bg-gray-100 border-t border-gray-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">Reference Code:</span>
                  </div>
                  <span className="text-base font-mono font-bold text-gray-900">{subscription.referenceCode}</span>
                </div>
              </div>
            </div>

            {/* Employee Information Section */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-6">
              <div className={`px-4 py-3 text-white ${getCompanyBgColor(subscription.company)}`}>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <User className="w-5 h-5" />
                  EMPLOYEE INFORMATION
                </h3>
              </div>
              
              <div className="p-6">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 w-1/3">
                        Assigned To:
                      </td>
                      <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                        {subscription.employeeName || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                        ID No.:
                      </td>
                      <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                        {(subscription as any).employeeId || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                        Position:
                      </td>
                      <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                        {subscription.position || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                        Company:
                      </td>
                      <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                        {subscription.company}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                        Department:
                      </td>
                      <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                        {subscription.department || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">
                        Location:
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {subscription.branch || 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* License Details Section */}
            {selectedType === 'License' && (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-6">
                <div className={`px-4 py-3 text-white ${getCompanyBgColor(subscription.company)}`}>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    LICENSE DETAILS
                  </h3>
                </div>
                
                <div className="p-6">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 w-1/3">
                          Service Provider
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.provider}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          License Name
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.name}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          License Key / Code
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-mono font-medium">
                          {subscription.licenseKey || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Number of Seats
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.numberOfSeats || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">
                          Device Link / Code
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {linkedAsset ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-700">{linkedAsset.deviceCode}</span>
                              <span className="text-gray-600">-</span>
                              <span className="text-gray-700">{linkedAsset.name}</span>
                            </div>
                          ) : 'No Device Linked'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Subscription Details Section */}
            {selectedType === 'Subscription' && (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-6">
                <div className={`px-4 py-3 text-white ${getCompanyBgColor(subscription.company)}`}>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    SUBSCRIPTION DETAILS
                  </h3>
                </div>
                
                <div className="p-6">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700 w-1/3">
                          Service Provider
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.provider}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Subscription Name
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.subscriptionName || subscription.name}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Plan Type
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.planType || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Account No.
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-mono font-medium">
                          {subscription.accountNumber || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Account Description
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.accountDescription || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Account Name
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.accountName || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-gray-300 bg-gray-50 font-semibold text-gray-700">
                          Account Email
                        </td>
                        <td className="py-3 px-4 border-b border-gray-300 text-gray-900 font-medium">
                          {subscription.accountEmail || 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50 font-semibold text-gray-700">
                          Device Link / Code
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {linkedAsset ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-purple-700">{linkedAsset.deviceCode}</span>
                              <span className="text-gray-600">-</span>
                              <span className="text-gray-700">{linkedAsset.name}</span>
                            </div>
                          ) : 'No Device Linked'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Terms, Agreement & Signatories Section */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden mb-6">
              <div className={`px-4 py-3 text-white ${getCompanyBgColor(subscription.company)}`}>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  TERMS, AGREEMENT & ACKNOWLEDGMENT
                </h3>
              </div>
              
              <div className="p-6">
                <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                  <p className="text-justify leading-relaxed">
                    I hereby acknowledge receipt of the {selectedType.toLowerCase()} detailed above and agree to the following terms and conditions:
                  </p>
                  
                  <ol className="list-decimal list-outside ml-6 space-y-3">
                    <li className="text-justify leading-relaxed">
                      <strong>Usage Rights:</strong> The {selectedType.toLowerCase()} is provided for business purposes only and must be used in accordance with company policies and applicable laws.
                    </li>
                    <li className="text-justify leading-relaxed">
                      <strong>Responsibility:</strong> I am responsible for maintaining the confidentiality of any access credentials, license keys, or account information provided.
                    </li>
                    <li className="text-justify leading-relaxed">
                      <strong>Restrictions:</strong> I shall not share, transfer, or distribute the {selectedType.toLowerCase()} or related credentials to unauthorized parties.
                    </li>
                    <li className="text-justify leading-relaxed">
                      <strong>Compliance:</strong> I agree to comply with all terms and conditions set forth by the service provider and the company's IT policies.
                    </li>
                    <li className="text-justify leading-relaxed">
                      <strong>Return Policy:</strong> Upon termination of employment or assignment change, I agree to return all access and cease using the {selectedType.toLowerCase()} immediately.
                    </li>
                    <li className="text-justify leading-relaxed">
                      <strong>Liability:</strong> I understand that misuse or unauthorized use of the {selectedType.toLowerCase()} may result in disciplinary action and potential legal consequences.
                    </li>
                  </ol>

                  <p className="text-justify leading-relaxed mt-6">
                    By signing below, I confirm that I have read, understood, and agree to abide by the terms and conditions outlined in this agreement.
                  </p>
                </div>
              </div>
            </div>

            {/* Signatories Section */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <div className={`px-4 py-3 text-white ${getCompanyBgColor(subscription.company)}`}>
                <h3 className="font-bold text-base">SIGNATORIES</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-8">
                  {/* Employee Signature */}
                  <div>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">RECEIVED BY:</p>
                      <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
                      <p className="text-sm font-bold text-gray-900 text-center">{subscription.employeeName || '_____________________'}</p>
                      <p className="text-xs text-gray-600 text-center mt-1">Employee Name & Signature</p>
                    </div>
                    <div>
                      <div className="border-b-2 border-gray-400 pb-8 mb-2"></div>
                      <p className="text-xs text-gray-600 text-center">Date</p>
                    </div>
                  </div>

                  {/* IT Department Signature */}
                  <div>
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">ISSUED BY:</p>
                      <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
                      <p className="text-sm font-bold text-gray-900 text-center">IT DEPARTMENT</p>
                      <p className="text-xs text-gray-600 text-center mt-1">Authorized Personnel</p>
                    </div>
                    <div>
                      <div className="border-b-2 border-gray-400 pb-8 mb-2"></div>
                      <p className="text-xs text-gray-600 text-center">Date</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              <p>This is a system-generated document from the IT Asset Management System</p>
              <p className="mt-1">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}