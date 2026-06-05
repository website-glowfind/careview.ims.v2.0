import { useState, useRef } from 'react';
import { X, ArrowRightLeft, Printer } from 'lucide-react';
import type { ITAsset, Company, FormRecord } from '@/types/inventory';
import { getCompanyBadgeClasses, getCompanyLogo, getCompanyHexColor } from '@/utils/device-code';
import { downloadPDF, printPDF } from '@/utils/pdf';

interface TransferFormProps {
  asset: ITAsset;
  onTransfer: (assetId: string, toCompany: Company) => void;
  onCancel: () => void;
  currentUser: string;
  onSaveFormRecord?: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
}

export function TransferForm({ asset, onTransfer, onCancel, currentUser, onSaveFormRecord }: TransferFormProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [toCompany, setToCompany] = useState<Company>(
    asset.company === 'KHEALTH' ? 'CAREVIEW' : 'KHEALTH'
  );
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [transferredBy, setTransferredBy] = useState(currentUser);
  const [approvedBy, setApprovedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');

  const fromCompany = asset.company;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save to Form Masterlist
    if (onSaveFormRecord) {
      const formData = {
        deviceCode: asset.deviceCode,
        assetName: asset.name,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        fromCompany,
        toCompany,
        transferDate,
        reason,
        transferredBy,
        approvedBy,
        receivedBy,
        notes,
        assignedTo: asset.assignedTo,
        department: asset.department,
      };

      onSaveFormRecord({
        formType: 'Asset Transfer',
        assetTag: asset.deviceCode,
        employeeName: asset.assignedTo,
        department: asset.department,
        company: toCompany, // New company after transfer
        status: 'Completed',
        details: `Transferred from ${fromCompany} to ${toCompany}. Reason: ${reason}`,
        createdBy: currentUser,
        relatedAssetId: asset._id,
        formData,
      });
    }

    // Execute the transfer
    onTransfer(asset._id!, toCompany);
  };

  const handlePrint = async () => {
    if (printRef.current) await printPDF(printRef.current);
  };

  const handleDownload = async () => {
    if (printRef.current) await downloadPDF(printRef.current, `Transfer-Form-${asset.deviceCode}.pdf`);
  };

  const fromCompanyColor = getCompanyHexColor(fromCompany);
  const toCompanyColor   = getCompanyHexColor(toCompany);
  const fromCompanyLogo  = getCompanyLogo(fromCompany);
  const toCompanyLogo    = getCompanyLogo(toCompany);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#162236] rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border dark:border-[#1e3a5f]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">IT Asset Transfer Form</h2>
              <p className="text-sm text-blue-100">Company Transfer Documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2 text-sm"
            >
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onCancel}
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
                  <img src={fromCompanyLogo} alt={fromCompany} className="h-12 w-auto" />
                  <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                  <img src={toCompanyLogo} alt={toCompany} className="h-12 w-auto" />
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-gray-900">IT ASSET TRANSFER FORM</h1>
                  <p className="text-sm text-gray-600 mt-1">Asset Code: {asset.deviceCode}</p>
                </div>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Transfer Date:</label>
                    <p className="text-sm font-semibold text-gray-900">{new Date(transferDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase">Document ID:</label>
                    <p className="text-sm font-mono font-semibold text-gray-900">TRF-{asset.deviceCode}-{Date.now()}</p>
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
                      {fromCompany}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      To Company:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold" style={{ color: toCompanyColor }}>
                      <select
                        value={toCompany}
                        onChange={(e) => setToCompany(e.target.value as Company)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: toCompanyColor }}
                        required
                      >
                        <option value="KHEALTH">KHEALTH</option>
                        <option value="CAREVIEW">CAREVIEW</option>
                        <option value="GLOWFIND">GLOWFIND</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Transfer Date:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
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
                      {asset.deviceCode}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Asset Name:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">{asset.name}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Category:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900 capitalize">{asset.category}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Brand & Model:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      {asset.brand} {asset.model}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Serial Number:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-gray-900">{asset.serialNumber}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Assigned To:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">{asset.assignedTo || 'Unassigned'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Department:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">{asset.department || 'N/A'}</td>
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
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Enter reason for transfer..."
                        required
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Transferred By:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      <input
                        type="text"
                        value={transferredBy}
                        onChange={(e) => setTransferredBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Name of person transferring"
                        required
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Approved By:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      <input
                        type="text"
                        value={approvedBy}
                        onChange={(e) => setApprovedBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Name of approving authority"
                        required
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Received By:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      <input
                        type="text"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Name of receiving person"
                        required
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                      Additional Notes:
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-gray-900">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Additional notes or remarks..."
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-4 text-center">
              <p className="text-xs text-gray-600">
                Asset Code: {asset.deviceCode}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 dark:bg-[#1e2d4a] px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-[#243352] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Complete Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
