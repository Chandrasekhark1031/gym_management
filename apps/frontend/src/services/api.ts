import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.VITE_SITES_MODE === 'true' ? '/api' : 'http://localhost:5000/api'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token && config.headers && import.meta.env.VITE_SITES_MODE !== 'true') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const requestPath = error.config?.url || '';
      if (import.meta.env.VITE_SITES_MODE === 'true' && localStorage.getItem('jwt_token') && !['/auth/login', '/customer/auth/login', '/sites/session'].includes(requestPath)) {
        const role = localStorage.getItem('auth_role');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('auth_role');
        window.location.assign(role === 'customer' ? '/customer/login' : '/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
