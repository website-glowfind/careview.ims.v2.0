import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Pencil, UserPlus, ArrowRightLeft, Archive as ArchiveIcon, Printer, Upload,
  User, History, MapPin, Wrench, FileText, Trash2, Recycle, AlertTriangle, X, Image as ImageIcon, Loader2,
} from 'lucide-react';
import type { ITAsset, AssetStatus } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { resolveFileUrl } from '@/utils/fileUrl';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { assetServices } from '@/services/assetServices';
import { useAssetStore } from '@/store/assetStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useAuthStore } from '@/store/authStore';

interface Props {
  asset: ITAsset;
  onClose: () => void;
  onEdit: (asset: ITAsset) => void;
  isAdmin: boolean;
  canEdit?: boolean;
  /** Open on a specific tab / with a modal already open (from the row … menu) */
  initialTab?: string;
  initialModal?: 'assign' | 'transfer' | 'maintenance' | 'disposal' | null;
}

const STATUS_PILL: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700', available: 'bg-green-100 text-green-700',
  'in-storage': 'bg-purple-100 text-purple-700', 'in-maintenance': 'bg-amber-100 text-amber-700',
  disposed: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'In Use', available: 'Available', 'in-storage': 'In Storage', 'in-maintenance': 'Under Repair', disposed: 'Disposed',
};
const CONDITION_PILL: Record<string, string> = {
  New: 'bg-green-100 text-green-700', Good: 'bg-blue-100 text-blue-700', Fair: 'bg-amber-100 text-amber-700',
  Poor: 'bg-orange-100 text-orange-700', Damaged: 'bg-red-100 text-red-700',
};
const TABS = ['Overview', 'Assignment', 'Location', 'Maintenance', 'Transfer History', 'Disposal', 'Documents', 'Activity Log'] as const;
type Tab = typeof TABS[number];

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const today = () => new Date().toISOString().slice(0, 10);

const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
const FLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{children} {required && <span className="text-red-500">*</span>}</label>
);
const DL = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div>
    <dt className="text-xs text-gray-400 dark:text-slate-500">{label}</dt>
    <dd className="text-sm text-gray-900 dark:text-slate-200 mt-0.5">{value || '—'}</dd>
  </div>
);

