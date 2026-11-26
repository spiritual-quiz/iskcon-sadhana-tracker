import { SadhanaEntry } from '../types/sadhana';

export interface MilestoneBadge {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  iconColor: string;
  isUnlocked: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPercent: number;
}

export const streakMilestoneService = {
  /**
   * Calculates private devotional milestone badges from past 30 days sadhana records
   * without creating any public rivalry.
   */
  calculateMilestones: (entries: SadhanaEntry[]): MilestoneBadge[] => {
    // Sort chronological ascending
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

    // 1. Brahma-Muhurta Hero: Wake up <= 04:30 for 7 consecutive days
    let maxWakeupStreak = 0;
    let currentWakeupStreak = 0;
    sorted.forEach((e) => {
      const time = e.wakeUpTimeStr || '07:00';
      const [h, m] = time.split(':').map((v: string) => parseInt(v, 10) || 0);
      const totalMinutes = h * 60 + m;
      if (totalMinutes <= 4 * 60 + 30) {
        currentWakeupStreak++;
        if (currentWakeupStreak > maxWakeupStreak) maxWakeupStreak = currentWakeupStreak;
      } else {
        currentWakeupStreak = 0;
      }
    });

    // 2. 100 Hours Book Reading: Cumulative reading duration
    const totalReadingMinutes = sorted.reduce(
      (sum, e) => sum + (e.readingMinutes || 0),
      0
    );
    const targetReadingMinutes = 100 * 60; // 6000 mins

    // 3. Punctual Japa: 16+ rounds completed before 9:00 AM (5+ days)
    const punctualDays = sorted.filter((e) => {
      const isComplete = (e.completedRounds || 0) >= (e.declaredRounds || 16);
      const isBefore9 = Boolean(e.completionTimeStr && e.completionTimeStr <= '09:00');
      return isComplete && isBefore9;
    }).length;
    const targetPunctualDays = 5;

    // 4. Sadhana Consistency: 7 consecutive days filled
    let maxConsistencyStreak = 0;
    let currentConsistencyStreak = 0;
    sorted.forEach(() => {
      currentConsistencyStreak++;
      if (currentConsistencyStreak > maxConsistencyStreak) {
        maxConsistencyStreak = currentConsistencyStreak;
      }
    });

    return [
      {
        id: 'brahma-muhurta-hero',
        title: 'Brahma-Muhurta Hero',
        subtitle: 'Wake up before 4:30 AM for 7 days',
        iconName: 'sunny',
        iconColor: '#EA580C',
        isUnlocked: maxWakeupStreak >= 7,
        currentValue: Math.min(maxWakeupStreak, 7),
        targetValue: 7,
        unit: 'days',
        progressPercent: Math.min(100, Math.round((maxWakeupStreak / 7) * 100)),
      },
      {
        id: '100-hours-reading',
        title: '100 Hours of Book Reading',
        subtitle: 'Prabhupada book study milestone',
        iconName: 'book',
        iconColor: '#D97706',
        isUnlocked: totalReadingMinutes >= targetReadingMinutes,
        currentValue: Math.round(totalReadingMinutes / 60),
        targetValue: 100,
        unit: 'hours',
        progressPercent: Math.min(100, Math.round((totalReadingMinutes / targetReadingMinutes) * 100)),
      },
      {
        id: 'punctual-japa',
        title: 'Punctual Japa',
        subtitle: '16 rounds before 9:00 AM (5+ days)',
        iconName: 'alarm',
        iconColor: '#059669',
        isUnlocked: punctualDays >= targetPunctualDays,
        currentValue: Math.min(punctualDays, targetPunctualDays),
        targetValue: targetPunctualDays,
        unit: 'days',
        progressPercent: Math.min(100, Math.round((punctualDays / targetPunctualDays) * 100)),
      },
      {
        id: 'steady-sadhana-streak',
        title: 'Steady Sadhana Streak',
        subtitle: '7 continuous daily submissions',
        iconName: 'flame',
        iconColor: '#DC2626',
        isUnlocked: maxConsistencyStreak >= 7,
        currentValue: Math.min(maxConsistencyStreak, 7),
        targetValue: 7,
        unit: 'days',
        progressPercent: Math.min(100, Math.round((maxConsistencyStreak / 7) * 100)),
      },
    ];
  },
};
