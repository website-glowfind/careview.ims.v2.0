import { useEffect, useState } from 'react';
import { LayoutList, LayoutGrid, Plus } from 'lucide-react';
import { InventoryTable } from '@/components/inventory-table';
import { InventoryCards } from '@/components/inventory-cards';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import type { ITAsset, Company, FieldChange, AssetType } from '@/types/inventory';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useGeneralCategoryStore } from '@/store/generalCategoryStore';
import { AssetDetails } from '@/components/asset-details';
import { AssetForm } from '@/components/asset-form';
import { TransferForm } from '@/components/transfer-form';
import { NewTransferModal } from '@/components/new-transfer-modal';
import { AssetActivityLogModal } from '@/components/asset-activity-log-modal';

interface InventoryPageProps {
  /** 'IT' = IT Inventory (default), 'General' = Asset List (appliances, furniture, etc.) */
  assetType?: AssetType;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function InventoryPage({ assetType = 'IT', pageTitle, pageSubtitle }: InventoryPageProps) {
  const {
    assets,
    selectedCompany,
    setSelectedCompany,
    fetchAssets,
    isLoading,
    deleteAsset,
    updateAsset,
    addAsset,
  } = useAssetStore();

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const title = pageTitle ?? (assetType === 'General' ? 'Asset List' : 'Inventory Management');
  const subtitle = pageSubtitle ?? (assetType === 'General'
    ? 'Manage appliances, furniture, and other general assets'
    : 'Manage and track all IT assets across companies');

  // Category source depends on asset type (both hooks called unconditionally)
  const itCats = useCategoryStore();
  const genCats = useGeneralCategoryStore();
  const { categories, defaultCategories, addCategory: handleAddCategory, deleteCategory: handleDeleteCategory } =
    assetType === 'General' ? genCats : itCats;

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
    (localStorage.getItem('inventoryViewMode') as 'table' | 'cards') ?? 'table'
  );
  const [viewingAsset, setViewingAsset] = useState<ITAsset | undefined>(undefined);
  const [editingAsset, setEditingAsset] = useState<ITAsset | undefined>(undefined);
  const [transferringAsset, setTransferringAsset] = useState<ITAsset | undefined>(undefined);
  const { addFormRecord } = useFormRecordStore();
  const [showForm, setShowForm] = useState(false);
  const { addHistoryEntry } = useActivityLogStore();
  const [viewingActivityLog, setViewingActivityLog] = useState<ITAsset | undefined>(undefined);
  const [showNewTransfer, setShowNewTransfer] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Only show assets that belong to this page's type (legacy assets w/o a type are IT)
  const visibleAssets = assets.filter(a => (a.assetType ?? 'IT') === assetType);