export function FurnitureDetails({ asset, onClose, onEdit, isAdmin, canEdit, initialTab, initialModal }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const { updateAsset, deleteAsset } = useAssetStore();
  const live = useAssetStore((s) => s.assets.find((a) => a._id === asset._id));
  const data = live ?? asset;
  const f: any = data.furniture ?? {};

  const { deviceHistory, fetchHistoryByDevice, addHistoryEntry } = useActivityLogStore();
  const { addFormRecord } = useFormRecordStore();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>((initialTab as Tab) ?? 'Overview');
  const [modal, setModal] = useState<null | 'assign' | 'transfer' | 'maintenance' | 'disposal' | 'archive'>(initialModal ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data.deviceCode) fetchHistoryByDevice(data.deviceCode); }, [data.deviceCode, fetchHistoryByDevice]);

  const maintenance: any[] = Array.isArray(f.maintenance) ? f.maintenance : [];
  const transfers: any[] = Array.isArray(f.transfers) ? f.transfers : [];
  const assignmentHistory: any[] = Array.isArray(f.assignmentHistory) ? f.assignmentHistory : [];
  const disposal = f.disposal;
  const photo = (data.attachments || []).find((a) => (a.type || '').startsWith('image/'));

  const displayStatus = disposal ? 'For Disposal' : (STATUS_LABEL[data.status] ?? data.status);
  const displayStatusPill = disposal ? 'bg-red-100 text-red-700' : (STATUS_PILL[data.status] ?? 'bg-gray-100 text-gray-600');

  const save = async (next: ITAsset) => { setBusy(true); try { await updateAsset(data._id!, next); } finally { setBusy(false); } };

  const log = (details: string, action: any = 'edited') =>
    addHistoryEntry({ action, category: 'asset', deviceCode: data.deviceCode, deviceName: data.name, company: data.company, details, performedBy: user?.name });

  // ── Header ──
  const Header = (
    <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-5 flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#1e2d4a] flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
        {photo ? <img src={resolveFileUrl(photo.url)} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-7 h-7" />}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{data.name}</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">Asset Code: <span className="font-mono font-semibold text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span></p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${displayStatusPill}`}>{displayStatus}</span>
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
  );

  const money = (v?: number) => (v != null ? `${f.currency ?? '₱'}${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—');

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to Furniture Inventory</button>
      {Header}

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
          {/* OVERVIEW */}
          {tab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
                <div>
                  <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">BASIC INFORMATION</h3>
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DL label="Asset Code" value={<span className="font-mono text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span>} />
                    <DL label="Furniture Name" value={data.name} />
                    <DL label="Category" value={data.category} />
                    <DL label="Type" value={f.type} />
                    <DL label="Company" value={data.company} />
                    <DL label="Brand" value={data.brand} />
                    <DL label="Model" value={data.model} />
                    <DL label="Serial Number" value={data.serialNumber} />
                    <DL label="Material" value={f.material} />
                    <DL label="Color" value={f.color} />
                    <DL label="Dimensions" value={f.dimensions} />
                    <DL label="Quantity" value={f.quantity != null ? `${f.quantity} ${f.unit ?? ''}`.trim() : undefined} />
                    <DL label="Condition" value={data.condition && <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${CONDITION_PILL[data.condition] ?? 'bg-gray-100 text-gray-600'}`}>{data.condition}</span>} />
                    <DL label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${displayStatusPill}`}>{displayStatus}</span>} />
                  </dl>
                  <div className="mt-4"><DL label="Description" value={f.description || data.specifications} /></div>
                </div>
                <div className="space-y-3">
                  <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl aspect-square flex flex-col items-center justify-center text-gray-400 overflow-hidden">
                    {photo ? <img src={resolveFileUrl(photo.url)} alt="" className="w-full h-full object-cover" /> : <><ImageIcon className="w-7 h-7" /><span className="text-xs mt-1">No asset photo</span></>}
                  </div>
                  <p className="text-xs text-gray-400 text-center -mt-1">Asset Photo</p>
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
                  <DL label="Purchase Date" value={fmtDate(data.purchaseDate)} />
                  <DL label="Supplier" value={f.supplier} />
                  <DL label="Purchase Order Number" value={f.poNumber} />
                  <DL label="Invoice / OR" value={f.invoiceNumber} />
                  <DL label="Acquisition Cost" value={money(f.acquisitionCost)} />
                  <DL label="Warranty" value={f.warranty ? 'Yes' : 'No'} />
                </dl>
              </div>

              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">CONDITION</h3>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  <DL label="Last Inspection" value={fmtDate(f.lastInspectionDate)} />
                  <DL label="Inspected By" value={f.inspectedBy} />
                  <DL label="Remarks" value={f.conditionRemarks} />
                </dl>
              </div>

              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">SYSTEM INFORMATION</h3>
                  <span className="text-xs text-gray-400">System generated</span>
                </div>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Date Encoded" value={fmtDateTime((data as any).createdAt)} />
                  <DL label="Encoded By" value={(f as any).encodedBy || user?.name} />
                  <DL label="Date Updated" value={fmtDateTime((data as any).updatedAt)} />
                  <DL label="Updated By" value={(f as any).updatedBy || user?.name} />
                </dl>
              </div>
            </div>
          )}

          {/* ASSIGNMENT */}
          {tab === 'Assignment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">CURRENT ASSIGNMENT</h3>
                {allowEdit && <button onClick={() => setModal('assign')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><UserPlus className="w-4 h-4" /> Change Assignment</button>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
                {data.assignedTo ? (
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DL label="Assigned To" value={data.assignedTo} /><DL label="Employee ID" value={data.employeeId} />
                    <DL label="Department" value={data.department} /><DL label="Position" value={data.position} />
                    <DL label="Date Assigned" value={fmtDate(f.dateAssigned)} />
                  </dl>
                ) : <div className="text-center py-8 text-gray-400"><User className="w-6 h-6 mx-auto mb-2" />Not currently assigned</div>}
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">ASSIGNMENT HISTORY</h3>
                <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                  {assignmentHistory.length === 0 ? <div className="text-center py-8 text-gray-400"><History className="w-6 h-6 mx-auto mb-2" />No assignment history</div> : (
                    <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                      {assignmentHistory.map((h, i) => (
                        <li key={i} className="px-4 py-3 text-sm flex justify-between"><span className="text-gray-800 dark:text-slate-200">{h.assignedTo || 'Unassigned'} · {h.department || '—'}</span><span className="text-gray-400">{fmtDate(h.date)}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LOCATION */}
          {tab === 'Location' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">CURRENT LOCATION</h3>
                {allowEdit && <button onClick={() => setModal('transfer')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><ArrowRightLeft className="w-4 h-4" /> Transfer Asset</button>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-5 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#0b5c96] mt-0.5" />
                <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                  <DL label="Site / Branch" value={f.siteBranch} /><DL label="Building" value={f.building} />
                  <DL label="Floor" value={f.floor} /><DL label="Room / Area" value={f.roomArea} /><DL label="Specific Location" value={f.specificLocation} />
                </dl>
              </div>
              <p className="text-xs text-gray-400">Previous locations are kept in Transfer History ({transfers.length} record{transfers.length !== 1 ? 's' : ''}).</p>
            </div>
          )}

          {/* MAINTENANCE */}
          {tab === 'Maintenance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">MAINTENANCE HISTORY</h3>
                {allowEdit && <button onClick={() => setModal('maintenance')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><Wrench className="w-4 h-4" /> Add Maintenance</button>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                {maintenance.length === 0 ? <div className="text-center py-10 text-gray-400"><Wrench className="w-6 h-6 mx-auto mb-2" />No maintenance records<p className="text-xs mt-1">Repairs and servicing will be listed here.</p></div> : (
                  <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                    {maintenance.map((m, i) => (
                      <li key={i} className="px-4 py-3 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-gray-900 dark:text-slate-200">{m.required}</span><span className="text-gray-400">{fmtDate(m.date)}</span></div>
                        <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{m.status} · {m.provider || '—'} · {m.cost ? `₱${Number(m.cost).toLocaleString()}` : '—'}</p>
                        {m.details && <p className="text-gray-600 dark:text-slate-300 text-xs mt-1">{m.details}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TRANSFER HISTORY */}
          {tab === 'Transfer History' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">TRANSFER HISTORY</h3>
                {allowEdit && <button onClick={() => setModal('transfer')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><ArrowRightLeft className="w-4 h-4" /> Transfer Asset</button>}
              </div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
                {transfers.length === 0 ? <div className="text-center py-10 text-gray-400"><ArrowRightLeft className="w-6 h-6 mx-auto mb-2" />No transfers yet</div> : (
                  <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                    {transfers.map((t, i) => (
                      <li key={i} className="px-4 py-3 text-sm">
                        <div className="flex justify-between"><span className="text-gray-800 dark:text-slate-200">{t.fromLocation || '—'} → {t.toLocation || '—'}</span><span className="text-gray-400">{fmtDate(t.date)}</span></div>
                        <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{t.reason || '—'}{t.toEmployee ? ` · to ${t.toEmployee}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* DISPOSAL */}
          {tab === 'Disposal' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
              {disposal ? (
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DL label="Status" value={<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">For Disposal</span>} />
                  <DL label="Reason" value={disposal.reason} /><DL label="Requested" value={fmtDate(disposal.date)} /><DL label="Method" value={disposal.method} />
                  {disposal.remarks && <div className="col-span-full"><DL label="Remarks" value={disposal.remarks} /></div>}
                </dl>
              ) : (
                <div className="text-center py-8">
                  <Recycle className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-700 dark:text-slate-300">No disposal request</p>
                  <p className="text-xs text-gray-400 mt-1">Requests are recorded in the Disposal Form module and Form Masterlist.</p>
                  {allowEdit && <button onClick={() => setModal('disposal')} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"><Recycle className="w-4 h-4" /> Request for Disposal</button>}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS */}
          {tab === 'Documents' && <DocumentsTab data={data} allowEdit={allowEdit} save={save} log={log} />}

          {/* ACTIVITY LOG */}
          {tab === 'Activity Log' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
              {deviceHistory.length === 0 ? <div className="text-center py-10 text-gray-400">No activity recorded</div> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase">
                    <tr><th className="px-4 py-2 text-left">Date & Time</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Asset Code</th><th className="px-4 py-2 text-left">Description</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">
                    {deviceHistory.map((h) => (
                      <tr key={h.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{fmtDateTime(h.timestamp)}</td>
                        <td className="px-4 py-2">{h.performedBy || '—'}</td>
                        <td className="px-4 py-2 capitalize">{h.action}</td>
                        <td className="px-4 py-2 font-mono text-[#0b5c96] dark:text-blue-400">{h.deviceCode}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-slate-400">{h.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal === 'assign' && (
        <AssignModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals) => {
          const next: ITAsset = { ...data, assignedTo: vals.assignedTo, employeeId: vals.employeeId, department: vals.department, position: vals.position,
            furniture: { ...f, dateAssigned: vals.dateAssigned, assignmentHistory: [...assignmentHistory, { assignedTo: vals.assignedTo, department: vals.department, date: vals.dateAssigned || today(), by: user?.name }] } };
          await save(next); await log(`Assigned to ${vals.assignedTo || 'Unassigned'}`, 'assign'); setModal(null);
        }} />
      )}
      {modal === 'transfer' && (
        <TransferModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals) => {
          const fromLocation = [f.siteBranch, f.building, f.floor, f.roomArea, f.specificLocation].filter(Boolean).join(' · ');
          const toLocation = [vals.siteBranch || f.siteBranch, vals.building || f.building, vals.floor || f.floor, vals.roomArea || f.roomArea, vals.specificLocation || f.specificLocation].filter(Boolean).join(' · ');
          const next: ITAsset = { ...data,
            assignedTo: vals.newEmployee || data.assignedTo, employeeId: vals.employeeId || data.employeeId, department: vals.department || data.department,
            location: toLocation || data.location,
            furniture: { ...f, siteBranch: vals.siteBranch || f.siteBranch, building: vals.building || f.building, floor: vals.floor || f.floor, roomArea: vals.roomArea || f.roomArea, specificLocation: vals.specificLocation || f.specificLocation,
              transfers: [...transfers, { fromLocation, toLocation, toEmployee: vals.newEmployee, reason: vals.reason, remarks: vals.remarks, date: vals.date || today(), by: user?.name }] } };
          await save(next); await log(`Transferred: ${vals.reason}`, 'transfer'); setModal(null);
        }} />
      )}
      {modal === 'maintenance' && (
        <MaintenanceModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals) => {
          const statusNext: AssetStatus = (vals.repairStatus === 'Completed') ? (f.prevStatus as AssetStatus) || 'available' : 'in-maintenance';
          const next: ITAsset = { ...data, status: statusNext,
            furniture: { ...f, prevStatus: vals.repairStatus === 'Completed' ? undefined : (data.status === 'in-maintenance' ? f.prevStatus : data.status),
              maintenance: [...maintenance, { ...vals, date: vals.date || today(), by: user?.name }] } as any };
          await save(next); await log(`Maintenance: ${vals.required} (${vals.repairStatus})`); setModal(null);
        }} />
      )}
      {modal === 'disposal' && (
        <DisposalModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals) => {
          const next: ITAsset = { ...data, furniture: { ...f, disposal: { reason: vals.reason, date: vals.date || today(), method: vals.method, remarks: vals.remarks, by: user?.name } } };
          await save(next);
          await addFormRecord({ formType: 'Asset Disposal', assetTag: data.deviceCode, deviceCode: data.deviceCode, name: data.name, company: data.company,
            category: data.category as any, employeeName: data.assignedTo, department: data.department, status: 'Active', createdBy: user?.name || 'Admin',
            details: `Disposal requested — ${vals.method}: ${vals.reason}`, relatedAssetId: data._id, formData: { ...vals, deviceCode: data.deviceCode, name: data.name } });
          await log(`Disposal requested — ${vals.method}`, 'disposed'); setModal(null);
        }} />
      )}
      {modal === 'archive' && (
        <ConfirmArchive data={data} busy={busy} onCancel={() => setModal(null)} onConfirm={async () => {
          setBusy(true);
          try { await deleteAsset(data._id!); await log(`Archived ${data.deviceCode}`, 'deleted'); onClose(); }
          finally { setBusy(false); }
        }} />
      )}
    </div>
  );
}

