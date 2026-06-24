export type UserRole = 'admin' | 'employee';

export interface DndSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  dndModeActive: boolean; // if true, all notifications are suppressed
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  defaultShiftId: string;
  joinedDate: string;
  avatar: string;
  dndSettings: DndSettings;
  status: 'active' | 'inactive';
  employeeId?: string;
  designation?: string;
  department?: string;
  branch?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  dob?: string;
  biometrics?: {
    faceRegistered: boolean;
    faceTemplateUrl?: string;
    fingerRegistered: boolean;
    fingerprintTemplate?: string;
    cardNumber?: string;
    pinCode?: string;
  };
  weekends?: number[]; // custom weekend days [0..6] (0=Sunday)
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // "HH:MM" 24h format
  endTime: string;   // "HH:MM" 24h format
  gracePeriodMinutes: number; // minutes after start time before marked late
  color: string;     // tailwind color class prefix or hex
  overtimeAllowed?: boolean;
  overtimeMultiplier?: number;
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  name: string;
  accuracy: number; // meters
}

export interface PunchLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string; // "YYYY-MM-DD"
  punchInTime: string; // ISO string
  punchOutTime: string | null; // ISO string or null
  shiftId: string;
  shiftName: string;
  status: 'on-time' | 'late' | 'excused' | 'present' | 'absent' | 'half-day';
  punchInLocation: GPSLocation;
  punchOutLocation: GPSLocation | null;
  notified: boolean;
  dndSuppressed: boolean;
  notes: string;
  requestedHalfDay?: boolean;
  overtimeMinutes?: number;
  overtimeStatus?: 'pending' | 'approved' | 'rejected';
  overtimeNotes?: string;
}

export interface SettingsPolicy {
  weekends: number[]; // e.g. [0, 6] (0 = Sunday, 6 = Saturday)
  halfDayThresholdHours: number; // e.g. 4 hours
  halfDayAutoMark: boolean; // automatically mark if work duration under threshold
  devLoginRestricted: boolean;
  adminPasscode: string;
  overtimeEnabled?: boolean;
  standardWorkHours?: number;
  overtimeMultiplier?: number;
}

export interface NotificationLog {
  id: string;
  userId: string;
  userName: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'sms' | 'email' | 'push';
  status: 'sent' | 'suppressed';
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  name: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  location?: string;
  phone?: string;
  manager?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  geofenceRadiusMeters?: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  manager?: string;
  headOfDepartment?: string;
  costCenter?: string;
  budget?: string;
  employeeCount?: number;
}

