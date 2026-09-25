export type Role = 'owner' | 'customer';

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  role: Role;
  gymId?: string;
  address?: string;
  gymName?: string;
  upiId?: string;
  photoUrl?: string;
  bankCandidateName?: string;
  paymentPhone?: string;
  qrCodeUrl?: string;
  gymLogoUrl?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: string;
}

export interface Gym {
  id: string;
  ownerId: string;
  name: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address: string;
  logoUrl?: string;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  upiId: string;
  upiQrUrl?: string;
}

export interface Plan {
  id: string;
  gymId: string;
  name: string;
  duration: number;
  durationUnit: 'Days' | 'Months' | 'Years';
  price: number;
  description: string;
  features: string[];
  isActive: boolean;
}

export type PaymentStatus = 'PENDING' | 'CUSTOMER_MARKED_PAID' | 'VERIFIED' | 'REJECTED';
export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Membership {
  id: string;
  customerId: string;
  gymId: string;
  planId: string;
  planName: string;
  planPrice: number;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface Payment {
  id: string;
  membershipId: string;
  customerId: string;
  gymId: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  verifiedAt?: string;
}
