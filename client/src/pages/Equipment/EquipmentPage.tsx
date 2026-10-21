import { useEffect, useState } from 'react';
import { EquipmentInventory } from '@/components/equipment-inventory';
import { EquipmentForm } from '@/components/equipment-form';
import { EquipmentDetails, type EquipmentModal } from '@/components/equipment-details';
import { ConfirmDisposalModal } from '@/components/confirm-disposal-modal';
import { useAssetStore } from '@/store/assetStore';
import { useAuthStore } from '@/store/authStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useDisposalDraftStore } from '@/store/disposalDraftStore';
import { equipmentCategoryStore } from '@/store/equipmentCategoryStore';
import { EQUIPMENT_KINDS, type EquipmentKind } from '@/config/equipment';
import { EQUIPMENT_STATUS } from '@/components/equipment-form';
import type { ITAsset, Company } from '@/types/inventory';
import type { FurnitureImportRow, ImportResult } from '@/components/furniture-upload-modal';

interface Props { kind: EquipmentKind; onNavigate?: (view: string) => void }

export function EquipmentPage({ kind, onNavigate }: Props) {
  const cfg = EQUIPMENT_KINDS[kind];
  const { assets, fetchAssets, isLoading, addAsset, updateAsset, deleteAsset, selectedCompany, setSelectedCompany } = useAssetStore();
  const { categories, addCategory, deleteCategory, fetchCategories } = equipmentCategoryStore(kind)();
  const user = useAuthStore((s) => s.user);
  const { addHistoryEntry } = useActivityLogStore();
  const setDisposalDraft = useDisposalDraftStore((s) => s.setItems);
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ITAsset | undefined>(undefined);
  const [viewing, setViewing] = useState<ITAsset | undefined>(undefined);
  const [viewIntent, setViewIntent] = useState<{ tab?: string; modal?: EquipmentModal }>({});
  const [disposalItems, setDisposalItems] = useState<ITAsset[] | null>(null);

  useEffect(() => { fetchAssets(); fetchCategories(); }, [fetchAssets, fetchCategories]);
  // Switching between MW and Medical Equipment must not keep the other module's open record
  useEffect(() => { setViewing(undefined); setShowForm(false); setEditing(undefined); }, [kind]);

  const items = assets.filter((a) => a.assetType === cfg.assetType);

  const handleAdd = () => { setEditing(undefined); setShowForm(true); };
  const handleEdit = (a: ITAsset) => { setEditing(a); setShowForm(true); };
  const handleView = (a: ITAsset) => { setViewIntent({}); setViewing(a); };

  const handleMenu = (a: ITAsset, action: string) => {
    switch (action) {
      case 'edit':        handleEdit(a); break;
      case 'assign':      setViewIntent({ tab: 'Assignment', modal: 'assign' }); setViewing(a); break;
      case 'transfer':    setViewIntent({ tab: 'Location', modal: 'transfer' }); setViewing(a); break;
      case 'maintenance': setViewIntent({ tab: 'Maintenance', modal: 'maintenance' }); setViewing(a); break;
      case 'calibration': setViewIntent({ tab: 'Calibration', modal: 'calibration' }); setViewing(a); break;
      case 'disposal':    setDisposalItems([a]); break;
      default:            setViewIntent({}); setViewing(a); break;
    }
  };

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
        addHistoryEntry({ action: 'added', category: 'asset', deviceCode: 'PENDING', deviceName: payload.name, company: payload.company, details: `${cfg.label}: ${payload.name} — ${payload.category}`, performedBy: user?.name });
      } else {
        await updateAsset(payload._id, payload);
        addHistoryEntry({ action: 'edited', category: 'asset', deviceCode: payload.deviceCode, deviceName: payload.name, company: payload.company, details: `Updated ${cfg.label.toLowerCase()} record`, performedBy: user?.name });
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
      const statusLabel = EQUIPMENT_STATUS.find((s) => s.value.toLowerCase() === String(r.status || '').toLowerCase())?.value || 'Available';
      try {
        await addAsset({
          name: r.name, category: String(r.category).toLowerCase(), company: r.company, brand: r.brand || '', model: r.model || '', serialNumber: r.serialNumber || '',
          status: EQUIPMENT_STATUS.find((s) => s.value === statusLabel)!.core, condition: r.condition || undefined,
          assignedTo: r.assignedTo || '', department: r.department || '', location: r.location || 'N/A',
          purchaseDate: r.purchaseDate || today, notes: r.notes || '',
          equipment: { statusLabel, description: r.name, calibrationRequired: cfg.calibrationDefault, calibrationIntervalMonths: cfg.calibrationDefault ? 12 : 0 },
          assetType: cfg.assetType,
        } as any);
        created++;
      } catch (err: any) { errors.push(`Row ${i + 2} (${r.name}): ${err.message}`); }
    }
    if (created > 0) addHistoryEntry({ action: 'added', category: 'asset', deviceCode: 'BULK', deviceName: `${created} ${cfg.label} record(s) imported`, company: (rows.find((r) => r.company)?.company as Company) || 'KHEALTH', details: `Excel import — ${created} created`, performedBy: user?.name });
    return { created, failed: rows.length - created, errors };
  };

  return (
    <div className="space-y-6">
      {isLoading && items.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b5c96]" /></div>
      ) : viewing ? (
        <EquipmentDetails kind={kind} asset={viewing} onClose={() => { setViewing(undefined); setViewIntent({}); }} onEdit={handleEdit} isAdmin={isAdmin} canEdit={canEdit} initialTab={viewIntent.tab} initialModal={viewIntent.modal ?? null} />
      ) : (
        <EquipmentInventory
          kind={kind}
          assets={items}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          onImport={handleImport}
          onMenuAction={handleMenu}
          isAdmin={isAdmin}
          canEdit={canEdit}
        />
      )}

      {disposalItems && (
        <ConfirmDisposalModal
          initial={disposalItems}
          pickFrom={items.filter((a) => !a.isDeleted)}
          registerLabel={cfg.label}
          onClose={() => setDisposalItems(null)}
          onProceed={(sel) => { setDisposalDraft(sel); setDisposalItems(null); onNavigate?.('disposal'); }}
        />
      )}

      {showForm && canEdit && (
        <EquipmentForm
          kind={kind}
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
