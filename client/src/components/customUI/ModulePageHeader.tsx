import { ArrowLeft, Construction } from 'lucide-react';
import { getModuleForView } from '@/config/modules';

/** White header band shown on every module page: back link + icon + title + description. */
export function ModulePageHeader({
  view,
  onBack,
  onSelectTab,
}: {
  view: string;
  onBack: () => void;
  /** When the module has sub-tabs, called with the selected tab's view key */
  onSelectTab?: (view: string) => void;
}) {
  const m = getModuleForView(view);
  if (!m) return null;
  const Icon = m.icon;

  return (
    <div className="bg-white dark:bg-[#0d1535] border-b border-gray-200 dark:border-[#1e3a5f]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-4 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-[#0b5c96] dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Main Dashboard
        </button>
        <div className="flex items-center gap-4 mt-3">
          <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-[#1e3a5f] bg-white dark:bg-[#162236] flex items-center justify-center text-[#0b5c96] dark:text-blue-400 flex-shrink-0">
            <Icon className="w-6 h-6" strokeWidth={1.25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">{m.name}</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">{m.description}</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs (e.g. IT Assets: Inventory · Add Assets · Subscription List · Overview · Export Reports) */}
      {m.tabs && m.tabs.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <nav className="flex items-center gap-6 overflow-x-auto -mb-px">
            {m.tabs.map((t) => {
              const active = t.view === view;
              return (
                <button
                  key={t.view}
                  onClick={() => onSelectTab?.(t.view)}
                  className={`whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
                    active
                      ? 'border-[#0b5c96] text-[#0b5c96] dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

/** Placeholder content for modules that are not yet configured (upcoming). */
export function ModuleSetupPlaceholder({ view }: { view: string }) {
  const m = getModuleForView(view);
  const title = m?.name ?? 'This module';
  return (
    <div className="border-2 border-dashed border-gray-200 dark:border-[#1e3a5f] rounded-xl py-24 px-6 text-center">
      <Construction className="w-10 h-10 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title} module is being set up</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
        This module has no records yet. Its tools will appear here once configured.
      </p>
    </div>
  );
}
