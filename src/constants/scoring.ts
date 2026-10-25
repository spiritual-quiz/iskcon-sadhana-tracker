export const SCORING_RULES = {
  maxDailyScore: 50, // 10 (Japa) + 10 (Reading) + 10 (Hearing) + 10 (Sleep & Rest) + 10 (Online Reading)
  japa: {
    maxMarks: 10,
    brackets: [
      { maxHour: 7, maxMinute: 30, marks: 10, label: 'Before 7:30 AM (10 marks)' },
      { maxHour: 9, maxMinute: 30, marks: 5, label: '7:30 AM to before 9:30 AM (5 marks)' },
      { maxHour: 13, maxMinute: 0, marks: 3, label: '9:30 AM to before 1:00 PM (3 marks)' },
      { maxHour: 19, maxMinute: 0, marks: 1, label: '1:00 PM to 7:00 PM (1 mark)' },
      { maxHour: 24, maxMinute: 0, marks: 0, label: 'After 7:00 PM (0 marks)' },
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
    targetHours: 6.5, // 6h 30m
    brackets: [
      { maxTime: '21:30', marks: 10, label: '≤ 9:30 PM (10 marks base)' },
      { maxTime: '22:00', marks: 8, label: '≤ 10:00 PM (8 marks base)' },
      { maxTime: '22:30', marks: 5, label: '≤ 10:30 PM (5 marks base)' },
      { maxTime: '23:00', marks: 2, label: '≤ 11:00 PM (2 marks base)' },
      { maxTime: 'after 23:00', marks: 0, label: 'After 11:00 PM (0 marks base)' },
    ],
  },
  onlineReading: {
    maxMarks: 10,
  },
  weeklyClass: {
    maxMarks: 10,
  },
  morningProgramme: {
    maxMarks: 10,
  },
  monthlySatsanga: {
    maxMarks: 50,
  },
  grades: [
    { grade: 'Advancing', minPercentage: 100.0, maxPercentage: 100.0, label: 'Advancing' },
    { grade: 'Good, Please Improve', minPercentage: 80.0, maxPercentage: 99.9, label: 'Good, Please Improve' },
    { grade: 'Your Sādhana Is at Risk', minPercentage: 60.0, maxPercentage: 79.9, label: 'Your Sādhana Is at Risk' },
    { grade: 'Māyā Is Distracting You', minPercentage: 40.0, maxPercentage: 59.9, label: 'Māyā Is Distracting You' },
    { grade: 'You Are in Māyā', minPercentage: 20.0, maxPercentage: 39.9, label: 'You Are in Māyā' },
    { grade: 'You Are Fallen', minPercentage: 0.0, maxPercentage: 19.9, label: 'You Are Fallen' },
  ],
};
