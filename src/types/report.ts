import { Grade, SadhanaEntry, MonthlySatsangStatus, MonthlyMeetingStatus } from './sadhana';

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
  dailySadhanaScore: number; // max 7 * 50 = 350
  weeklyClassAttendance?: boolean;
  weeklyClassMarks?: number;
  morningProgrammeAttendance: boolean;
  morningProgrammeMarks: number; // 0 or 50
  weeklyServiceAttendance: boolean;
  weeklyServiceMarks: number; // 0 or 10
  onlineReadingDaysAttended: number; // 0 to 5 days (Mon to Fri)
  onlineReadingMarks: number; // 0 to 50 marks (10 marks each day)
  totalScore: number;
  maxAvailableMarks: number; // Strictly 410 (350 daily + 50 morning + 10 service)
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
  startDate: string; // YYYY-MM-01
  endDate: string; // YYYY-MM-lastDay
  dailyEntries: (SadhanaEntry | null)[];
  totalRounds: number;
  totalReadingMinutes: number;
  totalHearingMinutes: number;
  weekdaysCount: number; // Mon to Fri
  weekendDaysCount: number; // Sat & Sun
  maxDailyMarks: number; // weekdays * 50 + weekends * 40
  dailySadhanaScore: number;
  weeklyCyclesScheduled: number;
  weeklyClassesScheduled?: number;
  weeklyClassesAttended?: number;
  weeklyClassesMarks?: number;
  morningProgrammesScheduled: number;
  morningProgrammesAttended: number;
  morningProgrammesMarks: number; // 0 or 50 per week
  weeklyServicesScheduled: number;
  weeklyServicesAttended: number;
  weeklyServicesMarks: number; // 0 or 10 per week
  satsangaScheduled: boolean; // dynamic: true if conducted, false if no class held
  satsangaAttended: boolean;
  satsangaMarks: number; // 0 or 50 marks
  satsangaStatus: MonthlySatsangStatus; // 'attended' | 'absent' | 'not_conducted'
  counsellorMeetingScheduled: boolean;
  counsellorMeetingAttended: boolean;
  counsellorMeetingMarks: number; // 0 or 50 marks
  counsellorMeetingStatus: MonthlyMeetingStatus;
  totalScore: number;
  maxAvailableMarks: number; // Dynamic monthly total
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
  onlineReadingDaysAttended?: number;
  onlineReadingMarks?: number;
  morningProgrammeAttendance?: boolean;
  weeklyServiceAttendance?: boolean;
  totalScore: number;
  maxAvailableMarks: number; // 410
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
