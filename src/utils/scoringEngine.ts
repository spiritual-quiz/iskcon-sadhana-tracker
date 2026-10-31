import { Grade } from '../types/sadhana';
import { SCORING_RULES } from '../constants/scoring';
import { calculateSleepDurationMinutes } from './dateUtils';

export interface SadhanaInput {
  declaredRounds: number;
  completedRounds: number;
  completionTimeStr?: string; // HH:mm format (24-hour)
  readingMinutes: number;
  hearingMinutes: number;
  sleepTimeStr?: string;
  wakeUpTimeStr?: string;
  restMinutes?: number;
  onlineReadingAttended?: boolean;
  morningProgrammeAttended?: boolean; // Weekly morning programme (50 marks)
  serviceAttended?: boolean; // Weekly service (10 marks)
  monthlyMeetingAttended?: boolean; // Monthly meeting with counsellor (50 marks)
}

export interface CalculatedSadhanaScore {
  japaMarks: number;
  readingMarks: number;
  hearingMarks: number;
  sleepMarks: number;
  onlineReadingMarks: number; // 0 or 10 (Monday to Friday)
  morningProgrammeMarks: number; // 0 or 50 (Weekly morning programme)
  serviceMarks: number; // 0 or 10 (Weekly service)
  monthlyMeetingMarks: number; // 0 or 50 (Monthly meeting with counsellor)
  totalRestMinutes: number;
  dailyTotalScore: number;
  percentage: number;
  grade: Grade;
  isComplete: boolean;
  isZeroScore: boolean;
  validationErrors: string[];
}

/**
 * Calculates Japa marks strictly adhering to the prompt rules:
 * - Completed rounds must reach or exceed declared commitment (otherwise 0 marks).
 * - Time brackets (Asia/Kolkata):
 *   - Completed on or before 7:30 AM (<= 07:30): 10 marks
 *   - 7:31 AM to 10:00 AM: 5 marks
 *   - 10:01 AM to 1:00 PM: 3 marks
 *   - 1:01 PM to 7:00 PM: 1 mark
 *   - After 7:00 PM: 0 marks
 */
export function calculateJapaMarks(
  declaredRounds: number,
  completedRounds: number,
  completionTimeStr?: string
): { marks: number; isHonored: boolean; reason: string } {
  if (declaredRounds <= 0) {
    return { marks: 0, isHonored: false, reason: 'Declared commitment must be greater than 0' };
  }

  if (completedRounds < declaredRounds) {
    return {
      marks: 0,
      isHonored: false,
      reason: `Chanted ${completedRounds}/${declaredRounds} rounds (commitment not completed: 0 marks)`,
    };
  }

  if (!completionTimeStr || !completionTimeStr.includes(':')) {
    return { marks: 0, isHonored: false, reason: 'Completion time missing' };
  }

  const [hours, minutes] = completionTimeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return { marks: 0, isHonored: false, reason: 'Invalid completion time format' };
  }

  const totalMinutes = hours * 60 + minutes;

  // On or before 7:30 AM (<= 7:30): 7 * 60 + 30 = 450 minutes -> 10 marks
  if (totalMinutes <= 450) {
    return { marks: 10, isHonored: true, reason: 'Completed on or before 7:30 AM (10 marks)' };
  }

  // 7:31 AM to 10:00 AM: 10 * 60 = 600 minutes -> 5 marks
  if (totalMinutes <= 600) {
    return { marks: 5, isHonored: true, reason: 'Completed between 7:31 AM and 10:00 AM (5 marks)' };
  }

  // 10:01 AM to before 1:00 PM: 13 * 60 = 780 minutes -> 3 marks
  if (totalMinutes < 780) {
    return { marks: 3, isHonored: true, reason: 'Completed between 10:01 AM and before 1:00 PM (3 marks)' };
  }

  // 1:00 PM to 7:00 PM: 19 * 60 = 1140 minutes -> 1 mark
  if (totalMinutes <= 1140) {
    return { marks: 1, isHonored: true, reason: 'Completed between 1:00 PM and 7:00 PM (1 mark)' };
  }

  // After 7:00 PM -> 0 marks
  return { marks: 0, isHonored: true, reason: 'Completed after 7:00 PM (0 marks)' };
}

