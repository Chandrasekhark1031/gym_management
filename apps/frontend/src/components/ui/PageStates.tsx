import { Loader2, Inbox } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600 py-8 justify-center" role="status" aria-live="polite">
      <Loader2 className="animate-spin" size={18} />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-10 px-4">
      <Inbox className="mx-auto text-gray-400 mb-3" size={32} />
      <h3 className="text-gray-800 font-medium">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm" role="alert">{message}</div>;
}
