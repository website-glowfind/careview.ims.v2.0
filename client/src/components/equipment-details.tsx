import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, UserPlus, ArrowRightLeft, Trash2 as ArchiveIcon, Printer, User, History, MapPin, Wrench, Recycle, Gauge, Image as ImageIcon,
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
import { EQUIPMENT_KINDS, EQUIPMENT_DOC_TYPES, RISK_LABEL, dueState, addMonthsIso, DUE_PILL, DUE_LABEL, type EquipmentKind } from '@/config/equipment';
import { equipmentStatusLabel } from '@/components/equipment-inventory';

export type EquipmentModal = 'assign' | 'transfer' | 'maintenance' | 'calibration' | 'disposal' | null;

interface Props {
  kind: EquipmentKind;
  asset: ITAsset;
  onClose: () => void;
  onEdit: (asset: ITAsset) => void;
  isAdmin: boolean;
  canEdit?: boolean;
  initialTab?: string;
  initialModal?: EquipmentModal;
}

const STATUS_PILL: Record<string, string> = {
  'In Use': 'bg-blue-100 text-blue-700', Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700',
  'Under Repair': 'bg-amber-100 text-amber-700', 'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
};
const CONDITION_PILL: Record<string, string> = {
  New: 'bg-green-100 text-green-700', Good: 'bg-blue-100 text-blue-700', Fair: 'bg-amber-100 text-amber-700', Poor: 'bg-orange-100 text-orange-700', Damaged: 'bg-red-100 text-red-700',
};
const RESULT_PILL: Record<string, string> = { Passed: 'bg-green-100 text-green-700', 'Passed with Adjustment': 'bg-amber-100 text-amber-700', Failed: 'bg-red-100 text-red-700' };
const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">{children}</h3>;
const btnPrimary = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]';
const btnGhost = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]';