// ── Modal shell ──
function Shell({ title, subtitle, onClose, children, footer, width = 'max-w-lg' }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className={`bg-white dark:bg-[#162236] rounded-2xl w-full ${width} shadow-xl max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between p-6 pb-3">
          <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>{subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 overflow-y-auto space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 mt-2 border-t border-gray-200 dark:border-[#1e3a5f]">{footer}</div>
      </div>
    </div>
  );
}
const cancelBtn = 'px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]';

function AssignModal({ data, busy, onClose, onSave }: any) {
  const f = data.furniture ?? {};
  const [v, setV] = useState({ assignedTo: data.assignedTo ?? '', employeeId: data.employeeId ?? '', department: data.department ?? '', position: data.position ?? '', dateAssigned: f.dateAssigned ?? today() });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title="Assign Furniture" subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose}
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.assignedTo.trim()} onClick={() => onSave(v)} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Save Assignment</button></>}>
      <div className="grid grid-cols-2 gap-4 pb-2">
        <div><FLabel required>Assigned To</FLabel><input value={v.assignedTo} onChange={set('assignedTo')} className={INPUT} /></div>
        <div><FLabel>Employee ID</FLabel><input value={v.employeeId} onChange={set('employeeId')} className={INPUT} /></div>
        <div><FLabel>Department</FLabel><input value={v.department} onChange={set('department')} className={INPUT} /></div>
        <div><FLabel>Position</FLabel><input value={v.position} onChange={set('position')} className={INPUT} /></div>
        <div className="col-span-2"><FLabel>Date Assigned</FLabel><input type="date" value={v.dateAssigned} onChange={set('dateAssigned')} className={INPUT} /></div>
      </div>
    </Shell>
  );
}

function TransferModal({ data, busy, onClose, onSave }: any) {
  const f = data.furniture ?? {};
  const fromLoc = [f.siteBranch, f.building, f.floor, f.roomArea, f.specificLocation].filter(Boolean).join(' · ') || '—';
  const [v, setV] = useState({ newEmployee: '', employeeId: '', department: '', siteBranch: '', building: '', floor: '', roomArea: '', specificLocation: '', date: today(), reason: '', remarks: '' });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title="Transfer Asset" subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose} width="max-w-2xl"
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.reason.trim()} onClick={() => onSave(v)} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Confirm Transfer</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-[#1e3a5f] p-3 text-xs"><p className="text-gray-400 mb-1">FROM</p><p className="text-gray-800 dark:text-slate-200">{data.assignedTo || 'Unassigned'} · {data.department || '—'}</p><p className="text-gray-500 mt-1">{fromLoc}</p></div>
        <div className="rounded-lg border border-[#0b5c96]/40 bg-[#0b5c96]/5 p-3 text-xs"><p className="text-[#0b5c96] mb-1">TO</p><p className="text-gray-800 dark:text-slate-200">{v.newEmployee || data.assignedTo || 'Unassigned'} · {v.department || data.department || '—'}</p><p className="text-gray-500 mt-1">Fill below to change</p></div>
      </div>
      <p className="text-xs text-gray-400">Leave a field blank to keep its current value.</p>
      <div className="grid grid-cols-2 gap-4 pb-2">
        <div><FLabel>New Employee</FLabel><input value={v.newEmployee} onChange={set('newEmployee')} className={INPUT} /></div>
        <div><FLabel>Employee ID</FLabel><input value={v.employeeId} onChange={set('employeeId')} className={INPUT} /></div>
        <div><FLabel>Department</FLabel><input value={v.department} onChange={set('department')} className={INPUT} /></div>
        <div><FLabel>Site / Branch</FLabel><input value={v.siteBranch} onChange={set('siteBranch')} className={INPUT} /></div>
        <div><FLabel>Building</FLabel><input value={v.building} onChange={set('building')} className={INPUT} /></div>
        <div><FLabel>Floor</FLabel><input value={v.floor} onChange={set('floor')} className={INPUT} /></div>
        <div><FLabel>Room / Area</FLabel><input value={v.roomArea} onChange={set('roomArea')} className={INPUT} /></div>
        <div><FLabel>Specific Location</FLabel><input value={v.specificLocation} onChange={set('specificLocation')} className={INPUT} /></div>
        <div><FLabel required>Transfer Date</FLabel><input type="date" value={v.date} onChange={set('date')} className={INPUT} /></div>
        <div><FLabel required>Reason</FLabel><input value={v.reason} onChange={set('reason')} placeholder="e.g. Department relocation" className={INPUT} /></div>
        <div className="col-span-2"><FLabel>Remarks</FLabel><textarea value={v.remarks} onChange={set('remarks')} rows={2} className={INPUT} /></div>
      </div>
    </Shell>
  );
}

function MaintenanceModal({ data, busy, onClose, onSave }: any) {
  const [v, setV] = useState({ required: '', repairStatus: 'For Repair', date: today(), provider: '', cost: '', details: '', remarks: '' });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title="Add Maintenance / Repair" subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose}
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.required.trim()} onClick={() => onSave({ ...v, cost: v.cost ? Number(v.cost) : undefined })} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Save Record</button></>}>
      <div className="space-y-4 pb-2">
        <div><FLabel required>Maintenance Required</FLabel><input value={v.required} onChange={set('required')} placeholder="e.g. Replace caster wheels" className={INPUT} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><FLabel>Repair Status</FLabel><select value={v.repairStatus} onChange={set('repairStatus')} className={INPUT}><option>For Repair</option><option>Ongoing</option><option>Completed</option></select></div>
          <div><FLabel>Repair Date</FLabel><input type="date" value={v.date} onChange={set('date')} className={INPUT} /></div>
          <div><FLabel>Repair Provider</FLabel><input value={v.provider} onChange={set('provider')} className={INPUT} /></div>
          <div><FLabel>Repair Cost (₱)</FLabel><input type="number" value={v.cost} onChange={set('cost')} className={INPUT} /></div>
        </div>
        <div><FLabel>Repair Details</FLabel><textarea value={v.details} onChange={set('details')} rows={2} className={INPUT} /></div>
        <div><FLabel>Remarks</FLabel><textarea value={v.remarks} onChange={set('remarks')} rows={2} className={INPUT} /></div>
        <p className="text-xs text-gray-400">"For Repair" or "Ongoing" sets the asset status to Under Repair. "Completed" returns it to its previous working status.</p>
      </div>
    </Shell>
  );
}

function DisposalModal({ data, busy, onClose, onSave }: any) {
  const [v, setV] = useState({ reason: '', date: today(), method: 'Scrap', remarks: '' });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title="Request for Disposal" subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose}
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.reason.trim()} onClick={() => onSave(v)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">Submit Request</button></>}>
      <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-400">
        The asset status becomes <strong>For Disposal</strong> until approved. The record is never permanently deleted — after disposal it is kept with status Disposed and its full history. A Disposal record is also added to the Form Masterlist.
      </div>
      <div className="space-y-4 pb-2">
        <div><FLabel required>Disposal Reason</FLabel><textarea value={v.reason} onChange={set('reason')} rows={2} className={INPUT} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><FLabel>Request Date</FLabel><input type="date" value={v.date} onChange={set('date')} className={INPUT} /></div>
          <div><FLabel>Proposed Disposal Method</FLabel><select value={v.method} onChange={set('method')} className={INPUT}><option>Scrap</option><option>Sell</option><option>Donate</option><option>Recycle</option><option>Return to Vendor</option><option>E-Waste Facility</option></select></div>
        </div>
        <div><FLabel>Remarks</FLabel><textarea value={v.remarks} onChange={set('remarks')} rows={2} className={INPUT} /></div>
      </div>
    </Shell>
  );
}

function ConfirmArchive({ data, busy, onCancel, onConfirm }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
        <h3 className="font-bold text-gray-900 dark:text-white">Archive this asset?</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{data.deviceCode} · {data.name} will move to Archived Records. Its history is kept and its code will never be reused.</p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <button onClick={onCancel} className={cancelBtn}>Cancel</button>
          <button disabled={busy} onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">Archive</button>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ data, allowEdit, save, log }: any) {
  const [docType, setDocType] = useState('Invoice');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const atts = data.attachments || [];
  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await assetServices.uploadFiles(Array.from(files));
      const tagged = uploaded.map((u) => ({ ...u, name: `[${docType}] ${u.name}` }));
      await save({ ...data, attachments: [...atts, ...tagged] });
      await log(`Uploaded document (${docType})`);
    } finally { setUploading(false); }
  };
  const remove = async (idx: number) => { await save({ ...data, attachments: atts.filter((_: any, i: number) => i !== idx) }); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">DOCUMENTS & ATTACHMENTS</h3>
        {allowEdit && (
          <div className="flex items-center gap-2">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className={`${INPUT} w-40`}>
              {['Invoice', 'Official Receipt', 'Purchase Order', 'Warranty Document', 'Asset Photo', 'Other'].map((d) => <option key={d}>{d}</option>)}
            </select>
            <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload</button>
          </div>
        )}
      </div>
      <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-4 min-h-[140px]">
        {atts.length === 0 ? <div className="text-center py-10 text-gray-400"><FileText className="w-6 h-6 mx-auto mb-2" />No documents attached</div> : (
          <ul className="space-y-2">
            {atts.map((att: any, idx: number) => (
              <li key={idx} className="flex items-center justify-between gap-3 text-sm">
                <a href={resolveFileUrl(att.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#0b5c96] dark:text-blue-400 hover:underline truncate"><FileText className="w-4 h-4 shrink-0" /><span className="truncate">{att.name}</span></a>
                {allowEdit && <button onClick={() => remove(idx)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
