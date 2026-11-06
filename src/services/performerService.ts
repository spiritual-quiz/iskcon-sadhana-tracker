import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTodayDateStringIST, getWeekDetails } from '../utils/dateUtils';
import { SadhanaEntry } from '../types/sadhana';
import { localStorageService } from './localStorageService';
import { fastCache } from './fastCacheService';

export interface PerformerInfo {
  userId: string;
  counseleeName: string;
  score?: number;
  percentage?: number;
  grade?: string;
  timeStr?: string;
  detail?: string;
}

export interface HonoursData {
  firstToFill: PerformerInfo | null;
  dailyBest: PerformerInfo | null;
  weeklyBest: PerformerInfo | null;
  monthlyBest: PerformerInfo | null;
}

function formatTimeToIST(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    // Format to IST AM/PM
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export const performerService = {
  /**
   * Compute devotional honours: First to Fill, Daily Best, Weekly Best, and Monthly Best
   */
  getHonoursAndPerformers: async (
    dateStr?: string,
    forceRefresh = false
  ): Promise<HonoursData> => {
    const targetDate = dateStr || getTodayDateStringIST();
    const cacheKey = `honours_performers_${targetDate}`;

    if (!forceRefresh) {
      const cached = await fastCache.get<HonoursData>(cacheKey);
      if (cached) return cached;
    }

    const { startDate: weekStart, endDate: weekEnd } = getWeekDetails(targetDate);
    const monthId = targetDate.substring(0, 7);
    const monthStart = `${monthId}-01`;
    const monthEnd = `${monthId}-31`;

    let allRelevantEntries: SadhanaEntry[] = [];

    // 1. Fetch entries from Cloud Firestore with 2000ms timeout
    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('date', '>=', monthStart),
        where('date', '<=', monthEnd)
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      if (!snap.empty) {
        allRelevantEntries = snap.docs.map((d) => d.data() as SadhanaEntry);
      }
    } catch {
      // Offline fallback: load from local storage
      try {
        allRelevantEntries = await localStorageService.getAllEntriesForDateRange(monthStart, monthEnd);
      } catch {}
    }

    // A. Daily Entries
    const dailyEntries = allRelevantEntries.filter((e) => e.date === targetDate);

    // 1. Who Filled First Today
    let firstToFill: PerformerInfo | null = null;
    if (dailyEntries.length > 0) {
      // Devotees who completed and submitted
      const submitted = dailyEntries
        .filter((e) => e.counseleeName && (e.isComplete !== false || (e.percentage ?? 0) > 0))
        .sort((a, b) => {
          const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return tA - tB;
        });

      if (submitted.length > 0) {
        const first = submitted[0];
        const timeStr = formatTimeToIST(first.createdAt || first.updatedAt);
        firstToFill = {
          userId: first.userId,
          counseleeName: first.counseleeName || 'Devotee',
          score: first.dailyTotalScore,
          percentage: first.percentage,
          grade: first.grade,
          timeStr: timeStr ? `${timeStr} IST` : 'Early Morning',
          detail: `Submitted early at ${timeStr || 'morning'} (${first.percentage}% score)`,
        };
      }
    }

    // 2. Daily Best Performer
    let dailyBest: PerformerInfo | null = null;
    if (dailyEntries.length > 0) {
      const scored = dailyEntries
        .filter((e) => e.counseleeName && (e.percentage ?? 0) > 0)
        .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || (b.dailyTotalScore ?? 0) - (a.dailyTotalScore ?? 0));

      if (scored.length > 0) {
        const top = scored[0];
        dailyBest = {
          userId: top.userId,
          counseleeName: top.counseleeName || 'Devotee',
          score: top.dailyTotalScore,
          percentage: top.percentage,
          grade: top.grade,
          detail: `${top.percentage}% score (${top.dailyTotalScore} marks) • Grade ${top.grade}`,
        };
      }
    }

    // 3. Weekly Best Performer (Monday - Sunday)
    let weeklyBest: PerformerInfo | null = null;
    const weeklyEntries = allRelevantEntries.filter(
      (e) => e.date >= weekStart && e.date <= weekEnd && (e.percentage ?? 0) > 0 && e.counseleeName
    );

    if (weeklyEntries.length > 0) {
      const userWeekMap = new Map<string, { name: string; totalScore: number; sumPct: number; count: number }>();
      for (const e of weeklyEntries) {
        const existing = userWeekMap.get(e.userId) || {
          name: e.counseleeName || 'Devotee',
          totalScore: 0,
          sumPct: 0,
          count: 0,
        };
        existing.totalScore += e.dailyTotalScore || 0;
        existing.sumPct += e.percentage || 0;
        existing.count += 1;
        userWeekMap.set(e.userId, existing);
      }

      const weekRankings = Array.from(userWeekMap.entries()).map(([userId, stats]) => ({
        userId,
        counseleeName: stats.name,
        totalScore: stats.totalScore,
        avgPercentage: Math.round(stats.sumPct / stats.count),
        daysCount: stats.count,
      }));

      weekRankings.sort((a, b) => b.totalScore - a.totalScore || b.avgPercentage - a.avgPercentage);

      if (weekRankings.length > 0) {
        const topWeek = weekRankings[0];
        weeklyBest = {
          userId: topWeek.userId,
          counseleeName: topWeek.counseleeName,
          score: topWeek.totalScore,
          percentage: topWeek.avgPercentage,
          detail: `${topWeek.avgPercentage}% avg (${topWeek.totalScore} marks across ${topWeek.daysCount} days)`,
        };
      }
    }

    // 4. Monthly Best Performer
    let monthlyBest: PerformerInfo | null = null;
    const monthlyEntries = allRelevantEntries.filter(
      (e) => (e.percentage ?? 0) > 0 && e.counseleeName
    );

    if (monthlyEntries.length > 0) {
      const userMonthMap = new Map<string, { name: string; totalScore: number; sumPct: number; count: number }>();
      for (const e of monthlyEntries) {
        const existing = userMonthMap.get(e.userId) || {
          name: e.counseleeName || 'Devotee',
          totalScore: 0,
          sumPct: 0,
          count: 0,
        };
        existing.totalScore += e.dailyTotalScore || 0;
        existing.sumPct += e.percentage || 0;
        existing.count += 1;
        userMonthMap.set(e.userId, existing);
      }

      const monthRankings = Array.from(userMonthMap.entries()).map(([userId, stats]) => ({
        userId,
        counseleeName: stats.name,
        totalScore: stats.totalScore,
        avgPercentage: Math.round(stats.sumPct / stats.count),
        daysCount: stats.count,
      }));

      monthRankings.sort((a, b) => b.totalScore - a.totalScore || b.avgPercentage - a.avgPercentage);

      if (monthRankings.length > 0) {
        const topMonth = monthRankings[0];
        monthlyBest = {
          userId: topMonth.userId,
          counseleeName: topMonth.counseleeName,
          score: topMonth.totalScore,
          percentage: topMonth.avgPercentage,
          detail: `${topMonth.avgPercentage}% avg (${topMonth.totalScore} marks across ${topMonth.daysCount} days)`,
        };
      }
    }

    const result: HonoursData = {
      firstToFill,
      dailyBest,
      weeklyBest,
      monthlyBest,
    };

    // Cache briefly (30s)
    await fastCache.set(cacheKey, result, 30);
    return result;
  },
};
