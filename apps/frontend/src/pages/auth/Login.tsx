import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dumbbell,
  Users,
  CalendarCheck,
  TrendingUp,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';
import { customerPortalService } from '../../services/gymService';
import { ErrorState } from '../../components/ui/PageStates';
import gymBg from '../../assets/gym_login_bg.jpg';

const schema = z.object({
  identifier: z.string().min(1, 'Email or Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

interface LoginProps {
  defaultRole?: 'owner' | 'customer';
}

export default function Login({ defaultRole = 'owner' }: LoginProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryRole = searchParams.get('role');
  const initialRole = queryRole === 'customer' ? 'customer' : defaultRole;
  const [role, setRole] = useState<'owner' | 'customer'>(initialRole);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (queryRole === 'customer' || queryRole === 'owner') {
      setRole(queryRole);
    }
  }, [queryRole]);

  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [error, setError] = useState('');

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      if (role === 'owner') {
        const response = await authService.login(data);
        if (response.success) {
          await login(
            {
              id: response.user.id,
              name: response.user.name,
              mobile: response.user.phone,
              email: response.user.email,
              role: 'owner',
              address: response.user.address,
              gymName: response.user.gymName,
              upiId: response.user.upiId,
              photoUrl: response.user.photoUrl,
              emailVerified: response.user.emailVerified,
              phoneVerified: response.user.phoneVerified,
              lastLoginAt: response.user.lastLoginAt,
            },
            response.token
          );
          navigate('/dashboard');
        }
      } else {
        const response = await customerPortalService.login({
          identifier: data.identifier,
          password: data.password,
        });
        await login(
          {
            id: response.user.id,
            name: response.user.name,
            mobile: response.user.phone,
            email: response.user.email,
            role: 'customer',
            address: response.user.address,
            photoUrl: response.user.photoUrl,
          },
          response.token
        );
        navigate('/customer/dashboard');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.message === 'Network Error' || !err.response
          ? 'Unable to connect to server. Please ensure the backend server is running.'
          : 'Login failed');
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100/40 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Decorative ambient blurred glowing orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-300/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Card matching Image 1 */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-gray-100 relative z-10">
        
        {/* Left Side: Dark Hero Panel */}
        <div className="relative bg-slate-950 text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden min-h-[440px] lg:min-h-[580px]">
          {/* Background image & gradient overlay */}
          <img
            src={gymBg}
            alt="Gym Workout"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-45 mix-blend-luminosity pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/60 pointer-events-none" />
          
          {/* Ambient blue glow inside left panel */}
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-600/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-10 -right-20 w-64 h-64 bg-blue-900/30 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="text-blue-500">
                <Dumbbell size={32} strokeWidth={2.4} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Gym<span className="text-blue-500">Pro</span>
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mt-1 pl-10">
              Train &bull; Track &bull; Transform
            </p>
          </div>

          {/* Middle Headline */}
          <div className="relative z-10 my-8 lg:my-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Build a Healthier
              <br />
              You <span className="text-blue-500">Today</span>
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-sm mt-3">
              Track your workouts, monitor your progress and achieve your fitness goals with ease.
            </p>
          </div>

          {/* Bottom Features List */}
          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-950/90 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <Users size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">Manage Members</h4>
                <p className="text-xs text-gray-400">Handle members with ease</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-950/90 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <CalendarCheck size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">Track Attendance</h4>
                <p className="text-xs text-gray-400">Keep your gym organized</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-950/90 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <TrendingUp size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">Grow Your Business</h4>
                <p className="text-xs text-gray-400">More members, more success</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Panel */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
          {/* Pill Tab Switcher: Owner / Customer */}
          <div className="inline-flex bg-gray-100 p-1.5 rounded-full w-full max-w-sm mx-auto mb-8 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setRole('owner');
                setError('');
              }}
              className={`flex-1 py-2.5 px-6 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                role === 'owner'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User size={16} />
              Owner
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('customer');
                setError('');
              }}
              className={`flex-1 py-2.5 px-6 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                role === 'customer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User size={16} />
              Customer
            </button>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {role === 'owner' ? 'Owner Login' : 'Customer Login'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {role === 'owner' ? 'Sign in to manage your gym' : 'Access your membership and payments'}
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <ErrorState message={error} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Enter email or phone"
                  className={`w-full pl-10 pr-4 py-3 bg-white border ${
                    errors.identifier ? 'border-red-500' : 'border-gray-200'
                  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  {...register('identifier')}
                />
              </div>
              {errors.identifier && (
                <p className="text-xs text-red-600 mt-1">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  className={`w-full pl-10 pr-11 py-3 bg-white border ${
                    errors.password ? 'border-red-500' : 'border-gray-200'
                  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all duration-150 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider with Forgot Password */}
          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-gray-200" />
            <Link
              to="/forgot-password"
              className="flex-shrink mx-4 text-xs sm:text-sm font-medium text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          {role === 'owner' && (
            <div className="text-center">
              <Link
                to="/register"
                className="text-xs sm:text-sm text-gray-600 hover:text-blue-600"
              >
                Don't have an account?{' '}
                <span className="text-blue-600 font-semibold hover:underline">
                  Register as Owner
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
