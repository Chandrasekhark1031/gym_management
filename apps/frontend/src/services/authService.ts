import api from './api';

export const authService = {
  async login(data: { identifier: string; password: string }) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async register(data: {
    name: string;
    gymName: string;
    email: string;
    phone: string;
    address?: string;
    password: string;
    confirmPassword: string;
  }) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async verifyOtp(email: string, otp: string) {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  async resetPassword(data: { resetToken: string; password: string; confirmPassword: string }) {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  async updateProfile(data: Record<string, unknown>) {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },

  async uploadLogo(file: File) {
    const form = new FormData();
    form.append('logo', file);
    const response = await api.post('/auth/profile/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async uploadQrCode(file: File) {
    const form = new FormData();
    form.append('qrCode', file);
    const response = await api.post('/auth/profile/qr-code', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async changePhone(phone: string) {
    const response = await api.patch('/auth/phone', { phone });
    return response.data;
  },

  async updateEmail(newEmail: string) {
    const response = await api.patch('/auth/email', { newEmail });
    return response.data;
  },

  async requestEmailChange(newEmail: string) {
    const response = await api.post('/auth/change-email/request', { newEmail });
    return response.data;
  },

  async verifyEmailChange(newEmail: string, otp: string) {
    const response = await api.post('/auth/change-email/verify', { newEmail, otp });
    return response.data;
  },
};

