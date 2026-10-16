import { useState } from 'react';
import { Recycle, X, Plus, Search as SearchIcon } from 'lucide-react';
import type { ITAsset } from '@/types/inventory';

interface Props {
  /** Asset(s) that opened the modal */
  initial: ITAsset[];
  /** Assets offered in the "Add More" picker (same register, non-deleted) */
  pickFrom: ITAsset[];
  /** Short register label shown on each asset tag, e.g. "IT Assets", "Furniture" */
  registerLabel: string;
  onClose: () => void;
  onProceed: (items: ITAsset[]) => void;
}

export function ConfirmDisposalModal({ initial, pickFrom, registerLabel, onClose, onProceed }: Props) {
  const [queue, setQueue] = useState<ITAsset[]>(initial);
  const [addMore, setAddMore] = useState(false);
  const [search, setSearch] = useState('');

  const remove = (id?: string) => setQueue((q) => q.filter((a) => a._id !== id));
  const picker = pickFrom.filter((a) => !queue.some((q) => q._id === a._id) && (!search.trim() || `${a.deviceCode} ${a.name} ${a.brand ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))).slice(0, 20);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-[#162236] rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-start justify-between p-5 pb-3 border-b border-gray-100 dark:border-[#1e3a5f]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center"><Recycle className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirm Disposal</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">This asset will be added to the centralized Disposal Form.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[52vh] overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-slate-400">Are you sure you want to proceed with {queue.length > 1 ? `these ${queue.length} assets` : 'this asset'} for disposal?</p>
          {queue.map((a) => (
            <div key={a._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center shrink-0"><Recycle className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400">{a.deviceCode}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300">{a.company}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700">{registerLabel}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-200 truncate">{a.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{a.category}</div>
                </div>
              </div>
              {queue.length > 1 && <button onClick={() => remove(a._id)} className="p-1 text-gray-400 hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>}
            </div>
          ))}

          {addMore && (
            <div className="rounded-xl border border-gray-200 dark:border-[#1e3a5f] p-2">
              <div className="relative mb-2">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets to add..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-sm text-gray-900 dark:text-white" />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {picker.length === 0 ? <p className="text-center text-xs text-gray-400 py-3">No assets to add</p> : picker.map((a) => (
                  <button key={a._id} onClick={() => { setQueue((q) => [...q, a]); setSearch(''); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">
                    <span className="font-mono text-xs font-semibold text-[#0b5c96] dark:text-blue-400">{a.deviceCode}</span>
                    <span className="text-gray-700 dark:text-slate-300 truncate">{a.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 dark:border-[#1e3a5f]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#1e3a5f] text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#1e2d4a]">Cancel</button>
          <div className="flex items-center gap-2">
            <button onClick={() => setAddMore((v) => !v)} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${addMore ? 'border-[#0b5c96] text-[#0b5c96] bg-[#0b5c96]/5' : 'border-gray-300 dark:border-[#1e3a5f] text-gray-600 dark:text-slate-300'}`}><Plus className="w-4 h-4" /> Add More</button>
            <button onClick={() => queue.length && onProceed(queue)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"><Recycle className="w-4 h-4" /> Proceed</button>
          </div>
        </div>
      </div>
    </div>
  );
}
