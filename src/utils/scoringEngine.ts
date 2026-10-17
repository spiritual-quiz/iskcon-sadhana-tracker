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
}

export interface CalculatedSadhanaScore {
  japaMarks: number;
  readingMarks: number;
  hearingMarks: number;
  sleepMarks: number;
  onlineReadingMarks: number; // 0 or 10 (Monday to Friday)
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
 * - Completed rounds must reach or exceed declared commitment.
 * - Time brackets (Asia/Kolkata):
 *   - Before 7:00 AM: 10 marks
 *   - Exactly 7:00 AM to before 10:00 AM: 5 marks
 *   - Exactly 10:00 AM to before 1:00 PM (13:00): 3 marks
 *   - Exactly 1:00 PM (13:00) or later: 1 mark
 * - Incomplete commitment: 0 marks
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
      reason: `Chanted ${completedRounds}/${declaredRounds} rounds (commitment not completed)`,
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

  // 7:00 AM is 7 * 60 = 420 minutes
  if (totalMinutes < 420) {
    return { marks: 10, isHonored: true, reason: 'Completed before 7:00 AM (10 marks)' };
  }

  // 10:00 AM is 10 * 60 = 600 minutes
  if (totalMinutes < 600) {
    return { marks: 5, isHonored: true, reason: 'Completed between 7:00 AM and 9:59 AM (5 marks)' };
  }

  // 1:00 PM is 13 * 60 = 780 minutes
  if (totalMinutes < 780) {
    return { marks: 3, isHonored: true, reason: 'Completed between 10:00 AM and 12:59 PM (3 marks)' };
  }

  // 1:00 PM or later
  return { marks: 1, isHonored: true, reason: 'Completed at 1:00 PM or later (1 mark)' };
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
 * Calculates Sleep & Rest marks adhering to user specifications:
 * - 7 hours overall: 10 marks
 * - 8 hours: 8 marks
 * - Above 8 to < 10 hours: 5 marks
 * - 10 hours or more: 0 marks
 */
export function calculateSleepMarks(totalMinutes: number): {
  marks: number;
  hours: number;
  reason: string;
} {
  if (totalMinutes <= 0) {
    return { marks: 0, hours: 0, reason: 'No rest or sleep recorded' };
  }
  const hours = Number((totalMinutes / 60).toFixed(2));

  if (hours <= 7.0) {
    return { marks: 10, hours, reason: `Optimal rest (${hours}h ≤ 7h): 10 marks` };
  }
  if (hours <= 8.0) {
    return { marks: 8, hours, reason: `Moderate rest (${hours}h ≤ 8h): 8 marks` };
  }
  if (hours < 10.0) {
    return { marks: 5, hours, reason: `High rest (${hours}h < 10h): 5 marks` };
  }
  return { marks: 0, hours, reason: `Excess rest (${hours}h ≥ 10h): 0 marks` };
}

/**
 * Calculates Grade from percentage:
 * 90%–100%: A
 * 80% to < 90%: B
 * 70% to < 80%: C
 * 60% to < 70%: D
 * Below 60%: E
 */
export function calculateGrade(percentage: number): Grade {
  if (percentage >= 90.0) return 'A';
  if (percentage >= 80.0) return 'B';
  if (percentage >= 70.0) return 'C';
  if (percentage >= 60.0) return 'D';
  return 'E';
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
  const sleepResult = calculateSleepMarks(totalRestMinutes);

  const onlineReadingMarks = input.onlineReadingAttended ? 10 : 0;

  const dailyTotalScore = Number(
    (japaResult.marks + readingMarks + hearingMarks + sleepResult.marks + onlineReadingMarks).toFixed(2)
  );
  const maxScore = input.onlineReadingAttended ? 50 : SCORING_RULES.maxDailyScore;
  const percentage = Number(((dailyTotalScore / maxScore) * 100).toFixed(1));
  const grade = calculateGrade(percentage);

  const isComplete =
    input.completedRounds > 0 ||
    input.readingMinutes > 0 ||
    input.hearingMinutes > 0 ||
    totalRestMinutes > 0 ||
    !!input.onlineReadingAttended;
  const isZeroScore = dailyTotalScore === 0;

  return {
    japaMarks: japaResult.marks,
    readingMarks,
    hearingMarks,
    sleepMarks: sleepResult.marks,
    onlineReadingMarks,
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
 * Calculates weekly total score and grade incorporating weekly programmes and online reading sessions
 * 7 days * 40 = 280, + 10 (class) + 10 (morning) = 300 base (+ 50 online reading = 350 max available)
 */
export function calculateWeeklyScoreAndGrade(params: {
  dailyScores: number[]; // up to 7 scores, max 40 each
  weeklyClassAttended: boolean;
  morningProgrammeAttended: boolean;
  onlineReadingMarks?: number; // 0 to 50 marks (Monday to Friday, 10 each)
}): {
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
} {
  const dailyTotal = params.dailyScores.reduce((sum, s) => sum + s, 0);
  const classMarks = params.weeklyClassAttended ? 10 : 0;
  const morningMarks = params.morningProgrammeAttended ? 10 : 0;
  const onlineReading = params.onlineReadingMarks ?? 0;
  const hasOnlineReading = params.onlineReadingMarks !== undefined;

  const totalScore = Number((dailyTotal + classMarks + morningMarks + onlineReading).toFixed(2));
  // 7 days * 40 = 280, + 10 (class) + 10 (morning) + (50 if online reading tracked)
  const maxAvailableMarks = 7 * SCORING_RULES.maxDailyScore + 10 + 10 + (hasOnlineReading ? 50 : 0);
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
 * Calculates monthly score and grade incorporating weekly programmes and dynamic monthly satsanga (50 marks)
 */
export function calculateMonthlyScoreAndGrade(params: {
  dailyScores: number[]; // all days of the month
  totalDaysInMonth: number;
  weeklyClassesScheduled: number;
  weeklyClassesAttended: number;
  morningProgrammesScheduled: number;
  morningProgrammesAttended: number;
  satsangaScheduled: boolean;
  satsangaAttended: boolean;
  onlineReadingMarks?: number;
}): {
  totalScore: number;
  maxAvailableMarks: number;
  percentage: number;
  grade: Grade;
} {
  const dailyTotal = params.dailyScores.reduce((sum, s) => sum + s, 0);
  const classMarks = params.weeklyClassesAttended * 10;
  const morningMarks = params.morningProgrammesAttended * 10;
  // Dynamic monthly satsang: 50 marks (0 if not scheduled/conducted)
  const satsangaMarks = params.satsangaScheduled && params.satsangaAttended ? 50 : 0;
  const onlineReading = params.onlineReadingMarks || 0;

  const totalScore = Number((dailyTotal + classMarks + morningMarks + satsangaMarks + onlineReading).toFixed(2));

  const maxAvailableMarks =
    params.totalDaysInMonth * SCORING_RULES.maxDailyScore +
    params.weeklyClassesScheduled * 10 +
    params.morningProgrammesScheduled * 10 +
    (params.satsangaScheduled ? 50 : 0);

  const percentage = maxAvailableMarks > 0 ? Number(((totalScore / maxAvailableMarks) * 100).toFixed(1)) : 0;
  const grade = calculateGrade(percentage);

  return {
    totalScore,
    maxAvailableMarks,
    percentage,
    grade,
  };
}
