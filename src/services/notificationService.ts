import { UserProfile } from '../types/auth';
import { sadhanaService } from './sadhanaService';
import { getTodayDateStringIST, getNowInIST, getDaysDifference } from '../utils/dateUtils';
import { authService } from './authService';
import { monitoringService } from './monitoringService';
import { birthdayService } from './birthdayService';

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
  ADMIN_ALERTS: 'admin_alerts_channel',
};

// Track dispatched notification keys in the current session to prevent duplicate sounds
const dispatchedAlertKeys = new Set<string>();

// Set foreground notification presentation handler with sound enabled
if (Notifications?.setNotificationHandler) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: any) => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true, // Plays default short notification chime ('ting' tone)
        shouldSetBadge: false,
      };
    },
  });
}

export const notificationService = {
  /**
   * Initialize notification channels and permissions with WhatsApp/PhonePe heads-up banner & tone
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

      // 2. Configure Android Notification Channels with WhatsApp / PhonePe style heads-up display & tone
      if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
        // Daily Sadhana Reminders Channel (compulsory for counselees, 6pm & 9pm)
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.SADHANA_REMINDER, {
          name: 'Sadhana Reminders',
          description: 'Daily devotional sadhana completion reminders with short chime',
          importance: Notifications.AndroidImportance.MAX, // Heads-up banner with tone
          sound: 'default', // Standard notification chime ('ting')
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFA600',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        });

        // Admin Alerts Channel (for new devotees, reminder off requests, rounds change, birthdays, 3+ day missing)
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ADMIN_ALERTS, {
          name: 'Counsellor Alerts',
          description: 'High-priority notifications for counselee requests, birthdays, and sadhana monitoring',
          importance: Notifications.AndroidImportance.MAX, // Heads-up banner with tone
          sound: 'default', // Standard notification chime
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#EA580C',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
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
            priority: Notifications.AndroidNotificationPriority.MAX,
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

      const todayStr = getTodayDateStringIST();
      const todayEntry = await sadhanaService.getDailyEntry(user.uid, todayStr);

      // Battery optimization: Check if already scheduled in Android AlarmManager
      if (Notifications.getAllScheduledNotificationsAsync) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const has6pm = scheduled.some((s: any) => s.identifier === 'sadhana_scheduled_6pm');
        const has9pm = scheduled.some((s: any) => s.identifier === 'sadhana_scheduled_9pm');
        if (has6pm && has9pm) {
          // If already scheduled, dismiss any active shade banner if devotee completed today's card
          if (todayEntry && Notifications.dismissNotificationAsync) {
            await Notifications.dismissNotificationAsync('sadhana_scheduled_6pm');
            await Notifications.dismissNotificationAsync('sadhana_scheduled_9pm');
          }
          return; // Already scheduled in AlarmManager, prevent battery drain
        }
      }

      // If today is already filled, dismiss any active notifications but keep repeating alarms for future days
      if (todayEntry) {
        await notificationService.cancelTodayReminders();
      }

      // 6:00 PM Daily Reminder (repeats daily at 18:00 IST even if app is closed)
      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_scheduled_6pm',
        content: {
          title: 'Sadhana Reminder',
          body: 'Hare Krishna! Please remember to fill your daily sadhana card for today.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'DailySadhana' },
        },
        trigger: {
          hour: 18,
          minute: 0,
          repeats: true,
        },
      });

      // 9:00 PM Daily Reminder (Final Call, repeats daily at 21:00 IST even if app is closed)
      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_scheduled_9pm',
        content: {
          title: 'Sadhana Reminder (Final Call)',
          body: 'Hare Krishna! It is 9:00 PM. Your daily sadhana card is pending. Please fill it before taking rest.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
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
        await Notifications.dismissNotificationAsync('sadhana_scheduled_6pm');
        await Notifications.dismissNotificationAsync('sadhana_scheduled_9pm');
      }
    } catch (e) {
      console.warn('Error cancelling today reminder:', e);
    }
  },

  /**
   * High-priority admin/counsellor heads-up alerts with tone (like WhatsApp/PhonePe):
   * 1. New counselee joined (pending registration)
   * 2. Reminder switch-off requests
   * 3. Chanting rounds change requests
   * 4. Devotees who haven't filled sadhana for 3+ consecutive days
   * 5. Devotee birthday today
   */
  checkAndDispatchAdminAlerts: async (adminUser: UserProfile | null): Promise<void> => {
    if (!adminUser || adminUser.role !== 'counsellor' || !Notifications) return;
    if (!Notifications.scheduleNotificationAsync) return;

    try {
      const todayStr = getTodayDateStringIST();
      const allUsers = await authService.getAllUsers();
      const counselees = allUsers.filter((u) => u.role === 'counselee');

      // 1. New Counselees joined / pending approval
      const pendingUsers = counselees.filter((u) => u.status === 'pending');
      if (pendingUsers.length > 0) {
        const key = `admin_pending_${todayStr}_${pendingUsers.length}`;
        if (!dispatchedAlertKeys.has(key)) {
          dispatchedAlertKeys.add(key);
          await Notifications.scheduleNotificationAsync({
            identifier: key,
            content: {
              title: 'New Counselee Registration',
              body: `${pendingUsers.length} devotee(s) registered (${pendingUsers[0].displayName}${pendingUsers.length > 1 ? ' +' + (pendingUsers.length - 1) + ' more' : ''}) and await your approval.`,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'CounseleeApproval' },
            },
            trigger: null,
          });
        }
      }

      // 2. Reminder Switch-Off Requests
      const reminderReqs = counselees.filter((u) => u.reminderOptOutRequested === true);
      if (reminderReqs.length > 0) {
        const key = `admin_reminder_optout_${todayStr}_${reminderReqs.length}`;
        if (!dispatchedAlertKeys.has(key)) {
          dispatchedAlertKeys.add(key);
          await Notifications.scheduleNotificationAsync({
            identifier: key,
            content: {
              title: 'Reminder Switch-Off Request',
              body: `${reminderReqs[0].displayName}${reminderReqs.length > 1 ? ' and others' : ''} requested to turn off daily sadhana reminders.`,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'ManageCounselees' },
            },
            trigger: null,
          });
        }
      }

      // 3. Target Rounds Change Requests
      const targetReqs = counselees.filter(
        (u) => u.targetRoundsRequested && u.targetRoundsRequested > 0
      );
      if (targetReqs.length > 0) {
        const key = `admin_rounds_req_${todayStr}_${targetReqs.length}`;
        if (!dispatchedAlertKeys.has(key)) {
          dispatchedAlertKeys.add(key);
          await Notifications.scheduleNotificationAsync({
            identifier: key,
            content: {
              title: 'Chanting Target Request',
              body: `${targetReqs[0].displayName} requested to update chanting target to ${targetReqs[0].targetRoundsRequested} rounds.`,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'ManageCounselees' },
            },
            trigger: null,
          });
        }
      }

      // 4. Devotees Missing Sadhana for 3+ Days
      const openAlerts = await monitoringService.getOpenAlerts();
      const missingAlerts = openAlerts.filter((a) => a.alertType === 'missing_card');
      if (missingAlerts.length > 0) {
        const key = `admin_missing_sadhana_${todayStr}_${missingAlerts.length}`;
        if (!dispatchedAlertKeys.has(key)) {
          dispatchedAlertKeys.add(key);
          await Notifications.scheduleNotificationAsync({
            identifier: key,
            content: {
              title: 'Sadhana Pending (3+ Days)',
              body: `${missingAlerts[0].counseleeName} has not submitted sadhana for 3+ consecutive days.`,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'MonitoringAlerts' },
            },
            trigger: null,
          });
        }
      }

      // 5. Devotee Birthdays Today
      const upcomingBdays = birthdayService.getUpcomingBirthdays(counselees, 1);
      const todayBdays = upcomingBdays.filter((b) => b.reminderDate === todayStr);
      if (todayBdays.length > 0) {
        const key = `admin_birthday_${todayStr}_${todayBdays.length}`;
        if (!dispatchedAlertKeys.has(key)) {
          dispatchedAlertKeys.add(key);
          await Notifications.scheduleNotificationAsync({
            identifier: key,
            content: {
              title: 'Devotee Birthday Today! 🎉',
              body: `Hare Krishna! Today is ${todayBdays[0].counseleeName}'s birthday! Wish them devotional blessings.`,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'BirthdayReminders' },
            },
            trigger: null,
          });
        }
      }
    } catch (e) {
      console.warn('Error checking admin alerts:', e);
    }
  },
};
