
export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER'
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  PRO = 'PRO_PLUS'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NOSHOW = 'NO_SHOW'
}

export interface Organization {
  id: string;
  name: string;
  slug: string; // for custom subdomains {slug}.flowlift.co
  timezone: string;
  plan: SubscriptionPlan;
  defaultLanguage: 'en' | 'es-MX';
  bookingApprovalRequired: boolean;
  cancellationPolicyHours: number;
  logoUrl?: string;
  primaryColor?: string;
}

export interface Service {
  id: string;
  orgId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price?: number;
  isActive: boolean;
}

export interface StaffProfile {
  id: string;
  orgId: string;
  userId?: string;
  displayName: string;
  email: string;
  servicesAllowed: string[]; // Service IDs
  isActive: boolean;
}

export interface Booking {
  id: string;
  orgId: string;
  serviceId: string;
  staffId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: BookingStatus;
  createdAt: string;
}

export interface AvailabilityRule {
  id: string;
  orgId: string;
  staffId?: string; // null means business-wide
  dayOfWeek: number; // 0-6
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface I18nStrings {
  [key: string]: {
    en: string;
    'es-MX': string;
  };
}
