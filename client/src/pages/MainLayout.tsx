import { useState } from 'react';
import { SidebarMenu } from '@/components/customUI/SideBarMenu';
import { Dashboard } from './Dashboard'; // Yung current dashboard mo
import { InventoryPage } from '@/pages/Inventory/InventoryPage'; // Yung ginawa nating table page
import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react';
import { AssetForm } from '@/components/asset-form';
import { useAssetStore } from '@/store/assetStore';
import { useFormRecordStore } from '@/store/formRecordStore';
import { FormMasterlistPage } from './Form-Masterlist/FormMasterListPage';
import { DisposalFormPage } from './Disposal-form/DisposalFormPage';

export default function MainLayout() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [formError, setFormError] = useState<string | null>(null);
    const { user, logout } = useAuthStore();
    const { assets, addAsset } = useAssetStore();
    const { addFormRecord } = useFormRecordStore();
    const handleSaveAsset = async (assetData: any, subscriptionData?: any) => {
      setFormError(null);
      try {
        await addAsset(assetData, subscriptionData);
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
      case 'form-masterlist':
        return <FormMasterlistPage />;
      case 'disposal':
        return <DisposalFormPage />;
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
              categories={['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'networking', 'phone', 'tablet', 'other']}
              onAddCategory={() => {}} // Opsyonal: logic para sa custom categories
              onDeleteCategory={() => {}}
              defaultCategories={['laptop', 'desktop', 'monitor', 'phone']}
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
    <div className="flex min-h-screen bg-gray-50">
      <SidebarMenu currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm px-8 py-4 flex justify-end">
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">
              Hello, <span className="text-blue-600">{user?.name}</span>
            </span>
            <button 
              onClick={() => logout()} 
              className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        <header className="h-16 bg-white border-b flex items-center px-8 text-sm font-bold text-gray-400 uppercase tracking-widest">
          IMS / {currentView}
        </header>
        
        <main className="p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
}