/**
 * Calculates Srila Prabhupada book reading marks:
 * min(10, (minutes / 30) * 10)
 */
export function calculateReadingMarks(minutes: number): number {
  if (minutes <= 0) return 0;
  const rawMarks = (minutes / 30) * 10;
  const clamped = Math.min(10, rawMarks);
  return Number(clamped.toFixed(2));
}

/**
 * Calculates Spiritual hearing marks:
 * min(10, (minutes / 30) * 10)
 */
export function calculateHearingMarks(minutes: number): number {
  if (minutes <= 0) return 0;
  const rawMarks = (minutes / 30) * 10;
  const clamped = Math.min(10, rawMarks);
  return Number(clamped.toFixed(2));
}

/**
 * Calculates Sleep & Rest marks adhering to rules:
 * - Sleep time base marks (6.5 hours / 390 mins baseline):
 *   - <= 9:30 PM (21:30): 10 marks
 *   - <= 10:00 PM (22:00): 8 marks
 *   - <= 10:30 PM (22:30): 5 marks
 *   - <= 11:00 PM (23:00): 2 marks
 *   - After 11:00 PM (or past midnight): 0 marks (even if 6.5 hours slept)
 * - Excess rest deduction:
 *   - If sleeping more than 6.5 hours, deduct 2 marks for every half-hour (30 mins) in excess.
 */
export function calculateSleepMarks(
  totalMinutes: number,
  sleepTimeStr?: string
): {
  marks: number;
  hours: number;
  reason: string;
} {
  if (totalMinutes <= 0) {
    return { marks: 0, hours: 0, reason: 'No rest or sleep recorded' };
  }
  const hours = Number((totalMinutes / 60).toFixed(2));

  // Determine base marks from sleep time
  let baseMarks = 10;
  let bedtimeLabel = '';

  if (sleepTimeStr && sleepTimeStr.includes(':')) {
    const [h, m] = sleepTimeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      if (h < 12) {
        // Bedtime in the morning/past midnight (e.g. 00:30, 01:00) is after 11:00 PM
        baseMarks = 0;
        bedtimeLabel = 'Bedtime after 11:00 PM (0 base)';
      } else {
        const bedMinutes = h * 60 + m;
        if (bedMinutes <= 21 * 60 + 30) {
          baseMarks = 10;
          bedtimeLabel = 'Bedtime ≤ 9:30 PM (10 base)';
        } else if (bedMinutes <= 22 * 60) {
          baseMarks = 8;
          bedtimeLabel = 'Bedtime ≤ 10:00 PM (8 base)';
        } else if (bedMinutes <= 22 * 60 + 30) {
          baseMarks = 5;
          bedtimeLabel = 'Bedtime ≤ 10:30 PM (5 base)';
        } else if (bedMinutes <= 23 * 60) {
          baseMarks = 2;
          bedtimeLabel = 'Bedtime ≤ 11:00 PM (2 base)';
        } else {
          baseMarks = 0;
          bedtimeLabel = 'Bedtime after 11:00 PM (0 base)';
        }
      }
    }
  }

  // Duration target: 6h 30m = 390 minutes
  let deduction = 0;
  if (totalMinutes > 390) {
    const excessMinutes = totalMinutes - 390;
    const excessHalfHours = Math.ceil(excessMinutes / 30);
    deduction = excessHalfHours * 2;
  }

  const finalMarks = Math.max(0, baseMarks - deduction);
  const deductionNote = deduction > 0 ? `, -${deduction} excess sleep penalty` : '';

  return {
    marks: finalMarks,
    hours,
    reason: `${bedtimeLabel ? bedtimeLabel + ', ' : ''}${hours}h rest${deductionNote} (${finalMarks} marks)`,
  };
}

/**
 * Calculates Spiritual Status Message from percentage:
 * 100%: Advancing
 * 80–99%: Good, Please Improve
 * 60–79%: Your Sādhana Is at Risk
 * 40–59%: Māyā Is Distracting You
 * 20–39%: You Are in Māyā
 * 0–19%: You Are Fallen
 */
