import { useEffect, useState } from 'react';
import { EquipmentPage } from '@/pages/Equipment/EquipmentPage';
import { WarehouseInventory } from '@/components/warehouse-inventory';
import { useWarehouseStore } from '@/store/warehouseStore';
import { useAuthStore } from '@/store/authStore';

type MwTab = 'register' | 'warehouse';

/** MW: the equipment asset register plus the warehouse inventory sections. */
export function MwPage({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [tab, setTab] = useState<MwTab>('register');
  const { items, fetchItems, fetchMeta } = useWarehouseStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || user?.role === 'encoder';

  useEffect(() => { fetchItems(); fetchMeta(); }, [fetchItems, fetchMeta]);

  const TABS: { id: MwTab; label: string; count?: number }[] = [
    { id: 'register', label: 'Asset Register' },
    { id: 'warehouse', label: 'Warehouse Inventory', count: items.length },
  ];

  return (
    <div className="space-y-5">
      <nav className="flex gap-1 border-b border-gray-200 dark:border-[#1e3a5f] overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-[#0b5c96] text-[#0b5c96] dark:text-blue-400 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}>
            {t.label}{t.count !== undefined && <span className="ml-1.5 text-xs text-gray-400">{t.count}</span>}
          </button>
        ))}
      </nav>

      {/* Both sections stay mounted so unsaved work in one survives switching tabs */}
      <div hidden={tab !== 'register'}><EquipmentPage kind="mw" onNavigate={onNavigate} /></div>
      <div hidden={tab !== 'warehouse'}><WarehouseInventory isAdmin={isAdmin} canEdit={canEdit} /></div>
    </div>
  );
}