  // Actions
  const handleAdd = () => {
    setEditingAsset(undefined);
    setShowForm(true);
    setViewingAsset(undefined);
  };

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
          performedBy: user?.name,
        });
      }
    } catch (err: any) {
      alert(`Failed to delete asset: ${err.message}`);
    }
  };

  const handleConfirmTransfer = async (assetId: string, toCompany: Company, fromName?: string, toName?: string) => {
    const asset = assets.find(a => a._id === assetId) ?? transferringAsset;
    if (asset) {
      const from = fromName?.trim() || 'Unassigned';
      const to   = toName?.trim()   || 'Unassigned';
      addHistoryEntry({
        action: 'transferred',
        category: 'asset',
        deviceCode: asset.deviceCode,
        deviceName: asset.name,
        company: toCompany,
        fromCompany: asset.company,
        toCompany,
        details: `Transferred from ${from} to ${to}`,
        performedBy: user?.name,
      });
    }
    setTransferringAsset(undefined);
    setShowNewTransfer(false);
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

  const handleUpdateAsset = async (
    updatedAsset: ITAsset | Omit<ITAsset, "id" | "deviceCode">,
    subscriptionData?: any,
  ) => {
    const isNew = !updatedAsset._id;

    // ── Add new asset ──────────────────────────────────────────────
    if (isNew) {
      try {
        await addAsset({ ...updatedAsset, assetType }, subscriptionData);
      } catch (err: any) {
        alert(`Failed to add asset: ${err.message}`);
        return;
      }
      setShowForm(false);
      setEditingAsset(undefined);
      addHistoryEntry({
        action: 'added',
        category: 'asset',
        deviceCode: (updatedAsset as ITAsset).deviceCode || 'PENDING',
        deviceName: updatedAsset.name,
        company: updatedAsset.company,
        details: `${updatedAsset.brand} ${updatedAsset.model} — ${updatedAsset.category}`,
        performedBy: user?.name,
      });
      return;
    }

    // ── Edit existing asset ────────────────────────────────────────
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

    // Compute field-level changes
    const fieldChanges: FieldChange[] = [];
    const fields: Array<keyof ITAsset> = ['name', 'brand', 'model', 'serialNumber', 'status', 'location', 'assignedTo', 'warrantyExpiry', 'notes', 'department', 'position', 'employeeId'];
    fields.forEach(field => {
      const oldValue = oldAsset[field]?.toString() || '';
      const newValue = (updatedAsset as ITAsset)[field]?.toString() || '';
      if (oldValue !== newValue) fieldChanges.push({ field: field as string, oldValue: oldValue || undefined, newValue: newValue || undefined });
    });

    const hadAssignment = !!oldAsset.assignedTo?.trim();
    const hasAssignment = !!(updatedAsset as ITAsset).assignedTo?.trim();

    let actionDetail = 'Updated asset information';
    if (!hadAssignment && hasAssignment) {
      actionDetail = `Assigned device to ${(updatedAsset as ITAsset).assignedTo}`;
    } else if (hadAssignment && !hasAssignment) {
      actionDetail = `Unassigned device from ${oldAsset.assignedTo}`;
    } else if (fieldChanges.length > 0) {
      actionDetail = `Updated ${fieldChanges.length} field${fieldChanges.length !== 1 ? 's' : ''}`;
    }

    addHistoryEntry({
      action: 'edited',
      category: 'asset',
      deviceCode: oldAsset.deviceCode,
      deviceName: oldAsset.name,
      company: oldAsset.company,
      details: actionDetail,
      performedBy: user?.name,
      changes: fieldChanges.length > 0 ? fieldChanges : undefined,
    });
  };

  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('inventoryViewMode', mode);
  };

  const sharedProps = {
    assets: visibleAssets,
    selectedCompany,
    onCompanyChange: setSelectedCompany,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewDetails: handleView,
    onTransfer: handleTransfer,
    isAdmin,
    canEdit,
    assetType,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Add Asset */}
          {canEdit && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          )}
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
      {showForm && canEdit && (
        <AssetForm
          asset={editingAsset}
          assets={assets}
          categories={categories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          defaultCategories={defaultCategories}
          onSave={handleUpdateAsset}
          onCancel={handleFormCancel}
          onBack={editingAsset ? handleFormBack : undefined}
          currentUser={user?.name}
          onSaveFormRecord={addFormRecord}
          assetType={assetType}
        />
      )}
      {viewingAsset && (
        <AssetDetails
          asset={viewingAsset}
          onClose={handleViewClose}
          onEdit={handleViewEdit}
          onViewActivityLog={() => handleViewActivityLog(viewingAsset)}
          isAdmin={isAdmin}
          canEdit={canEdit}
        />
      )}

      {viewingActivityLog && (
        <AssetActivityLogModal
          asset={viewingActivityLog}
          onClose={() => setViewingActivityLog(undefined)}
        />
      )}

      {/* Transfer Form (from row action) */}
      {transferringAsset && (
        <TransferForm
          asset={transferringAsset}
          onTransfer={handleConfirmTransfer}
          onCancel={() => setTransferringAsset(undefined)}
          currentUser={user?.name || 'Admin'}
          onSaveFormRecord={addFormRecord}
          onNewForm={() => {
            setTransferringAsset(undefined);
            setShowNewTransfer(true);
          }}
        />
      )}

      {/* New Transfer Form (from toolbar button — picks asset first) */}
      {showNewTransfer && canEdit && (
        <NewTransferModal
          currentUser={user?.name || 'Admin'}
          onClose={() => setShowNewTransfer(false)}
          onTransfer={handleConfirmTransfer}
          onSaveFormRecord={addFormRecord}
        />
      )}
    </div>
  );
}
