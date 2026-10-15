export const SCORING_RULES = {
  maxDailyScore: 40, // 10 (Japa) + 10 (Reading) + 10 (Hearing) + 10 (Sleep & Rest)
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
  sleep: {
    maxMarks: 10,
    // 7 hours overall 10 marks, 8 hours 8 marks, above 9 hours 5 marks, 10 hours 0 marks
    brackets: [
      { maxHours: 7.0, marks: 10, label: '≤ 7 hours (10 marks)' },
      { maxHours: 8.0, marks: 8, label: '7 to 8 hours (8 marks)' },
      { maxHours: 9.99, marks: 5, label: 'Above 8 to < 10 hours (5 marks)' },
      { maxHours: 24.0, marks: 0, label: '≥ 10 hours (0 marks)' },
    ],
  },
  weeklyClass: {
    maxMarks: 10,
  },
  morningProgramme: {
    maxMarks: 10,
  },
  monthlySatsanga: {
    maxMarks: 20,
  },
  grades: [
    { grade: 'A', minPercentage: 90.0, maxPercentage: 100.0, label: 'Excellent' },
    { grade: 'B', minPercentage: 80.0, maxPercentage: 90.0, label: 'Very Good' },
    { grade: 'C', minPercentage: 70.0, maxPercentage: 80.0, label: 'Good' },
    { grade: 'D', minPercentage: 60.0, maxPercentage: 70.0, label: 'Fair' },
    { grade: 'E', minPercentage: 0.0, maxPercentage: 60.0, label: 'Needs Encouragement' },
  ],
};
