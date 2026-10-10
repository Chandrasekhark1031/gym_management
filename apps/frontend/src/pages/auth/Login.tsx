import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Users, UserRound } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { customerPortalService } from '../../services/gymService';
import AuthCard from '../../components/ui/AuthCard';
import Button from '../../components/ui/Button';
import { Input, PasswordInput } from '../../components/ui/Input';
const schema = z.object({
  identifier: z.string().email('Enter your login email'),
  password: z.string().min(1, 'Enter your password'),
});
type FormData = z.infer<typeof schema>;
export default function Login({ defaultRole = 'owner' }: { defaultRole?: 'owner' | 'customer' }) {
  const [searchParams] = useSearchParams();
  const queryRole = searchParams.get('role');
  const role = queryRole === 'customer' || queryRole === 'owner' ? queryRole : defaultRole;
  const navigate = useNavigate();
  const { login, sessionError } = useAuthStore();
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  useEffect(() => { setError(''); reset(); }, [role, reset]);
  const onSubmit = async (values: FormData) => {
    setError('');
    try {
      const response = role === 'owner' ? await authService.login(values) : await customerPortalService.login(values);
      await login({ ...response.user, mobile: response.user.phone, role }, response.token);
      navigate(role === 'owner' ? '/dashboard' : '/customer/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to log in. Please try again.');
    }
  };
  return <AuthCard
    title={role === 'owner' ? 'Welcome back, owner.' : 'Your gym. Your progress.'}
    subtitle={role === 'owner' ? 'Log in to manage your gym and members.' : 'Log in with the email and password your gym owner gave you.'}
    topElement={<nav className="grid grid-cols-2 gap-1 rounded-xl bg-[#eef2e9] p-1" aria-label="Choose login type">
      <Link to="/login" aria-current={role === 'owner' ? 'page' : undefined} className={'flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ' + (role === 'owner' ? 'bg-white text-[#174b40] shadow-sm' : 'text-[#758472]')}><UserRound size={16} />Owner login</Link>
      <Link to="/customer/login" aria-current={role === 'customer' ? 'page' : undefined} className={'flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ' + (role === 'customer' ? 'bg-white text-[#174b40] shadow-sm' : 'text-[#758472]')}><Users size={16} />Customer login</Link>
    </nav>}
    footer={role === 'owner' ? <p className="text-sm text-gray-500">New gym owner? <Link to="/owner/register" className="font-semibold text-[#174b40] hover:underline">Create owner account</Link></p> : <p className="text-sm text-gray-500">Need login details or a password reset?<br />Contact your gym owner.</p>}
  >
    {(error || sessionError) && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error || sessionError}</p>}
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input label="Email address" type="email" autoComplete="username" required error={errors.identifier?.message} {...register('identifier')} />
      <PasswordInput label="Password" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
      <Button type="submit" loading={isSubmitting} className="w-full min-h-12"><LogIn size={17} />Log in as {role}</Button>
    </form>
  </AuthCard>;
}
