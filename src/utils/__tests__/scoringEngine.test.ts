import {
  calculateJapaMarks,
  calculateReadingMarks,
  calculateHearingMarks,
  calculateSleepMarks,
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

  describe('Option D: Sleep & Rest Scoring', () => {
    test('up to 7 hours awards 10 marks', () => {
      expect(calculateSleepMarks(390).marks).toBe(10); // 6.5 hours
      expect(calculateSleepMarks(420).marks).toBe(10); // exactly 7 hours
    });

    test('7 to 8 hours awards 8 marks', () => {
      expect(calculateSleepMarks(450).marks).toBe(8); // 7.5 hours
      expect(calculateSleepMarks(480).marks).toBe(8); // 8.0 hours
    });

    test('above 8 hours to < 10 hours awards 5 marks', () => {
      expect(calculateSleepMarks(510).marks).toBe(5); // 8.5 hours
      expect(calculateSleepMarks(540).marks).toBe(5); // 9 hours
      expect(calculateSleepMarks(570).marks).toBe(5); // 9.5 hours
    });

    test('10 hours or more awards 0 marks', () => {
      expect(calculateSleepMarks(600).marks).toBe(0); // 10.0 hours
      expect(calculateSleepMarks(660).marks).toBe(0); // 11.0 hours
    });

    test('0 minutes awards 0 marks', () => {
      expect(calculateSleepMarks(0).marks).toBe(0);
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
    test('perfect sadhana yields 40/40, 100%, Grade A', () => {
      const result = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '06:30', // 10
        readingMinutes: 30, // 10
        hearingMinutes: 30, // 10
        sleepTimeStr: '21:30',
        wakeUpTimeStr: '04:00', // 6.5 hours -> 10 marks
        restMinutes: 0,
      });

      expect(result.dailyTotalScore).toBe(40);
      expect(result.percentage).toBe(100);
      expect(result.grade).toBe('A');
      expect(result.sleepMarks).toBe(10);
      expect(result.isZeroScore).toBe(false);
    });

    test('partial japa, reading, hearing, and 8h sleep calculates out of 40', () => {
      const result = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '08:30', // 5 marks
        readingMinutes: 15, // 5 marks
        hearingMinutes: 15, // 5 marks
        sleepTimeStr: '22:00',
        wakeUpTimeStr: '06:00', // 8.0 hours -> 8 marks
        restMinutes: 0,
      });

      expect(result.japaMarks).toBe(5);
      expect(result.readingMarks).toBe(5);
      expect(result.hearingMarks).toBe(5);
      expect(result.sleepMarks).toBe(8);
      expect(result.dailyTotalScore).toBe(23); // 23/40 = 57.5% -> E
      expect(result.percentage).toBe(57.5);
      expect(result.grade).toBe('E');
    });
  });

  describe('Weekly Programme Scoring', () => {
    test('calculates 7 days plus weekly class and morning programme out of 300', () => {
      const dailyScores = [40, 40, 40, 40, 40, 40, 40]; // 280
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: true, // +10
      });

      expect(weekly.totalScore).toBe(300);
      expect(weekly.maxAvailableMarks).toBe(300);
      expect(weekly.percentage).toBe(100);
      expect(weekly.grade).toBe('A');
    });

    test('partial weekly score out of 300', () => {
      const dailyScores = [30, 30, 30, 30, 30, 30, 30]; // 210
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: false,
      });

      expect(weekly.totalScore).toBe(220);
      expect(weekly.maxAvailableMarks).toBe(300);
      expect(weekly.percentage).toBe(73.3);
      expect(weekly.grade).toBe('C');
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
