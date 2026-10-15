export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface AuditRecord {
  timestamp: string; // ISO string
  modifiedBy: string; // UID
  previousValues: Record<string, any>;
  reason?: string;
}

export interface SadhanaEntry {
  id: string; // `${userId}_${date}`
  userId: string;
  counseleeName?: string;
  date: string; // YYYY-MM-DD (Asia/Kolkata timezone)
  
  // A. Japa - Chanting
  declaredRounds: number;
  completedRounds: number;
  completionTimeStr?: string; // HH:mm format, e.g. "06:45"
  japaMarks: number; // 0, 1, 3, 5, or 10
  
  // B. Reading - Srila Prabhupada's Books
  readingMinutes: number;
  readingMarks: number; // 0 to 10
  
  // C. Hearing - Spiritual audio/lectures
  hearingMinutes: number;
  hearingMarks: number; // 0 to 10
  
  // D. Sleep & Rest
  sleepTimeStr?: string; // e.g. "21:30"
  wakeUpTimeStr?: string; // e.g. "04:00"
  restMinutes: number; // daytime rest in minutes
  sleepMarks: number; // 0, 5, 8, or 10 marks
  totalSleepMinutes?: number;
  
  // E. Score Totals
  dailyTotalScore: number; // 0 to 40
  percentage: number; // 0 to 100%
  grade: Grade;
  
  // Metadata & Status
  isComplete: boolean;
  isZeroScore: boolean;
  auditHistory?: AuditRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyAttendance {
  id: string; // `${userId}_${weekId}_${type}`
  userId: string;
  weekId: string; // e.g. "2026-W41"
  type: 'weekly_class' | 'morning_programme';
  scheduledDate: string; // YYYY-MM-DD
  attended: boolean;
  marks: number; // 10 or 0
  isRecorded: boolean; // whether attendance was submitted
  updatedBy: string;
  updatedAt: string;
}

export interface MonthlySatsangaAttendance {
  id: string; // `${userId}_${monthId}`
  userId: string;
  monthId: string; // YYYY-MM
  scheduledDate: string; // YYYY-MM-DD
  attended: boolean;
  marks: number; // 10 or 0
  isRecorded: boolean;
  updatedBy: string;
  updatedAt: string;
}
