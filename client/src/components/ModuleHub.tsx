import { ArrowRight, Lock } from 'lucide-react';
import { MODULES, MODULE_GROUPS } from '@/config/modules';
import { useAuthStore } from '@/store/authStore';

interface ModuleHubProps {
  onOpen: (view: string) => void;
}

export function ModuleHub({ onOpen }: ModuleHubProps) {
  const user = useAuthStore((s) => s.user);
  const userName = user?.name ?? 'User';
  const isAdmin = user?.role === 'admin';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-10">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-semibold text-gray-900 dark:text-white tracking-tight">Inventory Management System</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Welcome back, {userName}.</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">{today}</p>
      </div>

      <div className="space-y-10">
        {MODULE_GROUPS.map((group) => {
          const items = MODULES.filter((m) => m.group === group);
          return (
            <section key={group}>
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400">{group}</h2>
                <span className="text-xs text-gray-400 dark:text-slate-500">{items.length}</span>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {items.map((m) => {
                  const locked = m.adminOnly && !isAdmin;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={locked}
                      onClick={() => onOpen(m.entryView)}
                      className="group relative flex aspect-[3/4] min-h-[230px] flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-[#1e3a5f] bg-white dark:bg-[#162236] p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-[#2a4a6f] hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5c96]/40 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-[#111b2e] disabled:hover:translate-y-0 disabled:hover:border-gray-200 dark:disabled:hover:border-[#1e3a5f] disabled:hover:shadow-none"
                    >
                      {/* Top accent rule (animates in on hover) */}
                      <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-[#0b5c96] transition-transform duration-300 group-hover:scale-x-100 group-disabled:hidden" />

                      <div className="flex items-start justify-between">
                        <Icon className={`h-8 w-8 ${locked ? 'text-gray-300 dark:text-slate-600' : 'text-[#0b5c96] dark:text-blue-400'}`} strokeWidth={1.25} />
                        {m.upcoming && <span className="rounded-full border border-gray-200 dark:border-[#1e3a5f] px-2 py-px text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Setup</span>}
                        {locked && <Lock className="h-3.5 w-3.5 text-gray-300 dark:text-slate-600" />}
                      </div>

                      <div className="mt-auto">
                        <h3 className={`text-[15px] font-semibold leading-snug ${locked ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>{m.name}</h3>
                        <p className={`mt-1.5 text-xs leading-relaxed line-clamp-3 ${locked ? 'text-gray-400 dark:text-slate-500' : 'text-gray-500 dark:text-slate-400'}`}>{m.description}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-[#1e3a5f] pt-3 text-xs">
                        <span className={locked ? 'text-gray-400 dark:text-slate-500' : 'font-medium text-gray-900 dark:text-white'}>{locked ? 'Admin only' : 'Open'}</span>
                        {!locked && <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-[#0b5c96] dark:group-hover:text-blue-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
