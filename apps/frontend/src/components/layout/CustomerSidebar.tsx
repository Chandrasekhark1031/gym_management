import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { customerPortalService, assetUrl } from '../../services/gymService';
import { LogOut, Dumbbell } from 'lucide-react';

const links = [
  { to: '/customer/dashboard', label: 'Dashboard' },
  { to: '/customer/profile', label: 'Profile' },
  { to: '/customer/membership', label: 'Membership' },
  { to: '/customer/payments', label: 'Payments' },
  { to: '/customer/notifications', label: 'Notifications' },
  { to: '/customer/gym-payment', label: 'Gym UPI / QR' },
];

export default function CustomerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();
  const [gymLogo, setGymLogo] = useState<string | null>(user?.gymLogoUrl || null);
  const [gymName, setGymName] = useState<string | null>(user?.gymName || null);

  useEffect(() => {
    if (user?.gymLogoUrl) {
      setGymLogo(user.gymLogoUrl);
      if (user.gymName) setGymName(user.gymName);
    }
    customerPortalService.gymPayment()
      .then((res) => {
        if (res.gym?.logoUrl) setGymLogo(res.gym.logoUrl);
        if (res.gym?.name) setGymName(res.gym.name);
      })
      .catch(() => {});
  }, [user?.gymLogoUrl, user?.gymName]);

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col h-full min-h-screen md:min-h-0">
      <div className="p-4 border-b text-center">
        {gymLogo ? (
          <img
            src={assetUrl(gymLogo)}
            alt={gymName || 'Gym Logo'}
            className="w-42 h-20 rounded-xl object-contain mb-2 mx-auto p-0.5"
          />
        ) : (
          <div className="w-42 h-20 rounded-xl bg-blue-600 text-white flex items-center justify-center  mx-auto mb-2.5 shadow-md shadow-blue-500/20">
            <Dumbbell size={24} />
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Customer Portal</h2>
       
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
        <p className="text-s text-gray-900 font-medium truncate mb-3">
    {user?.name}
  </p>
        <button type="button" onClick={logout} className="flex items-center text-red-600 hover:text-red-800 text-sm">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </button>
      </div>
    </aside>
  );
}
