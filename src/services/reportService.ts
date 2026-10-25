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

    // Fetch weekly attendance
    const attendance = await attendanceService.getWeeklyAttendanceForUser(params.userId, weekId);
    const classAttended = attendance.weeklyClass?.attended || false;
    const morningAttended = attendance.morningProgramme?.attended || false;

    // Calculate score out of 350 (280 daily + 10 class + 10 morning + 50 online reading)
    const scoreCalc = calculateWeeklyScoreAndGrade({
      dailyScores,
      weeklyClassAttended: classAttended,
      morningProgrammeAttended: morningAttended,
      onlineReadingMarks,
    });

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
      morningProgrammeMarks: morningAttended ? 10 : 0,
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

      try {
        await setDoc(doc(db, 'shared_weekly_summaries', summaryId), sharedSummary);
      } catch (e) {
        console.warn('Firestore shared_weekly_summaries write fallback:', e);
      }
    }

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

    // Monthly satsanga attendance (50 marks, dynamic attendance)
    const satsanga = await attendanceService.getMonthlySatsangaForUser(params.userId, monthId);
    const satsangaAttended = satsanga?.attended || false;
    const isConducted = satsanga ? (satsanga.conducted !== false && satsanga.status !== 'not_conducted') : true;
    const satsangaStatus = satsanga?.status || (satsangaAttended ? 'attended' : (isConducted ? 'absent' : 'not_conducted'));

    // Approximate 4 weekly cycles per month
    const weeklyClassesScheduled = 4;
    const weeklyClassesAttended = 3;
    const morningProgrammesScheduled = 4;
    const morningProgrammesAttended = 3;

    const scoreCalc = calculateMonthlyScoreAndGrade({
      dailyScores,
      totalDaysInMonth: dates.length,
      weeklyClassesScheduled,
      weeklyClassesAttended,
      morningProgrammesScheduled,
      morningProgrammesAttended,
      satsangaScheduled: isConducted,
      satsangaAttended,
    });

    let consistencyRating: 'Consistent' | 'Improving' | 'Needs Encouragement' = 'Consistent';
    if (scoreCalc.percentage >= 80) consistencyRating = 'Consistent';
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
      morningProgrammesMarks: morningProgrammesAttended * 10,
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

    try {
      await setDoc(doc(db, 'shared_monthly_summaries', summaryId), sharedSummary);
    } catch (e) {
      console.warn('Firestore shared_monthly_summaries write fallback:', e);
    }

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
