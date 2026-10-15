import { useEffect, useState } from 'react';
import { LayoutList, LayoutGrid, Plus, Recycle, X, Search as SearchIcon } from 'lucide-react';
import { useDisposalDraftStore } from '@/store/disposalDraftStore';
import { InventoryTable } from '@/components/inventory-table';
import { InventoryCards } from '@/components/inventory-cards';
import { FurnitureInventory } from '@/components/furniture-inventory';
import { FurnitureForm } from '@/components/furniture-form';
import { FurnitureDetails } from '@/components/furniture-details';
import type { FurnitureImportRow, ImportResult } from '@/components/furniture-upload-modal';
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
  /** Rendered inside the IT Assets tabbed module — hides the Add button + view toggle (Add is its own tab) */
  embedded?: boolean;
  /** Open the Add Asset form on mount (used by the "Add Assets" tab) */
  autoOpenForm?: boolean;
  /** Called when the auto-opened form is closed, so the parent can switch back to the Inventory tab */
  onRequestCloseForm?: () => void;
  /** Navigate to another module view (used by the Disposal action → Disposal module) */
  onNavigate?: (view: string) => void;
}

export function InventoryPage({ assetType = 'IT', pageTitle, pageSubtitle, embedded = false, autoOpenForm = false, onRequestCloseForm, onNavigate }: InventoryPageProps) {
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

  // ── Disposal flow (IT) ──
  const setDisposalDraft = useDisposalDraftStore((s) => s.setItems);
  const [disposalQueue, setDisposalQueue] = useState<ITAsset[]>([]);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [addMore, setAddMore] = useState(false);
  const [disposalSearch, setDisposalSearch] = useState('');

  const title = pageTitle ?? (assetType === 'General' ? 'Asset List' : 'Inventory Management');
  const subtitle = pageSubtitle ?? (assetType === 'General'
    ? 'Manage appliances, furniture, and other general assets'
    : 'Manage and track all IT assets across companies');

  // Category source depends on asset type (both hooks called unconditionally)
  const itCats = useCategoryStore();
  const genCats = useGeneralCategoryStore();
  const { categories, defaultCategories, addCategory: handleAddCategory, deleteCategory: handleDeleteCategory, fetchCategories } =
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
  const [viewIntent, setViewIntent] = useState<{ tab?: string; modal?: 'assign' | 'transfer' | 'maintenance' | 'disposal' | null }>({});

  // Furniture row "…" menu → open the detail page at the right tab / modal
  const handleFurnitureMenu = (a: ITAsset, action: string) => {
    switch (action) {
      case 'edit':        handleEdit(a); break;
      case 'assign':      setViewIntent({ tab: 'Assignment', modal: 'assign' }); setViewingAsset(a); break;
      case 'transfer':    setViewIntent({ tab: 'Location', modal: 'transfer' }); setViewingAsset(a); break;
      case 'maintenance': setViewIntent({ tab: 'Maintenance', modal: 'maintenance' }); setViewingAsset(a); break;
      case 'disposal':    setViewIntent({ tab: 'Disposal', modal: 'disposal' }); setViewingAsset(a); break;
      case 'archive':     handleDelete(a._id!); break;
      case 'view':
      case 'print':
      default:            setViewIntent({}); setViewingAsset(a); break;
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // "Add Assets" tab: open the form immediately on mount
  useEffect(() => {
    if (autoOpenForm && canEdit) {
      setEditingAsset(undefined);
      setViewingAsset(undefined);
      setShowForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenForm]);

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

  // Edit from the full-page Furniture detail — keep the detail open underneath so
  // we return to it (refreshed) after save/cancel instead of the list.
  const handleFurnitureEdit = (asset: ITAsset) => {
    setEditingAsset(asset);
    setShowForm(true);
  };

  const handleTransfer = (asset: ITAsset) => {
    setTransferringAsset(asset);
  };

  const handleView = (asset: ITAsset) => {
    setViewingAsset(asset);
  };

  const handleViewClose = () => {
    setViewingAsset(undefined);
    setViewIntent({});
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
    if (autoOpenForm) onRequestCloseForm?.();
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
      if (autoOpenForm) onRequestCloseForm?.();
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
    // For Furniture, keep the detail page open so we return to it (refreshed from
    // the store) after editing; IT closes its details modal as before.
    if (assetType !== 'General') setViewingAsset(undefined);

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

  // Bulk import furniture from Excel/CSV (asset codes auto-generated server-side)
  const handleImportFurniture = async (rows: FurnitureImportRow[]): Promise<ImportResult> => {
    const errors: string[] = [];
    let created = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = `Row ${i + 2}`; // +2: header row + 1-based
      if (!r.name || !r.category || !r.company) {
        errors.push(`${line}: missing Furniture Name, Category, or Company — skipped`);
        continue;
      }
      try {
        await addAsset({
          name: r.name,
          category: r.category,
          company: r.company,
          brand: r.brand || '',
          model: r.model || '',
          serialNumber: r.serialNumber || '',
          status: (r.status as ITAsset['status']) || 'available',
          condition: r.condition || undefined,
          assignedTo: r.assignedTo || '',
          department: r.department || '',
          location: r.location || 'N/A',
          purchaseDate: r.purchaseDate || today,
          notes: r.notes || '',
          assetType: 'General',
        });
        created++;
      } catch (err: any) {
        errors.push(`${line} (${r.name}): ${err.message}`);
      }
    }

    if (created > 0) {
      addHistoryEntry({
        action: 'added',
        category: 'asset',
        deviceCode: 'BULK',
        deviceName: `${created} furniture asset${created !== 1 ? 's' : ''} imported`,
        company: (rows.find((r) => r.company)?.company as Company) || 'KHEALTH',
        details: `Excel import — ${created} created${errors.length ? `, ${errors.length} skipped/failed` : ''}`,
        performedBy: user?.name,
      });
    }
    return { created, failed: rows.length - created, errors };
  };

  const handleViewModeChange = (mode: 'table' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('inventoryViewMode', mode);
  };

  const handleDispose = (asset: ITAsset) => {
    setDisposalQueue((q) => (q.some((a) => a._id === asset._id) ? q : [...q, asset]));
    setShowDisposalModal(true);
  };
  const removeFromQueue = (id?: string) => setDisposalQueue((q) => q.filter((a) => a._id !== id));
  const cancelDisposal = () => { setDisposalQueue([]); setShowDisposalModal(false); setAddMore(false); setDisposalSearch(''); };
  const proceedDisposal = () => {
    if (disposalQueue.length === 0) return;
    setDisposalDraft(disposalQueue);
    setShowDisposalModal(false); setAddMore(false); setDisposalSearch('');
    setDisposalQueue([]);
    onNavigate?.('disposal');
  };

  const sharedProps = {
    assets: visibleAssets,
    selectedCompany,
    onCompanyChange: setSelectedCompany,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onViewDetails: handleView,
    onTransfer: handleTransfer,
    onDispose: assetType === 'IT' ? handleDispose : undefined,
    isAdmin,
    canEdit,
    assetType,
  };

  return (
    <div className="space-y-6">
      {assetType === 'General' ? (
        viewingAsset ? (
          <FurnitureDetails
            asset={viewingAsset}
            onClose={handleViewClose}
            onEdit={handleFurnitureEdit}
            isAdmin={isAdmin}
            canEdit={canEdit}
            initialTab={viewIntent.tab}
            initialModal={viewIntent.modal ?? null}
          />
        ) : (
          <FurnitureInventory
            assets={visibleAssets}
            selectedCompany={selectedCompany}
            onCompanyChange={setSelectedCompany}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleView}
            onTransfer={handleTransfer}
            onAdd={handleAdd}
            onImport={handleImportFurniture}
            onMenuAction={handleFurnitureMenu}
            isAdmin={isAdmin}
            canEdit={canEdit}
          />
        )
      ) : (
      <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Add Asset (hidden in the tabbed module — "Add Assets" is its own tab) */}
          {canEdit && !embedded && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          )}
          {/* View toggle */}
          <div className={`items-center gap-1 p-1 bg-gray-100 dark:bg-[#1e2d4a] rounded-xl ${embedded ? 'hidden' : 'flex'}`}>
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
      </>
      )}
      {showForm && canEdit && (
        assetType === 'General' ? (
          <FurnitureForm
            asset={editingAsset}
            assets={assets}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onSave={handleUpdateAsset}
            onCancel={handleFormCancel}
            onBack={editingAsset ? handleFormBack : undefined}
            currentUser={user?.name}
          />
        ) : (
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
        )
      )}
      {viewingAsset && assetType !== 'General' && (
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

      {/* Confirm Disposal (IT) */}
      {showDisposalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-start justify-between p-5 pb-3 border-b border-gray-100 dark:border-[#1e3a5f]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center"><Recycle className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirm Disposal</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">This asset will be added to the centralized Disposal Form.</p>
                </div>
              </div>
              <button onClick={cancelDisposal} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 max-h-[52vh] overflow-y-auto">
              <p className="text-sm text-gray-600 dark:text-slate-400">Are you sure you want to proceed with {disposalQueue.length > 1 ? `these ${disposalQueue.length} assets` : 'this asset'} for disposal?</p>
              {disposalQueue.map((a) => (
                <div key={a._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center shrink-0"><Recycle className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400">{a.deviceCode}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300">{a.company}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700">IT Assets</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-200 truncate">{a.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{a.category}</div>
                    </div>
                  </div>
                  {disposalQueue.length > 1 && <button onClick={() => removeFromQueue(a._id)} className="p-1 text-gray-400 hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>}
                </div>
              ))}

              {addMore && (
                <div className="rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-2">
                  <div className="relative mb-2">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={disposalSearch} onChange={(e) => setDisposalSearch(e.target.value)} placeholder="Search assets to add..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-900 dark:text-white" />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {assets.filter((a) => (a.assetType ?? 'IT') === 'IT' && !a.isDeleted && !disposalQueue.some((q) => q._id === a._id) && (!disposalSearch.trim() || `${a.deviceCode} ${a.name} ${a.brand}`.toLowerCase().includes(disposalSearch.trim().toLowerCase()))).slice(0, 20).map((a) => (
                      <button key={a._id} onClick={() => { setDisposalQueue((q) => [...q, a]); setDisposalSearch(''); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                        <span className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400">{a.deviceCode}</span>
                        <span className="text-gray-700 dark:text-slate-300 truncate">{a.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
              <button onClick={cancelDisposal} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
              <div className="flex items-center gap-2">
                <button onClick={() => setAddMore((v) => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${addMore ? 'border-[#0b5c96] text-[#0b5c96] bg-[#0b5c96]/5' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300'}`}><Plus className="w-4 h-4" /> Add More</button>
                <button onClick={proceedDisposal} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"><Recycle className="w-4 h-4" /> Proceed</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
