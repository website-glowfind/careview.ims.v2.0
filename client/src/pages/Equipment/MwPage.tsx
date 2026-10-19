import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { EquipmentPage } from '@/pages/Equipment/EquipmentPage';
import { WarehouseInventory } from '@/components/warehouse-inventory';
import { GatePassPage } from '@/components/gate-pass';
import { StockMovementPage, MovementTable } from '@/components/stock-movement';
import { WarehouseReports } from '@/components/warehouse-reports';
import { useWarehouseStore, useGatePassStore, type WarehouseItem } from '@/store/warehouseStore';
import { useAuthStore } from '@/store/authStore';

type MwTab = 'register' | 'warehouse' | 'gate-pass' | 'movement' | 'reports';

/** MW: equipment asset register plus warehouse inventory, gate pass, stock movement, and reports. */
export function MwPage({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [tab, setTab] = useState<MwTab>('register');
  const [startWithItem, setStartWithItem] = useState<WarehouseItem | null>(null);
  const { items, fetchItems, fetchMeta } = useWarehouseStore();
  const { gatePasses, movements, fetchGatePasses, fetchMovements } = useGatePassStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || user?.role === 'encoder';

  useEffect(() => { fetchItems(); fetchMeta(); fetchGatePasses(); fetchMovements(); }, [fetchItems, fetchMeta, fetchGatePasses, fetchMovements]);

  const TABS: { id: MwTab; label: string; count?: number }[] = [
    { id: 'register', label: 'Asset Register' },
    { id: 'warehouse', label: 'Warehouse Inventory', count: items.length },
    { id: 'gate-pass', label: 'Gate Pass', count: gatePasses.length },
    { id: 'movement', label: 'Stock Movement', count: movements.length },
    { id: 'reports', label: 'Reports' },
  ];

  const itemMovements = (item: WarehouseItem) => {
    const rows = [...movements].filter((m) => m.itemId === item._id).reverse();
    return rows.length ? <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden"><MovementTable rows={rows} /></div> : (
      <div className="text-center py-10 text-gray-400"><History className="w-6 h-6 mx-auto mb-2" /><p className="font-medium text-gray-600 dark:text-slate-300">No stock movement yet</p><p className="text-xs mt-1">IN and OUT movements from Gate Passes will be listed here.</p></div>
    );
  };

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

      {/* Sections stay mounted so unsaved work in one survives switching tabs */}
      <div hidden={tab !== 'register'}><EquipmentPage kind="mw" onNavigate={onNavigate} /></div>
      <div hidden={tab !== 'warehouse'}>
        <WarehouseInventory isAdmin={isAdmin} canEdit={canEdit} renderMovementTab={itemMovements}
          onGatePass={canEdit ? (item) => { setStartWithItem(item); setTab('gate-pass'); } : undefined} />
      </div>
      <div hidden={tab !== 'gate-pass'}><GatePassPage canEdit={canEdit} startWithItem={startWithItem} onStartConsumed={() => setStartWithItem(null)} /></div>
      <div hidden={tab !== 'movement'}><StockMovementPage /></div>
      <div hidden={tab !== 'reports'}><WarehouseReports /></div>
    </div>
  );
}
