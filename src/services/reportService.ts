import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WeeklyReport, MonthlyReport, SharedWeeklySummary, SharedMonthlySummary } from '../types/report';
import { SadhanaEntry } from '../types/sadhana';
import { sadhanaService } from './sadhanaService';
import { attendanceService } from './attendanceService';
import { calculateWeeklyScoreAndGrade, calculateMonthlyScoreAndGrade } from '../utils/scoringEngine';
import { getWeekDetails, getMonthDetails } from '../utils/dateUtils';
import { localStorageService } from './localStorageService';
import { fastCache } from './fastCacheService';

export const reportService = {
  /**
   * Generate or fetch full detailed Weekly Report for a counselee
   */
  generateWeeklyReport: async (params: {
    userId: string;
    counseleeName: string;
    weekDateString: string; // Any date in that week (e.g. today)
    publishSharedSummary?: boolean;
    publicConsent?: boolean;
  }): Promise<WeeklyReport> => {
    const { weekId, startDate, endDate, dates } = getWeekDetails(params.weekDateString);
    const cacheKey = `weekly_report_${params.userId}_${weekId}`;
    const cached = await fastCache.get<WeeklyReport>(cacheKey);
    if (cached) return cached;

    // Fetch daily entries for all 7 days of the week
    const entries = await sadhanaService.getEntriesForDateRange(params.userId, startDate, endDate);
    const entryMap = new Map<string, SadhanaEntry>();
    entries.forEach((e) => entryMap.set(e.date, e));

    const dailyEntries: (SadhanaEntry | null)[] = dates.map((d) => entryMap.get(d) || null);

    let totalRounds = 0;
    let totalReadingMinutes = 0;
    let totalHearingMinutes = 0;
    let missingReportDays = 0;
    let onlineReadingDaysAttended = 0;
    const dailyScores: number[] = [];

    dailyEntries.forEach((entry) => {
      if (entry) {
        totalRounds += entry.completedRounds;
        totalReadingMinutes += entry.readingMinutes;
        totalHearingMinutes += entry.hearingMinutes;
        const coreDailyScore =
          (entry.japaMarks || 0) +
          (entry.readingMarks || 0) +
          (entry.hearingMarks || 0) +
          (entry.sleepMarks || 0);
        dailyScores.push(coreDailyScore);
        if (entry.onlineReadingAttended) {
          onlineReadingDaysAttended++;
        }
      } else {
        missingReportDays++;
        dailyScores.push(0); // Missing day counts as 0 in finalized weekly total
      }
    });

    const onlineReadingMarks = onlineReadingDaysAttended * 10;
    const hasAnySubmitted = entries.length > 0;

    // Fetch weekly attendance
    const attendance = await attendanceService.getWeeklyAttendanceForUser(params.userId, weekId);
    const classAttended = hasAnySubmitted ? (attendance.weeklyClass?.attended || false) : false;
    const morningAttended = hasAnySubmitted ? (attendance.morningProgramme?.attended || false) : false;

    // Calculate score out of 390 (280 daily core + 10 class + 50 morning + 50 online reading)
    const scoreCalc = hasAnySubmitted
      ? calculateWeeklyScoreAndGrade({
          dailyScores,
          weeklyClassAttended: classAttended,
          morningProgrammeAttended: morningAttended,
          onlineReadingMarks,
        })
      : {
          totalScore: 0,
          maxAvailableMarks: 390,
          percentage: 0,
          grade: 'You Are Fallen' as const,
        };

    const report: WeeklyReport = {
      userId: params.userId,
      counseleeName: params.counseleeName,
      weekId,
      startDate,
      endDate,
      dailyEntries,
      totalRounds,
      totalReadingMinutes,
      totalHearingMinutes,
      dailySadhanaScore: dailyScores.reduce((a, b) => a + b, 0),
      weeklyClassAttendance: classAttended,
      weeklyClassMarks: classAttended ? 10 : 0,
      morningProgrammeAttendance: morningAttended,
      morningProgrammeMarks: morningAttended ? 50 : 0,
      onlineReadingDaysAttended,
      onlineReadingMarks,
      totalScore: scoreCalc.totalScore,
      maxAvailableMarks: scoreCalc.maxAvailableMarks,
      percentage: scoreCalc.percentage,
      grade: scoreCalc.grade,
      missingReportDays,
    };

    // Publish/update shared summary for community viewing if requested
    if (params.publishSharedSummary !== false) {
      const summaryId = `${params.userId}_${weekId}`;
      const sharedSummary: SharedWeeklySummary = {
        id: summaryId,
        userId: params.userId,
        counseleeName: params.counseleeName,
        weekId,
        totalRounds,
        totalReadingMinutes,
        totalHearingMinutes,
        totalScore: scoreCalc.totalScore,
        maxAvailableMarks: scoreCalc.maxAvailableMarks,
        percentage: scoreCalc.percentage,
        grade: scoreCalc.grade,
        publicConsent: params.publicConsent ?? true,
      };

      await localStorageService.saveSharedWeeklySummary(sharedSummary);
      setDoc(doc(db, 'shared_weekly_summaries', summaryId), sharedSummary).catch(() => {});
    }

    await fastCache.set(cacheKey, report, 60);
    return report;
  },

  /**
   * Generate or fetch full detailed Monthly Report for a counselee
   */
  generateMonthlyReport: async (params: {
    userId: string;
    counseleeName: string;
    year: number;
    month: number;
    publicConsent?: boolean;
  }): Promise<MonthlyReport> => {
    const { monthId, monthName, dates } = getMonthDetails(params.year, params.month);
    const cacheKey = `monthly_report_${params.userId}_${monthId}`;
    const cached = await fastCache.get<MonthlyReport>(cacheKey);
    if (cached) return cached;

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const entries = await sadhanaService.getEntriesForDateRange(params.userId, startDate, endDate);
    const entryMap = new Map<string, SadhanaEntry>();
    entries.forEach((e) => entryMap.set(e.date, e));

    const dailyEntries: (SadhanaEntry | null)[] = dates.map((d) => entryMap.get(d) || null);

    let totalRounds = 0;
    let totalReadingMinutes = 0;
    let totalHearingMinutes = 0;
    let missingReportDays = 0;
    const dailyScores: number[] = [];

    dailyEntries.forEach((entry) => {
      if (entry) {
        totalRounds += entry.completedRounds;
        totalReadingMinutes += entry.readingMinutes;
        totalHearingMinutes += entry.hearingMinutes;
        dailyScores.push(entry.dailyTotalScore);
      } else {
        missingReportDays++;
        dailyScores.push(0);
      }
    });

    const hasAnySubmitted = entries.length > 0;

    // Monthly satsanga attendance (50 marks, dynamic attendance)
    const satsanga = await attendanceService.getMonthlySatsangaForUser(params.userId, monthId);
    const satsangaAttended = hasAnySubmitted ? (satsanga?.attended || false) : false;
    const isConducted = satsanga ? (satsanga.conducted !== false && satsanga.status !== 'not_conducted') : false;
    const satsangaStatus = satsanga?.status || (satsangaAttended ? 'attended' : (isConducted ? 'absent' : 'not_conducted'));

    // Dynamic weekly cycles per month based on calendar weeks
    const weekIds = Array.from(new Set(dates.map((d) => getWeekDetails(d).weekId)));
    const weeklyClassesScheduled = weekIds.length;
    const morningProgrammesScheduled = weekIds.length;

    let weeklyClassesAttended = 0;
    let morningProgrammesAttended = 0;

    if (hasAnySubmitted) {
      await Promise.all(
        weekIds.map(async (wId) => {
          const att = await attendanceService.getWeeklyAttendanceForUser(params.userId, wId);
          if (att.weeklyClass?.attended) weeklyClassesAttended++;
          if (att.morningProgramme?.attended) morningProgrammesAttended++;
        })
      );
    }

    const scoreCalc = hasAnySubmitted
      ? calculateMonthlyScoreAndGrade({
          dailyScores,
          totalDaysInMonth: dates.length,
          weeklyClassesScheduled,
          weeklyClassesAttended,
          morningProgrammesScheduled,
          morningProgrammesAttended,
          satsangaScheduled: isConducted,
          satsangaAttended,
        })
      : {
          totalScore: 0,
          maxAvailableMarks:
            dates.length * 50 +
            weeklyClassesScheduled * 10 +
            morningProgrammesScheduled * 50 +
            (isConducted ? 50 : 0),
          percentage: 0,
          grade: 'You Are Fallen' as const,
        };

    let consistencyRating: 'Consistent' | 'Improving' | 'Needs Encouragement' = 'Consistent';
    if (!hasAnySubmitted) consistencyRating = 'Needs Encouragement';
    else if (scoreCalc.percentage >= 80) consistencyRating = 'Consistent';
    else if (scoreCalc.percentage >= 60) consistencyRating = 'Improving';
    else consistencyRating = 'Needs Encouragement';

    const report: MonthlyReport = {
      userId: params.userId,
      counseleeName: params.counseleeName,
      monthId,
      monthName,
      dailyEntries,
      totalRounds,
      totalReadingMinutes,
      totalHearingMinutes,
      dailySadhanaScore: dailyScores.reduce((a, b) => a + b, 0),
      weeklyClassesScheduled,
      weeklyClassesAttended,
      weeklyClassesMarks: weeklyClassesAttended * 10,
      morningProgrammesScheduled,
      morningProgrammesAttended,
      morningProgrammesMarks: morningProgrammesAttended * 50,
      satsangaScheduled: isConducted,
      satsangaAttended,
      satsangaMarks: isConducted && satsangaAttended ? 50 : 0,
      satsangaStatus,
      totalScore: scoreCalc.totalScore,
      maxAvailableMarks: scoreCalc.maxAvailableMarks,
      percentage: scoreCalc.percentage,
      grade: scoreCalc.grade,
      missingReportDays,
      consistencyRating,
    };

    // Update shared monthly summary
    const summaryId = `${params.userId}_${monthId}`;
    const sharedSummary: SharedMonthlySummary = {
      id: summaryId,
      userId: params.userId,
      counseleeName: params.counseleeName,
      monthId,
      totalRounds,
      totalReadingMinutes,
      totalHearingMinutes,
      totalScore: scoreCalc.totalScore,
      maxAvailableMarks: scoreCalc.maxAvailableMarks,
      percentage: scoreCalc.percentage,
      grade: scoreCalc.grade,
      consistencyBadge: consistencyRating,
      publicConsent: params.publicConsent ?? true,
    };

    await localStorageService.saveSharedMonthlySummary(sharedSummary);
    setDoc(doc(db, 'shared_monthly_summaries', summaryId), sharedSummary).catch(() => {});

    await fastCache.set(cacheKey, report, 90);
    return report;
  },

  /**
   * Counselees: Fetch permitted weekly community summaries
   */
  getCommunityWeeklySummaries: async (weekId: string): Promise<SharedWeeklySummary[]> => {
    try {
      const q = query(collection(db, 'shared_weekly_summaries'), where('weekId', '==', weekId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs
          .map((d) => d.data() as SharedWeeklySummary)
          .filter((s) => s.publicConsent !== false);
      }
    } catch (e) {
      // Fallback to local storage
    }

    const localSummaries = await localStorageService.getSharedWeeklySummaries(weekId);
    return localSummaries.filter((s) => s.publicConsent !== false);
  },

  /**
   * Counselees: Fetch permitted monthly community summaries
   */
  getCommunityMonthlySummaries: async (monthId: string): Promise<SharedMonthlySummary[]> => {
    try {
      const q = query(collection(db, 'shared_monthly_summaries'), where('monthId', '==', monthId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs
          .map((d) => d.data() as SharedMonthlySummary)
          .filter((s) => s.publicConsent !== false);
      }
    } catch (e) {
      // Fallback to local storage
    }

    const localSummaries = await localStorageService.getSharedMonthlySummaries(monthId);
    return localSummaries.filter((s) => s.publicConsent !== false);
  },
};
