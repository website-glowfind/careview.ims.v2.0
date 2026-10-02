import { useState } from 'react';
import { TopBar } from '@/components/customUI/TopBar';
import { ModuleHub } from '@/components/ModuleHub';
import { ModulePageHeader, ModuleSetupPlaceholder } from '@/components/customUI/ModulePageHeader';
import { getModuleForView } from '@/config/modules';
import { InventoryPage } from '@/pages/Inventory/InventoryPage';
import { ITOverviewTab } from '@/pages/Inventory/ITOverviewTab';
import { ITExportReportsTab } from '@/pages/Inventory/ITExportReportsTab';
import { FormMasterlistPage } from './Form-Masterlist/FormMasterListPage';
import { SubscriptionPage } from './Subscripton/SubscriptionPage';
import { DeletedDevices } from './Deleted-Device/DeletedDevicePage';
import { ActivityLog } from './ActivityLog/ActivityLogPage';
import { DisposalFormPage } from './Disposal-form/DisposalFormPage';
import { UserManagement } from './User-Management/UserManagement';
import { EmployeeListPage } from './Employee-List/EmployeeListPage';

export default function MainLayout() {
  const [currentView, setCurrentView] = useState('hub');
  const goHub = () => setCurrentView('hub');

  const renderView = () => {
    const mod = getModuleForView(currentView);
    if (mod?.upcoming) return <ModuleSetupPlaceholder view={currentView} />;

    switch (currentView) {
      // ── IT Assets module tabs ──────────────────────────────────────
      case 'inventory':       return <InventoryPage assetType="IT" embedded />;
      case 'add':             return (
        <InventoryPage assetType="IT" embedded autoOpenForm onRequestCloseForm={() => setCurrentView('inventory')} />
      );
      case 'subscriptions':   return <SubscriptionPage />;
      case 'dashboard':       return <ITOverviewTab />;
      case 'export':          return <ITExportReportsTab />;
      // ───────────────────────────────────────────────────────────────
      case 'furniture':       return <InventoryPage assetType="General" />;
      case 'deleted':         return <DeletedDevices />;
      case 'history':         return <ActivityLog />;
      case 'employees':       return <EmployeeListPage />;
      case 'form-masterlist': return <FormMasterlistPage />;
      case 'disposal':        return <DisposalFormPage />;
      case 'users':           return <UserManagement />;
      default:                return null;
    }
  };

  if (currentView === 'hub') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f1729] transition-colors duration-300">
        <TopBar currentView={currentView} onModulesClick={goHub} />
        <ModuleHub onOpen={setCurrentView} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1729] transition-colors duration-300">
      <TopBar currentView={currentView} onModulesClick={goHub} />
      <ModulePageHeader view={currentView} onBack={goHub} onSelectTab={setCurrentView} />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        {renderView()}
      </main>
    </div>
  );
}
