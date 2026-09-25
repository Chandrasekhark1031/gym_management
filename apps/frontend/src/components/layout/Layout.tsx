import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import CustomerSidebar from './CustomerSidebar';
import { useAuthStore } from '../../store/useAuthStore';

export default function Layout() {
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarComponent = user?.role === 'customer' ? CustomerSidebar : Sidebar;

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="hidden md:flex">
        <SidebarComponent />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <button type="button" className="fixed inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50">
            <SidebarComponent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="md:hidden bg-white border-b px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 rounded-md border border-gray-200">
            <Menu size={18} />
          </button>
          <span className="font-semibold text-gray-800">Gym Management</span>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
