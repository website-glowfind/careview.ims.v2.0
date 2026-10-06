import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, UserPlus, ArrowRightLeft, Archive as ArchiveIcon, Printer, Gauge, Fuel, Wrench, Hammer,
  ClipboardCheck, AlertTriangle, Recycle, Car,
} from 'lucide-react';
import type { ITAsset, AssetStatus } from '@/types/inventory';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { useAssetStore } from '@/store/assetStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useAuthStore } from '@/store/authStore';
import {
  DL, fmtDate, fmtDateTime, today, AssignModal, TransferModal, MaintenanceModal, DisposalModal, ConfirmArchive, DocumentsTab, LogEntryModal,
} from '@/components/asset-detail-kit';

interface Props {
  asset: ITAsset;
  onClose: () => void;
  onEdit: (asset: ITAsset) => void;
  isAdmin: boolean;
  canEdit?: boolean;
  initialModal?: string | null;
}

const TABS = ['Overview', 'Assignment', 'Registration & Insurance', 'Odometer', 'Fuel', 'Maintenance', 'Repairs', 'Inspections', 'Incidents', 'Documents', 'Disposal', 'Activity Log'] as const;
type Tab = typeof TABS[number];
const STATUS_PILL: Record<string, string> = {
  Available: 'bg-green-100 text-green-700', Assigned: 'bg-blue-100 text-blue-700', Active: 'bg-green-100 text-green-700',
  'Under Maintenance': 'bg-amber-100 text-amber-700', 'Under Repair': 'bg-amber-100 text-amber-700', Inactive: 'bg-gray-100 text-gray-600',
  'For Disposal': 'bg-orange-100 text-orange-700', Disposed: 'bg-red-100 text-red-700',
};
const DOC_TYPES = ['OR / CR', 'Insurance', 'Assignment', 'Maintenance', 'Fuel', 'Incident', 'Vehicle Photo', 'Other'];
// menu action → tab + modal
const ACTION_MAP: Record<string, { tab: Tab; modal: string }> = {
  assign: { tab: 'Assignment', modal: 'assign' }, transfer: { tab: 'Assignment', modal: 'transfer' },
  odometer: { tab: 'Odometer', modal: 'odometer' }, fuel: { tab: 'Fuel', modal: 'fuel' },
  maintenance: { tab: 'Maintenance', modal: 'maintenance' }, repair: { tab: 'Repairs', modal: 'repair' },
  inspection: { tab: 'Inspections', modal: 'inspection' }, incident: { tab: 'Incidents', modal: 'incident' },
  documents: { tab: 'Documents', modal: '' }, disposal: { tab: 'Disposal', modal: 'disposal' },
};

