import { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  topElement?: ReactNode;
}

export default function AuthCard({ title, subtitle, children, footer, topElement }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 p-8">
        {topElement && <div className="mb-6">{topElement}</div>}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-center">{footer}</div>}
      </div>
    </div>
  );
}
