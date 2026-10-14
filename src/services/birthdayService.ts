import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BirthdayReminder } from '../types/monitoring';
import { UserProfile } from '../types/auth';
import {
  getNowInIST,
  getTodayDateStringIST,
  getBirthdayInYear,
  calculateAge,
  getDaysDifference,
} from '../utils/dateUtils';

export const birthdayService = {
  /**
   * Scan counselees and identify birthdays today or upcoming in the next 30 days
   */
  getUpcomingBirthdays: (counselees: UserProfile[], windowDays: number = 30): BirthdayReminder[] => {
    const today = getNowInIST();
    const currentYear = today.getFullYear();
    const todayStr = getTodayDateStringIST();
    const results: BirthdayReminder[] = [];

    counselees.forEach((c) => {
      if (!c.dateOfBirth) return;

      // Check current year birthday
      let bday = getBirthdayInYear(c.dateOfBirth, currentYear);
      let diff = getDaysDifference(todayStr, bday.dateString);

      // If birthday already passed this year, check next year
      if (diff < 0) {
        bday = getBirthdayInYear(c.dateOfBirth, currentYear + 1);
        diff = getDaysDifference(todayStr, bday.dateString);
      }

      if (diff >= 0 && diff <= windowDays) {
        const turningAge = calculateAge(c.dateOfBirth) + (diff === 0 ? 0 : 1);
        results.push({
          id: `${c.uid}_${bday.dateString.substring(0, 4)}`,
          userId: c.uid,
          counseleeName: c.displayName,
          counseleePhone: c.phoneNumber,
          counseleeEmail: c.email,
          dateOfBirth: c.dateOfBirth,
          reminderDate: bday.dateString,
          turningAge,
          isLeapYearSpecial: bday.isLeapAdjusted,
          isNotified: false,
        });
      }
    });

    // Sort by nearest reminder date
    return results.sort((a, b) => a.reminderDate.localeCompare(b.reminderDate));
  },

  /**
   * Record that a birthday notification has been dispatched to avoid duplicate alerts
   */
  markBirthdayNotified: async (reminder: BirthdayReminder): Promise<void> => {
    const docRef = doc(db, 'birthday_notifications', reminder.id);
    await setDoc(docRef, {
      ...reminder,
      isNotified: true,
      notifiedAt: new Date().toISOString(),
    });
  },

  /**
   * Check if a reminder has already been notified
   */
  isAlreadyNotified: async (reminderId: string): Promise<boolean> => {
    const docRef = doc(db, 'birthday_notifications', reminderId);
    const snap = await getDoc(docRef);
    return snap.exists() && snap.data()?.isNotified === true;
  },
};
