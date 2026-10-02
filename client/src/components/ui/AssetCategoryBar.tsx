import { REGISTERS, type RegisterId } from '@/utils/assetRegister';

interface AssetCategoryBarProps {
  value: RegisterId;
  onChange: (id: RegisterId) => void;
  counts: Partial<Record<RegisterId, number>>;
  className?: string;
}

/** Horizontal "ASSET CATEGORY" filter bar used across record modules. */
export function AssetCategoryBar({ value, onChange, counts, className = '' }: AssetCategoryBarProps) {
  return (
    <div className={`bg-white dark:bg-[#162236] border border-gray-200 dark:border-[#1e3a5f] rounded-xl px-4 py-3 ${className}`}>
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
          Asset Category
        </span>
        <div className="flex items-center gap-2">
          {REGISTERS.map((r) => {
            const Icon = r.icon;
            const active = value === r.id;
            const count = counts[r.id] ?? 0;
            return (
              <button
                key={r.id}
                onClick={() => onChange(r.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-[#0b5c96] text-white border-[#0b5c96]'
                    : 'bg-white dark:bg-[#1e2d4a] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-[#1e3a5f] hover:border-gray-300 dark:hover:border-[#2a4a6f]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {r.label}
                <span className={`text-xs ${active ? 'text-white/80' : 'text-gray-400 dark:text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
