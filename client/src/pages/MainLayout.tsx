import { useState } from 'react';
import { TopBar } from '@/components/customUI/TopBar';
import { ModuleHub } from '@/components/ModuleHub';
import { ModulePageHeader, ModuleSetupPlaceholder } from '@/components/customUI/ModulePageHeader';
import { getModuleForView } from '@/config/modules';
import { canAccessModule } from '@/config/permissions';
import { useAuthStore } from '@/store/authStore';
import { InventoryPage } from '@/pages/Inventory/InventoryPage';
import { ITOverviewTab } from '@/pages/Inventory/ITOverviewTab';
import { ITExportReportsTab } from '@/pages/Inventory/ITExportReportsTab';
import { VehiclePage } from '@/pages/Vehicle/VehiclePage';
import { StaffHousePage } from '@/pages/StaffHouse/StaffHousePage';
import { OfficeSuppliesPage } from '@/pages/OfficeSupplies/OfficeSuppliesPage';
import { RecordsCompliancePage } from '@/pages/RecordsCompliance/RecordsCompliancePage';
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
  const user = useAuthStore((s) => s.user);

  const renderView = () => {
    const mod = getModuleForView(currentView);
    if (mod?.upcoming) return <ModuleSetupPlaceholder view={currentView} />;
    if (mod && !canAccessModule(user, mod.id)) {
      return (
        <div className="border-2 border-dashed border-gray-200 dark:border-[#1e3a5f] rounded-xl py-24 px-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No access to this module</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">You don't have permission to view {mod.name}. Contact an administrator.</p>
        </div>
      );
    }

    switch (currentView) {
      // ── IT Assets module tabs ──────────────────────────────────────
      case 'inventory':       return <InventoryPage assetType="IT" embedded onNavigate={setCurrentView} />;
      case 'add':             return (
        <InventoryPage assetType="IT" embedded autoOpenForm onRequestCloseForm={() => setCurrentView('inventory')} />
      );
      case 'subscriptions':   return <SubscriptionPage />;
      case 'dashboard':       return <ITOverviewTab />;
      case 'export':          return <ITExportReportsTab />;
      // ───────────────────────────────────────────────────────────────
      case 'furniture':       return <InventoryPage assetType="General" />;
      case 'vehicle':         return <VehiclePage />;
      case 'staff-house':     return <StaffHousePage />;
      case 'office-supplies': return <OfficeSuppliesPage />;
      case 'records-compliance': return <RecordsCompliancePage onNavigate={setCurrentView} />;
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
      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 py-8">
        {renderView()}
      </main>
    </div>
  );
}
