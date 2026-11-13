export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'employee';
  positionId?: string;
  dailyRate?: number;
  phone?: string;
  joinedDate?: string;
  avatarUrl?: string;
}

export interface Position {
  id: string;
  title: string;
  department: string;
  baseDailyRate: number;
}

export interface WorkSetting {
  id: string;
  workStart: string; // e.g., "08:00"
  workEnd: string; // e.g., "17:00"
  lateToleranceMinutes: number; // e.g., 15
  workDays: string; // e.g., "Monday - Friday"
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Early Leave';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  date: string; // "YYYY-MM-DD"
  clockInTime?: string; // "HH:mm:ss"
  clockInSelfieUrl?: string;
  clockInLocation?: string;
  clockOutTime?: string; // "HH:mm:ss"
  clockOutSelfieUrl?: string;
  clockOutLocation?: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  month: string; // "YYYY-MM"
  totalDaysPresent: number;
  dailyRate: number;
  totalAmount: number;
  status: 'Draft' | 'Paid';
  generatedAt: string;
}
