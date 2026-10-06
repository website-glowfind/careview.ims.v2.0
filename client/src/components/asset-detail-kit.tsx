import { useRef, useState } from 'react';
import { X, AlertTriangle, Upload, Loader2, FileText, Trash2 } from 'lucide-react';
import { resolveFileUrl } from '@/utils/fileUrl';
import { assetServices } from '@/services/assetServices';
import type { ITAsset } from '@/types/inventory';

// ── Shared primitives ────────────────────────────────────────────────────
export const INPUT = 'w-full rounded-lg border border-gray-300 dark:border-[#1e3a5f] bg-white dark:bg-[#0f1729] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0b5c96]/40';
export const cancelBtn = 'px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]';
export const today = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

export const FLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{children} {required && <span className="text-red-500">*</span>}</label>
);
export const DL = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div>
    <dt className="text-xs text-gray-400 dark:text-slate-500">{label}</dt>
    <dd className="text-sm text-gray-900 dark:text-slate-200 mt-0.5">{value || '—'}</dd>
  </div>
);
export function KField({ label, required, value, onChange, placeholder, type = 'text' }: {
  label: string; required?: boolean; value: any; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (<div><FLabel required={required}>{label}</FLabel><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT} /></div>);
}

export function Shell({ title, subtitle, onClose, children, footer, width = 'max-w-lg' }: any) {
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

// ── Shared modals (register-agnostic form collectors) ────────────────────
export function AssignModal({ data, busy, onClose, onSave, driverLabel = 'Assigned To' }: any) {
  const [v, setV] = useState({ assignedTo: data.assignedTo ?? '', employeeId: data.employeeId ?? '', department: data.department ?? '', position: data.position ?? '', dateAssigned: today(), remarks: '' });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title={driverLabel === 'Assigned Driver' ? 'Assign Driver' : 'Assign'} subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose}
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.assignedTo.trim()} onClick={() => onSave(v)} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Save Assignment</button></>}>
      <div className="grid grid-cols-2 gap-4 pb-2">
        <KField label={driverLabel} required value={v.assignedTo} onChange={(x) => setV((s) => ({ ...s, assignedTo: x }))} />
        <KField label="Employee ID" value={v.employeeId} onChange={(x) => setV((s) => ({ ...s, employeeId: x }))} />
        <KField label="Department" value={v.department} onChange={(x) => setV((s) => ({ ...s, department: x }))} />
        <KField label="Position" value={v.position} onChange={(x) => setV((s) => ({ ...s, position: x }))} />
        <KField label="Date Assigned" type="date" value={v.dateAssigned} onChange={(x) => setV((s) => ({ ...s, dateAssigned: x }))} />
        <div className="col-span-2"><FLabel>Remarks</FLabel><textarea value={v.remarks} onChange={set('remarks')} rows={2} className={INPUT} /></div>
      </div>
    </Shell>
  );
}

export function TransferModal({ data, fromLabel, busy, onClose, onSave }: any) {
  const [v, setV] = useState({ newEmployee: '', department: '', toLocation: '', date: today(), reason: '', remarks: '' });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title="Transfer Asset" subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose} width="max-w-xl"
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.reason.trim()} onClick={() => onSave(v)} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Confirm Transfer</button></>}>
      <div className="rounded-lg border border-gray-200 dark:border-[#1e3a5f] p-3 text-xs"><p className="text-gray-400 mb-1">CURRENT</p><p className="text-gray-800 dark:text-slate-200">{data.assignedTo || 'Unassigned'} · {fromLabel || data.location}</p></div>
      <p className="text-xs text-gray-400">Leave a field blank to keep its current value.</p>
      <div className="grid grid-cols-2 gap-4 pb-2">
        <KField label="New Assignee" value={v.newEmployee} onChange={(x) => setV((s) => ({ ...s, newEmployee: x }))} />
        <KField label="Department" value={v.department} onChange={(x) => setV((s) => ({ ...s, department: x }))} />
        <div className="col-span-2"><KField label="New Location" value={v.toLocation} onChange={(x) => setV((s) => ({ ...s, toLocation: x }))} /></div>
        <KField label="Transfer Date" required type="date" value={v.date} onChange={(x) => setV((s) => ({ ...s, date: x }))} />
        <KField label="Reason" required value={v.reason} onChange={(x) => setV((s) => ({ ...s, reason: x }))} placeholder="e.g. Relocation" />
        <div className="col-span-2"><FLabel>Remarks</FLabel><textarea value={v.remarks} onChange={set('remarks')} rows={2} className={INPUT} /></div>
      </div>
    </Shell>
  );
}

