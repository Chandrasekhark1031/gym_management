import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/authService';
import { customerPortalService } from '../services/gymService';
import api from '../services/api';

const mapOwner = (user: any): User => ({
  id: user.id,
  name: user.name,
  mobile: user.phone,
  email: user.email,
  role: 'owner',
  address: user.address,
  gymName: user.gymName,
  upiId: user.upiId,
  photoUrl: user.photoUrl,
  bankCandidateName: user.bankCandidateName,
  paymentPhone: user.paymentPhone,
  qrCodeUrl: user.qrCodeUrl,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  lastLoginAt: user.lastLoginAt,
});

const mapCustomer = (user: any): User => ({
  id: user.id,
  name: user.name,
  mobile: user.phone,
  email: user.email,
  role: 'customer',
  address: user.address,
  photoUrl: user.photoUrl,
  gymName: user.gymName,
  gymLogoUrl: user.gymLogoUrl,
});

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionError: string | null;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  sessionError: null,
  login: async (user, token) => {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('auth_role', user.role);
    set({ user, token, isLoading: false, sessionError: null });
  },
  logout: async () => {
    const role = localStorage.getItem('auth_role');
    if (import.meta.env.VITE_SITES_MODE === 'true') await api.post('/auth/logout');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_role');
    set({ user: null, token: null, isLoading: false, sessionError: null });
    window.location.assign(role === 'customer' ? '/customer/login' : '/login');
  },
  restoreSession: async () => {
    try {
      if (import.meta.env.VITE_SITES_MODE === 'true') {
        const response = await api.get('/sites/session');
        const user = response.data.user;
        const token = response.data.token;
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('auth_role', user.role);
        set({ user: user.role === 'customer' ? mapCustomer(user) : mapOwner(user), token, isLoading: false, sessionError: null });
        return;
      }
      const token = localStorage.getItem('jwt_token');
      const role = localStorage.getItem('auth_role');
      if (!token) {
        set({ user: null, token: null, isLoading: false });
        return;
      }

      if (role === 'customer') {
        const response = await customerPortalService.me();
        if (response.success) {
          set({ user: mapCustomer(response.user), token, isLoading: false });
          return;
        }
      } else {
        const response = await authService.getMe();
        if (response.success) {
          set({ user: mapOwner(response.user), token, isLoading: false });
          return;
        }
      }
    } catch (err: any) {
      if (import.meta.env.VITE_SITES_MODE === 'true') {
        set({ sessionError: err.response?.status === 401 ? null : err.response?.data?.message || 'The workspace is temporarily unavailable. Please try again.' });
      }
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('auth_role');
    }
    set({ user: null, token: null, isLoading: false });
  },
  setUser: (user) => set({ user }),
}));