function DueBadge({ date }: { date?: string }) {
  const s = dueState(date);
  return <span className="inline-flex items-center gap-2">{date ? fmtDate(date) : '—'}<span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${DUE_PILL[s]}`}>{DUE_LABEL[s]}</span></span>;
}

export function EquipmentDetails({ kind, asset, onClose, onEdit, isAdmin, canEdit, initialTab, initialModal }: Props) {
  const cfg = EQUIPMENT_KINDS[kind];
  const allowEdit = canEdit ?? isAdmin;
  const { updateAsset, deleteAsset } = useAssetStore();
  const live = useAssetStore((s) => s.assets.find((a) => a._id === asset._id));
  const data = live ?? asset;
  const eq: Record<string, any> = data.equipment ?? {};

  const { deviceHistory, fetchHistoryByDevice, addHistoryEntry } = useActivityLogStore();
  const { addFormRecord } = useFormRecordStore();
  const user = useAuthStore((s) => s.user);

  const maintenance: any[] = Array.isArray(eq.maintenance) ? eq.maintenance : [];
  const calibrations: any[] = Array.isArray(eq.calibrationHistory) ? eq.calibrationHistory : [];
  const transfers: any[] = Array.isArray(eq.transfers) ? eq.transfers : [];
  const assignmentHistory: any[] = Array.isArray(eq.assignmentHistory) ? eq.assignmentHistory : [];
  const disposal = eq.disposal;
  const showCalibration = !!eq.calibrationRequired || calibrations.length > 0;
  const TABS = ['Overview', 'Assignment', 'Location', 'Maintenance', ...(showCalibration ? ['Calibration'] : []), 'Transfer History', 'Disposal', 'Documents', 'Activity Log'];

  const [tab, setTab] = useState<string>(initialTab ?? 'Overview');
  const [modal, setModal] = useState<EquipmentModal | 'archive'>(initialModal ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data.deviceCode) fetchHistoryByDevice(data.deviceCode); }, [data.deviceCode, fetchHistoryByDevice]);

  const photo = (data.attachments || []).find((a) => (a.type || '').startsWith('image/'));
  const statusLabel = equipmentStatusLabel(data);
  const statusPill = disposal ? 'bg-red-100 text-red-700' : (STATUS_PILL[statusLabel] ?? 'bg-gray-100 text-gray-600');
  const money = (v?: number) => (v != null ? `${eq.currency ?? '₱'}${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—');

  const save = async (next: ITAsset) => { setBusy(true); try { await updateAsset(data._id!, next); } finally { setBusy(false); } };
  const log = (details: string, action: any = 'edited') => addHistoryEntry({ action, category: 'asset', deviceCode: data.deviceCode, deviceName: data.name, company: data.company, details, performedBy: user?.name });
  const withEq = (patch: Record<string, any>, extra: Partial<ITAsset> = {}): ITAsset => ({ ...data, ...extra, equipment: { ...eq, ...patch } });

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to {cfg.title}</button>

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
            {data.category && <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-gray-200 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300 capitalize">{data.category}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <QRCodeDisplay deviceCode={data.deviceCode} size={72} showDownload showLabel={false} />
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
            const count = t === 'Maintenance' ? maintenance.length : t === 'Calibration' ? calibrations.length : t === 'Transfer History' ? transfers.length : t === 'Activity Log' ? deviceHistory.length : 0;
            return (
              <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>
                {t}{count > 0 ? ` ${count}` : ''}
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          {tab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
                <div>
                  <H>BASIC INFORMATION</H>
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DL label="Asset Code" value={<span className="font-mono text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span>} />
                    <DL label="Equipment Name" value={data.name} /><DL label="Category" value={<span className="capitalize">{data.category}</span>} />
                    <DL label="Equipment Type" value={eq.equipmentType} /><DL label="Company" value={data.company} /><DL label="Brand" value={data.brand} />
                    <DL label="Model" value={data.model} /><DL label="Serial Number" value={data.serialNumber} /><DL label="Manufacturer" value={eq.manufacturer} />
                    <DL label="Specification" value={eq.specification} /><DL label="Quantity" value={eq.quantity != null ? `${eq.quantity} ${eq.unit ?? ''}`.trim() : undefined} />
                    <DL label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>} />
                  </dl>
                  <div className="mt-4"><DL label="Description" value={eq.description || data.specifications} /></div>
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

              {cfg.medical && (
                <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                  <H>REGULATORY</H>
                  <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    <DL label="Registration No." value={eq.regulatoryNo || <span className="text-red-600">Not registered</span>} />
                    <DL label="Registration Expiry" value={eq.regulatoryNo ? <DueBadge date={eq.regulatoryExpiry} /> : '—'} />
                    <DL label="Risk Classification" value={RISK_LABEL[eq.riskClass ?? '']} />
                  </dl>
                </div>
              )}

              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>SERVICE & CALIBRATION</H>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  <DL label="Service Interval" value={eq.serviceIntervalMonths ? `Every ${eq.serviceIntervalMonths} month(s)` : 'Not set'} />
                  <DL label="Last Service" value={fmtDate(eq.lastServiceDate)} /><DL label="Next Service Due" value={<DueBadge date={eq.nextServiceDue} />} />
                  {eq.calibrationRequired ? (<>
                    <DL label="Calibration Interval" value={`Every ${eq.calibrationIntervalMonths || '—'} month(s)`} />
                    <DL label="Last Calibration" value={fmtDate(eq.lastCalibrationDate)} /><DL label="Next Calibration Due" value={<DueBadge date={eq.nextCalibrationDue} />} />
                  </>) : <DL label="Calibration" value="Not required" />}
                </dl>
              </div>

              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>PURCHASE DETAILS</H>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  <DL label="Purchase Date" value={fmtDate(data.purchaseDate)} /><DL label="Supplier" value={eq.supplier} /><DL label="Purchase Order Number" value={eq.poNumber} />
                  <DL label="Invoice / OR" value={eq.invoiceNumber} /><DL label="Acquisition Cost" value={money(eq.acquisitionCost)} />
                  <DL label="Warranty" value={eq.hasWarranty ? `Yes — until ${fmtDate(data.warrantyExpiry)}` : 'No'} />
                </dl>
              </div>

              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>CONDITION</H>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Condition" value={data.condition} /><DL label="Last Inspection" value={fmtDate(eq.lastInspectionDate)} /><DL label="Inspected By" value={eq.inspectedBy} />
                  <DL label="Remarks" value={eq.conditionRemarks} />
                </dl>
              </div>

              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <H>SYSTEM INFORMATION</H>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Date Encoded" value={fmtDateTime((data as any).createdAt)} /><DL label="Date Updated" value={fmtDateTime((data as any).updatedAt)} />
                </dl>
              </div>
            </div>
          )}

          {tab === 'Assignment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><H>CURRENT ASSIGNMENT</H>{allowEdit && <button onClick={() => setModal('assign')} className={btnPrimary}><UserPlus className="w-4 h-4" /> Change Assignment</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
                {data.assignedTo ? (
                  <dl className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <DL label="Assigned To" value={data.assignedTo} /><DL label="Employee ID" value={data.employeeId} /><DL label="Department" value={data.department} />
                    <DL label="Position" value={data.position} /><DL label="Date Assigned" value={fmtDate(eq.dateAssigned)} />
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
                <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1">
                  <DL label="Site / Branch" value={eq.site} /><DL label="Building" value={eq.building} /><DL label="Floor" value={eq.floor} /><DL label="Room / Area" value={eq.room} /><DL label="Specific Location" value={eq.specificLocation} />
                </dl>
              </div>
              <p className="text-xs text-gray-400">Previous locations are kept in Transfer History ({transfers.length} record{transfers.length !== 1 ? 's' : ''}).</p>
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

          {tab === 'Calibration' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><H>CALIBRATION HISTORY</H>{allowEdit && <button onClick={() => setModal('calibration')} className={btnPrimary}><Gauge className="w-4 h-4" /> Log Calibration</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
                {calibrations.length === 0 ? <div className="text-center py-10 text-gray-400"><Gauge className="w-6 h-6 mx-auto mb-2" />No calibration records</div> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Result</th><th className="px-4 py-2 text-left">Certificate</th><th className="px-4 py-2 text-left">Provider</th><th className="px-4 py-2 text-left">Next Due</th><th className="px-4 py-2 text-left">Cost</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{[...calibrations].reverse().map((c, i) => (
                      <tr key={i}><td className="px-4 py-2">{fmtDate(c.calibrationDate)}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${RESULT_PILL[c.result] ?? 'bg-gray-100 text-gray-600'}`}>{c.result}</span></td><td className="px-4 py-2">{c.certificateNo || '—'}</td><td className="px-4 py-2">{c.provider || '—'}</td><td className="px-4 py-2">{fmtDate(c.nextDueDate)}</td><td className="px-4 py-2">{c.cost ? money(Number(c.cost)) : '—'}</td></tr>
                    ))}</tbody>
                  </table>
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

          {tab === 'Documents' && <DocumentsTab data={data} allowEdit={allowEdit} save={save} log={log} docTypes={EQUIPMENT_DOC_TYPES} />}

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
          await save(withEq({ dateAssigned: vals.dateAssigned, statusLabel: vals.assignedTo ? 'Assigned' : 'Available', assignmentHistory: [...assignmentHistory, { assignedTo: vals.assignedTo, department: vals.department, date: vals.dateAssigned || today(), by: user?.name }] },
            { assignedTo: vals.assignedTo, employeeId: vals.employeeId, department: vals.department, position: vals.position, status: vals.assignedTo ? 'active' : 'available' }));
          log(`Assigned to ${vals.assignedTo || 'Unassigned'}`, 'assign'); setModal(null);
        }} />
      )}
      {modal === 'transfer' && (
        <TransferModal data={data} fromLabel={data.location} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          await save(withEq({ specificLocation: vals.toLocation || eq.specificLocation, transfers: [...transfers, { fromLocation: data.location, toLocation: vals.toLocation, toEmployee: vals.newEmployee, reason: vals.reason, remarks: vals.remarks, date: vals.date || today(), by: user?.name }] },
            { assignedTo: vals.newEmployee || data.assignedTo, department: vals.department || data.department, location: vals.toLocation || data.location }));
          log(`Transferred: ${vals.reason}`, 'transfer'); setModal(null);
        }} />
      )}
      {modal === 'maintenance' && (
        <MaintenanceModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          const done = vals.repairStatus === 'Completed';
          const date = vals.date || today();
          const statusNext: AssetStatus = done ? (eq.prevStatus as AssetStatus) || 'available' : 'in-maintenance';
          await save(withEq({
            statusLabel: done ? (eq.prevStatusLabel || 'Available') : 'Under Repair',
            prevStatus: done ? undefined : (data.status === 'in-maintenance' ? eq.prevStatus : data.status),
            prevStatusLabel: done ? undefined : (eq.statusLabel || 'Available'),
            ...(done ? { lastServiceDate: date, nextServiceDue: addMonthsIso(date, eq.serviceIntervalMonths) || eq.nextServiceDue } : {}),
            maintenance: [...maintenance, { ...vals, date, by: user?.name }],
          }, { status: statusNext }));
          log(`Maintenance: ${vals.required} (${vals.repairStatus})`); setModal(null);
        }} />
      )}
      {modal === 'calibration' && (
        <LogEntryModal title="Log Calibration" subtitle={`${data.deviceCode} · ${data.name}`} busy={busy} onClose={() => setModal(null)}
          fields={[
            { key: 'calibrationDate', label: 'Calibration Date', type: 'date', required: true },
            { key: 'nextDueDate', label: 'Next Due Date', type: 'date' },
            { key: 'result', label: 'Result', options: ['Passed', 'Passed with Adjustment', 'Failed'], required: true },
            { key: 'certificateNo', label: 'Certificate No.' },
            { key: 'provider', label: 'Calibration Provider' },
            { key: 'cost', label: `Cost (${eq.currency ?? '₱'})`, type: 'number' },
            { key: 'remarks', label: 'Remarks', textarea: true },
          ]}
          onSave={async (vals) => {
            const result = vals.result || 'Passed';
            const nextDue = vals.nextDueDate && vals.nextDueDate !== today() ? vals.nextDueDate : addMonthsIso(vals.calibrationDate, eq.calibrationIntervalMonths) || vals.nextDueDate;
            await save(withEq({ lastCalibrationDate: vals.calibrationDate, nextCalibrationDue: nextDue, calibrationHistory: [...calibrations, { ...vals, result, nextDueDate: nextDue, cost: vals.cost ? Number(vals.cost) : undefined, by: user?.name, at: new Date().toISOString() }] }));
            log(`Calibration logged — ${result}${vals.certificateNo ? ` (Cert ${vals.certificateNo})` : ''}`); setModal(null);
          }} />
      )}
      {modal === 'disposal' && (
        <DisposalModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
          await save(withEq({ statusLabel: 'For Disposal', disposal: { reason: vals.reason, date: vals.date || today(), method: vals.method, remarks: vals.remarks, by: user?.name } }));
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
