export function formatPaymentMethod(method?: string): string {
  const map: Record<string, string> = {
    CASH: 'Cash',
    UPI: 'UPI',
    BANK_TRANSFER: 'Bank Transfer',
    OTHER: 'Other',
    OFFLINE: 'Offline',
  };
  return method ? map[method] || method : '-';
}

export const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER', 'OFFLINE'] as const;
export const PAYMENT_STATUSES = ['PAID', 'PENDING', 'FAILED'] as const;
