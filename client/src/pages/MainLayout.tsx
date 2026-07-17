import { useState } from 'react';
import { SidebarMenu } from '@/components/customUI/SideBarMenu';
import { Dashboard } from './Dashboard'; // Yung current dashboard mo
import { InventoryPage } from '@/pages/Inventory/InventoryPage'; // Yung ginawa nating table page
import { useAuthStore } from '@/store/authStore';
import { LogOut, Sun, Moon, User } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { AssetForm } from '@/components/asset-form';
import { useAssetStore } from '@/store/assetStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { useActivityLogStore } from '@/store/activityLogStore';
import { FormMasterlistPage } from './Form-Masterlist/FormMasterListPage';
import { SubscriptionPage } from './Subscripton/SubscriptionPage';
import { DeletedDevices } from './Deleted-Device/DeletedDevicePage';
import { ActivityLog } from './ActivityLog/ActivityLogPage';
import { DisposalFormPage } from './Disposal-form/DisposalFormPage';
import { UserManagement } from './User-Management/UserManagement';
import { EmployeeListPage } from './Employee-List/EmployeeListPage';

export default function MainLayout() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [formError, setFormError] = useState<string | null>(null);
    const { user, logout } = useAuthStore();
    const { assets, addAsset } = useAssetStore();
    const { categories, defaultCategories, addCategory, deleteCategory } = useCategoryStore();
    const { addFormRecord } = useFormRecordStore();
    const { isDark, toggleDark } = useThemeStore();
    const { addHistoryEntry } = useActivityLogStore();
    const handleSaveAsset = async (assetData: any, subscriptionData?: any) => {
      setFormError(null);
      try {
        await addAsset(assetData, subscriptionData);
        // Log the new asset — deviceCode comes back from the server via the store
        addHistoryEntry({
          action: 'added',
          category: 'asset',
          deviceCode: assetData.deviceCode || 'PENDING',
          deviceName: assetData.name,
          company: assetData.company,
          details: `${assetData.brand} ${assetData.model} — ${assetData.category}`,
        });
        setCurrentView('inventory');
      } catch (error: any) {
        setFormError(error?.message || 'Failed to save asset.');
      }
    };
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <InventoryPage />;
      case 'subscriptions':
        return <SubscriptionPage />;
      case 'deleted':
        return <DeletedDevices />;
      case 'history':
        return <ActivityLog />;
      case 'employees':
        return <EmployeeListPage />;
      case 'form-masterlist':
        return <FormMasterlistPage />;
      case 'disposal':
        return <DisposalFormPage />;
      case 'users':
        return <UserManagement />;
      case 'add':
        return (
          <div className="max-w-4xl mx-auto">
            {formError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm font-medium">
                ⚠️ {formError}
              </div>
            )}
            <AssetForm
              assets={assets}
              categories={categories}
              onAddCategory={addCategory}
              onDeleteCategory={deleteCategory}
              defaultCategories={defaultCategories}
              onSave={handleSaveAsset}
              onCancel={() => { setFormError(null); setCurrentView('dashboard'); }}
              currentUser={user?.name || 'Admin'}
              onSaveFormRecord={addFormRecord}
            />
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f1729] transition-colors duration-300">
      <SidebarMenu currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white dark:bg-[#0d1535] shadow-sm px-8 py-4 flex justify-end border-b border-gray-200 dark:border-[#1e3a5f] transition-colors duration-300">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">
              Hello, <span className="text-blue-600 dark:text-blue-400">{user?.name}</span>
            </span>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#1e2d4a] transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        <header className="h-16 bg-white dark:bg-[#0d1535] border-b border-gray-200 dark:border-[#1e3a5f] flex items-center px-8 text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">
          IMS / {currentView}
        </header>

        <main className="p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
}