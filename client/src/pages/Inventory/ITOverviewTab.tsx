import { useEffect } from 'react';
import { DashboardStats } from '@/components/dashboard-stats';
import { useAssetStore } from '@/store/assetStore';

/** "Overview" tab of the IT Assets module — key metrics + company distribution (IT assets only). */
export function ITOverviewTab() {
  const { assets, selectedCompany, fetchAssets } = useAssetStore();

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Only IT assets (legacy assets without a type are IT)
  const itAssets = assets.filter((a) => (a.assetType ?? 'IT') === 'IT');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">Monitor your IT assets and key metrics</p>
      </div>
      <DashboardStats assets={itAssets} selectedCompany={selectedCompany} />
    </div>
  );
}
