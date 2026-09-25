import { useToastStore } from '../../store/useToastStore';

const styles = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 w-full max-w-sm px-4" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`border rounded-lg shadow-sm p-3 text-sm ${styles[toast.type]}`}>
          <div className="flex justify-between gap-3">
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} className="text-xs underline">Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}
