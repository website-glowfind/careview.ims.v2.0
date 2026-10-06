import { useEffect, useState } from 'react';
import { StaffHouseInventory } from '@/components/staff-house-inventory';
import { StaffHouseForm } from '@/components/staff-house-form';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useStaffHouseCategoryStore } from '@/store/staffHouseCategoryStore';
import type { ITAsset, Company } from '@/types/inventory';
import type { FurnitureImportRow, ImportResult } from '@/components/furniture-upload-modal';

export function StaffHousePage() {
  const { assets, fetchAssets, isLoading, addAsset, updateAsset, deleteAsset, selectedCompany, setSelectedCompany } = useAssetStore();
  const { categories, addCategory, deleteCategory, fetchCategories } = useStaffHouseCategoryStore();
  const user = useAuthStore((s) => s.user);
  const { addHistoryEntry } = useActivityLogStore();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ITAsset | undefined>(undefined);

  useEffect(() => { fetchAssets(); fetchCategories(); }, [fetchAssets, fetchCategories]);

  const items = assets.filter((a) => a.assetType === 'StaffHouse');

  const handleAdd = () => { setEditing(undefined); setShowForm(true); };
  const handleEdit = (a: ITAsset) => { setEditing(a); setShowForm(true); };

  const handleDelete = async (id: string) => {
    const a = assets.find((x) => x._id === id);
    try {
      await deleteAsset(id);
      if (a) addHistoryEntry({ action: 'deleted', category: 'asset', deviceCode: a.deviceCode, deviceName: a.name, company: a.company, details: `${a.name} — ${a.category}`, performedBy: user?.name });
    } catch (err: any) { alert(`Failed to delete: ${err.message}`); }
  };

  const handleSave = async (payload: any) => {
    const isNew = !payload._id;
    try {
      if (isNew) {
        await addAsset(payload);
        addHistoryEntry({ action: 'added', category: 'asset', deviceCode: 'PENDING', deviceName: payload.name, company: payload.company, details: `${payload.name} — ${payload.category}`, performedBy: user?.name });
      } else {
        await updateAsset(payload._id, payload);
        addHistoryEntry({ action: 'edited', category: 'asset', deviceCode: payload.deviceCode, deviceName: payload.name, company: payload.company, details: 'Updated staff house asset', performedBy: user?.name });
      }
      setShowForm(false); setEditing(undefined);
    } catch (err: any) { alert(`Failed to save: ${err.message}`); }
  };

  const handleImport = async (rows: FurnitureImportRow[]): Promise<ImportResult> => {
    const errors: string[] = []; let created = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.name || !r.category || !r.company) { errors.push(`Row ${i + 2}: missing Asset Name, Category, or Company — skipped`); continue; }
      try {
        await addAsset({
          name: r.name, category: r.category, company: r.company, brand: r.brand || '', model: r.model || '', serialNumber: r.serialNumber || '',
          status: (r.status as ITAsset['status']) || 'available', condition: r.condition || undefined,
          assignedTo: r.assignedTo || '', department: r.department || '', location: r.location || 'N/A',
          purchaseDate: r.purchaseDate || today, notes: r.notes || '',
          staffHouse: { statusLabel: 'Available', description: r.name }, assetType: 'StaffHouse',
        });
        created++;
      } catch (err: any) { errors.push(`Row ${i + 2} (${r.name}): ${err.message}`); }
    }
    if (created > 0) addHistoryEntry({ action: 'added', category: 'asset', deviceCode: 'BULK', deviceName: `${created} staff house asset(s) imported`, company: (rows.find((r) => r.company)?.company as Company) || 'KHEALTH', details: `Excel import — ${created} created`, performedBy: user?.name });
    return { created, failed: rows.length - created, errors };
  };

  return (
    <div className="space-y-6">
      {isLoading && items.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b5c96]" /></div>
      ) : (
        <StaffHouseInventory
          assets={items}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onView={handleEdit}
          onDelete={handleDelete}
          onImport={handleImport}
          isAdmin={isAdmin}
          canEdit={canEdit}
        />
      )}

      {showForm && canEdit && (
        <StaffHouseForm
          asset={editing}
          assets={assets}
          categories={categories}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
