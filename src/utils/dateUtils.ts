/**
 * Date utility functions adhering strictly to Asia/Kolkata (IST: UTC+05:30) timezone rules
 */

const IST_OFFSET_MINUTES = 330; // 5 hours 30 minutes

/**
 * Returns a Date object shifted to represent the current time in Asia/Kolkata
 */
export function getNowInIST(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + IST_OFFSET_MINUTES * 60000);
}

/**
 * Format a Date to 'YYYY-MM-DD' in Asia/Kolkata timezone
 */
export function getTodayDateStringIST(): string {
  const istDate = getNowInIST();
  return formatDateToString(istDate);
}

export function formatDateToString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time in IST as 'HH:mm'
 */
export function getCurrentTimeIST(): string {
  const istDate = getNowInIST();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Calculates current dynamic age from YYYY-MM-DD
 */
export function calculateAge(dobString?: string): number {
  if (!dobString) return 0;
  const [year, month, day] = dobString.split('-').map(Number);
  if (!year || !month || !day) return 0;
  
  const today = getNowInIST();
  let age = today.getFullYear() - year;
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  
  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Calculates dynamic connection duration in years & months from YYYY-MM-DD
 */
export function calculateConnectionDuration(connectDateString?: string): { years: number; months: number; text: string } {
  if (!connectDateString) return { years: 0, months: 0, text: '0 years' };
  const [year, month, day] = connectDateString.split('-').map(Number);
  if (!year || !month || !day) return { years: 0, months: 0, text: '0 years' };
  
  const today = getNowInIST();
  let years = today.getFullYear() - year;
  let months = today.getMonth() + 1 - month;
  
  if (today.getDate() < day) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  
  years = Math.max(0, years);
  months = Math.max(0, months);

  let text = '';
  if (years > 0) {
    text += `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    if (text) text += ' ';
    text += `${months} month${months > 1 ? 's' : ''}`;
  }
  if (!text) text = 'Less than a month';

  return { years, months, text };
}

/**
 * Checks if a given year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Determines the birthday date for a counselee in a target year.
 * Handles Feb 29 birthdays on Feb 28 in non-leap years.
 */
export function getBirthdayInYear(dobString: string, targetYear: number): { dateString: string; isLeapAdjusted: boolean } {
  const parts = dobString.split('-').map(Number);
  const birthMonth = parts[1];
  const birthDay = parts[2];

  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(targetYear)) {
    return {
      dateString: `${targetYear}-02-28`,
      isLeapAdjusted: true,
    };
  }

  const mm = String(birthMonth).padStart(2, '0');
  const dd = String(birthDay).padStart(2, '0');
  return {
    dateString: `${targetYear}-${mm}-${dd}`,
    isLeapAdjusted: false,
  };
}

/**
 * Calculates sleep duration in minutes, handling overnight crossing (e.g. 21:30 to 04:00)
 */
export function calculateSleepDurationMinutes(sleepTimeStr?: string, wakeUpTimeStr?: string): number {
  if (!sleepTimeStr || !wakeUpTimeStr) return 0;
  const [sH, sM] = sleepTimeStr.split(':').map(Number);
  const [wH, wM] = wakeUpTimeStr.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(wH) || isNaN(wM)) return 0;

  let sleepMin = sH * 60 + sM;
  let wakeMin = wH * 60 + wM;

  if (wakeMin < sleepMin) {
    // Crosses midnight
    wakeMin += 24 * 60;
  }

  return Math.max(0, wakeMin - sleepMin);
}

/**
 * Format minutes into "Xh Ym"
 */
export function formatMinutesToHours(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * Computes week ID in format 'YYYY-Www' and date list [Monday ... Sunday]
 */
export function getWeekDetails(dateString: string): { weekId: string; startDate: string; endDate: string; dates: string[] } {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  
  // Day of week: 0 (Sun) to 6 (Sat). We want Monday=1 ... Sunday=7
  const dayOfWeek = date.getUTCDay() || 7; 
  
  // Monday of this week
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - dayOfWeek + 1);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(monday.getUTCDate() + i);
    dates.push(cur.toISOString().split('T')[0]);
  }

  // ISO Week number
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const weekId = `${monday.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;

  return {
    weekId,
    startDate: dates[0],
    endDate: dates[6],
    dates,
  };
}

/**
 * Computes month ID 'YYYY-MM' and month days
 */
export function getMonthDetails(year: number, month: number): { monthId: string; monthName: string; dates: string[] } {
  const monthId = `${year}-${String(month).padStart(2, '0')}`;
  const d = new Date(year, month - 1, 1);
  const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
  }

  return { monthId, monthName, dates };
}

/**
 * Calculates calendar days between two YYYY-MM-DD strings
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}
