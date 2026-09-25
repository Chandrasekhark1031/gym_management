import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { assetUrl } from '../../services/gymService';
import { LogOut, Dumbbell } from 'lucide-react';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/customers', label: 'Customers' },
  { to: '/plans', label: 'Plans' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/payments', label: 'Payments' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col h-full min-h-screen md:min-h-0">
      <div className="p-4 border-b text-center">
        {user?.photoUrl ? (
          <img
            src={assetUrl(user.photoUrl)}
            alt={user?.gymName || 'Gym Logo'}
            className="w-42 h-20 rounded-xl mx-auto object-contain j mb-2 p-0.5"
          />
        ) : (
          <div className="w-42 h-20 rounded-xl bg-blue-600 text-white flex items-center justify-center  mx-auto mb-2.5 shadow-md shadow-blue-500/20">
            <Dumbbell size={24} />
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Gym Manager</h2>
        <p className="text-s text-gray-700 font-medium mt-1.5">
  {user?.gymName || ''}
</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `block py-2.5 px-3 rounded-md text-sm ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <p className="text-s text-gray-900 mb-2 truncate">{user?.name}</p>
        <button onClick={logout} className="flex items-center text-red-600 hover:text-red-800 text-sm">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </button>
      </div>
    </aside>
  );
}