export function VehicleDetails({ asset, onClose, onEdit, isAdmin, canEdit, initialModal }: Props) {
  const allowEdit = canEdit ?? isAdmin;
  const { updateAsset, deleteAsset } = useAssetStore();
  const live = useAssetStore((s) => s.assets.find((a) => a._id === asset._id));
  const data = live ?? asset;
  const v: any = data.vehicle ?? {};

  const { deviceHistory, fetchHistoryByDevice, addHistoryEntry } = useActivityLogStore();
  const { addFormRecord } = useFormRecordStore();
  const user = useAuthStore((s) => s.user);

  const initAction = initialModal ? ACTION_MAP[initialModal] : undefined;
  const [tab, setTab] = useState<Tab>(initAction?.tab ?? 'Overview');
  const [modal, setModal] = useState<string | null>(initAction?.modal || null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data.deviceCode) fetchHistoryByDevice(data.deviceCode); }, [data.deviceCode, fetchHistoryByDevice]);

  const arr = (k: string): any[] => (Array.isArray(v[k]) ? v[k] : []);
  const disposal = v.disposal;
  const statusLabel = disposal ? 'For Disposal' : (v.vehicleStatus || 'Available');
  const statusPill = STATUS_PILL[statusLabel] ?? 'bg-gray-100 text-gray-600';

  const save = async (next: ITAsset) => { setBusy(true); try { await updateAsset(data._id!, next); } finally { setBusy(false); } };
  const log = (details: string, action: any = 'edited') => addHistoryEntry({ action, category: 'asset', deviceCode: data.deviceCode, deviceName: data.name, company: data.company, details, performedBy: user?.name });
  const addLog = async (field: string, entry: any, logMsg: string) => {
    await save({ ...data, vehicle: { ...v, [field]: [...arr(field), { ...entry, by: user?.name }] } });
    log(logMsg); setModal(null);
  };

  const headBtns = [
    { label: 'Edit', icon: Pencil, on: () => onEdit(data) },
    { label: 'Assign Driver', icon: UserPlus, on: () => setModal('assign') },
    { label: 'Transfer', icon: ArrowRightLeft, on: () => setModal('transfer') },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96]"><ArrowLeft className="w-4 h-4" /> Back to Fleet Inventory</button>

      {/* Header */}
      <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f] p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#1e2d4a] flex items-center justify-center text-gray-400 shrink-0"><Car className="w-7 h-7" /></div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{data.name}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Asset Code: <span className="font-mono font-semibold text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span>{v.plateNumber ? <> · Plate <span className="font-mono">{v.plateNumber}</span></> : null}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>
            {v.condition && <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-700">{v.condition}</span>}
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getCompanyBadgeClasses(data.company)}`}>{data.company}</span>
            {v.vehicleType && <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-gray-200 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300">{v.vehicleType}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <QRCodeDisplay deviceCode={data.deviceCode} size={72} showDownload={false} showLabel={false} />
            <button onClick={() => window.print()} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#0b5c96] dark:text-blue-400 hover:underline"><Printer className="w-3 h-3" /> Print QR</button>
          </div>
          {allowEdit && (
            <div className="grid grid-cols-2 gap-2">
              {headBtns.map((b) => <button key={b.label} onClick={b.on} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><b.icon className="w-3.5 h-3.5" /> {b.label}</button>)}
              {isAdmin && <button onClick={() => setModal('archive')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]"><ArchiveIcon className="w-3.5 h-3.5" /> Archive</button>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#162236] rounded-2xl border border-gray-200 dark:border-[#1e3a5f]">
        <nav className="flex gap-5 px-6 border-b border-gray-100 dark:border-[#1e3a5f] overflow-x-auto">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-[#0b5c96] text-[#0b5c96] dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}>{t}{t === 'Activity Log' && deviceHistory.length > 0 ? ` ${deviceHistory.length}` : ''}</button>)}
        </nav>

        <div className="p-6">
          {tab === 'Overview' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">VEHICLE DETAILS</h3>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Asset Code" value={<span className="font-mono text-[#0b5c96] dark:text-blue-400">{data.deviceCode}</span>} /><DL label="Plate Number" value={v.plateNumber} />
                  <DL label="Type" value={v.vehicleType} /><DL label="Brand" value={data.brand} /><DL label="Model" value={data.model} /><DL label="Variant" value={v.variant} />
                  <DL label="Year Model" value={v.yearModel} /><DL label="Color" value={v.color} /><DL label="Fuel Type" value={v.fuelType} /><DL label="Transmission" value={v.transmission} />
                  <DL label="Engine No." value={v.engineNumber} /><DL label="Chassis No." value={v.chassisNumber} /><DL label="MV File No." value={v.mvFileNumber} /><DL label="Seating" value={v.seatingCapacity} />
                  <DL label="Condition" value={v.condition} /><DL label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusPill}`}>{statusLabel}</span>} />
                </dl>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5">
                <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">PURCHASE</h3>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                  <DL label="Acquisition Date" value={fmtDate(v.acquisitionDate || data.purchaseDate)} /><DL label="Purchase Price" value={v.purchasePrice != null ? `₱${Number(v.purchasePrice).toLocaleString()}` : '—'} />
                  <DL label="Supplier / Dealer" value={v.supplierDealer} /><DL label="Ownership" value={v.ownershipType} />
                </dl>
              </div>
            </div>
          )}

          {tab === 'Assignment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">ASSIGNED DRIVER</h3>{allowEdit && <button onClick={() => setModal('assign')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><UserPlus className="w-4 h-4" /> Assign Driver</button>}</div>
              <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
                {data.assignedTo ? <dl className="grid grid-cols-2 md:grid-cols-4 gap-4"><DL label="Driver" value={data.assignedTo} /><DL label="Employee ID" value={data.employeeId} /><DL label="Department" value={data.department} /><DL label="Branch / Center" value={v.branchCenter} /><DL label="Custodian" value={v.custodian} /><DL label="Parking" value={v.parkingLocation} /><DL label="Current Location" value={v.currentLocation} /></dl> : <div className="text-center py-8 text-gray-400">No driver assigned</div>}
              </div>
            </div>
          )}

          {tab === 'Registration & Insurance' && (
            <div className="space-y-8">
              <div><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">REGISTRATION</h3>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4"><DL label="OR Number" value={v.orNumber} /><DL label="CR Number" value={v.crNumber} /><DL label="Registration Date" value={fmtDate(v.registrationDate)} /><DL label="Expiry" value={fmtDate(v.registrationExpiry)} /><DL label="LTO Status" value={v.ltoStatus} /><DL label="Emission Test" value={fmtDate(v.emissionTestDate)} /><DL label="Emission Expiry" value={fmtDate(v.emissionExpiry)} /></dl>
              </div>
              <div className="border-t border-gray-100 dark:border-[#1e3a5f] pt-5"><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500 mb-3">INSURANCE</h3>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4"><DL label="Provider" value={v.insuranceProvider} /><DL label="Policy No." value={v.policyNumber} /><DL label="Coverage" value={v.coverageType} /><DL label="Start" value={fmtDate(v.insuranceStart)} /><DL label="Expiry" value={fmtDate(v.insuranceExpiry)} /><DL label="Premium" value={v.premiumCost != null ? `₱${Number(v.premiumCost).toLocaleString()}` : '—'} /><DL label="Status" value={v.insuranceStatus} /></dl>
              </div>
            </div>
          )}

          {tab === 'Odometer' && <LogTab title="ODOMETER READINGS" icon={Gauge} rows={arr('odometer')} allowEdit={allowEdit} onAdd={() => setModal('odometer')} addLabel="Update Odometer" render={(r) => <><span className="font-medium">{r.reading} km</span><span className="text-gray-400">{fmtDate(r.date)}</span></>} sub={(r) => r.notes} />}
          {tab === 'Fuel' && <LogTab title="FUEL RECORDS" icon={Fuel} rows={arr('fuel')} allowEdit={allowEdit} onAdd={() => setModal('fuel')} addLabel="Add Fuel Record" render={(r) => <><span className="font-medium">{r.liters} L · ₱{r.cost}</span><span className="text-gray-400">{fmtDate(r.date)}</span></>} sub={(r) => [r.station, r.odometer ? `${r.odometer} km` : ''].filter(Boolean).join(' · ')} />}
          {tab === 'Maintenance' && <LogTab title="MAINTENANCE HISTORY" icon={Wrench} rows={arr('maintenance')} allowEdit={allowEdit} onAdd={() => setModal('maintenance')} addLabel="Add Maintenance" render={(r) => <><span className="font-medium">{r.required}</span><span className="text-gray-400">{fmtDate(r.date)}</span></>} sub={(r) => `${r.repairStatus} · ${r.provider || '—'}`} />}
          {tab === 'Repairs' && <LogTab title="REPAIRS" icon={Hammer} rows={arr('repairs')} allowEdit={allowEdit} onAdd={() => setModal('repair')} addLabel="Add Repair" render={(r) => <><span className="font-medium">{r.issue}</span><span className="text-gray-400">{fmtDate(r.date)}</span></>} sub={(r) => [r.provider, r.cost ? `₱${r.cost}` : ''].filter(Boolean).join(' · ')} />}
          {tab === 'Inspections' && <LogTab title="INSPECTIONS" icon={ClipboardCheck} rows={arr('inspections')} allowEdit={allowEdit} onAdd={() => setModal('inspection')} addLabel="Add Inspection" render={(r) => <><span className="font-medium">{r.type || 'Inspection'} — {r.result}</span><span className="text-gray-400">{fmtDate(r.date)}</span></>} sub={(r) => [r.inspector, r.nextDue ? `next ${fmtDate(r.nextDue)}` : ''].filter(Boolean).join(' · ')} />}
          {tab === 'Incidents' && <LogTab title="INCIDENTS" icon={AlertTriangle} rows={arr('incidents')} allowEdit={allowEdit} onAdd={() => setModal('incident')} addLabel="Add Incident" render={(r) => <><span className="font-medium">{r.type || 'Incident'} · {r.severity}</span><span className="text-gray-400">{fmtDate(r.date)}</span></>} sub={(r) => r.description} />}

          {tab === 'Documents' && <DocumentsTab data={data} allowEdit={allowEdit} save={save} log={log} docTypes={DOC_TYPES} />}

          {tab === 'Disposal' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl p-6">
              {disposal ? <dl className="grid grid-cols-2 md:grid-cols-4 gap-4"><DL label="Status" value={<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">For Disposal</span>} /><DL label="Reason" value={disposal.reason} /><DL label="Requested" value={fmtDate(disposal.date)} /><DL label="Method" value={disposal.method} /></dl>
                : <div className="text-center py-8"><Recycle className="w-7 h-7 mx-auto mb-2 text-gray-300" /><p className="font-medium text-gray-700 dark:text-slate-300">No disposal request</p>{allowEdit && <button onClick={() => setModal('disposal')} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"><Recycle className="w-4 h-4" /> Request for Disposal</button>}</div>}
            </div>
          )}

          {tab === 'Activity Log' && (
            <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl overflow-hidden">
              {deviceHistory.length === 0 ? <div className="text-center py-10 text-gray-400">No activity recorded</div> : (
                <table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-[#1e2d4a] text-xs text-gray-500 dark:text-slate-400 uppercase"><tr><th className="px-4 py-2 text-left">Date & Time</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Description</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{deviceHistory.map((h) => <tr key={h.id}><td className="px-4 py-2 whitespace-nowrap">{fmtDateTime(h.timestamp)}</td><td className="px-4 py-2">{h.performedBy || '—'}</td><td className="px-4 py-2 capitalize">{h.action}</td><td className="px-4 py-2 text-gray-600 dark:text-slate-400">{h.details}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'assign' && <AssignModal data={data} busy={busy} driverLabel="Assigned Driver" onClose={() => setModal(null)} onSave={async (vals: any) => { await save({ ...data, assignedTo: vals.assignedTo, employeeId: vals.employeeId, department: vals.department, position: vals.position, vehicle: { ...v, assignmentDate: vals.dateAssigned } }); log(`Driver assigned: ${vals.assignedTo}`, 'assign'); setModal(null); }} />}
      {modal === 'transfer' && <TransferModal data={data} fromLabel={v.currentLocation || v.branchCenter || data.location} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => { await save({ ...data, assignedTo: vals.newEmployee || data.assignedTo, department: vals.department || data.department, location: vals.toLocation || data.location, vehicle: { ...v, currentLocation: vals.toLocation || v.currentLocation, transfers: [...arr('transfers'), { fromLocation: v.currentLocation || data.location, toLocation: vals.toLocation, toEmployee: vals.newEmployee, reason: vals.reason, date: vals.date || today(), by: user?.name }] } }); log(`Transferred: ${vals.reason}`, 'transfer'); setModal(null); }} />}
      {modal === 'maintenance' && <MaintenanceModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => {
        const statusLbl = vals.repairStatus === 'Completed' ? (v.prevStatusLabel || 'Active') : 'Under Maintenance';
        const core: AssetStatus = vals.repairStatus === 'Completed' ? 'active' : 'in-maintenance';
        await save({ ...data, status: core, vehicle: { ...v, vehicleStatus: statusLbl, prevStatusLabel: vals.repairStatus === 'Completed' ? undefined : (v.vehicleStatus || 'Active'), maintenance: [...arr('maintenance'), { ...vals, date: vals.date || today(), by: user?.name }] } });
        log(`Maintenance: ${vals.required}`); setModal(null); }} />}
      {modal === 'odometer' && <LogEntryModal title="Update Odometer" subtitle={`${data.deviceCode} · ${data.name}`} busy={busy} onClose={() => setModal(null)} onSave={(vals) => addLog('odometer', vals, `Odometer: ${vals.reading} km`)} fields={[{ key: 'reading', label: 'Odometer Reading (km)', type: 'number', required: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'notes', label: 'Notes', textarea: true }]} />}
      {modal === 'fuel' && <LogEntryModal title="Add Fuel Record" subtitle={`${data.deviceCode} · ${data.name}`} busy={busy} onClose={() => setModal(null)} onSave={(vals) => addLog('fuel', vals, `Fuel: ${vals.liters} L`)} fields={[{ key: 'date', label: 'Date', type: 'date', required: true }, { key: 'liters', label: 'Liters', type: 'number' }, { key: 'cost', label: 'Cost (₱)', type: 'number' }, { key: 'odometer', label: 'Odometer (km)', type: 'number' }, { key: 'station', label: 'Station' }, { key: 'notes', label: 'Notes', textarea: true }]} />}
      {modal === 'repair' && <LogEntryModal title="Add Repair" subtitle={`${data.deviceCode} · ${data.name}`} busy={busy} onClose={() => setModal(null)} onSave={(vals) => addLog('repairs', vals, `Repair: ${vals.issue}`)} fields={[{ key: 'issue', label: 'Issue / Work Done', required: true }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'provider', label: 'Repair Provider' }, { key: 'cost', label: 'Cost (₱)', type: 'number' }, { key: 'details', label: 'Details', textarea: true }]} />}
      {modal === 'inspection' && <LogEntryModal title="Add Inspection" subtitle={`${data.deviceCode} · ${data.name}`} busy={busy} onClose={() => setModal(null)} onSave={(vals) => addLog('inspections', vals, `Inspection: ${vals.result}`)} fields={[{ key: 'type', label: 'Inspection Type', placeholder: 'e.g. Safety, Emission' }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'result', label: 'Result', options: ['Pass', 'Fail', 'Needs Attention'] }, { key: 'inspector', label: 'Inspected By' }, { key: 'nextDue', label: 'Next Due', type: 'date' }, { key: 'notes', label: 'Notes', textarea: true }]} />}
      {modal === 'incident' && <LogEntryModal title="Add Incident" subtitle={`${data.deviceCode} · ${data.name}`} busy={busy} onClose={() => setModal(null)} onSave={(vals) => addLog('incidents', vals, `Incident: ${vals.type || 'reported'}`)} fields={[{ key: 'date', label: 'Date', type: 'date', required: true }, { key: 'type', label: 'Incident Type', placeholder: 'e.g. Accident, Theft' }, { key: 'severity', label: 'Severity', options: ['Minor', 'Moderate', 'Major'] }, { key: 'reportedBy', label: 'Reported By' }, { key: 'description', label: 'Description', textarea: true, required: true }]} />}
      {modal === 'disposal' && <DisposalModal data={data} busy={busy} onClose={() => setModal(null)} onSave={async (vals: any) => { await save({ ...data, vehicle: { ...v, vehicleStatus: 'For Disposal', disposal: { reason: vals.reason, date: vals.date || today(), method: vals.method, remarks: vals.remarks, by: user?.name } } }); await addFormRecord({ formType: 'Asset Disposal', assetTag: data.deviceCode, deviceCode: data.deviceCode, name: data.name, company: data.company, category: data.category as any, employeeName: data.assignedTo, department: data.department, status: 'Active', createdBy: user?.name || 'Admin', details: `Disposal requested — ${vals.method}: ${vals.reason}`, relatedAssetId: data._id, formData: { ...vals, deviceCode: data.deviceCode } }); log(`Disposal requested — ${vals.method}`, 'disposed'); setModal(null); }} />}
      {modal === 'archive' && <ConfirmArchive data={data} busy={busy} onCancel={() => setModal(null)} onConfirm={async () => { setBusy(true); try { await deleteAsset(data._id!); log(`Archived ${data.deviceCode}`, 'deleted'); onClose(); } finally { setBusy(false); } }} />}
    </div>
  );
}

function LogTab({ title, icon: Icon, rows, allowEdit, onAdd, addLabel, render, sub }: {
  title: string; icon: any; rows: any[]; allowEdit: boolean; onAdd: () => void; addLabel: string;
  render: (r: any) => React.ReactNode; sub?: (r: any) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">{title}</h3>{allowEdit && <button onClick={onAdd} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0b5c96] text-white text-sm hover:bg-[#094a79]"><Icon className="w-4 h-4" /> {addLabel}</button>}</div>
      <div className="border border-gray-200 dark:border-[#1e3a5f] rounded-xl">
        {rows.length === 0 ? <div className="text-center py-10 text-gray-400"><Icon className="w-6 h-6 mx-auto mb-2" />No records yet</div> : (
          <ul className="divide-y divide-gray-100 dark:divide-[#1e3a5f]">{rows.slice().reverse().map((r, i) => <li key={i} className="px-4 py-3 text-sm"><div className="flex justify-between gap-3 text-gray-900 dark:text-slate-200">{render(r)}</div>{sub && sub(r) && <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{sub(r)}</p>}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
