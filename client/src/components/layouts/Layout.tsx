import React, { useState } from 'react';
import { SidebarMenu } from '@/components/customUI/SideBarMenu';
import { useAuthStore } from '@/store/authStore';
import { LogOut } from 'lucide-react'; // Para sa logout button

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SidebarMenu currentView={currentView} onViewChange={setCurrentView} />

      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 uppercase tracking-tight">
            {currentView.replace('-', ' ')}
          </h2>
          
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

        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}