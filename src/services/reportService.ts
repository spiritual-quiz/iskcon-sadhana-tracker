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
import { SadhanaEntry, Grade } from '../types/sadhana';
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
    forceRefresh?: boolean;
  }): Promise<WeeklyReport> => {
    const { weekId, startDate, endDate, dates } = getWeekDetails(params.weekDateString);
    const cacheKey = `weekly_report_${params.userId}_${weekId}`;
    if (!params.forceRefresh) {
      const cached = await fastCache.get<WeeklyReport>(cacheKey);
      if (cached) return cached;
    }

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
        // Daily total score up to 50 (core 40 + online reading 10)
        dailyScores.push(entry.dailyTotalScore || 0);
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

    // Fetch weekly attendance (morning programme: 50 marks, weekly service: 10 marks)
    const attendance = await attendanceService.getWeeklyAttendanceForUser(params.userId, weekId);
    const morningAttended = hasAnySubmitted ? (attendance.morningProgramme?.attended || false) : false;
    const serviceAttended = hasAnySubmitted ? (attendance.service?.attended || false) : false;
    const classAttended = hasAnySubmitted ? (attendance.weeklyClass?.attended || false) : false;

    // Strictly 410 marks: 7 * 50 (350 daily) + 50 (morning prog) + 10 (weekly service) = 410
    const scoreCalc = hasAnySubmitted
      ? calculateWeeklyScoreAndGrade({
          dailyScores,
          morningProgrammeAttended: morningAttended,
          serviceAttended: serviceAttended,
        })
      : {
          totalScore: 0,
          maxAvailableMarks: 410,
          percentage: 0,
          grade: ('Card Pending' as any) as Grade,
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
      weeklyServiceAttendance: serviceAttended,
      weeklyServiceMarks: serviceAttended ? 10 : 0,
      onlineReadingDaysAttended,
      onlineReadingMarks,
      totalScore: scoreCalc.totalScore,
      maxAvailableMarks: 410,
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
        onlineReadingDaysAttended,
        onlineReadingMarks,
        morningProgrammeAttendance: morningAttended,
        weeklyServiceAttendance: serviceAttended,
        totalScore: scoreCalc.totalScore,
        maxAvailableMarks: 410,
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

    // Count weekdays (Mon-Fri @ 50) and weekends (Sat-Sun @ 40)
    let weekdaysCount = 0;
    let weekendDaysCount = 0;

    dates.forEach((d) => {
      const dayOfWeek = new Date(d + 'T12:00:00Z').getUTCDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        weekdaysCount++;
      } else {
        weekendDaysCount++;
      }
    });

    const maxDailyMarks = weekdaysCount * 50 + weekendDaysCount * 40;

    dailyEntries.forEach((entry) => {
      if (entry) {
        totalRounds += entry.completedRounds;
        totalReadingMinutes += entry.readingMinutes;
        totalHearingMinutes += entry.hearingMinutes;
        dailyScores.push(entry.dailyTotalScore || 0);
      } else {
        missingReportDays++;
        dailyScores.push(0);
      }
    });

    const hasAnySubmitted = entries.length > 0;

    // Monthly satsanga attendance (50 marks, dynamic attendance)
    const satsanga = await attendanceService.getMonthlySatsangaForUser(params.userId, monthId);
    const satsangaAttended = hasAnySubmitted ? (satsanga?.attended || false) : false;
    const isSatsangaConducted = satsanga ? (satsanga.conducted !== false && satsanga.status !== 'not_conducted') : true;
    const satsangaStatus = satsanga?.status || (satsangaAttended ? 'attended' : (isSatsangaConducted ? 'absent' : 'not_conducted'));

    // Monthly counsellor meeting attendance (50 marks, monthly meeting with counsellor)
    const meeting = await attendanceService.getMonthlyMeetingForUser(params.userId, monthId);
    const meetingAttended = hasAnySubmitted ? (meeting?.attended || false) : false;
    const isMeetingConducted = meeting ? (meeting.conducted !== false && meeting.status !== 'not_conducted') : true;
    const meetingStatus = meeting?.status || (meetingAttended ? 'attended' : (isMeetingConducted ? 'absent' : 'not_conducted'));

    // Dynamic weekly cycles per month based on calendar weeks
    const weekIds = Array.from(new Set(dates.map((d) => getWeekDetails(d).weekId)));
    const weeklyCyclesScheduled = weekIds.length;
    const morningProgrammesScheduled = weeklyCyclesScheduled;
    const weeklyServicesScheduled = weeklyCyclesScheduled;

    let morningProgrammesAttended = 0;
    let weeklyServicesAttended = 0;

    if (hasAnySubmitted) {
      await Promise.all(
        weekIds.map(async (wId) => {
          const att = await attendanceService.getWeeklyAttendanceForUser(params.userId, wId);
          if (att.morningProgramme?.attended) morningProgrammesAttended++;
          if (att.service?.attended) weeklyServicesAttended++;
        })
      );
    }

    const scoreCalc = hasAnySubmitted
      ? calculateMonthlyScoreAndGrade({
          dailyScores,
          weekdaysCount,
          weekendDaysCount,
          weeklyCyclesScheduled,
          morningProgrammesAttended,
          weeklyServicesAttended,
          satsangaScheduled: isSatsangaConducted,
          satsangaAttended,
          counsellorMeetingScheduled: isMeetingConducted,
          counsellorMeetingAttended: meetingAttended,
        })
      : {
          totalScore: 0,
          maxAvailableMarks:
            maxDailyMarks +
            weeklyCyclesScheduled * 60 +
            (isSatsangaConducted ? 50 : 0) +
            (isMeetingConducted ? 50 : 0),
          percentage: 0,
          grade: ('Card Pending' as any) as Grade,
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
      startDate,
      endDate,
      dailyEntries,
      totalRounds,
      totalReadingMinutes,
      totalHearingMinutes,
      weekdaysCount,
      weekendDaysCount,
      maxDailyMarks,
      dailySadhanaScore: dailyScores.reduce((a, b) => a + b, 0),
      weeklyCyclesScheduled,
      weeklyClassesScheduled: weeklyCyclesScheduled,
      weeklyClassesAttended: weeklyServicesAttended,
      weeklyClassesMarks: weeklyServicesAttended * 10,
      morningProgrammesScheduled,
      morningProgrammesAttended,
      morningProgrammesMarks: morningProgrammesAttended * 50,
      weeklyServicesScheduled,
      weeklyServicesAttended,
      weeklyServicesMarks: weeklyServicesAttended * 10,
      satsangaScheduled: isSatsangaConducted,
      satsangaAttended,
      satsangaMarks: isSatsangaConducted && satsangaAttended ? 50 : 0,
      satsangaStatus,
      counsellorMeetingScheduled: isMeetingConducted,
      counsellorMeetingAttended: meetingAttended,
      counsellorMeetingMarks: isMeetingConducted && meetingAttended ? 50 : 0,
      counsellorMeetingStatus: meetingStatus,
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
  getCommunityWeeklySummaries: async (weekId: string, forceRefresh = false): Promise<SharedWeeklySummary[]> => {
    if (!forceRefresh) {
      const cached = await fastCache.get<SharedWeeklySummary[]>(`community_summaries_${weekId}`);
      if (cached && cached.length > 0) return cached;
    }

    try {
      const q = query(collection(db, 'shared_weekly_summaries'), where('weekId', '==', weekId));
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      if (!snap.empty) {
        const results = snap.docs
          .map((d) => {
            const s = d.data() as SharedWeeklySummary;
            return {
              ...s,
              maxAvailableMarks: 410,
              percentage: Number(((s.totalScore / 410) * 100).toFixed(1)),
            };
          })
          .filter((s) => s && s.publicConsent !== false);
        await Promise.all(results.map((s) => localStorageService.saveSharedWeeklySummary(s)));
        await fastCache.set(`community_summaries_${weekId}`, results, 30);
        return results;
      }
    } catch (e) {
      // Fallback to local storage
    }

    const localSummaries = await localStorageService.getSharedWeeklySummaries(weekId);
    return localSummaries
      .filter((s) => s.publicConsent !== false)
      .map((s) => ({
        ...s,
        maxAvailableMarks: 410,
        percentage: Number(((s.totalScore / 410) * 100).toFixed(1)),
      }));
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
