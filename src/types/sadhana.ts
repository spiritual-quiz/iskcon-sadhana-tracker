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
  
  // E. Online Reading Session (Monday to Friday, 10 Marks each day)
  onlineReadingAttended?: boolean;
  onlineReadingMarks?: number; // 0 or 10

  // G. Service (Weekly, 10 Marks)
  serviceAttended?: boolean;
  serviceMarks?: number; // 0 or 10

  // H. Monthly Meeting with Counsellor (Monthly, 50 Marks)
  monthlyMeetingAttended?: boolean;
  monthlyMeetingMarks?: number; // 0 or 50

  // F. Score Totals
  dailyTotalScore: number; // 0 to 40 (or 50 with online reading)
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

export type MonthlySatsangStatus = 'attended' | 'absent' | 'not_conducted';

export interface MonthlySatsangaAttendance {
  id: string; // `${userId}_${monthId}`
  userId: string;
  monthId: string; // YYYY-MM
  scheduledDate: string; // YYYY-MM-DD
  attended: boolean;
  marks: number; // 50 or 0
  isRecorded: boolean;
  status?: MonthlySatsangStatus;
  conducted?: boolean;
  updatedBy: string;
  updatedAt: string;
}
