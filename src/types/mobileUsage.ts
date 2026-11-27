export type TimeSlot = 'night' | 'morning' | 'afternoon' | 'evening';

export interface AppSession {
  appName: string;
  packageName: string;
  startTime: number; // Unix timestamp ms
  endTime: number;   // Unix timestamp ms
  durationMinutes: number;
  timeSlot: TimeSlot;
  startTimeFormatted: string; // e.g. "11:00 AM"
  endTimeFormatted: string;   // e.g. "12:00 PM"
}

export interface AppUsageSummary {
  appName: string;
  packageName: string;
  iconName: string;
  iconColor: string;
  totalMinutes: number;
  percentage: number; // 0 - 100
  sessionsCount: number;
  sessions: AppSession[];
  category: 'social' | 'video' | 'browser' | 'chat' | 'utility' | 'other';
}

export interface DailyMobileUsageRecord {
  id: string; // `${uid}_${date}`
  uid: string;
  counseleeName: string;
  counseleeEmail?: string;
  counseleePhone?: string;
  date: string; // YYYY-MM-DD
  totalScreenMinutes: number;
  nightUsageMinutes: number; // 10:00 PM to 4:00 AM
  nightSessions: AppSession[];
  hasLateNightActivity: boolean; // true if nightUsageMinutes > 5
  apps: AppUsageSummary[];
  hourlyUsage: number[]; // 24 values: index 0 (12 AM-1 AM) to index 23 (11 PM-12 AM)
  syncedAt: string; // ISO timestamp
  permissionGranted: boolean;
}

export interface CounseleeUsageSummaryCard {
  uid: string;
  counseleeName: string;
  permissionGranted: boolean;
  totalScreenMinutes: number;
  nightUsageMinutes: number;
  hasLateNightActivity: boolean;
  topApps: {
    appName: string;
    iconName: string;
    iconColor: string;
    minutes: number;
    percentage: number;
    sessionsCount: number;
  }[];
  allSessions: AppSession[];
  hourlyUsage: number[];
  lastSyncedAt?: string;
}
