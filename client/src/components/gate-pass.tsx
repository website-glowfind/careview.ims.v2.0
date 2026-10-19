import { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Eye, Trash2, ArrowLeft, FileText, ArrowDownToLine, ArrowUpFromLine, X, Loader2 } from 'lucide-react';
import { useWarehouseStore, useGatePassStore, type GatePass, type MaterialDirection, type WarehouseItem } from '@/store/warehouseStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useAuthStore } from '@/store/authStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { GatePassSheet, printGatePasses, formatGpDate } from '@/components/gate-pass-sheet';
import { show } from '@/components/warehouse-inventory';

const MAX_LINES = 10; // the paper form has ten item rows
const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 bg-[#0b5c96] text-white rounded-lg text-sm font-medium hover:bg-[#094a79] disabled:opacity-50';
const BTN_GHOST = 'inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[#1e3a5f] text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#1e2d4a]';
const todayIso = () => new Date().toISOString().slice(0, 10);

export const MaterialPill = ({ m }: { m: MaterialDirection }) => (
  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${m === 'IN' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m}</span>
);

interface Props {
  canEdit: boolean;
  /** Warehouse item to start a new gate pass with (Gate Pass action on an inventory item) */
  startWithItem: WarehouseItem | null;
  onStartConsumed: () => void;
}

export function GatePassPage({ canEdit, startWithItem, onStartConsumed }: Props) {
  const { gatePasses } = useGatePassStore();
  const [creating, setCreating] = useState(false);
  const [initialItem, setInitialItem] = useState<WarehouseItem | null>(null);
  const [viewing, setViewing] = useState<GatePass | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (startWithItem) { setInitialItem(startWithItem); setCreating(true); onStartConsumed(); }
  }, [startWithItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => [...gatePasses].reverse(), [gatePasses]);
  const { page, setPage, totalPages, pageItems, total, pageSize } = usePagination(rows, 10);

  if (creating) {
    return (
      <GatePassForm initialItem={initialItem}
        onCancel={() => { setCreating(false); setInitialItem(null); }}
        onPosted={(msg) => { setCreating(false); setInitialItem(null); setNotice(msg); }} />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gate Pass</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Warehouse Gate Pass for material IN and OUT. Posting a pass updates stock and the Stock Movement history.</p>
        </div>
        {canEdit && <button onClick={() => setCreating(true)} className={BTN_PRIMARY}><Plus className="w-4 h-4" /> New Gate Pass</button>}
      </div>

      {notice && <div className="flex items-start gap-2 p-3 rounded-lg text-sm border bg-green-50 border-green-200 text-green-800 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400"><span className="flex-1">{notice}</span><button onClick={() => setNotice('')}><X className="w-4 h-4" /></button></div>}

      <div className="bg-white dark:bg-[#162236] rounded-xl border border-gray-200 dark:border-[#1e3a5f] overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-14 text-gray-400"><FileText className="w-7 h-7 mx-auto mb-2" /><p className="font-medium text-gray-700 dark:text-slate-300">No gate passes yet</p><p className="text-xs mt-1">Create a gate pass to move material in or out of the warehouse.</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-gray-50 dark:bg-[#1e2d4a] border-b border-gray-200 dark:border-[#1e3a5f]">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {['Gate Pass No.', 'Date', 'Material', 'Requesting Department', 'Requestor / Employee', 'Items', 'Destination', 'Prepared By'].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                  {pageItems.map((g) => (
                    <tr key={g._id} className="hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                      <td className="px-4 py-2.5"><button onClick={() => setViewing(g)} className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400 hover:underline">{g.gatePassNo}</button></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{formatGpDate(g.date)}</td>
                      <td className="px-4 py-2.5"><MaterialPill m={g.material} /></td>
                      <td className="px-4 py-2.5">{g.requestingDepartment}</td>
                      <td className="px-4 py-2.5">{g.requestor}</td>
                      <td className="px-4 py-2.5">{g.lines.length}</td>
                      <td className="px-4 py-2.5">{g.destination}</td>
                      <td className="px-4 py-2.5">{g.preparedBy}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button title="View" onClick={() => setViewing(g)} className="p-1.5 text-gray-400 hover:text-blue-600"><Eye className="w-4 h-4" /></button>
                        <button title="Print Gate Pass" onClick={() => printGatePasses([g])} className="p-1.5 text-gray-400 hover:text-gray-700"><Printer className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-[#1e3a5f]"><Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} label="gate passes" /></div>
          </>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-3xl shadow-xl max-h-[94vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-[#1e3a5f]">
              <div><h3 className="text-base font-bold text-gray-900 dark:text-white">Gate Pass {viewing.gatePassNo}</h3><p className="text-xs text-gray-500 dark:text-slate-400">Warehouse Gate Pass — KHealth / Careview</p></div>
              <button onClick={() => setViewing(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-[#0f1729] overflow-y-auto"><div className="max-w-xl mx-auto border border-gray-200 shadow-sm"><GatePassSheet pass={viewing} /></div></div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
              <button onClick={() => setViewing(null)} className={BTN_GHOST}>Close</button>
              <button onClick={() => printGatePasses([viewing])} className={BTN_PRIMARY}><Printer className="w-4 h-4" /> Print Gate Pass</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function Field({ label, required, children, className = '' }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return <div className={className}><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>{children}</div>;
}

type LineDraft = { itemId?: string; itemCode?: string; description: string; qtyText: string; remarks: string };
const blankLine = (): LineDraft => ({ description: '', qtyText: '', remarks: '' });
const optionLabel = (i: WarehouseItem) => `${i.itemCode} — ${i.itemDescription}`;

function GatePassForm({ initialItem, onCancel, onPosted }: { initialItem: WarehouseItem | null; onCancel: () => void; onPosted: (msg: string) => void }) {
  const { items, meta } = useWarehouseStore();
  const { gatePasses, nextGatePassNo, createGatePass } = useGatePassStore();
  const { addHistoryEntry } = useActivityLogStore();
  const user = useAuthStore((s) => s.user);

  const [head, setHead] = useState({
    gatePassNo: '', date: todayIso(), requestingDepartment: initialItem?.department.trim() ?? '', requestor: '',
    material: '' as MaterialDirection | '', destination: '', preparedBy: user?.name ?? '', preparedDate: todayIso(), receivedBy: '', receivedDate: '',
  });
  const [lines, setLines] = useState<LineDraft[]>(() => initialItem
    ? [{ itemId: initialItem._id, itemCode: initialItem.itemCode, description: initialItem.itemDescription, qtyText: '', remarks: '' }]
    : [blankLine()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { nextGatePassNo().then((no) => setHead((h) => (h.gatePassNo ? h : { ...h, gatePassNo: no }))); }, [nextGatePassNo]);

  const byLabel = useMemo(() => new Map(items.map((i) => [optionLabel(i), i])), [items]);
  const byId = (id?: string) => items.find((i) => i._id === id);
  const setH = <K extends keyof typeof head>(k: K, v: (typeof head)[K]) => setHead((p) => ({ ...p, [k]: v }));
  const setL = (idx: number, patch: Partial<LineDraft>) => setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const pick = (idx: number, value: string) => {
    const hit = byLabel.get(value);
    if (hit) setL(idx, { itemId: hit._id, itemCode: hit.itemCode, description: hit.itemDescription });
    else setL(idx, { itemId: undefined, itemCode: undefined, description: value });
  };

  const submit = async () => {
    const e: string[] = [];
    if (!head.gatePassNo.trim()) e.push('Gate Pass No. is required.');
    else if (gatePasses.some((g) => g.gatePassNo === head.gatePassNo.trim())) e.push(`Gate Pass No. ${head.gatePassNo} already exists.`);
    if (!head.date) e.push('Date is required.');
    if (!head.requestingDepartment.trim()) e.push('Requesting Department is required.');
    if (!head.requestor.trim()) e.push('Requestor / Employee is required.');
    if (!head.material) e.push('Choose Material IN or OUT.');
    const filled = lines.filter((l) => l.description.trim() || l.qtyText.trim());
    if (filled.length === 0) e.push('Add at least one item.');
    filled.forEach((l, i) => {
      if (!l.description.trim()) e.push(`Item ${i + 1}: description is required.`);
      if (!(Number(l.qtyText) > 0)) e.push(`Item ${i + 1}: enter a quantity greater than 0.`);
    });
    const linked = filled.filter((l) => l.itemId);
    if (new Set(linked.map((l) => l.itemId)).size !== linked.length) e.push('The same warehouse item appears on more than one row — combine them into one row.');
    if (head.material === 'OUT') {
      for (const l of linked) {
        const item = byId(l.itemId);
        const stock = item?.currentStock ?? 0;
        if (item && Number(l.qtyText) > stock) e.push(`${item.itemCode}: only ${stock} in stock, cannot issue ${l.qtyText}.`);
      }
    }
    if (!head.destination.trim()) e.push('Destination is required.');
    if (!head.preparedBy.trim()) e.push('Prepared by is required.');
    setErrors(e);
    if (e.length) return;

    setBusy(true);
    try {
      const res = await createGatePass({
        ...head, gatePassNo: head.gatePassNo.trim(), material: head.material as MaterialDirection,
        lines: filled.map((l) => ({ itemId: l.itemId, itemCode: l.itemCode, description: l.description.trim(), quantity: Number(l.qtyText), remarks: l.remarks })),
      });
      addHistoryEntry({ action: 'transferred', category: 'asset', deviceCode: head.gatePassNo.trim(), deviceName: `Gate Pass — Material ${head.material}`, company: 'KHEALTH', details: `${filled.length} item(s) to ${head.destination}. Requestor: ${head.requestor}`, performedBy: user?.name });
      onPosted(`Gate Pass ${head.gatePassNo.trim()} posted — ${res.movementCount ? `${res.movementCount} stock movement${res.movementCount === 1 ? '' : 's'} recorded` : 'no inventory items linked, stock unchanged'}.`);
    } catch (err: any) { setErrors([err.message]); }
    finally { setBusy(false); }
  };


  return (
    <div className="space-y-5">
      <button onClick={onCancel} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to Gate Pass</button>

      <div className="bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="bg-[#0b5c96] text-white text-center py-3 text-lg font-bold tracking-wide">WAREHOUSE GATE PASS</div>
        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Gate Pass No." required><input value={head.gatePassNo} onChange={(e) => setH('gatePassNo', e.target.value)} className={`${INPUT} font-mono`} /><p className="text-xs text-gray-400 mt-1">Suggested automatically — you can edit it.</p></Field>
            <Field label="Date" required><input type="date" value={head.date} onChange={(e) => setH('date', e.target.value)} className={INPUT} /></Field>
            <Field label="Requesting Department" required>
              <input list="gp-depts" value={head.requestingDepartment} onChange={(e) => setH('requestingDepartment', e.target.value)} className={INPUT} />
              <datalist id="gp-depts">{(meta?.departmentTabs ?? []).map((d) => <option key={d} value={d} />)}</datalist>
            </Field>
            <Field label="Requestor / Employee" required><input value={head.requestor} onChange={(e) => setH('requestor', e.target.value)} className={INPUT} /></Field>
            <Field label="Material" required className="sm:col-span-2">
              <div className="flex gap-3">
                {(['IN', 'OUT'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setH('material', m)}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg border text-sm ${head.material === m ? 'border-[#0b5c96] bg-[#0b5c96]/10 text-[#0b5c96] font-semibold ring-1 ring-[#0b5c96]' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]'}`}>
                    {m === 'IN' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />} Material {m}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">IN increases Received. OUT increases Issued. Current Stock is updated for items linked to the warehouse inventory.</p>
            </Field>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">Item Details</h4>
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0b5c96]/10 text-[#0b5c96] dark:text-blue-300"><tr>
                  <th className="px-3 py-2 w-12 text-center font-semibold">No.</th><th className="px-3 py-2 text-left font-semibold">Description of Item / Material</th>
                  <th className="px-3 py-2 w-28 font-semibold">Quantity</th><th className="px-3 py-2 text-left font-semibold">Remarks</th><th className="w-10" />
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                  {lines.map((l, i) => {
                    const item = byId(l.itemId);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-center font-semibold text-[#0b5c96]">{i + 1}</td>
                        <td className="px-3 py-2 min-w-[280px]">
                          <input list="gp-items" value={item ? optionLabel(item) : l.description} onChange={(e) => pick(i, e.target.value)} placeholder="Pick a warehouse item or type a description" className={INPUT} />
                          {item && <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">{item.department.trim()} · in stock: <b>{show(item.currentStock) || '0'}</b> {item.unit}</p>}
                          {!item && l.description && <p className="text-[11px] text-gray-400 mt-1">Not linked to inventory — stock will not change.</p>}
                        </td>
                        <td className="px-3 py-2"><input type="number" min={1} value={l.qtyText} onChange={(e) => setL(i, { qtyText: e.target.value })} className={`${INPUT} text-center`} /></td>
                        <td className="px-3 py-2 min-w-[160px]"><input value={l.remarks} onChange={(e) => setL(i, { remarks: e.target.value })} className={INPUT} /></td>
                        <td className="px-2"><button type="button" title="Remove row" disabled={lines.length === 1} onClick={() => setLines((p) => p.filter((_, k) => k !== i))} className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <datalist id="gp-items">{items.map((i) => <option key={i._id} value={optionLabel(i)} />)}</datalist>
            </div>
            <button type="button" disabled={lines.length >= MAX_LINES} onClick={() => setLines((p) => [...p, blankLine()])} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#0b5c96] hover:underline disabled:text-gray-400 disabled:no-underline">
              <Plus className="w-4 h-4" /> Add item row <span className="text-xs text-gray-400 font-normal">({lines.length} of {MAX_LINES})</span>
            </button>
          </div>

          <Field label="Destination" required><input value={head.destination} onChange={(e) => setH('destination', e.target.value)} className={INPUT} /></Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-[#0b5c96] text-center">Prepared by</p>
              <Field label="Name & Signature" required><input value={head.preparedBy} onChange={(e) => setH('preparedBy', e.target.value)} className={INPUT} /></Field>
              <Field label="Date"><input type="date" value={head.preparedDate} onChange={(e) => setH('preparedDate', e.target.value)} className={INPUT} /></Field>
            </div>
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-[#0b5c96] text-center">Received by</p>
              <Field label="Name & Signature"><input value={head.receivedBy} onChange={(e) => setH('receivedBy', e.target.value)} className={INPUT} /></Field>
              <Field label="Date"><input type="date" value={head.receivedDate} onChange={(e) => setH('receivedDate', e.target.value)} className={INPUT} /></Field>
            </div>
          </div>

          {errors.length > 0 && <ul className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 list-disc pl-8 space-y-0.5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1e3a5f] flex items-center justify-end gap-2">
          <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
          <button onClick={submit} disabled={busy} className={BTN_PRIMARY}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Post Gate Pass</button>
        </div>
      </div>
    </div>
  );
}
