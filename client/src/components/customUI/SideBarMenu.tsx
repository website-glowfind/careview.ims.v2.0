import { LayoutDashboard, Package, Plus, Activity, Users, Trash2, FileX, CreditCard, ClipboardList, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function SidebarMenu({ currentView, onViewChange }: SidebarProps) {
  const { user } = useAuthStore();
  // Normalize any legacy/unknown role to 'employee' so the menu never comes up empty
  const rawRole = user?.role ?? 'employee';
  const role = rawRole === 'admin' || rawRole === 'encoder' ? rawRole : 'employee';
  const isAdmin = role === 'admin';

  // roles: which non-admin roles may see the item (admin always sees everything)
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['encoder', 'employee'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['encoder', 'employee'] },
    { id: 'add', label: 'Add Asset', icon: Plus, roles: ['encoder'] },
    { id: 'subscriptions', label: 'Subscription List', icon: CreditCard, roles: ['encoder'] },
    { id: 'employees', label: 'Employee List', icon: UserCheck, roles: ['employee'] },
    { id: 'disposal', label: 'Disposal Form', icon: FileX, roles: ['encoder'] },
    { id: 'form-masterlist', label: 'Form Masterlist', icon: ClipboardList, roles: ['encoder'] },
    { id: 'users', label: 'User Settings', icon: Users, roles: [] },
    { id: 'deleted', label: 'Deleted Devices', icon: Trash2, roles: ['encoder'] },
    { id: 'history', label: 'Activity Log', icon: Activity, roles: ['employee'] },
  ];

  const menuItems = allMenuItems.filter(item => isAdmin || item.roles.includes(role));

  return (
    <div className="w-64 bg-[#d5e1f1] dark:bg-[#0d1535] border-r border-gray-200 dark:border-[#1e3a5f] min-h-screen p-4 transition-colors duration-300 flex flex-col">
      <div className="mb-8">
        <div className="flex justify-center items-center gap-3 mb-3">
          <img
            src={'/logo.png'}
            alt="IMS Logo"
            className="w-12 h-12 object-contain"
          />
        </div>
        <div className="text-center">
          <p className="text-gray-600 dark:text-slate-400 text-xs">Inventory Management System</p>
        </div>
      </div>

      <nav>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-[#1e2d4a]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Credit */}
      <div className="mt-auto pt-4 border-t border-gray-300/60 dark:border-[#1e3a5f] text-center">
        <p className="text-[11px] text-gray-500 dark:text-slate-500">
          Developed by <span className="font-semibold text-gray-600 dark:text-slate-400">J.M.V</span>
        </p>
      </div>
    </div>
  );
}