import { useMemo, useState } from 'react';
import { Search, History } from 'lucide-react';
import { useGatePassStore, useWarehouseStore, type StockMovement } from '@/store/warehouseStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { MaterialPill } from '@/components/gate-pass';
import { formatGpDate } from '@/components/gate-pass-sheet';
import { sameDept } from '@/components/warehouse-inventory';

const SELECT = 'px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300';
const HEAD = ['Date', 'Gate Pass No.', 'Item Code', 'Item Description', 'Department', 'Type', 'Qty', 'Previous', 'Current', 'Destination', 'Requestor', 'Prepared By', 'Received By', 'Remarks'];

/** Movement table, reused by the Stock Movement tab and a warehouse item's details. */
export function MovementTable({ rows }: { rows: StockMovement[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1300px] text-sm">
        <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-b border-gray-200 dark:border-[#1e3a5f]">
          <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{HEAD.map((h) => <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
          {rows.map((m) => (
            <tr key={m._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
              <td className="px-3 py-2.5 whitespace-nowrap">{formatGpDate(m.date)}</td>
              <td className="px-3 py-2.5 font-mono text-xs">{m.gatePassNo}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-[#0b5c96] dark:text-blue-400">{m.itemCode}</td>
              <td className="px-3 py-2.5 min-w-[200px]">{m.itemDescription}</td>
              <td className="px-3 py-2.5">{m.department}</td>
              <td className="px-3 py-2.5"><MaterialPill m={m.movementType} /></td>
              <td className="px-3 py-2.5 tabular-nums">{m.quantity}</td>
              <td className="px-3 py-2.5 tabular-nums">{m.previousStock}</td>
              <td className="px-3 py-2.5 tabular-nums font-semibold">{m.currentStock}</td>
              <td className="px-3 py-2.5">{m.destination}</td>
              <td className="px-3 py-2.5">{m.requestor}</td>
              <td className="px-3 py-2.5">{m.preparedBy}</td>
              <td className="px-3 py-2.5">{m.receivedBy || '—'}</td>
              <td className="px-3 py-2.5">{m.remarks || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StockMovementPage() {
  const { movements } = useGatePassStore();
  const { meta } = useWarehouseStore();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'IN' | 'OUT'>('');
  const [dept, setDept] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...movements].reverse().filter((m) => (!type || m.movementType === type) && (!dept || sameDept(m.department, dept))
      && (!q || [m.gatePassNo, m.itemCode, m.itemDescription, m.requestor, m.destination].some((v) => (v || '').toLowerCase().includes(q))));
  }, [movements, search, type, dept]);
  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(rows, 10);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stock Movement</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Every IN and OUT posted through a Gate Pass, with the stock before and after.</p>
      </div>
      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-[#1e3a5f] flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search gate pass no., item code, description, requestor, destination…" className={`${SELECT} w-full pl-9`} />
          </div>
          <select value={type} onChange={(e) => { setType(e.target.value as any); setPage(1); }} className={SELECT}><option value="">All movements</option><option value="IN">IN</option><option value="OUT">OUT</option></select>
          <select value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} className={SELECT}><option value="">All departments</option>{(meta?.departmentTabs ?? []).map((d) => <option key={d}>{d}</option>)}</select>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-14 text-gray-400"><History className="w-7 h-7 mx-auto mb-2" /><p className="font-medium text-gray-700 dark:text-slate-300">No stock movement</p><p className="text-xs mt-1">{movements.length ? 'No movement matches your filters.' : 'Movements appear here once a Gate Pass is posted.'}</p></div>
        ) : (
          <>
            <MovementTable rows={pageItems} />
            <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="movements" /></div>
          </>
        )}
      </div>
    </div>
  );
}
