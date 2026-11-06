import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  getTodayDateStringIST,
  getNowInIST,
  formatDateToString,
  getWeekDetails,
  getMonthDetails,
  formatMinutesToHours,
  calculateSleepDurationMinutes,
} from '../utils/dateUtils';
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
  highlightCategory?: string;
}

export interface CategoryChampion {
  category: 'chanting' | 'hearing' | 'reading' | 'sleep' | 'onlineReading' | 'service' | 'morningProgram';
  title: string;
  devoteeName: string;
  userId: string;
  valueStr: string;
  badge: string;
  iconName: string;
  detail: string;
}

export interface MonthlyChampionsData {
  previousMonthId: string;
  previousMonthName: string;
  currentMonthName: string;
  isFirst10Days: boolean;
  daysRemainingInHighlight: number;
  champions: {
    chanting: CategoryChampion | null;
    hearing: CategoryChampion | null;
    reading: CategoryChampion | null;
    sleep: CategoryChampion | null;
    onlineReading: CategoryChampion | null;
    service: CategoryChampion | null;
    morningProgram: CategoryChampion | null;
  };
  championsList: CategoryChampion[];
}

export interface HonoursData {
  motivationalQuote: {
    text: string;
    source: string;
  };
  // Yesterday's honours (shown the next day)
  yesterday: {
    dateStr: string;
    firstToFill: PerformerInfo | null;
    dailyBest: PerformerInfo | null;
  };
  // Last week's honours (shown next week)
  lastWeek: {
    weekRangeStr: string;
    weeklyBest: PerformerInfo | null;
    championsList: CategoryChampion[];
  };
  // Monthly category champions (e.g. October shown in November, 10 days highlight)
  monthlyChampions: MonthlyChampionsData;

  // Backward compatible properties
  firstToFill: PerformerInfo | null;
  dailyBest: PerformerInfo | null;
  weeklyBest: PerformerInfo | null;
  monthlyBest: PerformerInfo | null;
}

const MOTIVATIONAL_QUOTES = [
  {
    text: 'Whatever action an exemplary devotee performs, common people follow. Through steady sadhana and enthusiastic chanting, pure devotional service awakens.',
    source: 'Bhagavad-gita 3.21',
  },
  {
    text: 'By rising early in the morning and chanting the holy names of Krishna with attention, all obstacles in spiritual life are effortlessly conquered.',
    source: 'Srila Prabhupada',
  },
  {
    text: 'One who is steadfastly engaged in the devotional service of the Lord is very dear to Sri Krishna. Steady association elevates the entire sanga.',
    source: 'Chaitanya Charitamrita',
  },
  {
    text: 'Always remember Krishna and never forget Him. Regular sadhana, hearing, and temple service are the direct path to ecstatic pure love of Godhead.',
    source: 'Padma Purana',
  },
];

function formatTimeToIST(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
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

/**
 * Helper to compute yesterday date string in IST
 */
export function getYesterdayDateIST(referenceDateStr?: string): string {
  const ref = referenceDateStr ? new Date(referenceDateStr + 'T12:00:00Z') : getNowInIST();
  ref.setUTCDate(ref.getUTCDate() - 1);
  return formatDateToString(ref);
}

/**
 * Helper to compute last week's Monday-Sunday range
 */
export function getLastWeekRangeIST(referenceDateStr?: string): {
  startDate: string;
  endDate: string;
  weekRangeStr: string;
} {
  const today = referenceDateStr || getTodayDateStringIST();
  const currentWeek = getWeekDetails(today);
  const [y, m, d] = currentWeek.startDate.split('-').map(Number);
  const prevMonday = new Date(Date.UTC(y, m - 1, d - 7));
  const lastWeek = getWeekDetails(formatDateToString(prevMonday));
  return {
    startDate: lastWeek.startDate,
    endDate: lastWeek.endDate,
    weekRangeStr: `${lastWeek.startDate} to ${lastWeek.endDate}`,
  };
}

/**
 * Helper to compute previous calendar month details
 */
export function getPreviousMonthRangeIST(referenceDateStr?: string): {
  year: number;
  month: number;
  monthId: string;
  monthName: string;
  startDate: string;
  endDate: string;
} {
  const today = referenceDateStr || getTodayDateStringIST();
  const [y, m] = today.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 2, 1));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonth = prevDate.getUTCMonth() + 1;
  const details = getMonthDetails(prevYear, prevMonth);
  return {
    year: prevYear,
    month: prevMonth,
    monthId: details.monthId,
    monthName: details.monthName,
    startDate: details.dates[0],
    endDate: details.dates[details.dates.length - 1],
  };
}