export function calculateGrade(percentage: number): Grade {
  if (percentage >= 100.0) return 'Advancing';
  if (percentage >= 80.0) return 'Good, Please Improve';
  if (percentage >= 60.0) return 'Your Bhakti Is at Risk';
  if (percentage >= 40.0) return 'Māyā Is Distracting You';
  if (percentage >= 20.0) return 'You Are in Māyā';
  return 'You Are Fallen';
}

/**
 * Evaluates a complete daily sadhana entry with 40-mark scale:
 * 10 Japa + 10 Reading + 10 Hearing + 10 Sleep/Rest
 */
export function evaluateDailySadhana(input: SadhanaInput): CalculatedSadhanaScore {
  const errors: string[] = [];

  if (input.declaredRounds <= 0) {
    errors.push('Declared round commitment must be at least 1 round.');
  }

  if (input.completedRounds < 0) {
    errors.push('Completed rounds cannot be negative.');
  }

  if (input.readingMinutes < 0) {
    errors.push('Reading duration cannot be negative.');
  }

  if (input.hearingMinutes < 0) {
    errors.push('Hearing duration cannot be negative.');
  }

  const japaResult = calculateJapaMarks(
    input.declaredRounds,
    input.completedRounds,
    input.completionTimeStr
  );

  const readingMarks = calculateReadingMarks(input.readingMinutes);
  const hearingMarks = calculateHearingMarks(input.hearingMinutes);

  let nightSleepMinutes = 0;
  if (input.sleepTimeStr && input.wakeUpTimeStr) {
    nightSleepMinutes = calculateSleepDurationMinutes(input.sleepTimeStr, input.wakeUpTimeStr);
  }
  const totalRestMinutes = nightSleepMinutes + (input.restMinutes || 0);
  const sleepResult = calculateSleepMarks(totalRestMinutes, input.sleepTimeStr);

  const onlineReadingMarks = input.onlineReadingAttended ? 10 : 0;
  const morningProgrammeMarks = input.morningProgrammeAttended ? 50 : 0;
  const serviceMarks = input.serviceAttended ? 10 : 0;
  const monthlyMeetingMarks = input.monthlyMeetingAttended ? 50 : 0;

  const dailyTotalScore = Number(
    (japaResult.marks + readingMarks + hearingMarks + sleepResult.marks + onlineReadingMarks).toFixed(2)
  );
  const maxScore = SCORING_RULES.maxDailyScore; // 50 marks
  const percentage = Number(((dailyTotalScore / maxScore) * 100).toFixed(1));
  const grade = calculateGrade(percentage);

  const isComplete =
    input.completedRounds > 0 ||
    input.readingMinutes > 0 ||
    input.hearingMinutes > 0 ||
    totalRestMinutes > 0 ||
    !!input.onlineReadingAttended ||
    !!input.morningProgrammeAttended ||
    !!input.serviceAttended ||
    !!input.monthlyMeetingAttended;
  const isZeroScore = dailyTotalScore === 0;

  return {
    japaMarks: japaResult.marks,
    readingMarks,
    hearingMarks,
    sleepMarks: sleepResult.marks,
    onlineReadingMarks,
    morningProgrammeMarks,
    serviceMarks,
    monthlyMeetingMarks,
    totalRestMinutes,
    dailyTotalScore,
    percentage,
    grade,
    isComplete,
    isZeroScore,
    validationErrors: errors,
  };
}

/**
 * Calculates weekly total score and grade:
 * 7 days * 50 (Monday to Sunday daily score) = 350
 * + Weekly Morning Programme (50 marks)
 * + Weekly Service (10 marks)
 * Calculation: 350 + 50 + 10 = strictly 410 max marks
 */
