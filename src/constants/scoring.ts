export const SCORING_RULES = {
  maxDailyScore: 30,
  japa: {
    maxMarks: 10,
    brackets: [
      { maxHour: 7, maxMinute: 0, marks: 10, label: 'Before 7:00 AM' },
      { maxHour: 10, maxMinute: 0, marks: 5, label: '7:00 AM to before 10:00 AM' },
      { maxHour: 13, maxMinute: 0, marks: 3, label: '10:00 AM to before 1:00 PM' },
      { maxHour: 24, maxMinute: 0, marks: 1, label: '1:00 PM or later' },
    ],
  },
  reading: {
    maxMarks: 10,
    targetMinutes: 30,
  },
  hearing: {
    maxMarks: 10,
    targetMinutes: 30,
  },
  weeklyClass: {
    maxMarks: 10,
  },
  morningProgramme: {
    maxMarks: 10,
  },
  monthlySatsanga: {
    maxMarks: 10,
  },
  grades: [
    { grade: 'A', minPercentage: 90.0, maxPercentage: 100.0, label: 'Excellent' },
    { grade: 'B', minPercentage: 80.0, maxPercentage: 90.0, label: 'Very Good' },
    { grade: 'C', minPercentage: 70.0, maxPercentage: 80.0, label: 'Good' },
    { grade: 'D', minPercentage: 60.0, maxPercentage: 70.0, label: 'Fair' },
    { grade: 'E', minPercentage: 0.0, maxPercentage: 60.0, label: 'Needs Encouragement' },
  ],
};
