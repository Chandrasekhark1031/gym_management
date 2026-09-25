type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const classes: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-700',
  info: 'bg-blue-100 text-blue-800',
};

export default function Badge({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[variant]}`}>{children}</span>;
}

export function membershipBadgeVariant(status?: string): BadgeVariant {
  if (status === 'ACTIVE') return 'success';
  if (status === 'EXPIRING_SOON') return 'warning';
  if (status === 'EXPIRED') return 'danger';
  return 'neutral';
}

export function paymentBadgeVariant(status?: string): BadgeVariant {
  if (status === 'PAID') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'neutral';
}
