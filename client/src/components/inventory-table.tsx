import { useState } from 'react';
import { Search, Filter, Edit, Trash2, Eye, AlertTriangle, ArrowRightLeft, Download, FileSpreadsheet } from 'lucide-react';
import type { ITAsset, AssetStatus, AssetCategory, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { exportToCSV, exportDetailedDevicesPDF } from '@/utils/exportUtils';

interface InventoryTableProps {
  assets: ITAsset[];
  selectedCompany: Company | 'all';
  onCompanyChange: (company: Company | 'all') => void;
  onEdit: (asset: ITAsset) => void;
  onDelete: (id: string) => void;
  onViewDetails: (asset: ITAsset) => void;
  onTransfer: (asset: ITAsset) => void;
  isAdmin: boolean;
}

type CategoryTab = 'all' | 'laptop' | 'printer' | 'desktop' | 'keyboard' | 'mouse' | 'monitor' | 'networking' | 'mobile';

export function InventoryTable({ 
  assets, 
  selectedCompany,
  onCompanyChange,
  onEdit, 
  onDelete, 
  onViewDetails,
  onTransfer,
  isAdmin,
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<ITAsset | null>(null);

  // Filter assets by company and exclude deleted items
  const companyFilteredAssets = selectedCompany === 'all' 
    ? assets.filter(a => !a.isDeleted)
    : assets.filter(a => a.company === selectedCompany && !a.isDeleted);

  const getCategoriesForTab = (tab: CategoryTab): AssetCategory[] => {
    const map: Record<CategoryTab, AssetCategory[]> = {
      all: ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'server', 'networking', 'mobile', 'mobile + subscription', 'tablet', 'other'],
      laptop: ['laptop'],
      printer: ['printer'],
      desktop: ['desktop'],
      keyboard: ['keyboard'],
      mouse: ['mouse'],
      monitor: ['monitor'],
      networking: ['networking', 'server'],
      mobile: ['mobile', 'mobile + subscription', 'tablet']
    };
    return map[tab];
  };

  const filteredAssets = companyFilteredAssets
    .filter((asset) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        asset.deviceCode.toLowerCase().includes(searchLower) ||
        asset.name.toLowerCase().includes(searchLower) ||
        asset.brand.toLowerCase().includes(searchLower) ||
        asset.serialNumber.toLowerCase().includes(searchLower) ||
        (asset.assignedTo && asset.assignedTo.toLowerCase().includes(searchLower));
      
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      const matchesCategory = getCategoriesForTab(categoryTab).includes(asset.category);
      
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));

  const getStatusBadgeColor = (status: AssetStatus) => {
    const colors: Record<AssetStatus, string> = {
      active: 'bg-green-100 text-green-800',
      'in-storage': 'bg-purple-100 text-purple-800',
      'in-maintenance': 'bg-orange-100 text-orange-800',
      available: 'bg-teal-100 text-teal-800',
      disposed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const tabs: { id: CategoryTab; label: string }[] = [
    { id: 'all', label: 'All Devices' },
    { id: 'laptop', label: 'Laptop' },
    { id: 'printer', label: 'Printer' },
    { id: 'desktop', label: 'Desktop' },
    { id: 'monitor', label: 'Monitor' },
    { id: 'networking', label: 'Network' },
    { id: 'mobile', label: 'Mobile' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex gap-2 mb-px">
          <button
            onClick={() => onCompanyChange('all')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              selectedCompany === 'all'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Companies
          </button>
          <button
            onClick={() => onCompanyChange('KHEALTH')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              selectedCompany === 'KHEALTH'
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className={`w-3 h-3 rounded-full bg-blue-500`}></span>
            KHEALTH
          </button>
          <button
            onClick={() => onCompanyChange('CAREVIEW')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              selectedCompany === 'CAREVIEW'
                ? 'border-green-500 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className={`w-3 h-3 rounded-full bg-green-500`}></span>
            CAREVIEW
          </button>
          <button
            onClick={() => onCompanyChange('GLOWFIND')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              selectedCompany === 'GLOWFIND'
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className={`w-3 h-3 rounded-full bg-orange-500`}></span>
            GLOWFIND
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by code, name, serial or user..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="available">Available</option>
            <option value="in-storage">In Storage</option>
            <option value="in-maintenance">In Maintenance</option>
          </select>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategoryTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                categoryTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Device Code</th>
              <th className="px-6 py-4">Device Name/Model</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Assigned To</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAssets.map((asset) => (
              <tr key={asset._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-blue-700">{asset.deviceCode}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{asset.name}</div>
                  <div className="text-gray-500 text-xs">{asset.brand} {asset.model}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${getCompanyBadgeClasses(asset.company)}`}>
                    {asset.company}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 capitalize">{asset.category || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeColor(asset.status)}`}>
                    {asset.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{asset.assignedTo || '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => onViewDetails(asset)} className="p-1 hover:text-blue-600"><Eye size={18}/></button>
                  {isAdmin && (
                    <>
                      <button onClick={() => onEdit(asset)} className="p-1 hover:text-green-600"><Edit size={18}/></button>
                      <button onClick={() => onTransfer(asset)} className="p-1 hover:text-purple-600"><ArrowRightLeft size={18}/></button>
                      <button 
                        onClick={() => { setAssetToDelete(asset); setShowDeleteModal(true); }} 
                        className="p-1 hover:text-red-600"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination Placeholder */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
        <span>Showing {filteredAssets.length} assets</span>
        <div className="flex gap-2">
           <button onClick={() => exportToCSV(filteredAssets, 'inventory')} className="flex items-center gap-1 hover:text-blue-600">
             <Download size={14}/> CSV
           </button>
           <button onClick={() => exportDetailedDevicesPDF(filteredAssets, 'inventory')} className="flex items-center gap-1 hover:text-red-600">
             <FileSpreadsheet size={14}/> PDF
           </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && assetToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete <span className="font-bold">{assetToDelete.deviceCode}</span>? 
              This will move the asset to "Deleted Devices".
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 bg-gray-100 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={() => { onDelete(assetToDelete._id!); setShowDeleteModal(false); }}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}