import { useState } from 'react';
import { X, Search, ArrowRightLeft, ChevronRight, Monitor, Laptop, Keyboard, Mouse, Printer, Server, Wifi, Smartphone } from 'lucide-react';
import type { ITAsset, Company, FormRecord } from '@/types/inventory';
import { useAssetStore } from '@/store/assetStore';
import { getCompanyBadgeClasses } from '@/utils/device-code';
import { TransferForm } from './transfer-form';

interface Props {
  currentUser: string;
  onClose: () => void;
  onTransfer: (assetId: string, toCompany: Company, fromName?: string, toName?: string) => void;
  onSaveFormRecord?: (record: Omit<FormRecord, 'id' | 'dateCreated'>) => void;
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  laptop: Laptop, desktop: Monitor, monitor: Monitor,
  keyboard: Keyboard, mouse: Mouse, printer: Printer,
  server: Server, networking: Wifi, phone: Smartphone,
  tablet: Smartphone, other: Monitor,
};

const STATUS_DOT: Record<string, string> = {
  active:           'bg-green-500',
  available:        'bg-teal-500',
  'in-storage':     'bg-purple-500',
  'in-maintenance': 'bg-orange-500',
  disposed:         'bg-red-500',
};

type Step = 'select' | 'form';

export function NewTransferModal({ currentUser, onClose, onTransfer, onSaveFormRecord }: Props) {
  const { assets } = useAssetStore();
  const [step, setStep]           = useState<Step>('select');
  const [selected, setSelected]   = useState<ITAsset | null>(null);
  const [search, setSearch]       = useState('');
  const [company, setCompany]     = useState<Company | 'all'>('all');

  const nonDeleted = assets.filter(a => !a.isDeleted);

  const filtered = nonDeleted.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || a.deviceCode.toLowerCase().includes(q)
      || a.name.toLowerCase().includes(q)
      || a.brand.toLowerCase().includes(q)
      || a.serialNumber.toLowerCase().includes(q)
      || (a.assignedTo ?? '').toLowerCase().includes(q);
    const matchCompany = company === 'all' || a.company === company;
    return matchSearch && matchCompany;
  }).sort((a, b) => a.deviceCode.localeCompare(b.deviceCode));

  const handleSelect = (asset: ITAsset) => {
    setSelected(asset);
    setStep('form');
  };

  const handleTransferComplete = (assetId: string, toCompany: Company, fromName?: string, toName?: string) => {
    onTransfer(assetId, toCompany, fromName, toName);
    onClose();
  };

  // Once asset is selected, hand off entirely to TransferForm
  if (step === 'form' && selected) {
    return (
      <TransferForm
        asset={selected}
        onTransfer={handleTransferComplete}
        onCancel={() => setStep('select')}
        currentUser={currentUser}
        onSaveFormRecord={onSaveFormRecord}
      />
    );
  }

  const COMPANIES: { id: Company | 'all'; label: string; dot?: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'KHEALTH',  label: 'KHEALTH',  dot: 'bg-blue-500' },
    { id: 'CAREVIEW', label: 'CAREVIEW', dot: 'bg-green-500' },
    { id: 'GLOWFIND', label: 'GLOWFIND', dot: 'bg-orange-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#162236] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-gray-200 dark:border-[#1e3a5f]">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">New Transfer Form</h2>
              <p className="text-sm text-blue-100">Step 1 of 2 — Select an asset to transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Company Filter */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 dark:border-[#1e3a5f] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search by code, name, brand, serial number, or assigned user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-[#1e3a5f] rounded-lg bg-white dark:bg-[#1e2d4a] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {COMPANIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCompany(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  company === c.id
                    ? c.id === 'KHEALTH'  ? 'bg-blue-600 text-white border-blue-600'
                    : c.id === 'CAREVIEW' ? 'bg-green-600 text-white border-green-600'
                    : c.id === 'GLOWFIND' ? 'bg-orange-600 text-white border-orange-600'
                    :                       'bg-slate-600 text-white border-slate-600'
                    : 'bg-white dark:bg-[#1e2d4a] text-gray-700 dark:text-slate-300 border-gray-200 dark:border-[#1e3a5f] hover:border-gray-400'
                }`}
              >
                {c.dot && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {filtered.length} asset{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#1e3a5f]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
              <Monitor className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium">No assets found</p>
              <p className="text-xs mt-1">Try a different search term or company</p>
            </div>
          ) : (
            filtered.map(asset => {
              const Icon = CATEGORY_ICON[asset.category] ?? Monitor;
              const ICON_BG: Record<string, string> = {
                KHEALTH:  'bg-blue-500/15 text-blue-500',
                CAREVIEW: 'bg-green-500/15 text-green-500',
                GLOWFIND: 'bg-orange-500/15 text-orange-500',
              };
              return (
                <button
                  key={asset._id}
                  onClick={() => handleSelect(asset)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 dark:hover:bg-[#1e2d4a] transition-colors text-left group"
                >
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${ICON_BG[asset.company] ?? 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-gray-600 dark:text-slate-400">{asset.deviceCode}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getCompanyBadgeClasses(asset.company)}`}>
                        {asset.company}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{asset.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {asset.brand} {asset.model} · S/N: {asset.serialNumber}
                      {asset.assignedTo ? ` · ${asset.assignedTo}` : ''}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[asset.status] ?? 'bg-gray-400'}`} />
                      <span className="capitalize hidden sm:block">{asset.status.replace('-', ' ')}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-[#1e3a5f] bg-gray-50 dark:bg-[#0f1729] rounded-b-xl">
          <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
            Click on an asset to proceed to the transfer form
          </p>
        </div>
      </div>
    </div>
  );
}
