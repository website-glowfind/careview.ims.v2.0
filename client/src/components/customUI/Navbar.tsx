import React from 'react'
import { BookMarked, ChevronDownIcon, LogOut, Shield, UserIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
const Navbar = ({children}: {children: React.ReactNode}) => {
    const { user, logout } = useAuthStore(); 
  return (
    <div className='flex w-full flex-col min-h-screen bg-gray-100'>
        <nav className='bg-white shadow-md'>
            <div className="bg-white border-b border-gray-200 px-8 py-4">
                <div className="flex items-center justify-end gap-4">
                    <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user?.role === 'admin'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {user?.role === 'admin' ? (
                        <Shield className="w-5 h-5" />
                        ) : (
                        <UserIcon className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                        {user?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                        {user?.role === 'admin' ? 'Administrator' : 'User'} • {user?.department}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="ml-4 flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                    </div>
                </div>
                </div>
        </nav>
        <main className='flex grow'>
            {children}
        </main>
    </div>
  )
}

export default Navbar