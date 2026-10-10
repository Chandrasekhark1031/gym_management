import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../services/authService';
import AuthCard from '../../components/ui/AuthCard';
import Button from '../../components/ui/Button';
import { Input, PasswordInput } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/PageStates';

const schema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    gymName: z.string().min(2, 'Gym name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    address: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must include letters')
      .regex(/\d/, 'Password must include numbers'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setSuccess('');
    try {
      const response = await authService.register(data);
      setSuccess(response.message || 'Owner registration successful. You can now login.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <AuthCard
      title="Create your owner account."
      subtitle="Set up your gym, then create login accounts for your customers."
      footer={
        <Link to="/login" className="text-sm text-[#174b40] hover:underline">
          Already an owner? Log in
        </Link>
      }
    >
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 text-green-700 p-3 text-sm">
          {success}
        </div>
      )}
      {serverError && (
        <div className="mb-4">
          <ErrorState message={serverError} />
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full Name *" error={errors.name?.message} {...register('name')} />
        <Input label="Gym Name *" error={errors.gymName?.message} {...register('gymName')} />
        <Input label="Email *" type="email" autoComplete="username" error={errors.email?.message} {...register('email')} />
        <Input label="Phone Number *" type="tel" inputMode="numeric" maxLength={10} error={errors.phone?.message} {...register('phone')} />
        <Input label="Gym Address" error={errors.address?.message} {...register('address')} />
        <PasswordInput label="Password *" autoComplete="new-password" hint="Use 8+ characters with letters and numbers." error={errors.password?.message} {...register('password')} />
        <PasswordInput
          label="Confirm Password *" autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create owner account
        </Button>
      </form>
    </AuthCard>
  );
}
