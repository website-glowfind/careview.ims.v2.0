import { X } from 'lucide-react';
import type { ITAsset, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { useState } from 'react';

interface TransferModalProps {
  asset: ITAsset;
  onTransfer: (assetId: string, toCompany: Company) => void;
  onCancel: () => void;
}

export function TransferModal({ asset, onTransfer, onCancel }: TransferModalProps) {
  const [targetCompany, setTargetCompany] = useState<Company>('KHEALTH');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetCompany !== asset.company) {
      onTransfer(asset._id!, targetCompany);
    }
  };

  const companies: Company[] = ['KHEALTH', 'CAREVIEW'];
  const availableCompanies = companies.filter(c => c !== asset.company);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transfer Device</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-1">Device Code</p>
              <p className="font-mono font-semibold text-lg">{asset.deviceCode}</p>
              <p className="text-gray-900 mt-2">{asset.name}</p>
              <p className="text-sm text-gray-600">{asset.brand} {asset.model}</p>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-gray-600">From:</span>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses(asset.company)}`}>
                {asset.company}
              </span>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer To <span className="text-red-500">*</span>
              </label>
              <select
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value as Company)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {availableCompanies.map(company => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                ✓ Asset Code Remains Permanent
              </p>
              <p className="text-xs text-blue-800">
                The Asset Code <strong>{asset.deviceCode}</strong> will remain unchanged. A new Transfer Form will be created and saved to the Form Masterlist.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-lg ${
                targetCompany === 'KHEALTH' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : targetCompany === 'CAREVIEW'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              Transfer Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}