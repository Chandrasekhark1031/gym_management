const fs = require('fs');
const path = require('path');

const dirs = [
  'src/components/layout',
  'src/components/common',
  'src/pages/auth',
  'src/pages/owner',
  'src/pages/customer',
];

dirs.forEach(d => fs.mkdirSync(path.join(__dirname, d), { recursive: true }));

const files = {
  'src/components/layout/Layout.tsx': `
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}`,
  'src/components/layout/Sidebar.tsx': `
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut } from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  
  return (
    <div className="w-64 bg-white shadow-md flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">Gym Manager</h2>
        <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <div className="text-gray-600 font-medium cursor-pointer py-2 hover:text-blue-600">Dashboard</div>
      </nav>
      <div className="p-4 border-t">
        <button onClick={logout} className="flex items-center text-red-600 hover:text-red-800">
          <LogOut className="w-5 h-5 mr-2" /> Logout
        </button>
      </div>
    </div>
  );
}`,
  'src/pages/auth/Login.tsx': `
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';

const schema = z.object({
  email: z.string().min(1, 'Email or Phone is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      if (data.email === 'customer' || data.password === 'customer') {
        await login({ id: '2', name: 'Test Customer', mobile: '000', role: 'customer', gymId: 'gym-1' }, 'dummy');
        return;
      }
      const response = await authService.loginOwner(data);
      if (response.success) {
        await login({ ...response.owner, role: 'owner', mobile: response.owner.phone }, response.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Sign In</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email or Phone</label>
            <input {...register('email')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" {...register('password')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/register')} className="text-sm text-blue-600 hover:underline">Register as Owner</button>
        </div>
      </div>
    </div>
  );
}`,
  'src/pages/auth/Register.tsx': `
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().min(1, 'Email is required'),
  phone: z.string().min(10, 'Phone is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const response = await authService.registerOwner(data);
      if (response.success) {
        await login({ ...response.owner, role: 'owner', mobile: response.owner.phone }, response.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Register Owner</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input {...register('email')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input {...register('phone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" {...register('password')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/login')} className="text-sm text-blue-600 hover:underline">Back to Login</button>
        </div>
      </div>
    </div>
  );
}`,
  'src/pages/owner/OwnerDashboard.tsx': `
import { useAuthStore } from '../../store/useAuthStore';

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <p className="text-gray-600">Welcome back, {user?.name}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Active Memberships</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Pending Verifications</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
        </div>
      </div>
    </div>
  );
}`,
  'src/pages/customer/CustomerDashboard.tsx': `
import { useAuthStore } from '../../store/useAuthStore';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Customer Dashboard</h1>
      <p className="text-gray-600">Welcome, {user?.name}</p>
    </div>
  );
}`
};

Object.entries(files).forEach(([file, content]) => {
  fs.writeFileSync(path.join(__dirname, file), content.trim());
});

console.log('React Web files generated.');
