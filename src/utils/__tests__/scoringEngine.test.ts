import {
  calculateJapaMarks,
  calculateReadingMarks,
  calculateHearingMarks,
  calculateGrade,
  evaluateDailySadhana,
  calculateWeeklyScoreAndGrade,
  calculateMonthlyScoreAndGrade,
} from '../scoringEngine';
import {
  calculateSleepDurationMinutes,
  calculateAge,
  calculateConnectionDuration,
  getBirthdayInYear,
  getDaysDifference,
} from '../dateUtils';

describe('Scoring Engine Unit Tests', () => {
  describe('Japa Chanting Marks & Exact Boundary Conditions', () => {
    test('completed before 7:00 AM awards 10 marks', () => {
      const res1 = calculateJapaMarks(16, 16, '06:30');
      expect(res1.marks).toBe(10);
      expect(res1.isHonored).toBe(true);

      const res2 = calculateJapaMarks(16, 16, '06:59');
      expect(res2.marks).toBe(10);
    });

    test('completed at exactly 7:00 AM awards 5 marks', () => {
      const res = calculateJapaMarks(16, 16, '07:00');
      expect(res.marks).toBe(5);
      expect(res.isHonored).toBe(true);
    });

    test('completed between 7:00 AM and 9:59 AM awards 5 marks', () => {
      const res = calculateJapaMarks(16, 16, '09:45');
      expect(res.marks).toBe(5);
    });

    test('completed at exactly 10:00 AM awards 3 marks', () => {
      const res = calculateJapaMarks(16, 16, '10:00');
      expect(res.marks).toBe(3);
    });

    test('completed between 10:00 AM and 12:59 PM awards 3 marks', () => {
      const res = calculateJapaMarks(16, 16, '12:45');
      expect(res.marks).toBe(3);
    });

    test('completed at exactly 1:00 PM (13:00) awards 1 mark', () => {
      const res = calculateJapaMarks(16, 16, '13:00');
      expect(res.marks).toBe(1);
    });

    test('completed after 1:00 PM awards 1 mark', () => {
      const res = calculateJapaMarks(16, 16, '18:30');
      expect(res.marks).toBe(1);
    });

    test('incomplete daily round commitment awards 0 marks even if chanted early', () => {
      const res = calculateJapaMarks(16, 14, '06:00');
      expect(res.marks).toBe(0);
      expect(res.isHonored).toBe(false);
      expect(res.reason).toContain('14/16 rounds');
    });

    test('missing completion time awards 0 marks and flags error', () => {
      const res = calculateJapaMarks(16, 16, '');
      expect(res.marks).toBe(0);
      expect(res.isHonored).toBe(false);
    });
  });

  describe('Srila Prabhupada Book Reading Marks', () => {
    test('30 minutes or more awards full 10 marks', () => {
      expect(calculateReadingMarks(30)).toBe(10);
      expect(calculateReadingMarks(45)).toBe(10);
    });

    test('15 minutes awards 5 marks', () => {
      expect(calculateReadingMarks(15)).toBe(5);
    });

    test('10 minutes awards ~3.33 marks', () => {
      expect(calculateReadingMarks(10)).toBe(3.33);
    });

    test('0 minutes awards 0 marks', () => {
      expect(calculateReadingMarks(0)).toBe(0);
    });
  });

  describe('Spiritual Hearing Marks', () => {
    test('30 minutes or more awards full 10 marks', () => {
      expect(calculateHearingMarks(30)).toBe(10);
      expect(calculateHearingMarks(60)).toBe(10);
    });

    test('15 minutes awards 5 marks', () => {
      expect(calculateHearingMarks(15)).toBe(5);
    });

    test('0 minutes awards 0 marks', () => {
      expect(calculateHearingMarks(0)).toBe(0);
    });
  });

  describe('Grade Boundaries', () => {
    test('A: 90% to 100%', () => {
      expect(calculateGrade(100)).toBe('A');
      expect(calculateGrade(90.0)).toBe('A');
    });

    test('B: 80% to below 90%', () => {
      expect(calculateGrade(89.9)).toBe('B');
      expect(calculateGrade(80.0)).toBe('B');
    });

    test('C: 70% to below 80%', () => {
      expect(calculateGrade(79.9)).toBe('C');
      expect(calculateGrade(70.0)).toBe('C');
    });

    test('D: 60% to below 70%', () => {
      expect(calculateGrade(69.9)).toBe('D');
      expect(calculateGrade(60.0)).toBe('D');
    });

    test('E: below 60%', () => {
      expect(calculateGrade(59.9)).toBe('E');
      expect(calculateGrade(0)).toBe('E');
    });
  });

  describe('Daily Sadhana Evaluation Integration', () => {
    test('perfect sadhana yields 30/30, 100%, Grade A', () => {
      const result = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '06:30',
        readingMinutes: 30,
        hearingMinutes: 30,
      });

      expect(result.dailyTotalScore).toBe(30);
      expect(result.percentage).toBe(100);
      expect(result.grade).toBe('A');
      expect(result.isZeroScore).toBe(false);
    });

    test('partial japa and partial reading calculates precisely', () => {
      const result = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '08:30', // 5 marks
        readingMinutes: 15, // 5 marks
        hearingMinutes: 0, // 0 marks
      });

      expect(result.japaMarks).toBe(5);
      expect(result.readingMarks).toBe(5);
      expect(result.hearingMarks).toBe(0);
      expect(result.dailyTotalScore).toBe(10);
      expect(result.percentage).toBe(33.3);
      expect(result.grade).toBe('E');
    });
  });

  describe('Weekly Programme Scoring', () => {
    test('calculates 7 days plus weekly class and morning programme out of 230', () => {
      const dailyScores = [30, 30, 30, 30, 30, 30, 30]; // 210
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: true, // +10
      });

      expect(weekly.totalScore).toBe(230);
      expect(weekly.maxAvailableMarks).toBe(230);
      expect(weekly.percentage).toBe(100);
      expect(weekly.grade).toBe('A');
    });

    test('zero attendance on weekly activities correctly reflects in score without duplicates', () => {
      const dailyScores = [20, 20, 20, 20, 20, 20, 20]; // 140
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: false,
        morningProgrammeAttended: false,
      });

      expect(weekly.totalScore).toBe(140);
      expect(weekly.maxAvailableMarks).toBe(230);
      expect(weekly.percentage).toBe(60.9);
      expect(weekly.grade).toBe('D');
    });
  });
});

