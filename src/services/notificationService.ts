import { UserProfile } from '../types/auth';
import { sadhanaService } from './sadhanaService';
import { getTodayDateStringIST, getNowInIST } from '../utils/dateUtils';

// Safely require Platform and expo-notifications for cross-platform and jest test environments
let Platform: any = { OS: 'android' };
try {
  Platform = require('react-native').Platform || Platform;
} catch (e) {
  // Graceful fallback
}

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Graceful fallback for non-native / test environments
}

export const NOTIFICATION_CHANNELS = {
  SADHANA_REMINDER: 'sadhana_reminder_channel',
};

// Set foreground notification presentation handler with sound enabled
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: any) => {
      // Check if this is a sadhana reminder
      const identifier = notification?.request?.identifier || '';
      if (identifier.startsWith('sadhana_reminder')) {
        // If today's card is already filled, do NOT present or play sound
        return {
          shouldShowAlert: true,
          shouldPlaySound: true, // Plays default short notification chime ('ting')
          shouldSetBadge: false,
        };
      }
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
}

export const notificationService = {
  /**
   * Initialize notification channels and permissions
   */
  setupNotifications: async (): Promise<boolean> => {
    if (!Notifications) return false;

    try {
      // 1. Request notification permissions (required for Android 13+ and iOS)
      if (Notifications.getPermissionsAsync && Notifications.requestPermissionsAsync) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          return false;
        }
      }

      // 2. Configure Android Notification Channel with sound ('ting' chime) & vibration
      if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.SADHANA_REMINDER, {
          name: 'Sadhana Reminders',
          description: 'Daily devotional sadhana completion reminders with short chime',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default', // Standard crisp notification chime ('ting')
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFA600',
          enableVibrate: true,
          showBadge: true,
        });
      }

      return true;
    } catch (e) {
      console.warn('Notification setup error:', e);
      return false;
    }
  },

  /**
   * Check if today's sadhana is filled.
   * - If already filled: cancel/dismiss reminder and do NOT notify.
   * - If NOT filled and past reminder time: send mobile notification with short chime ('ting').
   */
  checkAndTriggerSadhanaReminder: async (user: UserProfile | null): Promise<boolean> => {
    if (!user || !user.uid || !Notifications) return false;
    if (user.sadhanaRemindersEnabled === false) return false;

    try {
      const todayStr = getTodayDateStringIST();
      const todayEntry = await sadhanaService.getDailyEntry(user.uid, todayStr);

      // If devotee has already filled today's card, cancel any notifications
      if (todayEntry) {
        await notificationService.cancelTodayReminders();
        return false;
      }

      // Check current IST time
      const istNow = getNowInIST();
      const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();
      const isPast6pm = currentMinutes >= 18 * 60; // 18:00 IST
      const isPast9pm = currentMinutes >= 21 * 60; // 21:00 IST

      if (!isPast6pm) {
        // Not yet 6 PM IST, no immediate notification needed
        return false;
      }

      const reminderId = `sadhana_reminder_${todayStr}`;
      const title = isPast9pm ? 'Sadhana Reminder (Final Call)' : 'Sadhana Reminder';
      const body = isPast9pm
        ? 'Hare Krishna! It is 9:00 PM. Your daily sadhana card is still pending. Please fill it before taking rest.'
        : 'Hare Krishna! Please remember to fill your daily sadhana card for today.';

      if (Notifications.scheduleNotificationAsync) {
        await Notifications.scheduleNotificationAsync({
          identifier: reminderId,
          content: {
            title,
            body,
            sound: 'default', // Mobile notification sound / short 'ting'
            vibrate: [0, 250, 250, 250],
            priority: Notifications.AndroidNotificationPriority.HIGH,
            channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
            data: { screen: 'DailySadhana', date: todayStr },
          },
          trigger: null, // Immediate trigger
        });
        return true;
      }
    } catch (e) {
      console.warn('Error triggering sadhana reminder notification:', e);
    }

    return false;
  },

  /**
   * Schedules standard daily reminders for 6:00 PM (18:00) and 9:00 PM (21:00) IST
   */
  scheduleDailyReminders: async (user: UserProfile | null): Promise<void> => {
    if (!user || !user.uid || !Notifications) return;
    if (user.sadhanaRemindersEnabled === false) return;

    try {
      if (!Notifications.scheduleNotificationAsync) return;

      // Check if today is already filled before scheduling
      const todayStr = getTodayDateStringIST();
      const todayEntry = await sadhanaService.getDailyEntry(user.uid, todayStr);
      if (todayEntry) {
        await notificationService.cancelTodayReminders();
        return;
      }

      // 6:00 PM Daily Reminder
      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_scheduled_6pm',
        content: {
          title: 'Sadhana Reminder',
          body: 'Hare Krishna! Please remember to fill your daily sadhana card for today.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'DailySadhana' },
        },
        trigger: {
          hour: 18,
          minute: 0,
          repeats: true,
        },
      });

      // 9:00 PM Daily Reminder (Final Call)
      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_scheduled_9pm',
        content: {
          title: 'Sadhana Reminder (Final Call)',
          body: 'Hare Krishna! It is 9:00 PM. Your daily sadhana card is pending. Please fill it before taking rest.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'DailySadhana' },
        },
        trigger: {
          hour: 21,
          minute: 0,
          repeats: true,
        },
      });
    } catch (e) {
      console.warn('Error scheduling daily reminders:', e);
    }
  },

  /**
   * Cancel today's sadhana reminders immediately (called once the devotee submits today's card)
   */
  cancelTodayReminders: async (): Promise<void> => {
    if (!Notifications) return;

    try {
      const todayStr = getTodayDateStringIST();
      const reminderId = `sadhana_reminder_${todayStr}`;

      if (Notifications.cancelScheduledNotificationAsync) {
        await Notifications.cancelScheduledNotificationAsync(reminderId);
      }
      if (Notifications.dismissNotificationAsync) {
        await Notifications.dismissNotificationAsync(reminderId);
      }
    } catch (e) {
      console.warn('Error cancelling today reminder:', e);
    }
  },
};
