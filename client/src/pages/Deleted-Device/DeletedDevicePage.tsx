import { useState } from 'react';
import { RefreshCw, Trash2, Search, Filter } from 'lucide-react';
import { useAssetStore } from '@/store/assetStore';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import type { Company } from '@/types/inventory';

export function DeletedDevices() {
  const { assets, selectedCompany, setSelectedCompany, restoreAsset } = useAssetStore();

  const [searchQuery, setSearchQuery]   = useState('');
  const [showFilters, setShowFilters]   = useState(false);
  const [restoringId, setRestoringId]   = useState<string | null>(null);

  const deletedAssets = assets.filter(a => a.isDeleted);

  const filteredAssets = deletedAssets.filter(asset => {
    const matchesCompany = selectedCompany === 'all' || asset.company === selectedCompany;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      asset.name.toLowerCase().includes(q) ||
      asset.deviceCode.toLowerCase().includes(q) ||
      asset.serialNumber.toLowerCase().includes(q) ||
      asset.brand.toLowerCase().includes(q);
    return matchesCompany && matchesSearch;
  });

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreAsset(id);
    } catch {
      alert('Failed to restore asset. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateString?: string) =>
    dateString ? new Date(dateString).toLocaleString() : 'N/A';

  const COMPANIES: { id: Company | 'all'; label: string }[] = [
    { id: 'all',      label: 'All Companies' },
    { id: 'KHEALTH',  label: 'KHEALTH' },
    { id: 'CAREVIEW', label: 'CAREVIEW' },
    { id: 'GLOWFIND', label: 'GLOWFIND' },
  ];

  const companyBtnClass = (id: Company | 'all') => {
    const active = selectedCompany === id;
    if (id === 'all')      return active ? 'bg-gray-900 dark:bg-slate-600 text-white' : 'bg-white dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-[#1e3a5f] hover:bg-gray-100 dark:hover:bg-[#243352]';
    if (id === 'KHEALTH')  return active ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20';
    if (id === 'CAREVIEW') return active ? 'bg-green-600 text-white' : 'bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/30 hover:bg-green-100 dark:hover:bg-green-500/20';
    return active ? 'bg-orange-600 text-white' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-500/20';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Deleted Devices</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">View and restore soft-deleted assets</p>
      </div>

      <div className="bg-white dark:bg-[#162236] rounded-xl shadow border border-gray-200 dark:border-[#1e3a5f]">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-[#1e3a5f] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Deleted Devices</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                {filteredAssets.length} deleted device{filteredAssets.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-[#1e2d4a] hover:bg-gray-200 dark:hover:bg-[#243352]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, serial number, or brand..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Company Filter */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-[#1e2d4a] rounded-lg border dark:border-[#1e3a5f]">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Filter by Company
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPANIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCompany(c.id as Company | 'all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${companyBtnClass(c.id)}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center">
              <Trash2 className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Deleted Devices</h3>
              <p className="text-gray-600 dark:text-slate-400">
                {searchQuery || selectedCompany !== 'all'
                  ? 'No deleted devices match your filters'
                  : 'Deleted devices will appear here'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-b border-gray-200 dark:border-[#1e3a5f]">
                <tr>
                  {['Device Code', 'Name', 'Company', 'Category', 'Deleted At', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#1e3a5f]">
                {filteredAssets.map(asset => (
                  <tr key={asset._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-slate-200">
                        {asset.deviceCode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-slate-200">{asset.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{asset.brand} {asset.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(asset.company)}`}>
                        {asset.company}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300 capitalize">
                        {asset.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                      {formatDate(asset.deletedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleRestore(asset._id!)}
                        disabled={restoringId === asset._id}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${restoringId === asset._id ? 'animate-spin' : ''}`} />
                        {restoringId === asset._id ? 'Restoring...' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
