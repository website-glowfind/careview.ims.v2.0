import { useEffect, useState } from 'react';
import { VehicleInventory } from '@/components/vehicle-inventory';
import { VehicleForm } from '@/components/vehicle-form';
import { VehicleDetails } from '@/components/vehicle-details';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import type { ITAsset } from '@/types/inventory';
import { ConfirmDisposalModal } from '@/components/confirm-disposal-modal';
import { useDisposalDraftStore } from '@/store/disposalDraftStore';

export function VehiclePage({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { assets, fetchAssets, isLoading, addAsset, updateAsset, deleteAsset } = useAssetStore();
  const user = useAuthStore((s) => s.user);
  const { addHistoryEntry } = useActivityLogStore();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ITAsset | undefined>(undefined);
  const [viewing, setViewing] = useState<ITAsset | undefined>(undefined);
  const [viewModal, setViewModal] = useState<string | null>(null);
  const [disposalItems, setDisposalItems] = useState<ITAsset[] | null>(null);
  const setDisposalDraft = useDisposalDraftStore((s) => s.setItems);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const vehicles = assets.filter((a) => a.assetType === 'Vehicle');

  const handleAdd = () => { setEditing(undefined); setShowForm(true); };
  const handleEdit = (a: ITAsset) => { setEditing(a); setShowForm(true); };
  const handleView = (a: ITAsset) => { setViewModal(null); setViewing(a); };
  const closeView = () => { setViewing(undefined); setViewModal(null); };

  const handleMenu = (a: ITAsset, action: string) => {
    if (action === 'edit') { handleEdit(a); return; }
    if (action === 'archive') { handleDelete(a._id!); return; }
    if (action === 'disposal') { setDisposalItems([a]); return; }
    setViewModal(action); setViewing(a);
  };

  const handleDelete = async (id: string) => {
    const a = assets.find((x) => x._id === id);
    try {
      await deleteAsset(id);
      if (a) addHistoryEntry({ action: 'deleted', category: 'asset', deviceCode: a.deviceCode, deviceName: a.name, company: a.company, details: `${a.brand} ${a.model}`, performedBy: user?.name });
    } catch (err: any) { alert(`Failed to delete vehicle: ${err.message}`); }
  };

  const handleSave = async (payload: any) => {
    const isNew = !payload._id;
    try {
      if (isNew) {
        await addAsset(payload);
        addHistoryEntry({ action: 'added', category: 'asset', deviceCode: 'PENDING', deviceName: payload.name, company: payload.company, details: `${payload.brand} ${payload.model} — ${payload.category}`, performedBy: user?.name });
      } else {
        await updateAsset(payload._id, payload);
        addHistoryEntry({ action: 'edited', category: 'asset', deviceCode: payload.deviceCode, deviceName: payload.name, company: payload.company, details: 'Updated vehicle information', performedBy: user?.name });
      }
      setShowForm(false); setEditing(undefined);
    } catch (err: any) { alert(`Failed to save vehicle: ${err.message}`); }
  };

  return (
    <div className="space-y-6">
      {isLoading && vehicles.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b5c96]" /></div>
      ) : viewing ? (
        <VehicleDetails asset={viewing} onClose={closeView} onEdit={handleEdit} isAdmin={isAdmin} canEdit={canEdit} initialModal={viewModal} />
      ) : (
        <VehicleInventory
          assets={vehicles}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          onMenuAction={handleMenu}
          isAdmin={isAdmin}
          canEdit={canEdit}
        />
      )}

      {disposalItems && (
        <ConfirmDisposalModal
          initial={disposalItems}
          pickFrom={vehicles.filter((v) => !v.isDeleted)}
          registerLabel="Company Vehicle"
          onClose={() => setDisposalItems(null)}
          onProceed={(items) => { setDisposalDraft(items); setDisposalItems(null); onNavigate?.('disposal'); }}
        />
      )}

      {showForm && canEdit && (
        <VehicleForm
          asset={editing}
          assets={assets}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
