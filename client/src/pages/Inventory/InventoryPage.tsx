import { useEffect } from 'react';
import { InventoryTable } from '@/components/inventory-table';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import type { ITAsset, Company } from '@/types/inventory';

export function InventoryPage() {
  // Kunin ang global state mula sa Asset Store
  const { 
    assets, 
    selectedCompany, 
    setSelectedCompany, 
    fetchAssets, 
    isLoading,
    deleteAsset
  } = useAssetStore();

  // Kunin ang user role mula sa Auth Store
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // Load assets pagkabukas ng page
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Actions
  const handleEdit = (asset: ITAsset) => {
    console.log("Opening edit modal for:", asset.deviceCode);
    // Dito mo i-trigger ang iyong Edit Modal/Form
  };

  const handleTransfer = (asset: ITAsset) => {
    console.log("Opening transfer modal for:", asset.deviceCode);
  };

  const handleView = (asset: ITAsset) => {
    console.log("Opening details modal for:", asset.deviceCode);
  };

  const handleDelete = async (id: string) => {
    await deleteAsset(id);
 
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage and track all IT assets across companies</p>
        </div>
      </div>

      {isLoading && assets.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <InventoryTable
          assets={assets}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleView}
          onTransfer={handleTransfer}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}