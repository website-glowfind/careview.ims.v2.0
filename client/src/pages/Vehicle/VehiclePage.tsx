import { useEffect, useState } from 'react';
import { VehicleInventory } from '@/components/vehicle-inventory';
import { VehicleForm } from '@/components/vehicle-form';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import type { ITAsset } from '@/types/inventory';

export function VehiclePage() {
  const { assets, fetchAssets, isLoading, addAsset, updateAsset, deleteAsset } = useAssetStore();
  const user = useAuthStore((s) => s.user);
  const { addHistoryEntry } = useActivityLogStore();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ITAsset | undefined>(undefined);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const vehicles = assets.filter((a) => a.assetType === 'Vehicle');

  const handleAdd = () => { setEditing(undefined); setShowForm(true); };
  const handleEdit = (a: ITAsset) => { setEditing(a); setShowForm(true); };

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
      ) : (
        <VehicleInventory
          assets={vehicles}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onView={handleEdit}
          onDelete={handleDelete}
          isAdmin={isAdmin}
          canEdit={canEdit}
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
