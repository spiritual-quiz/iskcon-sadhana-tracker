import { UserProfile } from '../types/auth';
import { SadhanaEntry } from '../types/sadhana';
import { getNowInIST, getTodayDateStringIST } from '../utils/dateUtils';

export interface SadhanaDailyReminder {
  id: string;
  timeSlot: '6pm' | '9pm';
  timeLabel: string;
  title: string;
  message: string;
  isUrgent: boolean;
  canTurnOff: false; // Student cannot switch off directly
  isActive: boolean; // Triggered if current IST time is past slot and card is unsubmitted
}

export const reminderService = {
  /**
   * Evaluates daily sadhana reminders for the student.
   * Reminders run at 6:00 PM (18:00) and 9:00 PM (21:00) IST if sadhana is pending.
   * Cannot be switched off by the student; must be requested to counsellor.
   */
  getDailyReminders: (
    user: UserProfile | null,
    todayEntry: SadhanaEntry | null
  ): {
    remindersEnabled: boolean;
    optOutRequested: boolean;
    pendingReminders: SadhanaDailyReminder[];
    allReminders: SadhanaDailyReminder[];
  } => {
    if (!user) {
      return {
        remindersEnabled: false,
        optOutRequested: false,
        pendingReminders: [],
        allReminders: [],
      };
    }

    // Default to true unless explicitly disabled by counsellor
    const remindersEnabled = user.sadhanaRemindersEnabled !== false;
    const optOutRequested = !!user.reminderOptOutRequested;

    const istNow = getNowInIST();
    const currentHour = istNow.getHours();
    const currentMinute = istNow.getMinutes();
    const currentTimeVal = currentHour * 60 + currentMinute;

    const isPast6pm = currentTimeVal >= 18 * 60; // 18:00 (6:00 PM)
    const isPast9pm = currentTimeVal >= 21 * 60; // 21:00 (9:00 PM)

    const isCardSubmitted = !!todayEntry;

    const sixPmReminder: SadhanaDailyReminder = {
      id: `reminder_6pm_${getTodayDateStringIST()}`,
      timeSlot: '6pm',
      timeLabel: '6:00 PM IST',
      title: '6:00 PM Sadhana Reminder',
      message:
        'Hare Krishna! Please remember to complete your japa, reading, hearing and submit today’s sadhana card.',
      isUrgent: false,
      canTurnOff: false,
      isActive: remindersEnabled && !isCardSubmitted && isPast6pm,
    };

    const ninePmReminder: SadhanaDailyReminder = {
      id: `reminder_9pm_${getTodayDateStringIST()}`,
      timeSlot: '9pm',
      timeLabel: '9:00 PM IST',
      title: '9:00 PM Sadhana Final Call',
      message:
        'Hare Krishna! It is 9:00 PM. Your daily sadhana card is still pending. Please submit it before taking rest.',
      isUrgent: true,
      canTurnOff: false,
      isActive: remindersEnabled && !isCardSubmitted && isPast9pm,
    };

    const allReminders = [sixPmReminder, ninePmReminder];
    const pendingReminders = allReminders.filter((r) => r.isActive);

    return {
      remindersEnabled,
      optOutRequested,
      pendingReminders,
      allReminders,
    };
  },
};
