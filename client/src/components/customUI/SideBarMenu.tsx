import { LayoutDashboard, Package, Plus, Settings, Activity, Users, Trash2, FileX, CreditCard, ClipboardList, FileEdit } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function SidebarMenu({ currentView, onViewChange }: SidebarProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'add', label: 'Add Asset', icon: Plus, adminOnly: true },
    { id: 'subscriptions', label: 'Subscription List', icon: CreditCard, adminOnly: true },
    { id: 'disposal', label: 'Disposal Form', icon: FileX, adminOnly: true },
    { id: 'form-masterlist', label: 'Form Masterlist', icon: ClipboardList, adminOnly: true },
    { id: 'users', label: 'User Settings', icon: Users, adminOnly: true },
    { id: 'deleted', label: 'Deleted Devices', icon: Trash2, adminOnly: true },
    { id: 'history', label: 'Activity Log', icon: Activity },
  ];

  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="w-64 bg-[#d5e1f1] border-r border-gray-200 min-h-screen p-4">
      <div className="mb-8">
        {/* Logo and Title - Side by Side */}
        <div className="flex justify-center items-center gap-3 mb-3">
          <img 
            src={'/logo.png'} 
            alt="IMS Logo" 
            className="w-12 h-12 object-contain"
          />
        </div>
        
        {/* Subtitle */}
        <div className="text-center">
          <p className="text-gray-600 text-xs">Inventory Management System</p>
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
                    : 'text-gray-700 hover:bg-blue-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}