import { X, Calendar, DollarSign, Building2, User, FileText, CreditCard, Key, AlertTriangle, Package, Hash, Smartphone, FileEdit, Pencil, Clock } from 'lucide-react';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import type { ITAsset, FormRecord } from '@/types/inventory';
import { LicenseSubscriptionFormViewer } from '@/components/license-subscription-form-viewer';
import { AssetActivityLogModal } from '@/components/asset-activity-log-modal';
import { useState } from 'react';
import type { Subscription } from '@/types/subscription';

interface SubscriptionDetailsProps {
  subscription: Subscription;
  onClose: () => void;
  onEdit?: () => void;
  isAdmin?: boolean;
  canEdit?: boolean;
  assets?: ITAsset[];
  categories?: string[];
  onAddCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
  defaultCategories?: string[];
  onSaveFormRecord?: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
  currentUser?: string;
}

export function SubscriptionDetails({ subscription, onClose, onEdit, isAdmin, canEdit, assets, categories, onAddCategory, onDeleteCategory, defaultCategories, onSaveFormRecord, currentUser }: SubscriptionDetailsProps) {
  const allowEdit = canEdit ?? isAdmin;
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpiringSoon = () => {
    const renewalDate = new Date(subscription.renewalDate);
    const today = new Date();
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRenewal <= 30 && daysUntilRenewal >= 0;
  };

  // Find the linked asset if deviceId exists
  const linkedAsset = assets && subscription.deviceId 
    ? assets.find(asset => asset._id === subscription.deviceId)
    : null;

  const [isEditing, setIsEditing] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [formRecord, setFormRecord] = useState<Partial<ITAsset>>(linkedAsset ?? {});

  const handleSave = (record: Partial<ITAsset>) => {
    setFormRecord(record);
    setIsEditing(false);
    if (onSaveFormRecord) {
      onSaveFormRecord({
        formType: 'Subscription Management',
        assetTag: record.deviceCode,
        referenceId: subscription.referenceCode,
        employeeName: record.assignedTo,
        department: record.department,
        company: record.company as ITAsset['company'],
        status: 'Active',
        details: `${subscription.type}: ${subscription.subscriptionName || subscription.licenseKey} | Renewal: ${new Date(subscription.renewalDate).toLocaleDateString()}`,
        createdBy: currentUser || 'System',
        relatedSubscriptionId: subscription.id,
        formData: {
          ...record,
          subscription: {
            id: subscription.id,
            referenceCode: subscription.referenceCode,
            type: subscription.type,
            subscriptionName: subscription.subscriptionName,
            licenseKey: subscription.licenseKey,
            renewalDate: subscription.renewalDate,
            cost: subscription.cost,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
          },
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#162236] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border dark:border-[#1e3a5f]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#1e3a5f]">
          <div className="flex items-center gap-3">
            {subscription.type === 'License' ? (
              <Key className="w-6 h-6 text-blue-600" />
            ) : (
              <Calendar className="w-6 h-6 text-purple-600" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{subscription.name}</h2>
              <p className="text-sm text-gray-600 font-mono mt-1">{subscription.referenceCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Expiring Soon Alert */}
          {isExpiringSoon() && subscription.status === 'Active' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Renewal Coming Soon</p>
                <p className="text-sm text-orange-700 mt-1">
                  This {subscription.type.toLowerCase()} renews within 30 days. Please review and prepare for renewal.
                </p>
              </div>
            </div>
          )}

          {/* Type and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Type</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                subscription.type === 'License' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}>
                {subscription.type}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Company</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses(subscription.company)}`}>
                {subscription.company}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusBadgeClass(subscription.status)}`}>
                {subscription.status}
              </span>
            </div>
          </div>

          {/* Employee Information */}
          {subscription.employeeName && (
            <div className="bg-gray-50 dark:bg-[#1e2d4a] rounded-lg p-4 border dark:border-[#1e3a5f]">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Employee Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{subscription.employeeName}</p>
                </div>
                {subscription.position && (
                  <div>
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="font-medium text-gray-900">{subscription.position}</p>
                  </div>
                )}
                {subscription.branch && (
                  <div>
                    <p className="text-sm text-gray-600">Branch</p>
                    <p className="font-medium text-gray-900">{subscription.branch}</p>
                  </div>
                )}
                {subscription.department && (
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium text-gray-900">{subscription.department}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* License-Specific Details */}
          {subscription.type === 'License' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                License Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscription.licenseKey && (
                  <div>
                    <p className="text-sm text-gray-600">License Key</p>
                    <p className="font-mono text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-blue-200 break-all">
                      {subscription.licenseKey}
                    </p>
                  </div>
                )}
                {subscription.numberOfSeats && (
                  <div>
                    <p className="text-sm text-gray-600">Number of Seats</p>
                    <p className="font-medium text-gray-900">{subscription.numberOfSeats}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscription-Specific Details */}
          {subscription.type === 'Subscription' && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Subscription Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscription.subscriptionName && (
                  <div>
                    <p className="text-sm text-gray-600">Subscription Name</p>
                    <p className="font-medium text-gray-900">{subscription.subscriptionName}</p>
                  </div>
                )}
                {subscription.accountNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Account Number</p>
                    <p className="font-mono text-sm font-medium text-gray-900">{subscription.accountNumber}</p>
                  </div>
                )}
                {subscription.accountDescription && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Account Description</p>
                    <p className="font-medium text-gray-900">{subscription.accountDescription}</p>
                  </div>
                )}
                {subscription.accountName && (
                  <div>
                    <p className="text-sm text-gray-600">Account Name</p>
                    <p className="font-medium text-gray-900">{subscription.accountName}</p>
                  </div>
                )}
                {subscription.accountEmail && (
                  <div>
                    <p className="text-sm text-gray-600">Account Email</p>
                    <p className="font-medium text-gray-900">{subscription.accountEmail}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-600" />
              Service Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Provider</p>
                <p className="font-medium text-gray-900">{subscription.provider}</p>
              </div>
              {subscription.planType && (
                <div>
                  <p className="text-sm text-gray-600">Plan Type</p>
                  <p className="font-medium text-gray-900">{subscription.planType}</p>
                </div>
              )}
              {subscription.category && (
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900">{subscription.category}</p>
                </div>
              )}
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              Billing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Cost</p>
                <p className="font-medium text-gray-900 text-lg">
                  {subscription.currency}{subscription.cost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Billing Cycle</p>
                <p className="font-medium text-gray-900">{subscription.billingCycle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Auto Renewal</p>
                <p className="font-medium text-gray-900">{subscription.autoRenewal ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {subscription.modeOfPayment && (
            <div className="bg-gray-50 dark:bg-[#1e2d4a] rounded-lg p-4 border dark:border-[#1e3a5f]">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Mode of Payment</p>
                  <p className="font-medium text-gray-900">{subscription.modeOfPayment}</p>
                </div>
                {subscription.modeOfPaymentNote && (
                  <div>
                    <p className="text-sm text-gray-600">Payment Note</p>
                    <p className="font-medium text-gray-900">{subscription.modeOfPaymentNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Important Dates */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Important Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscription.purchaseDate && (
                <div>
                  <p className="text-sm text-gray-600">Purchase Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(subscription.purchaseDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(subscription.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Renewal Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(subscription.renewalDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {subscription.notes && (
            <div className="bg-gray-50 dark:bg-[#1e2d4a] rounded-lg p-4 border dark:border-[#1e3a5f]">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                Notes
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{subscription.notes}</p>
            </div>
          )}

          {/* Linked Asset Information */}
          {linkedAsset && (
            <div className={`border rounded-lg p-5 ${
              subscription.type === 'License' 
                ? 'border-blue-200 bg-blue-50' 
                : 'border-purple-200 bg-purple-50'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className={`w-5 h-5 ${
                  subscription.type === 'License' ? 'text-blue-700' : 'text-purple-700'
                }`} />
                <h3 className={`text-base font-semibold ${
                  subscription.type === 'License' ? 'text-blue-900' : 'text-purple-900'
                }`}>
                  Linked Device Information
                </h3>
              </div>
              
              {/* Device Code */}
              <div className={`p-4 bg-white border rounded-lg mb-4 ${
                subscription.type === 'License' 
                  ? 'border-blue-300' 
                  : 'border-purple-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className={`w-5 h-5 ${
                    subscription.type === 'License' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                  <h4 className={`font-semibold ${
                    subscription.type === 'License' ? 'text-blue-900' : 'text-purple-900'
                  }`}>
                    Device Code
                  </h4>
                </div>
                <div className={`font-mono text-lg font-bold ${
                  subscription.type === 'License' ? 'text-blue-900' : 'text-purple-900'
                }`}>
                  {linkedAsset.deviceCode}
                </div>
              </div>

              {/* Conditional Layout Based on Type */}
              {subscription.type === 'License' ? (
                /* LICENSE LAYOUT - Blue Theme */
                <>
                  {/* Employee Information Section */}
                  <div className="bg-white border border-blue-300 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      License Assigned To
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                        <p className="text-sm text-gray-900 font-semibold">{linkedAsset.assignedTo || 'Not Assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.position || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(linkedAsset.company)}`}>
                          {linkedAsset.company}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.department || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Device Specification Section */}
                  <div className="bg-white border border-blue-300 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Licensed Device Specification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                        <p className="text-sm text-gray-900 font-semibold">{linkedAsset.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.brand}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.model}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <p className="text-sm text-gray-900 font-medium capitalize">{linkedAsset.category}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                        <p className="text-sm text-gray-900 font-mono font-medium">{linkedAsset.serialNumber}</p>
                      </div>
                      {linkedAsset.specifications && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
                          <p className="text-sm text-gray-900">{linkedAsset.specifications}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                          linkedAsset.status === 'active' ? 'bg-green-100 text-green-800' :
                          linkedAsset.status === 'in-maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          linkedAsset.status === 'in-storage' ? 'bg-blue-100 text-blue-800' :
                          linkedAsset.status === 'disposed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {linkedAsset.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                        <p className="text-sm text-gray-900 font-medium">
                          {new Date(linkedAsset.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      {linkedAsset.warrantyExpiry && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                          <p className="text-sm text-gray-900 font-medium">
                            {new Date(linkedAsset.warrantyExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {linkedAsset.notes && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{linkedAsset.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* SUBSCRIPTION LAYOUT - Purple Theme */
                <>
                  {/* Device Specification Section - First for Subscription */}
                  <div className="bg-white border border-purple-300 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      Subscribed Device Specification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                        <p className="text-sm text-gray-900 font-semibold">{linkedAsset.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <p className="text-sm text-gray-900 font-medium capitalize">{linkedAsset.category}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                          linkedAsset.status === 'active' ? 'bg-green-100 text-green-800' :
                          linkedAsset.status === 'in-maintenance' ? 'bg-yellow-100 text-yellow-800' :
                          linkedAsset.status === 'in-storage' ? 'bg-blue-100 text-blue-800' :
                          linkedAsset.status === 'disposed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {linkedAsset.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.brand}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.model}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                        <p className="text-sm text-gray-900 font-mono font-medium">{linkedAsset.serialNumber}</p>
                      </div>
                      {linkedAsset.specifications && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Specifications</label>
                          <p className="text-sm text-gray-900">{linkedAsset.specifications}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                        <p className="text-sm text-gray-900 font-medium">
                          {new Date(linkedAsset.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      {linkedAsset.warrantyExpiry && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                          <p className="text-sm text-gray-900 font-medium">
                            {new Date(linkedAsset.warrantyExpiry).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {linkedAsset.notes && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Device Notes</label>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{linkedAsset.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employee Information Section - Second for Subscription */}
                  <div className="bg-white border border-purple-300 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" />
                      Device User Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                        <p className="text-sm text-gray-900 font-semibold">{linkedAsset.assignedTo || 'Not Assigned'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.position || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.department || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <p className="text-sm text-gray-900 font-medium">{linkedAsset.location}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(linkedAsset.company)}`}>
                          {linkedAsset.company}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-[#1e3a5f]">
          <button
            onClick={() => setShowActivityLog(true)}
            className="flex-1 px-3 py-1.5 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5 text-sm"
          >
            <Clock className="w-3.5 h-3.5" />
            Activity Log
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-sm"
          >
            <FileEdit className="w-3.5 h-3.5" />
            {linkedAsset ? 'Asset Form' : 'Subscription Form'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded hover:bg-gray-50 dark:hover:bg-[#1e2d4a] transition-colors text-sm"
          >
            Close
          </button>
          {allowEdit && (
            <button
              onClick={() => { onClose(); onEdit?.(); }}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription / Asset Form Modal */}
      {isEditing && (
        <LicenseSubscriptionFormViewer
          subscription={subscription}
          linkedAsset={linkedAsset ?? undefined}
          onClose={() => setIsEditing(false)}
        />
      )}

      {/* Activity Log Modal */}
      {showActivityLog && (
        <AssetActivityLogModal
          asset={{
            ...(linkedAsset ?? {}),
            deviceCode: subscription.referenceCode,
            name: subscription.name,
          } as ITAsset}
          onClose={() => setShowActivityLog(false)}
        />
      )}
    </div>
  );
}