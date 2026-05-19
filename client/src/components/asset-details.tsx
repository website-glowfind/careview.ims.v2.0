import { X, Calendar, MapPin, User, Package, FileText, AlertTriangle, Building2, Clock, Hash, Users, Briefcase, FileSignature } from 'lucide-react';
import type { ITAsset } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { IssuanceAgreement } from '@/components/issuance-agreement';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { useState } from 'react';

interface AssetDetailsProps {
  asset: ITAsset;
  onClose: () => void;
  onEdit: () => void;
  onViewActivityLog: () => void;
  isAdmin: boolean;
}

export function AssetDetails({ asset, onClose, onEdit, onViewActivityLog, isAdmin }: AssetDetailsProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'in-storage':
        return 'bg-purple-100 text-purple-800';
      case 'in-maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'available':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isWarrantyExpired = asset.warrantyExpiry
    ? new Date(asset.warrantyExpiry) < new Date()
    : false;

  const isWarrantyExpiringSoon = () => {
    if (!asset.warrantyExpiry) return false;
    const expiryDate = new Date(asset.warrantyExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const [showIssuanceAgreement, setShowIssuanceAgreement] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">Asset Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!isAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                <strong>View-only mode:</strong> Contact an administrator to make changes.
              </p>
            </div>
          )}

          {/* Warranty Alert */}
          {isWarrantyExpiringSoon() && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Warranty Expiring Soon</p>
                <p className="text-sm text-orange-700 mt-1">
                  This asset's warranty expires within 30 days. Consider renewal or replacement planning.
                </p>
              </div>
            </div>
          )}

          {/* Device Code Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
              {/* Device Code Text Section */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Device Code</h3>
                </div>
                <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
                  <div className="font-mono text-lg font-bold text-blue-600">
                    {asset.deviceCode}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusBadgeColor(
                        asset.status
                      )}`}
                    >
                      {asset.status === 'in-maintenance' ? 'In Maintenance' : asset.status === 'in-storage' ? 'In Storage' : asset.status}
                    </span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses(asset.company)}`}>
                      {asset.company}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="mt-4 lg:mt-0 flex justify-center lg:justify-end">
                <QRCodeDisplay
                  asset={asset}
                  size={120}
                  showDownload={true}
                  showLabel={true}
                />
              </div>
            </div>
          </div>

          {/* Employee Information Section */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Employee Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned To */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-sm">Assigned To:</span>
                </div>
                <p className="font-medium text-gray-900">{asset.assignedTo || 'Not assigned'}</p>
              </div>

              {/* ID No. */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-sm">ID No.:</span>
                </div>
                <p className="font-medium text-gray-900">{asset.employeeId || 'Not specified'}</p>
              </div>

              {/* Position */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-sm">Position:</span>
                </div>
                <p className="font-medium text-gray-900">{asset.position || 'Not specified'}</p>
              </div>

              {/* Company */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">Company:</span>
                </div>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses(asset.company)}`}>
                  {asset.company}
                </span>
              </div>

              {/* Department */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm">Department:</span>
                </div>
                <p className="font-medium text-gray-900">{asset.department || 'Not specified'}</p>
              </div>

              {/* Location */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Location:</span>
                </div>
                <p className="font-medium text-gray-900">{asset.location}</p>
              </div>
            </div>
          </div>

          {/* Device Specification Section */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Device Specification</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Name */}
              <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-gray-600 mb-1 text-sm">Asset Name</div>
                <p className="font-semibold text-gray-900 text-lg">{asset.name}</p>
              </div>

              {/* Brand */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-gray-600 mb-1 text-sm">Brand</div>
                <p className="font-medium text-gray-900">{asset.brand}</p>
              </div>

              {/* Model */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-gray-600 mb-1 text-sm">Model</div>
                <p className="font-medium text-gray-900">{asset.model}</p>
              </div>

              {/* Category */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Package className="w-4 h-4" />
                  <span className="text-sm">Category</span>
                </div>
                <p className="font-medium text-gray-900 capitalize">{asset.category}</p>
              </div>

              {/* Serial Number */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Serial Number</span>
                </div>
                <p className="font-medium font-mono text-sm text-gray-900">{asset.serialNumber}</p>
              </div>

              {/* Status */}
              <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-gray-600 mb-1 text-sm">Status</div>
                <span
                  className={`inline-block px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusBadgeColor(
                    asset.status
                  )}`}
                >
                  {asset.status === 'in-maintenance' ? 'In Maintenance' : asset.status === 'in-storage' ? 'In Storage' : asset.status}
                </span>
              </div>

              {/* Specifications */}
              {asset.specifications && (
                <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-600 mb-2 text-sm">Specifications</div>
                  <p className="text-gray-800 whitespace-pre-wrap">{asset.specifications}</p>
                </div>
              )}
            </div>
          </div>

          {/* Other Information Section */}
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Other Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purchase Date */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Purchase Date</span>
                </div>
                <p className="font-medium text-gray-900">{formatDate(asset.purchaseDate)}</p>
              </div>

              {/* Warranty Expiry */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Warranty Expiry</span>
                </div>
                {asset.warrantyExpiry ? (
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(asset.warrantyExpiry)}</p>
                    {isWarrantyExpired && (
                      <p className="text-xs text-red-600 mt-1 font-semibold">Expired</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Not specified</p>
                )}
              </div>

              {/* Notes */}
              <div className="md:col-span-2 bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-gray-600 mb-2 text-sm">Notes</div>
                <p className="text-gray-800 whitespace-pre-wrap">{asset.notes || 'No notes available'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onViewActivityLog}
              className="flex-1 px-3 py-1.5 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 text-sm"
            >
              <Clock className="w-3.5 h-3.5" />
              Activity Log
            </button>
            <button
              onClick={() => setShowIssuanceAgreement(true)}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-sm"
            >
              <FileSignature className="w-3.5 h-3.5" />
              Asset Form
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
            >
              Close
            </button>
            {isAdmin && (
              <button
                onClick={onEdit}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Edit Asset
              </button>
            )}
          </div>
        </div>
      </div>
      {showIssuanceAgreement && (
        <IssuanceAgreement
          asset={asset}
          onClose={() => setShowIssuanceAgreement(false)}
        />
      )}
    </div>
  );
}