import { useEffect, useMemo, useState } from 'react';
import { Plus, Boxes, Recycle, RefreshCw, AlertTriangle, LayoutGrid, Package, ScrollText } from 'lucide-react';
import { OfficeSupplyInventory, osOf, isConsumable, isLowStock, statusDisplay } from '@/components/office-supply-inventory';
import { OfficeSupplyForm } from '@/components/office-supply-form';
import { useAssetStore } from '@/store/assetStore';
import { useHighlightStore } from '@/store/highlightStore';
import { useAuthStore } from '@/store/authStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useOfficeSupplyCategoryStore } from '@/store/officeSupplyCategoryStore';
import type { ITAsset, Company } from '@/types/inventory';

type Tab = 'overview' | 'inventory' | 'activity';
const titleCase = (s: string) => (s || '').replace(/\b\w/g, (m) => m.toUpperCase());
const companyLabel = (c: Company) => c === 'KHEALTH' ? 'KHealth' : c === 'CAREVIEW' ? 'Careview' : 'Glowfind';
const companyBadge = (c: Company) => c === 'KHEALTH' ? 'bg-blue-50 text-blue-700' : c === 'CAREVIEW' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700';
const PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
  'Low Stock': 'bg-orange-100 text-orange-700',
};

export function OfficeSuppliesPage() {
  const { assets, fetchAssets, isLoading, addAsset, updateAsset, deleteAsset } = useAssetStore();
  const { categories, addCategory, deleteCategory, fetchCategories } = useOfficeSupplyCategoryStore();
  const { history, fetchHistory } = useActivityLogStore();
  const user = useAuthStore((s) => s.user);
  const { addHistoryEntry } = useActivityLogStore();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'encoder';

  const [tab, setTab] = useState<Tab>('overview');
  const pendingHighlight = useHighlightStore((s) => s.deviceCode);
  useEffect(() => { if (pendingHighlight && /-OS-/.test(pendingHighlight)) setTab('inventory'); }, [pendingHighlight]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ITAsset | undefined>(undefined);

  useEffect(() => { fetchAssets(); fetchCategories(); fetchHistory(); }, [fetchAssets, fetchCategories, fetchHistory]);

  const items = useMemo(() => assets.filter((a) => a.assetType === 'OfficeSupply' && !a.isDeleted), [assets]);
  const sorted = useMemo(() => [...items].sort((a, b) => b.deviceCode.localeCompare(a.deviceCode)), [items]);

  const stats = {
    total: items.length,
    reusable: items.filter((a) => !isConsumable(a)).length,
    consumables: items.filter((a) => isConsumable(a)).length,
    alerts: items.filter((a) => isLowStock(a)).length,
  };
  const lowStockItems = items.filter((a) => isLowStock(a));
  const osActivity = history.filter((h) => /^[A-Z]{2}-OS-/.test(h.deviceCode || ''));

  const handleAdd = () => { setEditing(undefined); setShowForm(true); };
  const handleEdit = (a: ITAsset) => { setEditing(a); setShowForm(true); };
  const handleView = (a: ITAsset) => { setEditing(a); setShowForm(true); };

  const handleMenu = (a: ITAsset, action: string) => {
    if (action === 'archive') { handleDelete(a._id!); return; }
    // view / edit / restock all open the item form
    setEditing(a); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const a = assets.find((x) => x._id === id);
    try {
      await deleteAsset(id);
      if (a) addHistoryEntry({ action: 'deleted', category: 'asset', deviceCode: a.deviceCode, deviceName: a.name, company: a.company, details: `${a.name} — ${titleCase(a.category)}`, performedBy: user?.name });
    } catch (err: any) { alert(`Failed to delete: ${err.message}`); }
  };

  const handleSave = async (payload: any) => {
    const isNew = !payload._id;
    try {
      if (isNew) {
        await addAsset(payload);
        addHistoryEntry({ action: 'added', category: 'asset', deviceCode: 'PENDING', deviceName: payload.name, company: payload.company, details: `${payload.name} — ${titleCase(payload.category)}`, performedBy: user?.name });
      } else {
        await updateAsset(payload._id, payload);
        addHistoryEntry({ action: 'edited', category: 'asset', deviceCode: payload.deviceCode, deviceName: payload.name, company: payload.company, details: 'Updated office supply item', performedBy: user?.name });
      }
      setShowForm(false); setEditing(undefined);
    } catch (err: any) { alert(`Failed to save: ${err.message}`); }
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'inventory', label: `Inventory (${items.length})`, icon: Package },
    { id: 'activity', label: 'Activity Log', icon: ScrollText },
  ];

  const StatTile = ({ icon: Icon, label, value, accent, iconColor }: any) => (
    <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium"><Icon className={`w-4 h-4 ${iconColor ?? ''}`} /> {label}</div>
      <p className={`text-3xl font-bold mt-1 ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Office Supplies</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Higher-value and controlled office items</p>
        </div>
        {canEdit && <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79] whitespace-nowrap"><Plus className="w-4 h-4" /> Add Item</button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-400' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#1e2d4a]'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b5c96]" /></div>
      ) : tab === 'overview' ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile icon={Boxes} label="Total Items" value={stats.total} iconColor="text-[#0b5c96]" />
            <StatTile icon={Recycle} label="Reusable" value={stats.reusable} accent="text-purple-600" iconColor="text-purple-500" />
            <StatTile icon={RefreshCw} label="Consumables" value={stats.consumables} accent="text-orange-600" iconColor="text-orange-500" />
            <StatTile icon={AlertTriangle} label="Stock Alerts" value={stats.alerts} accent="text-red-600" iconColor="text-red-500" />
          </div>

          {/* Stock Alerts panel */}
          <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-[#1e3a5f] text-sm font-semibold text-gray-700 dark:text-slate-200"><AlertTriangle className="w-4 h-4 text-orange-500" /> Stock Alerts</div>
            {lowStockItems.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-gray-400">No low-stock items. All consumables are above minimum levels.</p>
            ) : lowStockItems.map((a) => {
              const os = osOf(a);
              return (
                <div key={a._id} className="flex items-center justify-between gap-4 px-5 py-3 bg-orange-50/50 dark:bg-orange-500/5 border-b last:border-b-0 border-gray-100 dark:border-[#1e3a5f]">
                  <div><div className="text-sm font-medium text-red-700 dark:text-red-400">{a.name}</div><div className="text-xs text-gray-500 dark:text-slate-400">{companyLabel(a.company)} · {titleCase(a.category)}</div></div>
                  <div className="text-right"><div className="text-sm font-semibold text-red-600">{os.currentStock ?? 0} remaining</div><div className="text-xs text-gray-400">min: {os.minStock ?? 0}</div></div>
                </div>
              );
            })}
          </div>

          {/* Recent Items */}
          <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-[#1e3a5f]">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Recent Items</span>
              <button onClick={() => setTab('inventory')} className="text-xs font-medium text-[#0b5c96] dark:text-blue-400 hover:underline">View all ›</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-b border-gray-200 dark:border-[#1e3a5f]">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Code</th><th className="px-5 py-3">Item</th><th className="px-5 py-3">Company</th><th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                  {sorted.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No items yet</td></tr>
                  ) : sorted.slice(0, 6).map((a) => {
                    const label = statusDisplay(a);
                    return (
                      <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a] cursor-pointer" onClick={() => handleView(a)}>
                        <td className="px-5 py-3 font-mono font-semibold text-[#0b5c96] dark:text-blue-400 whitespace-nowrap">{a.deviceCode}</td>
                        <td className="px-5 py-3"><div className="font-medium text-gray-900 dark:text-slate-200">{a.name}</div><div className="text-xs text-gray-400 capitalize">{a.category}</div></td>
                        <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${companyBadge(a.company)}`}>{companyLabel(a.company)}</span></td>
                        <td className="px-5 py-3"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${PILL[label] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'inventory' ? (
        <OfficeSupplyInventory
          assets={items}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          onMenuAction={handleMenu}
          isAdmin={isAdmin}
          canEdit={canEdit}
        />
      ) : (
        <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
          {osActivity.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-gray-400">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {osActivity.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <div className="text-sm text-gray-800 dark:text-slate-200"><span className="font-semibold capitalize">{h.action}</span> · {h.deviceName} <span className="font-mono text-xs text-gray-400">{h.deviceCode}</span></div>
                    {h.details && <div className="text-xs text-gray-500 dark:text-slate-400">{h.details}</div>}
                  </div>
                  <div className="text-right text-xs text-gray-400"><div>{h.performedBy || 'System'}</div><div>{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</div></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showForm && canEdit && (
        <OfficeSupplyForm
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
