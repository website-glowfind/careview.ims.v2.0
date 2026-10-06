import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, UserPlus, ArrowRightLeft, Archive as ArchiveIcon, Printer,
  User, History, MapPin, Wrench, Recycle, Image as ImageIcon,
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
  DL, fmtDate, fmtDateTime, today, AssignModal, TransferModal, MaintenanceModal, DisposalModal, ConfirmArchive, DocumentsTab,
} from '@/components/asset-detail-kit';

interface Props {
  asset: ITAsset;
  onClose: () => void;
  onEdit: (asset: ITAsset) => void;
  isAdmin: boolean;
  canEdit?: boolean;
  initialTab?: string;
  initialModal?: 'assign' | 'transfer' | 'maintenance' | 'disposal' | null;
}

const STATUS_PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
};
const CONDITION_PILL: Record<string, string> = {
  New: 'bg-green-100 text-green-700', Good: 'bg-blue-100 text-blue-700', Fair: 'bg-amber-100 text-amber-700', Poor: 'bg-orange-100 text-orange-700', Damaged: 'bg-red-100 text-red-700',
};
const TABS = ['Overview', 'Assignment', 'Location', 'Maintenance', 'Transfer History', 'Disposal', 'Documents', 'Activity Log'] as const;
type Tab = typeof TABS[number];
const DOC_TYPES = ['Asset Photo', 'Invoice', 'Official Receipt', 'Purchase Order', 'Warranty Document', 'Transfer Document', 'Maintenance Document', 'Disposal Document', 'Other'];

