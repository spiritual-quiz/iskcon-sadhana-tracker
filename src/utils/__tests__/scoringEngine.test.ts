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
  parseDateComponents,
  formatDateToDevoteeFormat,
  formatDevoteeDateToISO,
} from '../dateUtils';

describe('Scoring Engine Unit Tests', () => {
  describe('Japa Chanting Marks & Exact Boundary Conditions', () => {
    test('completed on or before 7:30 AM awards 10 marks', () => {
      const res1 = calculateJapaMarks(16, 16, '05:45');
      expect(res1.marks).toBe(10);
      expect(res1.isHonored).toBe(true);

      const res2 = calculateJapaMarks(16, 16, '07:29');
      expect(res2.marks).toBe(10);

      const res3 = calculateJapaMarks(16, 16, '07:30');
      expect(res3.marks).toBe(10);
      expect(res3.isHonored).toBe(true);
    });

    test('completed between 7:31 AM and 10:00 AM awards 5 marks', () => {
      const res1 = calculateJapaMarks(16, 16, '07:31');
      expect(res1.marks).toBe(5);
      expect(res1.isHonored).toBe(true);

      const res2 = calculateJapaMarks(16, 16, '09:15');
      expect(res2.marks).toBe(5);

      const res3 = calculateJapaMarks(16, 16, '10:00');
      expect(res3.marks).toBe(5);
    });

    test('completed between 10:01 AM and before 1:00 PM awards 3 marks', () => {
      const res1 = calculateJapaMarks(16, 16, '10:01');
      expect(res1.marks).toBe(3);

      const res2 = calculateJapaMarks(16, 16, '12:45');
      expect(res2.marks).toBe(3);

      const res3 = calculateJapaMarks(16, 16, '12:59');
      expect(res3.marks).toBe(3);
    });

    test('completed at 1:00 PM (13:00) to 7:00 PM (19:00) awards 1 mark', () => {
      const res1 = calculateJapaMarks(16, 16, '13:00');
      expect(res1.marks).toBe(1);

      const res2 = calculateJapaMarks(16, 16, '19:00');
      expect(res2.marks).toBe(1);
    });

    test('completed after 7:00 PM awards 0 marks', () => {
      const res = calculateJapaMarks(16, 16, '19:01');
      expect(res.marks).toBe(0);
      expect(res.isHonored).toBe(true);
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
    test('sleep time <= 9:30 PM and 6.5 hours awards 10 marks', () => {
      expect(calculateSleepMarks(390, '21:30').marks).toBe(10); // 6.5 hours
      expect(calculateSleepMarks(360, '21:00').marks).toBe(10); // 6 hours
    });

    test('sleep time 10:00 PM and 6.5 hours awards 8 marks', () => {
      expect(calculateSleepMarks(390, '22:00').marks).toBe(8);
    });

    test('sleep time 10:30 PM and 6.5 hours awards 5 marks', () => {
      expect(calculateSleepMarks(390, '22:30').marks).toBe(5);
    });

    test('sleep time 11:00 PM and 6.5 hours awards 2 marks', () => {
      expect(calculateSleepMarks(390, '23:00').marks).toBe(2);
    });

    test('sleep time after 11:00 PM awards 0 marks even with 6.5 hours', () => {
      expect(calculateSleepMarks(390, '23:15').marks).toBe(0);
      expect(calculateSleepMarks(390, '00:30').marks).toBe(0);
    });

    test('sleeping more than 6.5 hours reduces 2 marks per half hour', () => {
      // Base 10 (21:30): 7.0 hours (420 mins = +30m excess) -> 10 - 2 = 8 marks
      expect(calculateSleepMarks(420, '21:30').marks).toBe(8);
      // Base 10 (21:30): 7.5 hours (450 mins = +60m excess) -> 10 - 4 = 6 marks
      expect(calculateSleepMarks(450, '21:30').marks).toBe(6);
      // Base 8 (22:00): 7.0 hours (420 mins = +30m excess) -> 8 - 2 = 6 marks
      expect(calculateSleepMarks(420, '22:00').marks).toBe(6);
    });

    test('0 minutes awards 0 marks', () => {
      expect(calculateSleepMarks(0).marks).toBe(0);
    });
  });

  describe('Spiritual Status Messages & Grade Boundaries', () => {
    test('100%: Advancing', () => {
      expect(calculateGrade(100)).toBe('Advancing');
    });

    test('80% to 99%: Good, Please Improve', () => {
      expect(calculateGrade(99)).toBe('Good, Please Improve');
      expect(calculateGrade(80.0)).toBe('Good, Please Improve');
    });

    test('60% to 79%: Your Bhakti Is at Risk', () => {
      expect(calculateGrade(79.9)).toBe('Your Bhakti Is at Risk');
      expect(calculateGrade(60.0)).toBe('Your Bhakti Is at Risk');
    });

    test('40% to 59%: Māyā Is Distracting You', () => {
      expect(calculateGrade(59.9)).toBe('Māyā Is Distracting You');
      expect(calculateGrade(40.0)).toBe('Māyā Is Distracting You');
    });

    test('20% to 39%: You Are in Māyā', () => {
      expect(calculateGrade(39.9)).toBe('You Are in Māyā');
      expect(calculateGrade(20.0)).toBe('You Are in Māyā');
    });

    test('0% to 19%: You Are Fallen', () => {
      expect(calculateGrade(19.9)).toBe('You Are Fallen');
      expect(calculateGrade(0)).toBe('You Are Fallen');
    });
  });

  describe('Daily Sadhana Evaluation Integration', () => {
    test('perfect sadhana with online reading yields 50/50, 100%, Advancing', () => {
      const result = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '06:30', // 10
        readingMinutes: 30, // 10
        hearingMinutes: 30, // 10
        sleepTimeStr: '21:30',
        wakeUpTimeStr: '04:00', // 6.5 hours -> 10 marks
        restMinutes: 0,
        onlineReadingAttended: true, // 10
      });

      expect(result.dailyTotalScore).toBe(50);
      expect(result.percentage).toBe(100);
      expect(result.grade).toBe('Advancing');
      expect(result.sleepMarks).toBe(10);
      expect(result.isZeroScore).toBe(false);
    });

    test('partial sadhana without online reading calculates out of 50', () => {
      const result = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '08:30', // 5 marks
        readingMinutes: 15, // 5 marks
        hearingMinutes: 15, // 5 marks
        sleepTimeStr: '22:00',
        wakeUpTimeStr: '06:00', // 8.0 hours -> 8 base - 3 half hours excess (90m excess = -6) = 2 marks
        restMinutes: 0,
        onlineReadingAttended: false, // 0 marks
      });

      expect(result.japaMarks).toBe(5);
      expect(result.readingMarks).toBe(5);
      expect(result.hearingMarks).toBe(5);
      expect(result.sleepMarks).toBe(2);
      expect(result.dailyTotalScore).toBe(17); // 17/50 = 34.0% -> You Are in Māyā
      expect(result.percentage).toBe(34.0);
      expect(result.grade).toBe('You Are in Māyā');
    });
  });

  describe('Weekly Programme Scoring', () => {
    test('calculates 7 days plus weekly class and morning programme out of 340', () => {
      const dailyScores = [40, 40, 40, 40, 40, 40, 40]; // 280
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: true, // +50
      });

      expect(weekly.totalScore).toBe(340);
      expect(weekly.maxAvailableMarks).toBe(350);
      expect(weekly.percentage).toBe(97.1);
      expect(weekly.grade).toBe('Good, Please Improve');
    });

    test('partial weekly score out of 350', () => {
      const dailyScores = [30, 30, 30, 30, 30, 30, 30]; // 210
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: false,
      });

      expect(weekly.totalScore).toBe(220);
      expect(weekly.maxAvailableMarks).toBe(350);
      expect(weekly.percentage).toBe(62.9);
      expect(weekly.grade).toBe('Your Bhakti Is at Risk');
    });

    test('calculates weekly score with online reading session (Mon-Fri, 50 marks max) and morning programme (50 marks)', () => {
      const dailyScores = [40, 40, 40, 40, 40, 40, 40]; // 280
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: true, // +50
        onlineReadingMarks: 50, // +50 (5 days x 10)
      });

      // 280 + 10 + 50 + 50 = 390
      expect(weekly.totalScore).toBe(390);
      expect(weekly.maxAvailableMarks).toBe(400);
      expect(weekly.percentage).toBe(97.5);
      expect(weekly.grade).toBe('Good, Please Improve');
    });

    test('calculates partial weekly score with 3 online reading sessions (30 marks)', () => {
      const dailyScores = [40, 40, 40, 40, 40, 40, 40]; // 280
      const weekly = calculateWeeklyScoreAndGrade({
        dailyScores,
        weeklyClassAttended: true, // +10
        morningProgrammeAttended: false, // 0
        onlineReadingMarks: 30, // +30 (3 days)
      });

      // 280 + 10 + 30 = 320 / 400 = 80.0% -> Good, Please Improve
      expect(weekly.totalScore).toBe(320);
      expect(weekly.maxAvailableMarks).toBe(400);
      expect(weekly.percentage).toBe(80.0);
      expect(weekly.grade).toBe('Good, Please Improve');
    });
  });

  describe('Daily Online Reading Session Scoring', () => {
    test('awards 10 marks when online reading session is attended on a weekday', () => {
      const res = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '06:30',
        readingMinutes: 30,
        hearingMinutes: 30,
        sleepTimeStr: '21:30',
        wakeUpTimeStr: '04:00',
        restMinutes: 0,
        onlineReadingAttended: true,
      });

      expect(res.onlineReadingMarks).toBe(10);
      expect(res.dailyTotalScore).toBe(50); // 40 standard + 10 online reading
      expect(res.percentage).toBe(100);
      expect(res.grade).toBe('Advancing');
    });

    test('awards 0 marks when online reading session is not attended (evaluated out of 50)', () => {
      const res = evaluateDailySadhana({
        declaredRounds: 16,
        completedRounds: 16,
        completionTimeStr: '06:30',
        readingMinutes: 30,
        hearingMinutes: 30,
        sleepTimeStr: '21:30',
        wakeUpTimeStr: '04:00',
        restMinutes: 0,
        onlineReadingAttended: false,
      });

      expect(res.onlineReadingMarks).toBe(0);
      expect(res.dailyTotalScore).toBe(40);
      expect(res.percentage).toBe(80); // 40/50 = 80%
      expect(res.grade).toBe('Good, Please Improve');
    });
  });

  describe('Dynamic Monthly Satsanga Scoring (50 Marks)', () => {
    test('when monthly satsang was held and attended, awards 50 marks', () => {
      // 30 days of 50 marks = 1500 marks base
      const dailyScores = Array(30).fill(50);
      const monthly = calculateMonthlyScoreAndGrade({
        dailyScores,
        totalDaysInMonth: 30,
        weeklyClassesScheduled: 4,
        weeklyClassesAttended: 4, // 40 marks
        morningProgrammesScheduled: 4,
        morningProgrammesAttended: 4, // 4 * 50 = 200 marks
        satsangaScheduled: true,
        satsangaAttended: true, // 50 marks
      });

      // total = 1500 + 40 + 200 + 50 = 1790
      // maxAvailable = 30*50 + 4*10 + 4*50 + 50 = 1790
      expect(monthly.totalScore).toBe(1790);
      expect(monthly.maxAvailableMarks).toBe(1790);
      expect(monthly.percentage).toBe(100);
      expect(monthly.grade).toBe('Advancing');
    });

    test('when monthly satsang was NOT held (cancelled / not conducted), zero marks are penalized', () => {
      const dailyScores = Array(30).fill(50);
      const monthly = calculateMonthlyScoreAndGrade({
        dailyScores,
        totalDaysInMonth: 30,
        weeklyClassesScheduled: 4,
        weeklyClassesAttended: 4, // 40 marks
        morningProgrammesScheduled: 4,
        morningProgrammesAttended: 4, // 4 * 50 = 200 marks
        satsangaScheduled: false, // dynamic: no satsang this month
        satsangaAttended: false,
      });

      // total = 1500 + 40 + 200 + 0 = 1740
      // maxAvailable = 30*50 + 4*10 + 4*50 + 0 = 1740 (50 marks not added to denominator!)
      expect(monthly.totalScore).toBe(1740);
      expect(monthly.maxAvailableMarks).toBe(1740);
      expect(monthly.percentage).toBe(100);
      expect(monthly.grade).toBe('Advancing');
    });

    test('when monthly satsang was held but devotee was absent, devotee receives 0 marks out of 50', () => {
      const dailyScores = Array(30).fill(50);
      const monthly = calculateMonthlyScoreAndGrade({
        dailyScores,
        totalDaysInMonth: 30,
        weeklyClassesScheduled: 4,
        weeklyClassesAttended: 4, // 40 marks
        morningProgrammesScheduled: 4,
        morningProgrammesAttended: 4, // 4 * 50 = 200 marks
        satsangaScheduled: true, // satsang was held
        satsangaAttended: false, // but absent
      });

      // total = 1500 + 40 + 200 + 0 = 1740
      // maxAvailable = 30*50 + 4*10 + 4*50 + 50 = 1790
      // 1740 / 1790 = 97.2% -> Good, Please Improve
      expect(monthly.totalScore).toBe(1740);
      expect(monthly.maxAvailableMarks).toBe(1790);
      expect(monthly.percentage).toBe(97.2);
      expect(monthly.grade).toBe('Good, Please Improve');
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

  describe('Devotee Date Formats & Scrolling Picker Conversions', () => {
    test('parses DD-MMM-YYYY format like 10-May-1988 accurately', () => {
      const parsed = parseDateComponents('10-May-1988');
      expect(parsed).toEqual({ day: 10, month: 5, year: 1988 });
    });

    test('parses ISO format 1988-05-10 accurately', () => {
      const parsed = parseDateComponents('1988-05-10');
      expect(parsed).toEqual({ day: 10, month: 5, year: 1988 });
    });

    test('formats ISO date to devotee format (10-May-1988)', () => {
      const formatted = formatDateToDevoteeFormat('1988-05-10');
      expect(formatted).toBe('10-May-1988');
    });

    test('formats devotee format to ISO (1988-05-10)', () => {
      const iso = formatDevoteeDateToISO('10-May-1988');
      expect(iso).toBe('1988-05-10');
    });

    test('calculateAge produces identical results for 10-May-1988 and 1988-05-10', () => {
      const ageFromDevoteeFormat = calculateAge('10-May-1988');
      const ageFromIsoFormat = calculateAge('1988-05-10');
      expect(ageFromDevoteeFormat).toBeGreaterThan(0);
      expect(ageFromDevoteeFormat).toBe(ageFromIsoFormat);
    });

    test('calculateConnectionDuration produces identical results for 15-Jan-2018 and 2018-01-15', () => {
      const duration1 = calculateConnectionDuration('15-Jan-2018');
      const duration2 = calculateConnectionDuration('2018-01-15');
      expect(duration1.years).toBe(duration2.years);
      expect(duration1.months).toBe(duration2.months);
      expect(duration1.text).toBe(duration2.text);
    });

    test('birthday calculations work seamlessly with 29-Feb-1996', () => {
      const bday = getBirthdayInYear('29-Feb-1996', 2025);
      expect(bday.dateString).toBe('2025-02-28');
      expect(bday.isLeapAdjusted).toBe(true);
    });
  });
});
