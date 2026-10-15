import { Grade, SadhanaEntry } from './sadhana';

export interface DailyReport extends SadhanaEntry {}

export interface WeeklyReport {
  userId: string;
  counseleeName: string;
  weekId: string; // e.g. "2026-W41"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dailyEntries: (SadhanaEntry | null)[]; // 7 days (null if missing submission)
  totalRounds: number;
  totalReadingMinutes: number;
  totalHearingMinutes: number;
  dailySadhanaScore: number; // max 7 * 40 = 280
  weeklyClassAttendance: boolean;
  weeklyClassMarks: number; // 0 or 10
  morningProgrammeAttendance: boolean;
  morningProgrammeMarks: number; // 0 or 10
  totalScore: number;
  maxAvailableMarks: number; // e.g. 280 + 10 + 10 = 300
  percentage: number;
  grade: Grade;
  missingReportDays: number;
  previousWeekScore?: number;
  scoreDifference?: number;
  appreciationNote?: string;
}

export interface MonthlyReport {
  userId: string;
  counseleeName: string;
  monthId: string; // YYYY-MM
  monthName: string; // e.g. "October 2026"
  dailyEntries: (SadhanaEntry | null)[];
  totalRounds: number;
  totalReadingMinutes: number;
  totalHearingMinutes: number;
  dailySadhanaScore: number;
  weeklyClassesScheduled: number;
  weeklyClassesAttended: number;
  weeklyClassesMarks: number;
  morningProgrammesScheduled: number;
  morningProgrammesAttended: number;
  morningProgrammesMarks: number;
  satsangaScheduled: boolean;
  satsangaAttended: boolean;
  satsangaMarks: number; // 0 or 10
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
  missingReportDays: number;
  previousMonthScore?: number;
  scoreDifference?: number;
  consistencyRating: 'Consistent' | 'Improving' | 'Needs Encouragement';
}

export interface SharedWeeklySummary {
  id: string; // `${userId}_${weekId}`
  userId: string;
  counseleeName: string;
  weekId: string;
  totalRounds: number;
  totalReadingMinutes: number;
  totalHearingMinutes: number;
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
  appreciationBadge?: string;
  publicConsent: boolean;
}

export interface SharedMonthlySummary {
  id: string; // `${userId}_${monthId}`
  userId: string;
  counseleeName: string;
  monthId: string;
  totalRounds: number;
  totalReadingMinutes: number;
  totalHearingMinutes: number;
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
  consistencyBadge?: string;
  publicConsent: boolean;
}
