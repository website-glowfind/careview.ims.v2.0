import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, UserPlus, ArrowRightLeft, Trash2 as ArchiveIcon, Printer, User, History, MapPin, Wrench, Recycle,
  PackagePlus, PackageMinus, Boxes, Image as ImageIcon,
} from 'lucide-react';
import type { ITAsset, AssetStatus } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { resolveFileUrl } from '@/utils/fileUrl';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { useAssetStore } from '@/store/assetStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useAuthStore } from '@/store/authStore';
import {
  DL, fmtDate, fmtDateTime, today, AssignModal, TransferModal, MaintenanceModal, DisposalModal, ConfirmArchive, DocumentsTab, LogEntryModal,
} from '@/components/asset-detail-kit';
import { isConsumable, isLowStock, statusDisplay } from '@/components/office-supply-inventory';

export type OfficeSupplyModal = 'assign' | 'transfer' | 'maintenance' | 'restock' | 'issue' | 'disposal' | null;

interface Props {
  asset: ITAsset;
  onClose: () => void;
  onEdit: (asset: ITAsset) => void;
  isAdmin: boolean;
  canEdit?: boolean;
  initialTab?: string;
  initialModal?: OfficeSupplyModal;
}

const STATUS_PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
  'Low Stock': 'bg-orange-100 text-orange-700',
};
const CONDITION_PILL: Record<string, string> = {
  New: 'bg-green-100 text-green-700', Good: 'bg-blue-100 text-blue-700', Fair: 'bg-amber-100 text-amber-700', Poor: 'bg-orange-100 text-orange-700', Damaged: 'bg-red-100 text-red-700',
};
const DOC_TYPES = ['Asset Photo', 'Purchase Order', 'Invoice / OR', 'Warranty', 'Issuance Slip', 'Other'];
const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">{children}</h3>;
const btnPrimary = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]';
const btnGhost = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]';
const titleCase = (s: string) => (s || '').replace(/\b\w/g, (m) => m.toUpperCase());