describe('Date Utilities & Sleep Duration', () => {
  test('calculates sleep duration crossing midnight (21:30 to 04:00)', () => {
    const minutes = calculateSleepDurationMinutes('21:30', '04:00');
    // 21:30 to 24:00 = 150m, 24:00 to 04:00 = 240m -> total 390 mins = 6.5 hours
    expect(minutes).toBe(390);
  });

  test('calculates sleep duration within same day (01:00 to 05:30)', () => {
    const minutes = calculateSleepDurationMinutes('01:00', '05:30');
    expect(minutes).toBe(270); // 4.5 hours
  });

  test('birthday on Feb 29 maps to Feb 28 in non-leap year (e.g. 2025)', () => {
    const birthdayInfo = getBirthdayInYear('1996-02-29', 2025);
    expect(birthdayInfo.dateString).toBe('2025-02-28');
    expect(birthdayInfo.isLeapAdjusted).toBe(true);
  });

  test('birthday on Feb 29 remains Feb 29 in leap year (e.g. 2024)', () => {
    const birthdayInfo = getBirthdayInYear('1996-02-29', 2024);
    expect(birthdayInfo.dateString).toBe('2024-02-29');
    expect(birthdayInfo.isLeapAdjusted).toBe(false);
  });

  test('calculates missing days difference accurately', () => {
    const diff = getDaysDifference('2026-10-10', '2026-10-14');
    expect(diff).toBe(4);
  });
});
