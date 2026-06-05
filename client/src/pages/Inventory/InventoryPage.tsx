import { useEffect, useState } from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { InventoryTable } from '@/components/inventory-table';
import { InventoryCards } from '@/components/inventory-cards';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import type { ITAsset, Company, DeviceActivity, FieldChange, UserRole, FormRecord } from '@/types/inventory';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { AssetDetails } from '@/components/asset-details';
import { AssetForm } from '@/components/asset-form';
import { TransferForm } from '@/components/transfer-form';

export function InventoryPage() {
  const {
    assets,
    selectedCompany,
    setSelectedCompany,
    fetchAssets,
    isLoading,
    deleteAsset,
    updateAsset,
  } = useAssetStore();

  
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
    (localStorage.getItem('inventoryViewMode') as 'table' | 'cards') ?? 'table'
  );
  const [viewingAsset, setViewingAsset] = useState<ITAsset | undefined>(undefined);
  const [editingAsset, setEditingAsset] = useState<ITAsset | undefined>(undefined);
  const [transferringAsset, setTransferringAsset] = useState<ITAsset | undefined>(undefined);
  const { addFormRecord } = useFormRecordStore();
  const [deviceActivities, setDeviceActivities] = useState<DeviceActivity[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formRecords, setFormRecords] = useState<FormRecord[]>([]);
  const { addHistoryEntry } = useActivityLogStore();
  const [viewingActivityLog, setViewingActivityLog] = useState<ITAsset | undefined>(undefined);
  const defaultCategories = ['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'server', 'networking', 'phone', 'tablet', 'other'];
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('itInventoryCategories');
    return saved ? JSON.parse(saved) : defaultCategories;
  });
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Actions
  const handleEdit = (viewingAsset: ITAsset) => {
    if (viewingAsset) {
      setEditingAsset(viewingAsset);
      setShowForm(true);
      setViewingAsset(undefined);
    }
  };

  const handleTransfer = (asset: ITAsset) => {
    setTransferringAsset(asset);
  };

  const handleView = (asset: ITAsset) => {
    setViewingAsset(asset);
  };

  const handleViewClose = () => {
    setViewingAsset(undefined);
  };

  const handleViewEdit = () => {
    if (viewingAsset) {
      setEditingAsset(viewingAsset);
      setShowForm(true);
      setViewingAsset(undefined);
    }
  };
  const addDeviceActivity = (activity: Omit<DeviceActivity, 'id' | 'timestamp'>) => {
    const newActivity: DeviceActivity = {
      ...activity,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
    };
    setDeviceActivities([...deviceActivities, newActivity]);
  };

  const handleViewActivityLog = (asset: ITAsset) => {
    setViewingActivityLog(asset);
  };

  const handleDelete = async (id: string) => {
    const asset = assets.find(a => a._id === id);
    try {
      await deleteAsset(id);
      if (asset) {
        addHistoryEntry({
          action: 'deleted',
          category: 'asset',
          deviceCode: asset.deviceCode,
          deviceName: asset.name,
          company: asset.company,
          details: `${asset.brand} ${asset.model} — S/N: ${asset.serialNumber}`,
        });
      }
    } catch (err: any) {
      alert(`Failed to delete asset: ${err.message}`);
    }
  };

  const handleConfirmTransfer = async (assetId: string, toCompany: Company) => {
    const asset = transferringAsset;
    if (!asset) return;
    const fromCompany = asset.company;
    try {
      await updateAsset(assetId, { ...asset, company: toCompany });
      addHistoryEntry({
        action: 'transferred',
        category: 'asset',
        deviceCode: asset.deviceCode,
        deviceName: asset.name,
        company: toCompany,
        fromCompany,
        toCompany,
        details: `Transferred from ${fromCompany} to ${toCompany}`,
      });
    } catch (err) {
      console.error('Transfer failed:', err);
    }
    setTransferringAsset(undefined);
  };
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAsset(undefined);
  };

  const handleFormBack = () => {
    if (editingAsset) {
      setViewingAsset(editingAsset);
      setShowForm(false);
      setEditingAsset(undefined);
    }
  };

  const handleAddCategory = (category: string) => {
    const updatedCategories = [...categories, category];
    setCategories(updatedCategories);
    localStorage.setItem('itInventoryCategories', JSON.stringify(updatedCategories));
  };
  const handleDeleteCategory = (category: string) => {
    const updatedCategories = categories.filter(cat => cat !== category);
    setCategories(updatedCategories);
    localStorage.setItem('itInventoryCategories', JSON.stringify(updatedCategories));
  };
  const handleUpdateAsset = async (updatedAsset: ITAsset | Omit<ITAsset, "id" | "deviceCode">) => {
    const isNew = !updatedAsset._id;

    if (isNew) {
      // Adding new asset — updateAsset is misnamed here; it's actually addAsset flow from MainLayout
      // Just close the form; the addAsset in MainLayout handles the API call
      setShowForm(false);
      setEditingAsset(undefined);
      return;
    }

    const oldAsset = assets.find(a => a._id === updatedAsset._id);
    if (!oldAsset || !updatedAsset._id) return;

    try {
      await updateAsset(updatedAsset._id, updatedAsset);
    } catch (error) {
      console.error("Failed to update asset:", error);
      return;
    }

    setShowForm(false);
    setEditingAsset(undefined);
    setViewingAsset(undefined);

    addHistoryEntry({
      action: 'edited',
      category: 'asset',
      deviceCode: oldAsset.deviceCode,
      deviceName: oldAsset.name,
      company: oldAsset.company,
      details: 'Updated asset information',
    });

    // Track changes for activity log
    const changes: FieldChange[] = [];
    const fields: Array<keyof ITAsset> = ['name', 'brand', 'model', 'serialNumber', 'status', 'location', 'assignedTo', 'warrantyExpiry', 'notes'];
    fields.forEach(field => {
      const oldValue = oldAsset[field]?.toString();
      const newValue = updatedAsset[field as keyof typeof updatedAsset]?.toString();
      if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
    });

    const hadAssignment = oldAsset.assignedTo?.trim() !== '';
    const hasAssignment = (updatedAsset as ITAsset).assignedTo?.trim() !== '';

    if (!hadAssignment && hasAssignment) {
      addDeviceActivity({
        deviceId: updatedAsset._id || '',
        user: user?.name || 'System',
        userRole: (user?.role as UserRole) || 'admin',
        actionType: 'assign',
        description: `Assigned device to ${(updatedAsset as ITAsset).assignedTo}`,
        changes: [{ field: 'assignedTo', oldValue: undefined, newValue: (updatedAsset as ITAsset).assignedTo }],
        source: 'web',
      });
    } else if (hadAssignment && !hasAssignment) {
      addDeviceActivity({
        deviceId: updatedAsset._id || '',
        user: user?.name || 'System',
        userRole: (user?.role as UserRole) || 'admin',
        actionType: 'unassign',
        description: `Unassigned device from ${oldAsset.assignedTo}`,
        changes: [{ field: 'assignedTo', oldValue: oldAsset.assignedTo, newValue: undefined }],
        source: 'web',
      });
    } else if (changes.length > 0) {
      addDeviceActivity({
        deviceId: updatedAsset._id || '',
        user: user?.name || 'System',
        userRole: (user?.role as UserRole) || 'admin',
        actionType: 'update',
        description: `Updated ${changes.length} field${changes.length !== 1 ? 's' : ''}`,
        changes,
        source: 'web',
      });
    }
  };

  const handleSaveFormRecord = (recordData: Omit<FormRecord, 'id' | 'dateCreated'>) => {
    const newRecord: FormRecord = {
      ...recordData,
      id: Date.now().toString() + Math.random(),
      dateCreated: new Date().toISOString(),
    };
    setFormRecords([...formRecords, newRecord]);
  };


  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('inventoryViewMode', mode);
  };

  const sharedProps = {
    assets,
    selectedCompany,
    onCompanyChange: setSelectedCompany,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewDetails: handleView,
    onTransfer: handleTransfer,
    isAdmin,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">Manage and track all IT assets across companies</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-[#1e2d4a] rounded-xl">
          <button
            onClick={() => handleViewModeChange('table')}
            title="Table view"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-[#162236] text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            <LayoutList className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleViewModeChange('cards')}
            title="Card view"
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-[#162236] text-blue-600 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLoading && assets.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'cards' ? (
        <InventoryCards {...sharedProps} />
      ) : (
        <InventoryTable {...sharedProps} />
      )}
      {showForm && isAdmin && (
        <AssetForm
          asset={editingAsset}
          assets={assets}
          categories={['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'server', 'networking', 'phone', 'tablet', 'other']}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          defaultCategories={defaultCategories}
          onSave={handleUpdateAsset}
          onCancel={handleFormCancel}
          onBack={editingAsset ? handleFormBack : undefined}
          currentUser={user?.name}
          onSaveFormRecord={handleSaveFormRecord}
        />
      )}
      {viewingAsset && (
        <AssetDetails
          asset={viewingAsset}
          onClose={handleViewClose}
          onEdit={handleViewEdit}
          onViewActivityLog={() => handleViewActivityLog(viewingAsset)}
          isAdmin={isAdmin}
        />
      )}

      {/* Transfer Form */}
      {transferringAsset && (
        <TransferForm
          asset={transferringAsset}
          onTransfer={handleConfirmTransfer}
          onCancel={() => setTransferringAsset(undefined)}
          currentUser={user?.name || 'Admin'}
          onSaveFormRecord={addFormRecord}
        />
      )}
    </div>
  );
}