export function OfficeSupplyDetails({ asset, onClose, onEdit, isAdmin, canEdit, initialTab, initialModal }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const { updateAsset, deleteAsset } = useAssetStore();
  const live = useAssetStore((s) => s.assets.find((a) => a._id === asset._id));
  const data = live ?? asset;
  const os: Record<string, any> = data.officeSupply ?? {};
  const consumable = isConsumable(data);

  const { deviceHistory, fetchHistoryByDevice, addHistoryEntry } = useActivityLogStore();
  const { addFormRecord } = useFormRecordStore();
  const user = useAuthStore((s) => s.user);

  const maintenance: any[] = Array.isArray(os.maintenance) ? os.maintenance : [];
  const transfers: any[] = Array.isArray(os.transfers) ? os.transfers : [];
  const assignmentHistory: any[] = Array.isArray(os.assignmentHistory) ? os.assignmentHistory : [];
  const stockLog: any[] = Array.isArray(os.stockLog) ? os.stockLog : [];
  const disposal = os.disposal;
  const TABS = ['Overview', 'Assignment', 'Location', ...(consumable ? ['Stock'] : []), 'Maintenance', 'Transfer History', 'Disposal', 'Documents', 'Activity Log'];

  const [tab, setTab] = useState<string>(initialTab ?? 'Overview');
  const [modal, setModal] = useState<OfficeSupplyModal | 'archive'>(initialModal ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data.deviceCode) fetchHistoryByDevice(data.deviceCode); }, [data.deviceCode, fetchHistoryByDevice]);

  const photo = (data.attachments || []).find((a) => (a.type || '').startsWith('image/'));
  const statusLabel = disposal ? 'For Disposal' : statusDisplay(data);
  const statusPill = STATUS_PILL[statusLabel] ?? 'bg-gray-100 text-gray-600';
  const money = (v?: number) => (v != null ? `${os.currency ?? '₱'}${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—');
  const stock = Number(os.currentStock ?? 0);

  const save = async (next: ITAsset) => { setBusy(true); try { await updateAsset(data._id!, next); } finally { setBusy(false); } };
  const log = (details: string, action: any = 'edited') => addHistoryEntry({ action, category: 'asset', deviceCode: data.deviceCode, deviceName: data.name, company: data.company, details, performedBy: user?.name });
  const withOs = (patch: Record<string, any>, extra: Partial<ITAsset> = {}): ITAsset => ({ ...data, ...extra, officeSupply: { ...os, ...patch } });

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to Office Supplies</button>

      {/* Header */}
      <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#1e2d4a] flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
          {photo ? <img src={resolveFileUrl(photo.url)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-7 h-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{data.name}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Item Code: <span className="font-mono font-semibold text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span></p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${consumable ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{consumable ? 'Controlled Consumable' : 'Reusable'}</span>
            {data.condition && <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${CONDITION_PILL[data.condition] ?? 'bg-gray-100 text-gray-600'}`}>{data.condition}</span>}
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(data.company)}`}>{data.company}</span>
            {data.category && <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-gray-200 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 capitalize">{data.category}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <QRCodeDisplay deviceCode={data.deviceCode} size={72} showDownload showLabel={false} />
            <button onClick={() => window.print()} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#0b5c96] dark:text-blue-400 hover:underline"><Printer className="w-3 h-3" /> Print QR</button>
          </div>
          {allowEdit && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onEdit(data)} className={btnGhost}><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => setModal('assign')} className={btnGhost}><UserPlus className="w-3.5 h-3.5" /> Assign</button>
              <button onClick={() => setModal('transfer')} className={btnGhost}><ArrowRightLeft className="w-3.5 h-3.5" /> Transfer</button>
              {isAdmin && <button onClick={() => setModal('archive')} className={btnGhost}><ArchiveIcon className="w-3.5 h-3.5" /> Delete</button>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f]">
        <nav className="flex gap-5 px-6 border-b border-gray-100 dark:border-[#1e3a5f] overflow-x-auto">
          {TABS.map((t) => {
            const count = t === 'Maintenance' ? maintenance.length : t === 'Stock' ? stockLog.length : t === 'Transfer History' ? transfers.length : t === 'Activity Log' ? deviceHistory.length : 0;
            return <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>{t}{count > 0 ? ` ${count}` : ''}</button>;
          })}
        </nav>

        <div className="p-6">
          {tab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
                <div>
                  <H>ITEM DETAILS</H>
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DL label="Item Code" value={<span className="font-mono text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span>} />
                    <DL label="Item Name" value={data.name} /><DL label="Category" value={titleCase(data.category)} />
                    <DL label="Item Type" value={consumable ? 'Controlled Consumable' : 'Reusable'} /><DL label="Company" value={data.company} />
                    <DL label="Brand" value={data.brand} /><DL label="Model" value={data.model} /><DL label="Serial Number" value={data.serialNumber} />
                    <DL label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>} />
                    {consumable && <DL label="Stock (current / min)" value={<span className={isLowStock(data) ? 'text-orange-600 font-semibold' : ''}>{stock} / {os.minStock ?? 0}</span>} />}
                  </dl>
                  <div className="mt-4"><DL label="Description" value={os.description || data.specifications} /></div>
                </div>
                <div className="space-y-3">
                  <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl aspect-square flex flex-col items-center justify-center text-gray-400 overflow-hidden">
                    {photo ? <img src={resolveFileUrl(photo.url)} alt="" className="w-full h-full object-cover" /> : <><ImageIcon className="w-7 h-7" /><span className="text-xs mt-1">No photo</span></>}
                  </div>
                  <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3 flex flex-col items-center">
                    <QRCodeDisplay deviceCode={data.deviceCode} size={120} showDownload={false} showLabel={false} />
                    <p className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400 mt-1">{data.deviceCode}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>PURCHASE DETAILS</H>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  <DL label="Purchase Number" value={os.purchaseNumber} /><DL label="Purchase Date" value={fmtDate(data.purchaseDate)} /><DL label="Supplier" value={os.supplier} />
                  <DL label="Purchase Order No." value={os.poNumber} /><DL label="Invoice / OR No." value={os.invoiceNumber} /><DL label="Unit Cost" value={money(os.unitCost)} />
                  <DL label="Quantity" value={os.quantity} /><DL label="Total Cost" value={money(os.totalCost)} /><DL label="Warranty" value={os.warranty ? 'Yes' : 'No'} />
                </dl>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>CONDITION</H>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4"><DL label="Condition" value={data.condition} /><DL label="Remarks" value={os.conditionRemarks} /><DL label="Notes" value={data.notes} /></dl>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>SYSTEM INFORMATION</H>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4"><DL label="Date Encoded" value={fmtDateTime((data as any).createdAt)} /><DL label="Date Updated" value={fmtDateTime((data as any).updatedAt)} /></dl>
              </div>
            </div>
          )}

          {tab === 'Assignment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><H>CURRENT ASSIGNMENT</H>{allowEdit && <button onClick={() => setModal('assign')} className={btnPrimary}><UserPlus className="w-4 h-4" /> Change Assignment</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
                {data.assignedTo || os.custodian ? (
                  <dl className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <DL label="Assigned To" value={data.assignedTo} /><DL label="Custodian" value={os.custodian} /><DL label="Department" value={data.department} />
                    <DL label="Position" value={data.position} /><DL label="Date Assigned" value={fmtDate(os.dateAssigned)} />
                  </dl>
                ) : <div className="text-center py-8 text-gray-400"><User className="w-6 h-6 mx-auto mb-2" />Not currently assigned</div>}
              </div>
              <div>
                <H>ASSIGNMENT HISTORY</H>
                <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                  {assignmentHistory.length === 0 ? <div className="text-center py-8 text-gray-400"><History className="w-6 h-6 mx-auto mb-2" />No assignment history</div> : (
                    <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{assignmentHistory.map((h, i) => <li key={i} className="px-4 py-3 text-sm flex justify-between"><span className="text-gray-800 dark:text-slate-200">{h.assignedTo || 'Unassigned'} · {h.department || '—'}</span><span className="text-gray-400">{fmtDate(h.date)}</span></li>)}</ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'Location' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><H>CURRENT LOCATION</H>{allowEdit && <button onClick={() => setModal('transfer')} className={btnPrimary}><ArrowRightLeft className="w-4 h-4" /> Transfer</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-5 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#0b5c96] mt-0.5" />
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1"><DL label="Center / Branch" value={os.centerBranch} /><DL label="Department" value={data.department} /><DL label="Location / Room" value={os.locationRoom || data.location} /></dl>
              </div>
              <p className="text-xs text-gray-400">Previous locations are kept in Transfer History ({transfers.length} record{transfers.length !== 1 ? 's' : ''}).</p>
            </div>
          )}

          {tab === 'Stock' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0b5c96]/10 text-[#0b5c96] flex items-center justify-center"><Boxes className="w-5 h-5" /></div>
                  <div><p className="text-xs text-gray-400">Current / Minimum stock</p><p className={`text-xl font-bold ${isLowStock(data) ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>{stock} / {os.minStock ?? 0}{isLowStock(data) && <span className="ml-2 text-xs font-semibold">Low stock</span>}</p></div>
                </div>
                {allowEdit && <div className="flex gap-2"><button onClick={() => setModal('restock')} className={btnPrimary}><PackagePlus className="w-4 h-4" /> Restock</button><button onClick={() => setModal('issue')} className={btnGhost}><PackageMinus className="w-4 h-4" /> Issue Stock</button></div>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
                {stockLog.length === 0 ? <div className="text-center py-10 text-gray-400"><Boxes className="w-6 h-6 mx-auto mb-2" />No restock or issuance yet</div> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Qty</th><th className="px-4 py-2 text-left">Stock</th><th className="px-4 py-2 text-left">Issued To / Supplier</th><th className="px-4 py-2 text-left">Reference / Remarks</th><th className="px-4 py-2 text-left">By</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{[...stockLog].reverse().map((s, i) => (
                      <tr key={i}><td className="px-4 py-2 whitespace-nowrap">{fmtDate(s.date)}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${s.type === 'Restock' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.type}</span></td><td className="px-4 py-2">{s.quantity}</td><td className="px-4 py-2">{s.previous} → <b>{s.next}</b></td><td className="px-4 py-2">{s.issuedTo || s.supplier || '—'}{s.department ? ` · ${s.department}` : ''}</td><td className="px-4 py-2 text-gray-600 dark:text-slate-400">{[s.reference, s.remarks].filter(Boolean).join(' · ') || '—'}</td><td className="px-4 py-2">{s.by || '—'}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {tab === 'Maintenance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><H>MAINTENANCE HISTORY</H>{allowEdit && <button onClick={() => setModal('maintenance')} className={btnPrimary}><Wrench className="w-4 h-4" /> Add Maintenance</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                {maintenance.length === 0 ? <div className="text-center py-10 text-gray-400"><Wrench className="w-6 h-6 mx-auto mb-2" />No maintenance records</div> : (
                  <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{maintenance.map((m, i) => <li key={i} className="px-4 py-3 text-sm"><div className="flex justify-between"><span className="font-medium text-gray-900 dark:text-slate-200">{m.required}</span><span className="text-gray-400">{fmtDate(m.date)}</span></div><p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{m.repairStatus} · {m.provider || '—'} · {m.cost ? `₱${Number(m.cost).toLocaleString()}` : '—'}</p>{m.details && <p className="text-gray-600 dark:text-slate-300 text-xs mt-1">{m.details}</p>}</li>)}</ul>
                )}
              </div>
            </div>
          )}

          {tab === 'Transfer History' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><H>TRANSFER HISTORY</H>{allowEdit && <button onClick={() => setModal('transfer')} className={btnGhost}><ArrowRightLeft className="w-4 h-4" /> Transfer</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                {transfers.length === 0 ? <div className="text-center py-10 text-gray-400"><ArrowRightLeft className="w-6 h-6 mx-auto mb-2" />No transfers yet</div> : (
                  <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{transfers.map((t, i) => <li key={i} className="px-4 py-3 text-sm"><div className="flex justify-between"><span className="text-gray-800 dark:text-slate-200">{t.fromLocation || '—'} → {t.toLocation || '—'}</span><span className="text-gray-400">{fmtDate(t.date)}</span></div><p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{t.reason || '—'}{t.toEmployee ? ` · to ${t.toEmployee}` : ''}</p></li>)}</ul>
                )}
              </div>
            </div>
          )}

          {tab === 'Disposal' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
              {disposal ? (
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4"><DL label="Status" value={<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">For Disposal</span>} /><DL label="Reason" value={disposal.reason} /><DL label="Requested" value={fmtDate(disposal.date)} /><DL label="Method" value={disposal.method} />{disposal.remarks && <div className="col-span-full"><DL label="Remarks" value={disposal.remarks} /></div>}</dl>
              ) : (
                <div className="text-center py-8"><Recycle className="w-7 h-7 mx-auto mb-2 text-gray-300" /><p className="font-medium text-gray-700 dark:text-slate-300">No disposal request</p><p className="text-xs text-gray-400 mt-1">Use "Request Disposal" from the list to send this to the Disposal module.</p>{allowEdit && <button onClick={() => setModal('disposal')} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"><Recycle className="w-4 h-4" /> Request for Disposal</button>}</div>
              )}
            </div>
          )}

          {tab === 'Documents' && <DocumentsTab data={data} allowEdit={allowEdit} save={save} log={log} docTypes={DOC_TYPES} />}

          {tab === 'Activity Log' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
              {deviceHistory.length === 0 ? <div className="text-center py-10 text-gray-400">No activity recorded</div> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-2 text-left">Date & Time</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Description</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{deviceHistory.map((h) => <tr key={h.id}><td className="px-4 py-2 whitespace-nowrap">{fmtDateTime(h.timestamp)}</td><td className="px-4 py-2">{h.performedBy || '—'}</td><td className="px-4 py-2 capitalize">{h.action}</td><td className="px-4 py-2 text-gray-600 dark:text-slate-400">{h.details}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'assign' && (
        <AssignModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          await save(withOs({ dateAssigned: vals.dateAssigned, statusLabel: vals.assignedTo ? 'Assigned' : 'Available', assignmentHistory: [...assignmentHistory, { assignedTo: vals.assignedTo, department: vals.department, date: vals.dateAssigned || today(), by: user?.name }] },
            { assignedTo: vals.assignedTo, employeeId: vals.employeeId, department: vals.department, position: vals.position, status: vals.assignedTo ? 'active' : 'available' }));
          log(`Assigned to ${vals.assignedTo || 'Unassigned'}`, 'assign'); setModal(null);
        }} />
      )}
      {modal === 'transfer' && (
        <TransferModal data={data} fromLabel={data.location} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          await save(withOs({ locationRoom: vals.toLocation || os.locationRoom, transfers: [...transfers, { fromLocation: data.location, toLocation: vals.toLocation, toEmployee: vals.newEmployee, reason: vals.reason, remarks: vals.remarks, date: vals.date || today(), by: user?.name }] },
            { assignedTo: vals.newEmployee || data.assignedTo, department: vals.department || data.department, location: vals.toLocation || data.location }));
          log(`Transferred: ${vals.reason}`, 'transfer'); setModal(null);
        }} />
      )}
      {modal === 'maintenance' && (
        <MaintenanceModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          const done = vals.repairStatus === 'Completed';
          const statusNext: AssetStatus = done ? (os.prevStatus as AssetStatus) || 'available' : 'in-maintenance';
          await save(withOs({
            statusLabel: done ? (os.prevStatusLabel || 'Available') : 'Under Repair',
            prevStatus: done ? undefined : (data.status === 'in-maintenance' ? os.prevStatus : data.status),
            prevStatusLabel: done ? undefined : (os.statusLabel || 'Available'),
            maintenance: [...maintenance, { ...vals, date: vals.date || today(), by: user?.name }],
          }, { status: statusNext }));
          log(`Maintenance: ${vals.required} (${vals.repairStatus})`); setModal(null);
        }} />
      )}
      {modal === 'restock' && (
        <LogEntryModal title="Restock" subtitle={`${data.deviceCode} · ${data.name} · current stock ${stock}`} busy={busy} onClose={() => setModal(null)}
          fields={[
            { key: 'date', label: 'Date Received', type: 'date', required: true },
            { key: 'quantity', label: 'Quantity Received', type: 'number', required: true },
            { key: 'supplier', label: 'Supplier', placeholder: os.supplier || '' },
            { key: 'reference', label: 'PO / Invoice / DR No.' },
            { key: 'remarks', label: 'Remarks', textarea: true },
          ]}
          onSave={async (vals) => {
            const q = Number(vals.quantity);
            if (!(q > 0)) { alert('Enter a quantity greater than 0.'); return; }
            const next = stock + q;
            await save(withOs({ currentStock: next, stockLog: [...stockLog, { type: 'Restock', date: vals.date || today(), quantity: q, previous: stock, next, supplier: vals.supplier, reference: vals.reference, remarks: vals.remarks, by: user?.name }] }));
            log(`Restocked ${q} (stock ${stock} → ${next})`); setModal(null);
          }} />
      )}
      {modal === 'issue' && (
        <LogEntryModal title="Issue Stock" subtitle={`${data.deviceCode} · ${data.name} · ${stock} in stock`} busy={busy} onClose={() => setModal(null)}
          fields={[
            { key: 'date', label: 'Date Issued', type: 'date', required: true },
            { key: 'quantity', label: 'Quantity', type: 'number', required: true },
            { key: 'issuedTo', label: 'Issued To', required: true },
            { key: 'department', label: 'Department' },
            { key: 'remarks', label: 'Purpose / Remarks', textarea: true },
          ]}
          onSave={async (vals) => {
            const q = Number(vals.quantity);
            if (!(q > 0)) { alert('Enter a quantity greater than 0.'); return; }
            if (q > stock) { alert(`Only ${stock} in stock — cannot issue ${q}.`); return; }
            const next = stock - q;
            await save(withOs({ currentStock: next, stockLog: [...stockLog, { type: 'Issue', date: vals.date || today(), quantity: q, previous: stock, next, issuedTo: vals.issuedTo, department: vals.department, remarks: vals.remarks, by: user?.name }] }));
            log(`Issued ${q} to ${vals.issuedTo} (stock ${stock} → ${next})`, 'assign'); setModal(null);
          }} />
      )}
      {modal === 'disposal' && (
        <DisposalModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          await save(withOs({ statusLabel: 'For Disposal', disposal: { reason: vals.reason, date: vals.date || today(), method: vals.method, remarks: vals.remarks, by: user?.name } }));
          await addFormRecord({ formType: 'Asset Disposal', assetTag: data.deviceCode, deviceCode: data.deviceCode, name: data.name, company: data.company, category: data.category as any, employeeName: data.assignedTo, department: data.department, status: 'Active', createdBy: user?.name || 'Admin', details: `Disposal requested — ${vals.method}: ${vals.reason}`, relatedAssetId: data._id, formData: { ...vals, deviceCode: data.deviceCode, name: data.name } });
          log(`Disposal requested — ${vals.method}`, 'disposed'); setModal(null);
        }} />
      )}
      {modal === 'archive' && (
        <ConfirmArchive data={data} busy={busy} onCancel={() => setModal(null)} onConfirm={async () => { setBusy(true); try { await deleteAsset(data._id!); log(`Deleted ${data.deviceCode}`, 'deleted'); onClose(); } finally { setBusy(false); } }} />
      )}
    </div>
  );
}