export function calculateWeeklyScoreAndGrade(params: {
  dailyScores: number[]; // up to 7 scores (0 to 50 each)
  morningProgrammeAttended: boolean;
  serviceAttended?: boolean;
  weeklyClassAttended?: boolean; // backwards compatibility / weekly service alias
  onlineReadingMarks?: number; // backwards compatibility
}): {
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
} {
  const dailyTotal = params.dailyScores.reduce((sum, s) => sum + s, 0);
  const morningMarks = params.morningProgrammeAttended ? 50 : 0;
  const serviceMarks = (params.serviceAttended || params.weeklyClassAttended) ? 10 : 0;

  const totalScore = Number((dailyTotal + morningMarks + serviceMarks).toFixed(2));
  const maxAvailableMarks = 410; // 7 * 50 (350) + 50 morning + 10 service = 410
  const percentage = Number(((totalScore / maxAvailableMarks) * 100).toFixed(1));
  const grade = calculateGrade(percentage);

  return {
    totalScore,
    maxAvailableMarks,
    percentage,
    grade,
  };
}

/**
 * Calculates monthly score and grade dynamically based on calendar month:
 * - Monday to Friday (weekdays): up to 50 marks daily (includes online reading)
 * - Saturday & Sunday (weekends): up to 40 marks daily (online reading not held)
 * - Weekly Morning Programme: 50 marks per week
 * - Weekly Service: 10 marks per week
 * - Monthly Satsanga: 50 marks
 * - Monthly Counsellor Meeting: 50 marks
 * Dynamic Max = (weekdays * 50) + (weekends * 40) + (weeklyCycles * 60) + 50 + 50
 */
export function calculateMonthlyScoreAndGrade(params: {
  dailyScores: number[]; // all days of the month (1st to last day)
  weekdaysCount?: number; // Mon to Fri count
  weekendDaysCount?: number; // Sat & Sun count
  weeklyCyclesScheduled?: number;
  morningProgrammesAttended: number;
  weeklyServicesAttended?: number;
  satsangaScheduled: boolean;
  satsangaAttended: boolean;
  counsellorMeetingScheduled?: boolean;
  counsellorMeetingAttended?: boolean;
  // Legacy params for backwards compatibility
  totalDaysInMonth?: number;
  weeklyClassesScheduled?: number;
  weeklyClassesAttended?: number;
  morningProgrammesScheduled?: number;
  onlineReadingMarks?: number;
}): {
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
} {
  const dailyTotal = params.dailyScores.reduce((sum, s) => sum + s, 0);
  const morningMarks = params.morningProgrammesAttended * 50;
  const servicesAttended = params.weeklyServicesAttended ?? params.weeklyClassesAttended ?? 0;
  const serviceMarks = servicesAttended * 10;
  const satsangaMarks = params.satsangaScheduled && params.satsangaAttended ? 50 : 0;
  const meetingScheduled = params.counsellorMeetingScheduled ?? false;
  const meetingMarks = meetingScheduled && params.counsellorMeetingAttended ? 50 : 0;

  const totalScore = Number((dailyTotal + morningMarks + serviceMarks + satsangaMarks + meetingMarks).toFixed(2));

  let maxDailyMarks = 0;
  if (params.weekdaysCount !== undefined && params.weekendDaysCount !== undefined) {
    maxDailyMarks = (params.weekdaysCount * 50) + (params.weekendDaysCount * 40);
  } else if (params.totalDaysInMonth !== undefined) {
    maxDailyMarks = params.totalDaysInMonth * 50;
  }

  const cycles = params.weeklyCyclesScheduled ?? params.morningProgrammesScheduled ?? 0;
  const maxWeeklyMarks = cycles * 60; // 50 morning + 10 service
  const maxSatsangaMarks = params.satsangaScheduled ? 50 : 0;
  const maxMeetingMarks = meetingScheduled ? 50 : 0;

  const maxAvailableMarks = maxDailyMarks + maxWeeklyMarks + maxSatsangaMarks + maxMeetingMarks;

  const percentage = maxAvailableMarks > 0 ? Number(((totalScore / maxAvailableMarks) * 100).toFixed(1)) : 0;
  const grade = calculateGrade(percentage);

  return {
    totalScore,
    maxAvailableMarks,
    percentage,
    grade,
  };
}
