import { Bell, LogOut, LayoutGrid, Sun, Moon, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

interface TopBarProps {
  currentView: string;
  onModulesClick: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  encoder: 'Encoder',
  employee: 'Employee',
};

export function TopBar({ currentView, onModulesClick }: TopBarProps) {
  const { user, logout } = useAuthStore();
  const { isDark, toggleDark } = useThemeStore();
  const isHub = currentView === 'hub';
  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? 'User';

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0d1535] border-b border-gray-200 dark:border-[#1e3a5f]">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button onClick={onModulesClick} className="flex items-center gap-2.5" title="Go to Modules">
          <svg viewBox="0 0 24 24" className="w-8 h-8 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2h6v5h5v6h-5v5H9v-5H4V7h5z" fill="#22c55e" />
            <circle cx="17" cy="16" r="4.5" fill="#2563eb" />
          </svg>
          <div className="leading-tight text-left">
            <div className="font-bold text-gray-900 dark:text-white text-sm">KHealth</div>
            <div className="text-gray-500 dark:text-slate-400 text-xs -mt-0.5">Careview</div>
          </div>
        </button>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={onModulesClick}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isHub
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#1e2d4a]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Modules
          </button>

          <button className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#1e2d4a] transition-colors" title="Notifications">
            <Bell className="w-5 h-5" />
          </button>

          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#1e2d4a] transition-colors"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="h-8 w-px bg-gray-200 dark:bg-[#1e3a5f] mx-1" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="leading-tight hidden md:block">
              <div className="font-semibold text-gray-900 dark:text-white text-sm">{user?.name ?? 'User'}</div>
              <div className="text-gray-500 dark:text-slate-400 text-xs">
                {roleLabel}{user?.department ? ` • ${user.department}` : ''}
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-2 py-2 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