export const performerService = {
  /**
   * Compute comprehensive devotional honours:
   * 1. Yesterday's Best Performer & First to Submit (Next Day recognition)
   * 2. Last Week's Best Performer & Category Highlights (Next Week recognition)
   * 3. Last Month's Category Champions (Chanting, Hearing, Reading, Sleep, Online Reading, Service, Morning Program)
   *    Active prominently for the first 10 days of the new month!
   */
  getHonoursAndPerformers: async (
    dateStr?: string,
    forceRefresh = false
  ): Promise<HonoursData> => {
    const targetDate = dateStr || getTodayDateStringIST();
    const cacheKey = `honours_performers_v2_${targetDate}`;

    if (!forceRefresh) {
      const cached = await fastCache.get<HonoursData>(cacheKey);
      if (cached) return cached;
    }

    const yesterdayDate = getYesterdayDateIST(targetDate);
    const lastWeek = getLastWeekRangeIST(targetDate);
    const prevMonth = getPreviousMonthRangeIST(targetDate);

    // Current month info
    const [curYear, curMonth, curDay] = targetDate.split('-').map(Number);
    const currentMonthDetails = getMonthDetails(curYear, curMonth);
    const isFirst10Days = curDay >= 1 && curDay <= 10;
    const daysRemainingInHighlight = isFirst10Days ? 10 - curDay + 1 : 0;

    // Fetch range spanning previous month start to today
    const queryStart = prevMonth.startDate;
    const queryEnd = targetDate;

    let entries: SadhanaEntry[] = [];
    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('date', '>=', queryStart),
        where('date', '<=', queryEnd)
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      if (!snap.empty) {
        entries = snap.docs.map((d) => d.data() as SadhanaEntry);
      }
    } catch {
      try {
        entries = await localStorageService.getAllEntriesForDateRange(queryStart, queryEnd);
      } catch {}
    }

    // -------------------------------------------------------------
    // 1. YESTERDAY'S HONOURS (Displayed Next Day)
    // -------------------------------------------------------------
    const yesterdayEntries = entries.filter((e) => e.date === yesterdayDate);
    let yesterdayFirstToFill: PerformerInfo | null = null;
    let yesterdayDailyBest: PerformerInfo | null = null;

    if (yesterdayEntries.length > 0) {
      // First to submit yesterday
      const submitted = yesterdayEntries
        .filter((e) => e.counseleeName && (e.isComplete !== false || (e.percentage ?? 0) > 0))
        .sort((a, b) => {
          const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return tA - tB;
        });

      if (submitted.length > 0) {
        const first = submitted[0];
        const timeStr = formatTimeToIST(first.createdAt || first.updatedAt);
        yesterdayFirstToFill = {
          userId: first.userId,
          counseleeName: first.counseleeName || 'Devotee',
          score: first.dailyTotalScore,
          percentage: first.percentage,
          grade: first.grade,
          timeStr: timeStr ? `${timeStr} IST` : 'Early Morning',
          detail: `Submitted yesterday at ${timeStr || 'morning'} (${first.percentage}% score)`,
          highlightCategory: 'First to Submit Yesterday',
        };
      }

      // Best performer yesterday
      const scored = yesterdayEntries
        .filter((e) => e.counseleeName && (e.percentage ?? 0) > 0)
        .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || (b.dailyTotalScore ?? 0) - (a.dailyTotalScore ?? 0));

      if (scored.length > 0) {
        const top = scored[0];
        yesterdayDailyBest = {
          userId: top.userId,
          counseleeName: top.counseleeName || 'Devotee',
          score: top.dailyTotalScore,
          percentage: top.percentage,
          grade: top.grade,
          detail: `${top.percentage}% score (${top.dailyTotalScore} marks) • Grade ${top.grade}`,
          highlightCategory: "Yesterday's Best Performer",
        };
      }
    }

    // Fallback: If yesterday has no entries (e.g. system just started), fallback to today
    const todayEntries = entries.filter((e) => e.date === targetDate);
    let todayFirstToFill: PerformerInfo | null = null;
    let todayDailyBest: PerformerInfo | null = null;

    if (todayEntries.length > 0) {
      const todaySubmitted = todayEntries
        .filter((e) => e.counseleeName && (e.isComplete !== false || (e.percentage ?? 0) > 0))
        .sort((a, b) => {
          const tA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return tA - tB;
        });
      if (todaySubmitted.length > 0) {
        const first = todaySubmitted[0];
        const timeStr = formatTimeToIST(first.createdAt || first.updatedAt);
        todayFirstToFill = {
          userId: first.userId,
          counseleeName: first.counseleeName || 'Devotee',
          score: first.dailyTotalScore,
          percentage: first.percentage,
          grade: first.grade,
          timeStr: timeStr ? `${timeStr} IST` : 'Early Morning',
          detail: `Submitted early at ${timeStr || 'morning'} (${first.percentage}% score)`,
        };
      }
      const todayScored = todayEntries
        .filter((e) => e.counseleeName && (e.percentage ?? 0) > 0)
        .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || (b.dailyTotalScore ?? 0) - (a.dailyTotalScore ?? 0));
      if (todayScored.length > 0) {
        const top = todayScored[0];
        todayDailyBest = {
          userId: top.userId,
          counseleeName: top.counseleeName || 'Devotee',
          score: top.dailyTotalScore,
          percentage: top.percentage,
          grade: top.grade,
          detail: `${top.percentage}% score (${top.dailyTotalScore} marks) • Grade ${top.grade}`,
        };
      }
    }

    // -------------------------------------------------------------
    // 2. LAST WEEK'S HONOURS (Displayed Next Week)
    // -------------------------------------------------------------
    const lastWeekEntries = entries.filter(
      (e) => e.date >= lastWeek.startDate && e.date <= lastWeek.endDate && e.counseleeName
    );

    let lastWeekBest: PerformerInfo | null = null;
    const lastWeekChampionsList: CategoryChampion[] = [];

    if (lastWeekEntries.length > 0) {
      const userWeekMap = new Map<
        string,
        {
          name: string;
          totalScore: number;
          sumPct: number;
          count: number;
          rounds: number;
          hearing: number;
          reading: number;
          service: number;
          morning: number;
        }
      >();

      for (const e of lastWeekEntries) {
        const existing = userWeekMap.get(e.userId) || {
          name: e.counseleeName || 'Devotee',
          totalScore: 0,
          sumPct: 0,
          count: 0,
          rounds: 0,
          hearing: 0,
          reading: 0,
          service: 0,
          morning: 0,
        };
        existing.totalScore += e.dailyTotalScore || 0;
        existing.sumPct += e.percentage || 0;
        existing.count += 1;
        existing.rounds += e.completedRounds || 0;
        existing.hearing += e.hearingMinutes || 0;
        existing.reading += e.readingMinutes || 0;
        if (e.serviceAttended || (e.serviceMarks || 0) > 0) existing.service += 1;
        if (e.morningProgrammeAttended || (e.morningProgrammeMarks || 0) > 0) existing.morning += 1;
        userWeekMap.set(e.userId, existing);
      }

      const weekRankings = Array.from(userWeekMap.entries()).map(([userId, stats]) => ({
        userId,
        counseleeName: stats.name,
        totalScore: stats.totalScore,
        avgPercentage: Math.round(stats.sumPct / stats.count),
        daysCount: stats.count,
        rounds: stats.rounds,
        hearing: stats.hearing,
        reading: stats.reading,
        service: stats.service,
        morning: stats.morning,
      }));

      weekRankings.sort((a, b) => b.totalScore - a.totalScore || b.avgPercentage - a.avgPercentage);

      if (weekRankings.length > 0) {
        const top = weekRankings[0];
        lastWeekBest = {
          userId: top.userId,
          counseleeName: top.counseleeName,
          score: top.totalScore,
          percentage: top.avgPercentage,
          detail: `Last Week's Champion: ${top.avgPercentage}% avg (${top.totalScore} marks across ${top.daysCount} days)`,
          highlightCategory: "Last Week's Best Performer",
        };

        // Last Week Chanting Top
        const topChanter = [...weekRankings].sort((a, b) => b.rounds - a.rounds)[0];
        if (topChanter && topChanter.rounds > 0) {
          lastWeekChampionsList.push({
            category: 'chanting',
            title: 'Last Week Most Chanting',
            devoteeName: topChanter.counseleeName,
            userId: topChanter.userId,
            valueStr: `${topChanter.rounds} Rounds`,
            badge: 'Best in Chanting',
            iconName: 'disc',
            detail: `Chanted ${topChanter.rounds} rounds last week`,
          });
        }

        // Last Week Reading Top
        const topReader = [...weekRankings].sort((a, b) => b.reading - a.reading)[0];
        if (topReader && topReader.reading > 0) {
          lastWeekChampionsList.push({
            category: 'reading',
            title: 'Last Week Most Book Reading',
            devoteeName: topReader.counseleeName,
            userId: topReader.userId,
            valueStr: formatMinutesToHours(topReader.reading),
            badge: 'Best in Reading',
            iconName: 'book',
            detail: `Read ${formatMinutesToHours(topReader.reading)} of Prabhupada's books last week`,
          });
        }

        // Last Week Hearing Top
        const topHearer = [...weekRankings].sort((a, b) => b.hearing - a.hearing)[0];
        if (topHearer && topHearer.hearing > 0) {
          lastWeekChampionsList.push({
            category: 'hearing',
            title: 'Last Week Most Hearing',
            devoteeName: topHearer.counseleeName,
            userId: topHearer.userId,
            valueStr: formatMinutesToHours(topHearer.hearing),
            badge: 'Best in Hearing',
            iconName: 'headset',
            detail: `Listened to ${formatMinutesToHours(topHearer.hearing)} of katha last week`,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 3. LAST MONTH'S CATEGORY CHAMPIONS (e.g. October shown in November for 10 days)
    // -------------------------------------------------------------
    const prevMonthEntries = entries.filter(
      (e) => e.date >= prevMonth.startDate && e.date <= prevMonth.endDate && e.counseleeName
    );

    // If previous month has entries, calculate previous month champions.
    // If not (e.g. app installed recently in November), fallback to current month entries.
    const monthTargetEntries = prevMonthEntries.length > 0 ? prevMonthEntries : entries.filter((e) => e.counseleeName);
    const monthDisplayName = prevMonthEntries.length > 0 ? prevMonth.monthName : currentMonthDetails.monthName;

    const userMonthAgg = new Map<
      string,
      {
        name: string;
        rounds: number;
        hearing: number;
        reading: number;
        totalSleepMin: number;
        sleepDays: number;
        onlineReadingCount: number;
        serviceCount: number;
        morningCount: number;
        totalScore: number;
        sumPercentage: number;
        entriesCount: number;
      }
    >();

    for (const e of monthTargetEntries) {
      const existing = userMonthAgg.get(e.userId) || {
        name: e.counseleeName || 'Devotee',
        rounds: 0,
        hearing: 0,
        reading: 0,
        totalSleepMin: 0,
        sleepDays: 0,
        onlineReadingCount: 0,
        serviceCount: 0,
        morningCount: 0,
        totalScore: 0,
        sumPercentage: 0,
        entriesCount: 0,
      };

      existing.rounds += e.completedRounds || 0;
      existing.hearing += e.hearingMinutes || 0;
      existing.reading += e.readingMinutes || 0;

      // Sleep calculation: overnight crossing + daytime rest
      const nightSleep = calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr);
      const totalSleep = nightSleep > 0 ? nightSleep + (e.restMinutes || 0) : e.totalSleepMinutes || 0;
      if (totalSleep >= 210 && totalSleep <= 720) {
        // Between 3.5 hrs and 12 hrs: realistic devotee sleep record
        existing.totalSleepMin += totalSleep;
        existing.sleepDays += 1;
      }

      if (e.onlineReadingAttended || (e.onlineReadingMarks || 0) > 0) {
        existing.onlineReadingCount += 1;
      }

      if (e.serviceAttended || (e.serviceMarks || 0) > 0) {
        existing.serviceCount += 1;
      }

      if (e.morningProgrammeAttended || (e.morningProgrammeMarks || 0) > 0) {
        existing.morningCount += 1;
      }

      existing.totalScore += e.dailyTotalScore || 0;
      existing.sumPercentage += e.percentage || 0;
      existing.entriesCount += 1;

      userMonthAgg.set(e.userId, existing);
    }

    const devoteesMonthly = Array.from(userMonthAgg.entries()).map(([userId, stats]) => {
      const avgSleepHours =
        stats.sleepDays > 0 ? Number((stats.totalSleepMin / stats.sleepDays / 60).toFixed(1)) : 8.0;
      return {
        userId,
        name: stats.name,
        rounds: stats.rounds,
        hearing: stats.hearing,
        reading: stats.reading,
        avgSleep: avgSleepHours,
        sleepDays: stats.sleepDays,
        onlineReadingCount: stats.onlineReadingCount,
        serviceCount: stats.serviceCount,
        morningCount: stats.morningCount,
        totalScore: stats.totalScore,
        avgPercentage: stats.entriesCount > 0 ? Math.round(stats.sumPercentage / stats.entriesCount) : 0,
        entriesCount: stats.entriesCount,
      };
    });

    // A. More Number of Chanting
    let chantingChamp: CategoryChampion | null = null;
    const topChanting = [...devoteesMonthly].sort((a, b) => b.rounds - a.rounds)[0];
    if (topChanting && topChanting.rounds > 0) {
      chantingChamp = {
        category: 'chanting',
        title: 'Most Chanting Rounds',
        devoteeName: topChanting.name,
        userId: topChanting.userId,
        valueStr: `${topChanting.rounds} Rounds`,
        badge: 'Best in Chanting',
        iconName: 'disc',
        detail: `Chanted ${topChanting.rounds} rounds in ${monthDisplayName}`,
      };
    }

    // B. More Hearing
    let hearingChamp: CategoryChampion | null = null;
    const topHearing = [...devoteesMonthly].sort((a, b) => b.hearing - a.hearing)[0];
    if (topHearing && topHearing.hearing > 0) {
      hearingChamp = {
        category: 'hearing',
        title: 'Most Spiritual Hearing',
        devoteeName: topHearing.name,
        userId: topHearing.userId,
        valueStr: formatMinutesToHours(topHearing.hearing),
        badge: 'Best in Hearing',
        iconName: 'headset',
        detail: `Listened to ${formatMinutesToHours(topHearing.hearing)} of lectures & kirtan`,
      };
    }

    // C. More Reading
    let readingChamp: CategoryChampion | null = null;
    const topReading = [...devoteesMonthly].sort((a, b) => b.reading - a.reading)[0];
    if (topReading && topReading.reading > 0) {
      readingChamp = {
        category: 'reading',
        title: 'Most Book Reading',
        devoteeName: topReading.name,
        userId: topReading.userId,
        valueStr: formatMinutesToHours(topReading.reading),
        badge: 'Best in Book Reading',
        iconName: 'book',
        detail: `Read ${formatMinutesToHours(topReading.reading)} of Prabhupada's books`,
      };
    }

    // D. Slept Less / Most Regulated Sleep (min 4 hrs avg, min 3 days to avoid zero bias)
    let sleepChamp: CategoryChampion | null = null;
    const eligibleSleep = devoteesMonthly.filter((d) => d.sleepDays >= 3 && d.avgSleep >= 4.0);
    eligibleSleep.sort((a, b) => a.avgSleep - b.avgSleep);
    const topSleep = eligibleSleep[0];
    if (topSleep) {
      sleepChamp = {
        category: 'sleep',
        title: 'Slept Less / Regulated Sleep',
        devoteeName: topSleep.name,
        userId: topSleep.userId,
        valueStr: `${topSleep.avgSleep} hrs/day avg`,
        badge: 'Best Regulated Sleep',
        iconName: 'alarm',
        detail: `Averaged ${topSleep.avgSleep} hrs sleep across ${topSleep.sleepDays} recorded days`,
      };
    }

    // E. More Online Reading
    let onlineChamp: CategoryChampion | null = null;
    const topOnline = [...devoteesMonthly].sort((a, b) => b.onlineReadingCount - a.onlineReadingCount)[0];
    if (topOnline && topOnline.onlineReadingCount > 0) {
      onlineChamp = {
        category: 'onlineReading',
        title: 'Most Online Reading',
        devoteeName: topOnline.name,
        userId: topOnline.userId,
        valueStr: `${topOnline.onlineReadingCount} Sessions`,
        badge: 'Best in Online Reading',
        iconName: 'laptop',
        detail: `Attended ${topOnline.onlineReadingCount} online reading sessions`,
      };
    }

    // F. More Devotional Service
    let serviceChamp: CategoryChampion | null = null;
    const topService = [...devoteesMonthly].sort((a, b) => b.serviceCount - a.serviceCount)[0];
    if (topService && topService.serviceCount > 0) {
      serviceChamp = {
        category: 'service',
        title: 'Most Practical Service',
        devoteeName: topService.name,
        userId: topService.userId,
        valueStr: `${topService.serviceCount} Seva Days`,
        badge: 'Best in Devotional Service',
        iconName: 'heart',
        detail: `Rendered ${topService.serviceCount} days of practical devotional service`,
      };
    }

    // G. More Morning Program
    let morningChamp: CategoryChampion | null = null;
    const topMorning = [...devoteesMonthly].sort((a, b) => b.morningCount - a.morningCount)[0];
    if (topMorning && topMorning.morningCount > 0) {
      morningChamp = {
        category: 'morningProgram',
        title: 'Most Morning Programs',
        devoteeName: topMorning.name,
        userId: topMorning.userId,
        valueStr: `${topMorning.morningCount} Programs`,
        badge: 'Best in Morning Program',
        iconName: 'sunny',
        detail: `Attended ${topMorning.morningCount} morning programs in the sanga`,
      };
    }

    const championsList: CategoryChampion[] = [
      chantingChamp,
      hearingChamp,
      readingChamp,
      sleepChamp,
      onlineChamp,
      serviceChamp,
      morningChamp,
    ].filter(Boolean) as CategoryChampion[];

    // Overall Monthly Best
    let monthlyBest: PerformerInfo | null = null;
    const topOverallMonth = [...devoteesMonthly].sort(
      (a, b) => b.totalScore - a.totalScore || b.avgPercentage - a.avgPercentage
    )[0];
    if (topOverallMonth && topOverallMonth.totalScore > 0) {
      monthlyBest = {
        userId: topOverallMonth.userId,
        counseleeName: topOverallMonth.name,
        score: topOverallMonth.totalScore,
        percentage: topOverallMonth.avgPercentage,
        detail: `${monthDisplayName} Champion: ${topOverallMonth.avgPercentage}% avg (${topOverallMonth.totalScore} marks)`,
        highlightCategory: `${monthDisplayName} Best Performer`,
      };
    }

    // Motivational quote selection based on day of month
    const quoteIndex = (curDay || 1) % MOTIVATIONAL_QUOTES.length;
    const motivationalQuote = MOTIVATIONAL_QUOTES[quoteIndex];

    const monthlyChampions: MonthlyChampionsData = {
      previousMonthId: prevMonth.monthId,
      previousMonthName: monthDisplayName,
      currentMonthName: currentMonthDetails.monthName,
      isFirst10Days,
      daysRemainingInHighlight,
      champions: {
        chanting: chantingChamp,
        hearing: hearingChamp,
        reading: readingChamp,
        sleep: sleepChamp,
        onlineReading: onlineChamp,
        service: serviceChamp,
        morningProgram: morningChamp,
      },
      championsList,
    };

    const result: HonoursData = {
      motivationalQuote,
      yesterday: {
        dateStr: yesterdayDate,
        firstToFill: yesterdayFirstToFill,
        dailyBest: yesterdayDailyBest,
      },
      lastWeek: {
        weekRangeStr: lastWeek.weekRangeStr,
        weeklyBest: lastWeekBest,
        championsList: lastWeekChampionsList,
      },
      monthlyChampions,
      // Backward compatible fields:
      firstToFill: yesterdayFirstToFill || todayFirstToFill,
      dailyBest: yesterdayDailyBest || todayDailyBest,
      weeklyBest: lastWeekBest,
      monthlyBest,
    };

    // Cache briefly (30s)
    await fastCache.set(cacheKey, result, 30);
    return result;
  },

  /**
   * Helper to fetch category champions specifically for a given year & month (used by monthly reports)
   */
  getMonthlyCategoryChampions: async (
    year: number,
    month: number
  ): Promise<MonthlyChampionsData> => {
    const details = getMonthDetails(year, month);
    const startDate = details.dates[0];
    const endDate = details.dates[details.dates.length - 1];

    let entries: SadhanaEntry[] = [];
    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
      ]);
      if (!snap.empty) {
        entries = snap.docs.map((d) => d.data() as SadhanaEntry);
      }
    } catch {
      try {
        entries = await localStorageService.getAllEntriesForDateRange(startDate, endDate);
      } catch {}
    }

    const todayStr = getTodayDateStringIST();
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const isFirst10Days = tD >= 1 && tD <= 10;
    const daysRemaining = isFirst10Days ? 10 - tD + 1 : 0;

    const userMonthAgg = new Map<
      string,
      {
        name: string;
        rounds: number;
        hearing: number;
        reading: number;
        totalSleepMin: number;
        sleepDays: number;
        onlineReadingCount: number;
        serviceCount: number;
        morningCount: number;
      }
    >();

    for (const e of entries) {
      if (!e.counseleeName) continue;
      const existing = userMonthAgg.get(e.userId) || {
        name: e.counseleeName,
        rounds: 0,
        hearing: 0,
        reading: 0,
        totalSleepMin: 0,
        sleepDays: 0,
        onlineReadingCount: 0,
        serviceCount: 0,
        morningCount: 0,
      };

      existing.rounds += e.completedRounds || 0;
      existing.hearing += e.hearingMinutes || 0;
      existing.reading += e.readingMinutes || 0;

      const nightSleep = calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr);
      const totalSleep = nightSleep > 0 ? nightSleep + (e.restMinutes || 0) : e.totalSleepMinutes || 0;
      if (totalSleep >= 210 && totalSleep <= 720) {
        existing.totalSleepMin += totalSleep;
        existing.sleepDays += 1;
      }

      if (e.onlineReadingAttended || (e.onlineReadingMarks || 0) > 0) existing.onlineReadingCount += 1;
      if (e.serviceAttended || (e.serviceMarks || 0) > 0) existing.serviceCount += 1;
      if (e.morningProgrammeAttended || (e.morningProgrammeMarks || 0) > 0) existing.morningCount += 1;

      userMonthAgg.set(e.userId, existing);
    }

    const devotees = Array.from(userMonthAgg.entries()).map(([userId, stats]) => {
      const avgSleep = stats.sleepDays > 0 ? Number((stats.totalSleepMin / stats.sleepDays / 60).toFixed(1)) : 8.0;
      return { userId, ...stats, avgSleep };
    });

    const topChanting = [...devotees].sort((a, b) => b.rounds - a.rounds)[0];
    const topHearing = [...devotees].sort((a, b) => b.hearing - a.hearing)[0];
    const topReading = [...devotees].sort((a, b) => b.reading - a.reading)[0];
    const eligibleSleep = devotees.filter((d) => d.sleepDays >= 3 && d.avgSleep >= 4.0).sort((a, b) => a.avgSleep - b.avgSleep);
    const topSleep = eligibleSleep[0];
    const topOnline = [...devotees].sort((a, b) => b.onlineReadingCount - a.onlineReadingCount)[0];
    const topService = [...devotees].sort((a, b) => b.serviceCount - a.serviceCount)[0];
    const topMorning = [...devotees].sort((a, b) => b.morningCount - a.morningCount)[0];

    const championsList: CategoryChampion[] = [];

    const makeChamp = (
      cat: CategoryChampion['category'],
      title: string,
      u: any,
      val: string,
      badge: string,
      icon: string,
      det: string
    ): CategoryChampion | null => {
      if (!u) return null;
      const c: CategoryChampion = {
        category: cat,
        title,
        devoteeName: u.name,
        userId: u.userId,
        valueStr: val,
        badge,
        iconName: icon,
        detail: det,
      };
      championsList.push(c);
      return c;
    };

    const chanting = topChanting && topChanting.rounds > 0 ? makeChamp('chanting', 'Most Chanting Rounds', topChanting, `${topChanting.rounds} Rounds`, 'Best in Chanting', 'disc', `Chanted ${topChanting.rounds} rounds in ${details.monthName}`) : null;
    const hearing = topHearing && topHearing.hearing > 0 ? makeChamp('hearing', 'Most Spiritual Hearing', topHearing, formatMinutesToHours(topHearing.hearing), 'Best in Hearing', 'headset', `Listened to ${formatMinutesToHours(topHearing.hearing)} of katha`) : null;
    const reading = topReading && topReading.reading > 0 ? makeChamp('reading', 'Most Book Reading', topReading, formatMinutesToHours(topReading.reading), 'Best in Book Reading', 'book', `Read ${formatMinutesToHours(topReading.reading)} of Prabhupada's books`) : null;
    const sleep = topSleep ? makeChamp('sleep', 'Slept Less / Regulated Sleep', topSleep, `${topSleep.avgSleep} hrs/day avg`, 'Best Regulated Sleep', 'alarm', `Averaged ${topSleep.avgSleep} hrs sleep across ${topSleep.sleepDays} recorded days`) : null;
    const online = topOnline && topOnline.onlineReadingCount > 0 ? makeChamp('onlineReading', 'Most Online Reading', topOnline, `${topOnline.onlineReadingCount} Sessions`, 'Best in Online Reading', 'laptop', `Attended ${topOnline.onlineReadingCount} online reading sessions`) : null;
    const service = topService && topService.serviceCount > 0 ? makeChamp('service', 'Most Devotional Service', topService, `${topService.serviceCount} Seva Days`, 'Best in Devotional Service', 'heart', `Rendered ${topService.serviceCount} days of practical seva`) : null;
    const morning = topMorning && topMorning.morningCount > 0 ? makeChamp('morningProgram', 'Most Morning Programs', topMorning, `${topMorning.morningCount} Programs`, 'Best in Morning Program', 'sunny', `Attended ${topMorning.morningCount} morning programs in the sanga`) : null;

    return {
      previousMonthId: details.monthId,
      previousMonthName: details.monthName,
      currentMonthName: details.monthName,
      isFirst10Days,
      daysRemainingInHighlight: daysRemaining,
      champions: {
        chanting,
        hearing,
        reading,
        sleep,
        onlineReading: online,
        service,
        morningProgram: morning,
      },
      championsList,
    };
  },
};
