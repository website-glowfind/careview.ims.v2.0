import { Package, CheckCircle, AlertCircle, CheckSquare, Building2 } from 'lucide-react';
import type { ITAsset, Company } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';

interface DashboardStatsProps {
  assets: ITAsset[];
  selectedCompany: Company | 'all';
}

export function DashboardStats({ assets, selectedCompany }: DashboardStatsProps) {
  // Filter out deleted assets
  const filteredAssets = selectedCompany === 'all' 
    ? assets.filter(a => !a.isDeleted)
    : assets.filter(a => a.company === selectedCompany && !a.isDeleted);

  const totalAssets = filteredAssets.length;
  const activeAssets = filteredAssets.filter(a => a.status === 'active').length;
  const maintenanceAssets = filteredAssets.filter(a => a.status === 'in-maintenance').length;
  const availableAssets = filteredAssets.filter(a => a.status === 'available').length;

  const stats = [
    {
      title: 'Total Assets',
      value: totalAssets,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Active',
      value: activeAssets,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'In Maintenance',
      value: maintenanceAssets,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      title: 'Available',
      value: availableAssets,
      icon: CheckSquare,
      color: 'bg-teal-500',
    },
  ];

  // Company breakdown for "all" view
  const companyBreakdown = selectedCompany === 'all' ? {
    KHEALTH: assets.filter(a => a.company === 'KHEALTH' && !a.isDeleted).length,
    CAREVIEW: assets.filter(a => a.company === 'CAREVIEW' && !a.isDeleted).length,
    GLOWFIND: assets.filter(a => a.company === 'GLOWFIND' && !a.isDeleted).length,
  } : null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white dark:bg-[#162236] rounded-lg shadow dark:shadow-none dark:border dark:border-[#1e3a5f] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-semibold dark:text-white">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Company Breakdown when viewing all */}
      {companyBreakdown && (
        <div className="bg-white dark:bg-[#162236] rounded-lg shadow dark:shadow-none dark:border dark:border-[#1e3a5f] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold dark:text-white">Company Distribution</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses('KHEALTH')}`}>
                  KHEALTH
                </span>
              </div>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{companyBreakdown.KHEALTH}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400/70 mt-1">devices</p>
            </div>

            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses('CAREVIEW')}`}>
                  CAREVIEW
                </span>
              </div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{companyBreakdown.CAREVIEW}</p>
              <p className="text-sm text-green-600 dark:text-green-400/70 mt-1">devices</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getCompanyBadgeClasses('GLOWFIND')}`}>
                  GLOWFIND
                </span>
              </div>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">{companyBreakdown.GLOWFIND}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400/70 mt-1">devices</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}