export function StaffHouseDetails({ asset, onClose, onEdit, isAdmin, canEdit, initialTab, initialModal }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const { updateAsset, deleteAsset } = useAssetStore();
  const live = useAssetStore((s) => s.assets.find((a) => a._id === asset._id));
  const data = live ?? asset;
  const sh: any = data.staffHouse ?? {};

  const { deviceHistory, fetchHistoryByDevice, addHistoryEntry } = useActivityLogStore();
  const { addFormRecord } = useFormRecordStore();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>((initialTab as Tab) ?? 'Overview');
  const [modal, setModal] = useState<null | 'assign' | 'transfer' | 'maintenance' | 'disposal' | 'archive'>(initialModal ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data.deviceCode) fetchHistoryByDevice(data.deviceCode); }, [data.deviceCode, fetchHistoryByDevice]);

  const maintenance: any[] = Array.isArray(sh.maintenance) ? sh.maintenance : [];
  const transfers: any[] = Array.isArray(sh.transfers) ? sh.transfers : [];
  const assignmentHistory: any[] = Array.isArray(sh.assignmentHistory) ? sh.assignmentHistory : [];
  const disposal = sh.disposal;
  const photo = (data.attachments || []).find((a) => (a.type || '').startsWith('image/'));
  const statusLabel = disposal ? 'For Disposal' : (sh.statusLabel || ({ active: 'In Use', available: 'Available', 'in-maintenance': 'Under Repair', 'in-storage': 'For Disposal', disposed: 'Disposed' } as any)[data.status] || data.status);
  const statusPill = disposal ? 'bg-red-100 text-red-700' : (STATUS_PILL[statusLabel] ?? 'bg-gray-100 text-gray-600');

  const save = async (next: ITAsset) => { setBusy(true); try { await updateAsset(data._id!, next); } finally { setBusy(false); } };
  const log = (details: string, action: any = 'edited') => addHistoryEntry({ action, category: 'asset', deviceCode: data.deviceCode, deviceName: data.name, company: data.company, details, performedBy: user?.name });
  const money = (v?: number) => (v != null ? `${sh.currency ?? '₱'}${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—');

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to Staff House Inventory</button>

      {/* Header */}
      <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#1e2d4a] flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
          {photo ? <img src={resolveFileUrl(photo.url)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-7 h-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{data.name}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Asset Code: <span className="font-mono font-semibold text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span></p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>
            {data.condition && <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${CONDITION_PILL[data.condition] ?? 'bg-gray-100 text-gray-600'}`}>{data.condition}</span>}
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(data.company)}`}>{data.company}</span>
            {data.category && <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-gray-200 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300">{data.category}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <QRCodeDisplay deviceCode={data.deviceCode} size={72} showDownload={false} showLabel={false} />
            <button onClick={() => window.print()} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#0b5c96] dark:text-blue-400 hover:underline"><Printer className="w-3 h-3" /> Print QR</button>
          </div>
          {allowEdit && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onEdit(data)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => setModal('assign')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><UserPlus className="w-3.5 h-3.5" /> Assign</button>
              <button onClick={() => setModal('transfer')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><ArrowRightLeft className="w-3.5 h-3.5" /> Transfer</button>
              {isAdmin && <button onClick={() => setModal('archive')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><ArchiveIcon className="w-3.5 h-3.5" /> Archive</button>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f]">
        <nav className="flex gap-5 px-6 border-b border-gray-100 dark:border-[#1e3a5f] overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>
              {t}{t === 'Activity Log' && deviceHistory.length > 0 ? ` ${deviceHistory.length}` : ''}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {tab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
                <div>
                  <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">BASIC INFORMATION</h3>
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DL label="Asset Code" value={<span className="font-mono text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span>} />
                    <DL label="Asset Name" value={data.name} /><DL label="Category" value={data.category} />
                    <DL label="Type" value={sh.assetType} /><DL label="Company" value={data.company} /><DL label="Brand" value={data.brand} />
                    <DL label="Model" value={data.model} /><DL label="Serial Number" value={data.serialNumber} /><DL label="Material" value={sh.material} />
                    <DL label="Color" value={sh.color} /><DL label="Dimensions" value={sh.dimensions} />
                    <DL label="Quantity" value={sh.quantity != null ? `${sh.quantity} ${sh.unit ?? ''}`.trim() : undefined} />
                    <DL label="Condition" value={data.condition && <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONDITION_PILL[data.condition] ?? 'bg-gray-100 text-gray-600'}`}>{data.condition}</span>} />
                    <DL label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>} />
                  </dl>
                  <div className="mt-4"><DL label="Description" value={sh.description || data.specifications} /></div>
                </div>
                <div className="space-y-3">
                  <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl aspect-square flex flex-col items-center justify-center text-gray-400 overflow-hidden">
                    {photo ? <img src={resolveFileUrl(photo.url)} alt="" className="w-full h-full object-cover" /> : <><ImageIcon className="w-7 h-7" /><span className="text-xs mt-1">No asset photo</span></>}
                  </div>
                  <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-3 flex flex-col items-center">
                    <QRCodeDisplay deviceCode={data.deviceCode} size={120} showDownload={false} showLabel={false} />
                    <p className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400 mt-1">{data.deviceCode}</p>
                    <p className="text-[11px] text-gray-400">Scan to identify this asset</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">PURCHASE DETAILS</h3>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  <DL label="Purchase Date" value={fmtDate(data.purchaseDate)} /><DL label="Supplier" value={sh.supplier} /><DL label="Purchase Order Number" value={sh.poNumber} />
                  <DL label="Invoice / OR" value={sh.invoiceNumber} /><DL label="Acquisition Cost" value={money(sh.acquisitionCost)} /><DL label="Warranty" value={sh.warranty ? 'Yes' : 'No'} />
                </dl>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">SYSTEM INFORMATION</h3><span className="text-xs text-gray-400">System generated</span></div>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Date Encoded" value={fmtDateTime((data as any).createdAt)} /><DL label="Encoded By" value={user?.name} />
                  <DL label="Date Updated" value={fmtDateTime((data as any).updatedAt)} /><DL label="Updated By" value={user?.name} />
                </dl>
              </div>
            </div>
          )}

          {tab === 'Assignment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">CURRENT ASSIGNMENT</h3>
                {allowEdit && <button onClick={() => setModal('assign')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><UserPlus className="w-4 h-4" /> Change Assignment</button>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
                {data.assignedTo || sh.assignedResident ? (
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DL label="Assigned To" value={data.assignedTo} /><DL label="Resident" value={sh.assignedResident} /><DL label="Room" value={sh.assignedRoom} /><DL label="Bed Number" value={sh.bedNumber} />
                    <DL label="Department" value={data.department} /><DL label="Position" value={data.position} /><DL label="Date Assigned" value={fmtDate(sh.dateAssigned)} />
                  </dl>
                ) : <div className="text-center py-8 text-gray-400"><User className="w-6 h-6 mx-auto mb-2" />Not currently assigned</div>}
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">ASSIGNMENT HISTORY</h3>
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
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">STAFF HOUSE LOCATION</h3>
                {allowEdit && <button onClick={() => setModal('transfer')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><ArrowRightLeft className="w-4 h-4" /> Transfer Asset</button>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-5 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#0b5c96] mt-0.5" />
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  <DL label="Staff House" value={sh.staffHouseName} /><DL label="Code" value={sh.staffHouseCode} /><DL label="Complete Location" value={sh.completeLocation} />
                  <DL label="Building" value={sh.building} /><DL label="Floor" value={sh.floor} /><DL label="Room Number" value={sh.roomNumber} />
                  <DL label="Room Name" value={sh.roomName} /><DL label="Capacity" value={sh.capacity} /><DL label="Occupancy" value={sh.occupancyStatus} /><DL label="Specific Area" value={sh.specificArea} />
                </dl>
              </div>
              <p className="text-xs text-gray-400">Previous locations are kept in Transfer History ({transfers.length} record{transfers.length !== 1 ? 's' : ''}).</p>
            </div>
          )}

          {tab === 'Maintenance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">MAINTENANCE HISTORY</h3>{allowEdit && <button onClick={() => setModal('maintenance')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><Wrench className="w-4 h-4" /> Add Maintenance</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                {maintenance.length === 0 ? <div className="text-center py-10 text-gray-400"><Wrench className="w-6 h-6 mx-auto mb-2" />No maintenance records</div> : (
                  <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{maintenance.map((m, i) => <li key={i} className="px-4 py-3 text-sm"><div className="flex justify-between"><span className="font-medium text-gray-900 dark:text-slate-200">{m.required}</span><span className="text-gray-400">{fmtDate(m.date)}</span></div><p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{m.repairStatus} · {m.provider || '—'} · {m.cost ? `₱${Number(m.cost).toLocaleString()}` : '—'}</p>{m.details && <p className="text-gray-600 dark:text-slate-300 text-xs mt-1">{m.details}</p>}</li>)}</ul>
                )}
              </div>
            </div>
          )}

          {tab === 'Transfer History' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">TRANSFER HISTORY</h3>{allowEdit && <button onClick={() => setModal('transfer')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><ArrowRightLeft className="w-4 h-4" /> Transfer Asset</button>}</div>
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
                <div className="text-center py-8"><Recycle className="w-7 h-7 mx-auto mb-2 text-gray-300" /><p className="font-medium text-gray-700 dark:text-slate-300">No disposal request</p><p className="text-xs text-gray-400 mt-1">Requests are recorded in the Disposal Form module and Form Masterlist.</p>{allowEdit && <button onClick={() => setModal('disposal')} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"><Recycle className="w-4 h-4" /> Request for Disposal</button>}</div>
              )}
            </div>
          )}

          {tab === 'Documents' && <DocumentsTab data={data} allowEdit={allowEdit} save={save} log={log} docTypes={DOC_TYPES} />}

          {tab === 'Activity Log' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
              {deviceHistory.length === 0 ? <div className="text-center py-10 text-gray-400">No activity recorded</div> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-2 text-left">Date & Time</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Asset Code</th><th className="px-4 py-2 text-left">Description</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{deviceHistory.map((h) => <tr key={h.id}><td className="px-4 py-2 whitespace-nowrap">{fmtDateTime(h.timestamp)}</td><td className="px-4 py-2">{h.performedBy || '—'}</td><td className="px-4 py-2 capitalize">{h.action}</td><td className="px-4 py-2 font-mono text-[#0b5c96] dark:text-blue-400">{h.deviceCode}</td><td className="px-4 py-2 text-gray-600 dark:text-slate-400">{h.details}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'assign' && (
        <AssignModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          const next: ITAsset = { ...data, assignedTo: vals.assignedTo, employeeId: vals.employeeId, department: vals.department, position: vals.position,
            staffHouse: { ...sh, dateAssigned: vals.dateAssigned, assignmentHistory: [...assignmentHistory, { assignedTo: vals.assignedTo, department: vals.department, date: vals.dateAssigned || today(), by: user?.name }] } };
          await save(next); log(`Assigned to ${vals.assignedTo || 'Unassigned'}`, 'assign'); setModal(null);
        }} />
      )}
      {modal === 'transfer' && (
        <TransferModal data={data} fromLabel={data.location} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          const next: ITAsset = { ...data, assignedTo: vals.newEmployee || data.assignedTo, department: vals.department || data.department, location: vals.toLocation || data.location,
            staffHouse: { ...sh, specificArea: vals.toLocation || sh.specificArea, transfers: [...transfers, { fromLocation: data.location, toLocation: vals.toLocation, toEmployee: vals.newEmployee, reason: vals.reason, remarks: vals.remarks, date: vals.date || today(), by: user?.name }] } };
          await save(next); log(`Transferred: ${vals.reason}`, 'transfer'); setModal(null);
        }} />
      )}
      {modal === 'maintenance' && (
        <MaintenanceModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          const statusNext: AssetStatus = vals.repairStatus === 'Completed' ? (sh.prevStatus as AssetStatus) || 'available' : 'in-maintenance';
          const statusLbl = vals.repairStatus === 'Completed' ? (sh.prevStatusLabel || 'Available') : 'Under Repair';
          const next: ITAsset = { ...data, status: statusNext,
            staffHouse: { ...sh, statusLabel: statusLbl, prevStatus: vals.repairStatus === 'Completed' ? undefined : (data.status === 'in-maintenance' ? sh.prevStatus : data.status), prevStatusLabel: vals.repairStatus === 'Completed' ? undefined : (sh.statusLabel || 'Available'),
              maintenance: [...maintenance, { ...vals, date: vals.date || today(), by: user?.name }] } };
          await save(next); log(`Maintenance: ${vals.required} (${vals.repairStatus})`); setModal(null);
        }} />
      )}
      {modal === 'disposal' && (
        <DisposalModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          const next: ITAsset = { ...data, staffHouse: { ...sh, statusLabel: 'For Disposal', disposal: { reason: vals.reason, date: vals.date || today(), method: vals.method, remarks: vals.remarks, by: user?.name } } };
          await save(next);
          await addFormRecord({ formType: 'Asset Disposal', assetTag: data.deviceCode, deviceCode: data.deviceCode, name: data.name, company: data.company, category: data.category as any, employeeName: data.assignedTo, department: data.department, status: 'Active', createdBy: user?.name || 'Admin', details: `Disposal requested — ${vals.method}: ${vals.reason}`, relatedAssetId: data._id, formData: { ...vals, deviceCode: data.deviceCode, name: data.name } });
          log(`Disposal requested — ${vals.method}`, 'disposed'); setModal(null);
        }} />
      )}
      {modal === 'archive' && (
        <ConfirmArchive data={data} busy={busy} onCancel={() => setModal(null)} onConfirm={async () => { setBusy(true); try { await deleteAsset(data._id!); log(`Archived ${data.deviceCode}`, 'deleted'); onClose(); } finally { setBusy(false); } }} />
      )}
    </div>
  );
}
