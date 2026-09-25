import api from './api';

export const gymService = {
  customers: {
    list: (params?: { search?: string; filter?: string }) => api.get('/customers', { params }).then((r) => r.data),
    get: (id: string) => api.get(`/customers/${id}`).then((r) => r.data),
    create: (data: any) => api.post('/customers', data).then((r) => r.data),
    update: (id: string, data: any) => api.put(`/customers/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, accountStatus: string) => api.patch(`/customers/${id}/status`, { accountStatus }).then((r) => r.data),
    remove: (id: string) => api.delete(`/customers/${id}`).then((r) => r.data),
    uploadPhoto: (id: string, file: File) => {
      const form = new FormData();
      form.append('photo', file);
      return api.post(`/customers/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
    },
  },
  plans: {
    list: () => api.get('/plans').then((r) => r.data),
    create: (data: any) => api.post('/plans', data).then((r) => r.data),
    update: (id: string, data: any) => api.put(`/plans/${id}`, data).then((r) => r.data),
    updateStatus: (id: string, isActive: boolean) => api.patch(`/plans/${id}/status`, { isActive }).then((r) => r.data),
    remove: (id: string) => api.delete(`/plans/${id}`).then((r) => r.data),
  },
  memberships: {
    list: (params?: { status?: string }) => api.get('/memberships', { params }).then((r) => r.data),
    assign: (data: any) => api.post('/memberships', data).then((r) => r.data),
    update: (id: string, data: any) => api.put(`/memberships/${id}`, data).then((r) => r.data),
    renew: (id: string, data?: { planId?: string; mode?: 'extend' | 'create_new' }) => api.post(`/memberships/${id}/renew`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/memberships/${id}`).then((r) => r.data),
  },
  payments: {
    list: () => api.get('/payments').then((r) => r.data),
    get: (id: string) => api.get(`/payments/${id}`).then((r) => r.data),
    create: (data: any) => api.post('/payments', data).then((r) => r.data),
    update: (id: string, data: any) => api.put(`/payments/${id}`, data).then((r) => r.data),
  },
  notifications: {
    list: () => api.get('/notifications').then((r) => r.data),
    markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  },
  dashboard: {
    stats: () => api.get('/dashboard/stats').then((r) => r.data),
    expiring: () => api.get('/dashboard/expiring-memberships').then((r) => r.data),
    recentPayments: () => api.get('/dashboard/recent-payments').then((r) => r.data),
  },
};

export const customerPortalService = {
  register: (data: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    password: string;
    confirmPassword: string;
  }) => api.post('/customer/auth/register', data).then((r) => r.data),
  login: (data: { identifier: string; password: string }) => api.post('/customer/auth/login', data).then((r) => r.data),
  me: () => api.get('/customer/auth/me').then((r) => r.data),
  dashboard: () => api.get('/customer/dashboard').then((r) => r.data),
  profile: () => api.get('/customer/profile').then((r) => r.data),
  updateProfile: (data: any) => api.patch('/customer/profile', data).then((r) => r.data),
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post('/customer/profile/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
  membership: () => api.get('/customer/membership').then((r) => r.data),
  membershipHistory: () => api.get('/customer/membership/history').then((r) => r.data),
  payments: () => api.get('/customer/payments').then((r) => r.data),
  notifications: () => api.get('/customer/notifications').then((r) => r.data),
  markNotificationRead: (id: string) => api.patch(`/customer/notifications/${id}/read`).then((r) => r.data),
  gymPayment: () => api.get('/customer/gym-payment').then((r) => r.data),
  changePassword: (data: any) => api.post('/customer/auth/change-password', data).then((r) => r.data),
};

export const assetUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  return `${base}${path}`;
};
