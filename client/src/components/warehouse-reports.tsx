import { useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { useWarehouseStore, useGatePassStore, type WarehouseItem, type StockMovement, type GatePass } from '@/store/warehouseStore';
import { useAuthStore } from '@/store/authStore';
import { show, sameDept } from '@/components/warehouse-inventory';
import { formatGpDate } from '@/components/gate-pass-sheet';

const n = (v: number | null | undefined) => v ?? 0;
const ITEM_HEAD = ['ITEM CODE', 'ITEM DESCRIPTION', 'DEPARTMENT', 'UNIT', 'BEGINNING QTY', 'RECEIVED', 'ISSUED', 'CURRENT STOCK', 'LOCATION', 'REMARKS', 'STATUS'];
const itemRow = (i: WarehouseItem) => [i.itemCode, i.itemDescription, i.department, i.unit, show(i.beginningQty), show(i.received), show(i.issued), show(i.currentStock), i.location, i.remarks, i.status];
const MOVE_HEAD = ['Date', 'Gate Pass No.', 'Item Code', 'Item Description', 'Department', 'Movement Type', 'Quantity', 'Previous Stock', 'Current Stock', 'Destination', 'Requestor', 'Prepared By', 'Received By', 'Remarks'];
const moveRow = (m: StockMovement) => [m.date, m.gatePassNo, m.itemCode, m.itemDescription, m.department, m.movementType, m.quantity, m.previousStock, m.currentStock, m.destination, m.requestor, m.preparedBy, m.receivedBy || '', m.remarks || ''];
const PASS_HEAD = ['Gate Pass No.', 'Date', 'Material', 'Requesting Department', 'Requestor / Employee', 'Items', 'Destination', 'Prepared By', 'Prepared Date', 'Received By', 'Received Date'];
const passRow = (g: GatePass) => [g.gatePassNo, g.date, g.material, g.requestingDepartment, g.requestor, g.lines.map((l) => `${l.description} x${l.quantity}`).join('; '), g.destination, g.preparedBy, g.preparedDate || '', g.receivedBy || '', g.receivedDate || ''];

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79]';
const BTN_GHOST = 'inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a] disabled:opacity-50';

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

export function WarehouseReports() {
  const { items, meta } = useWarehouseStore();
  const { movements, gatePasses } = useGatePassStore();
  const user = useAuthStore((s) => s.user);
  const [dept, setDept] = useState('');
  const [fmt, setFmt] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');

  const departments = meta?.departmentTabs ?? [];
  const scoped = dept ? items.filter((i) => sameDept(i.department, dept)) : items;
  const summary = departments.map((d) => {
    const list = items.filter((i) => sameDept(i.department, d));
    return { d, count: list.length, received: list.reduce((s, i) => s + n(i.received), 0), issued: list.reduce((s, i) => s + n(i.issued), 0), stock: list.reduce((s, i) => s + n(i.currentStock), 0), out: list.filter((i) => n(i.currentStock) <= 0).length };
  });

  const exportInventory = () => {
    const name = `MW_Warehouse_Inventory_${dept || 'ALL'}_${stamp()}`;
    if (fmt === 'xlsx') {
      // One sheet per department, in the workbook's own column layout
      const wb = XLSX.utils.book_new();
      for (const d of dept ? [dept] : departments) {
        const list = items.filter((i) => sameDept(i.department, d));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([ITEM_HEAD, ...list.map(itemRow)]), d.trim().slice(0, 31));
      }
      XLSX.writeFile(wb, `${name}.xlsx`);
    } else if (fmt === 'csv') {
      download(`${name}.csv`, new Blob(['﻿' + [ITEM_HEAD.map(esc).join(','), ...scoped.map((i) => itemRow(i).map(esc).join(','))].join('\n')], { type: 'text/csv;charset=utf-8' }));
    } else {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFontSize(14); doc.text('MW Warehouse Inventory', 40, 40);
      doc.setFontSize(8.5); doc.setTextColor(90);
      doc.text(`Department: ${dept || 'All'} | Generated: ${new Date().toLocaleString()} by ${user?.name ?? 'User'} | Records: ${scoped.length}`, 40, 56);
      autoTable(doc, { head: [ITEM_HEAD], body: scoped.map(itemRow), startY: 66, styles: { fontSize: 7, cellPadding: 3 }, headStyles: { fillColor: [11, 92, 150] } });
      doc.save(`${name}.pdf`);
    }
  };

  const exportSheet = (title: string, head: string[], rows: (string | number)[][]) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...rows]), title.slice(0, 31));
    XLSX.writeFile(wb, `MW_${title.replace(/\s+/g, '_')}_${stamp()}.xlsx`);
  };

  const formats = [['xlsx', 'Excel', FileSpreadsheet], ['csv', 'CSV', FileDown], ['pdf', 'PDF', FileText]] as const;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reports</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Warehouse stock by department, and exports of inventory, stock movement, and gate passes.</p>
      </div>

      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        <h3 className="px-5 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">Stock by department</h3>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-y border-gray-200 dark:border-[#1e3a5f]"><tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              {['Department', 'Items', 'Total Received', 'Total Issued', 'Total Current Stock', 'Items Out of Stock'].map((h) => <th key={h} className="px-5 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
              {summary.map((s) => (
                <tr key={s.d}><td className="px-5 py-2.5 font-medium text-gray-900 dark:text-white">{s.d}</td><td className="px-5 py-2.5">{s.count}</td><td className="px-5 py-2.5">{s.received}</td><td className="px-5 py-2.5">{s.issued}</td><td className="px-5 py-2.5 font-semibold">{s.stock}</td><td className={`px-5 py-2.5 ${s.out ? 'text-red-600 font-semibold' : ''}`}>{s.out}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-gray-400">Totals add quantities as recorded, regardless of unit (box, roll, piece…). Use them as a guide, not an accounting figure.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Export Warehouse Inventory</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Department</label>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-700 dark:text-slate-300"><option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {formats.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setFmt(id)} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm ${fmt === id ? 'border-[#0b5c96] bg-[#0b5c96]/10 text-[#0b5c96] font-semibold ring-1 ring-[#0b5c96]' : 'border-gray-200 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}><Icon className="w-4 h-4" /> {label}</button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{scoped.length} record{scoped.length === 1 ? '' : 's'}. Excel exports one sheet per department using the original column layout.</p>
          <button onClick={exportInventory} disabled={scoped.length === 0} className={`${BTN_PRIMARY} disabled:opacity-50`}><FileDown className="w-4 h-4" /> Export Inventory</button>
        </div>

        <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Other reports</h3>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-[#1e3a5f] p-3">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Stock Movement</p><p className="text-xs text-gray-500">{movements.length} movement{movements.length === 1 ? '' : 's'}</p></div>
            <button disabled={!movements.length} onClick={() => exportSheet('Stock Movement', MOVE_HEAD, movements.map(moveRow))} className={BTN_GHOST}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-[#1e3a5f] p-3">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Gate Pass Register</p><p className="text-xs text-gray-500">{gatePasses.length} gate pass{gatePasses.length === 1 ? '' : 'es'}{gatePasses.length ? ` · latest ${formatGpDate(gatePasses[gatePasses.length - 1].date)}` : ''}</p></div>
            <button disabled={!gatePasses.length} onClick={() => exportSheet('Gate Pass Register', PASS_HEAD, gatePasses.map(passRow))} className={BTN_GHOST}><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