export function MaintenanceModal({ data, busy, onClose, onSave, title = 'Add Maintenance / Repair' }: any) {
  const [v, setV] = useState({ required: '', repairStatus: 'For Repair', date: today(), provider: '', cost: '', details: '', remarks: '' });
  const set = (k: string) => (e: any) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title={title} subtitle={`${data.deviceCode} · ${data.name}`} onClose={onClose}
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !v.required.trim()} onClick={() => onSave({ ...v, cost: v.cost ? Number(v.cost) : undefined })} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Save Record</button></>}>
      <div className="space-y-4 pb-2">
        <KField label="Maintenance Required" required value={v.required} onChange={(x) => setV((s) => ({ ...s, required: x }))} placeholder="e.g. Replace parts" />
        <div className="grid grid-cols-2 gap-4">
          <div><FLabel>Repair Status</FLabel><select value={v.repairStatus} onChange={set('repairStatus')} className={INPUT}><option>For Repair</option><option>Ongoing</option><option>Completed</option></select></div>
          <KField label="Repair Date" type="date" value={v.date} onChange={(x) => setV((s) => ({ ...s, date: x }))} />
          <KField label="Repair Provider" value={v.provider} onChange={(x) => setV((s) => ({ ...s, provider: x }))} />
          <KField label="Repair Cost (₱)" type="number" value={v.cost} onChange={(x) => setV((s) => ({ ...s, cost: x }))} />
        </div>
        <div><FLabel>Repair Details</FLabel><textarea value={v.details} onChange={set('details')} rows={2} className={INPUT} /></div>
        <p className="text-xs text-gray-400">"For Repair" or "Ongoing" sets the asset status to Under Repair. "Completed" returns it to its previous working status.</p>
      </div>
    </Shell>
  );
}

export function DisposalModal({ data, busy, onClose, onSave }: any) {
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
          <KField label="Request Date" type="date" value={v.date} onChange={(x) => setV((s) => ({ ...s, date: x }))} />
          <div><FLabel>Proposed Disposal Method</FLabel><select value={v.method} onChange={set('method')} className={INPUT}><option>Scrap</option><option>Sell</option><option>Donate</option><option>Recycle</option><option>Return to Vendor</option><option>E-Waste Facility</option></select></div>
        </div>
        <div><FLabel>Remarks</FLabel><textarea value={v.remarks} onChange={set('remarks')} rows={2} className={INPUT} /></div>
      </div>
    </Shell>
  );
}

export function ConfirmArchive({ data, busy, onCancel, onConfirm }: any) {
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

export function DocumentsTab({ data, allowEdit, save, log, docTypes }: { data: ITAsset; allowEdit: boolean; save: (next: ITAsset) => Promise<void>; log: (d: string) => void; docTypes?: string[] }) {
  const [docType, setDocType] = useState((docTypes && docTypes[0]) || 'Invoice');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const atts = data.attachments || [];
  const types = docTypes || ['Invoice', 'Official Receipt', 'Purchase Order', 'Warranty Document', 'Asset Photo', 'Other'];
  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await assetServices.uploadFiles(Array.from(files));
      const tagged = uploaded.map((u) => ({ ...u, name: `[${docType}] ${u.name}` }));
      await save({ ...data, attachments: [...atts, ...tagged] });
      log(`Uploaded document (${docType})`);
    } finally { setUploading(false); }
  };
  const remove = async (idx: number) => { await save({ ...data, attachments: atts.filter((_: any, i: number) => i !== idx) }); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-gray-400 dark:text-slate-500">DOCUMENTS & ATTACHMENTS</h3>
        {allowEdit && (
          <div className="flex items-center gap-2">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className={`${INPUT} w-44`}>{types.map((d) => <option key={d}>{d}</option>)}</select>
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

// Simple "Add log entry" modal used by vehicle fleet logs (odometer, fuel, inspection, incident)
export function LogEntryModal({ title, subtitle, fields, onClose, onSave, busy }: {
  title: string; subtitle?: string; onClose: () => void; busy?: boolean;
  fields: { key: string; label: string; type?: string; required?: boolean; textarea?: boolean; options?: string[]; placeholder?: string }[];
  onSave: (vals: Record<string, any>) => void;
}) {
  const [v, setV] = useState<Record<string, any>>(() => Object.fromEntries(fields.map((f) => [f.key, f.type === 'date' ? today() : ''])));
  const required = fields.filter((f) => f.required);
  const ok = required.every((f) => String(v[f.key] ?? '').trim() !== '');
  return (
    <Shell title={title} subtitle={subtitle} onClose={onClose} width="max-w-xl"
      footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button disabled={busy || !ok} onClick={() => onSave(v)} className="px-4 py-2 rounded-lg bg-[#0b5c96] text-white text-sm font-semibold hover:bg-[#094a79] disabled:opacity-50">Save</button></>}>
      <div className="grid grid-cols-2 gap-4 pb-2">
        {fields.map((f) => (
          <div key={f.key} className={f.textarea ? 'col-span-2' : ''}>
            <FLabel required={f.required}>{f.label}</FLabel>
            {f.textarea ? (
              <textarea value={v[f.key]} onChange={(e) => setV((s) => ({ ...s, [f.key]: e.target.value }))} rows={2} className={INPUT} />
            ) : f.options ? (
              <select value={v[f.key]} onChange={(e) => setV((s) => ({ ...s, [f.key]: e.target.value }))} className={INPUT}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
            ) : (
              <input type={f.type || 'text'} value={v[f.key]} placeholder={f.placeholder} onChange={(e) => setV((s) => ({ ...s, [f.key]: e.target.value }))} className={INPUT} />
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}
