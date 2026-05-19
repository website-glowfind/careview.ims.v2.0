import { useEffect } from 'react';
import { DashboardStats } from '@/components/dashboard-stats';
import { useAssetStore } from '@/store/assetStore'; // Siguraduhing tama ang path

export function Dashboard() {
  // 1. Kunin ang lahat ng kailangan mula sa Zustand Store
  const { 
    assets,
    selectedCompany,
    fetchAssets, 
    fetchSubscriptions, 
    getWarrantyExpiringAssets, 
    getExpiringSubscriptions,
    isLoading 
  } = useAssetStore();

  // 2. Mag-fetch ng data sa unang load ng component
  useEffect(() => {
    const loadDashboardData = async () => {
      await Promise.all([
        fetchAssets(),
        fetchSubscriptions()
      ]);
    };
    
    loadDashboardData();
  }, [fetchAssets, fetchSubscriptions]);

  // 3. Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600 font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  // 4. Tawagin ang helper functions para sa alerts
  const expiringWarranties = getWarrantyExpiringAssets();
  const expiringSubscriptions = getExpiringSubscriptions();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">Monitor your IT assets and key metrics</p>
      </div>

      {/* Stats Cards Section */}
      <DashboardStats assets={assets} selectedCompany={selectedCompany} />

      <div className="grid grid-cols-1 gap-6">
        {/* Warranty Alerts */}
        {expiringWarranties.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center mb-2">
              <h3 className="text-sm font-semibold text-yellow-800 uppercase tracking-wider">
                ⚠️ Warranties Expiring Soon ({expiringWarranties.length})
              </h3>
            </div>
            <ul className="space-y-2">
              {expiringWarranties.map(asset => (
                <li key={asset._id} className="text-sm text-yellow-700 flex justify-between border-b border-yellow-200/50 pb-1">
                  <span><span className="font-medium">{asset.deviceCode}</span> - {asset.name}</span>
                  <span className="font-semibold italic">
                    Expires: {new Date(asset.warrantyExpiry!).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Subscription Renewal Alerts */}
        {expiringSubscriptions.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-center mb-2">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">
                📅 Subscriptions Renewing Soon ({expiringSubscriptions.length})
              </h3>
            </div>
            <ul className="space-y-2">
              {expiringSubscriptions.map(sub => (
                <li key={sub.id} className="text-sm text-blue-700 flex justify-between border-b border-blue-200/50 pb-1">
                  <span><span className="font-medium">{sub.referenceCode}</span> - {sub.name}</span>
                  <span className="font-semibold italic">
                    Renews: {new Date(sub.renewalDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Empty State kung walang data */}
      {assets.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500">No assets found. Start by adding new equipment.</p>
        </div>
      )}
    </div>
  );
}