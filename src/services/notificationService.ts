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
  APP_UPDATES: 'app_updates_channel',
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

        // App Updates Channel (for new versions & OTA updates)
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.APP_UPDATES, {
          name: 'App Updates',
          description: 'High-priority alerts for new devotional application updates and features',
          importance: Notifications.AndroidImportance.MAX, // Heads-up banner with tone
          sound: 'default', // Standard notification chime
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
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
   * Dispatch system notification for app update available
   */
  triggerAppUpdateNotification: async (): Promise<boolean> => {
    if (!Notifications?.scheduleNotificationAsync) return false;
    try {
      const todayStr = getTodayDateStringIST();
      const identifier = `app_update_available_${todayStr}`;
      if (dispatchedAlertKeys.has(identifier)) return false;
      dispatchedAlertKeys.add(identifier);

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: 'Bhakti Unnati Update Available! 🚀',
          body: 'A fresh devotional update is ready. Tap to install the latest features and enhancements.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: NOTIFICATION_CHANNELS.APP_UPDATES,
          data: { screen: 'AppUpdate' },
        },
        trigger: null,
      });
      return true;
    } catch (e) {
      console.warn('Error triggering update notification:', e);
      return false;
    }
  },

  /**
   * Show live update download progress in the Android notification shade
   */
  showUpdateDownloadProgress: async (progress: number): Promise<void> => {
    if (!Notifications?.scheduleNotificationAsync) return;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: 'bhakti_update_progress',
        content: {
          title: `Updating Bhakti Unnati (${progress}%)`,
          body: progress < 95 ? 'Downloading update package in background...' : 'Finalizing update installation...',
          sound: null, // silent while updating progress
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: NOTIFICATION_CHANNELS.APP_UPDATES,
        },
        trigger: null,
      });
    } catch (e) {
      // Ignore background notification error
    }
  },

  /**
   * Dismiss the download progress notification from notification tray
   */
  dismissUpdateDownloadProgress: async (): Promise<void> => {
    if (!Notifications?.dismissNotificationAsync) return;
    try {
      await Notifications.dismissNotificationAsync('bhakti_update_progress');
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Show notification when update is downloaded and ready to apply
   */
  showUpdateCompleteNotification: async (): Promise<void> => {
    if (!Notifications?.scheduleNotificationAsync) return;
    try {
      await Notifications.dismissNotificationAsync('bhakti_update_progress');
      await Notifications.scheduleNotificationAsync({
        identifier: 'bhakti_update_complete',
        content: {
          title: 'Bhakti Unnati Update Ready! 🎉',
          body: 'Devotional updates installed successfully. Close and reopen the app (or restart) to enjoy new features.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: NOTIFICATION_CHANNELS.APP_UPDATES,
          data: { screen: 'AppUpdateComplete' },
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Error showing update complete notification:', e);
    }
  },

  /**
   * Schedules standard daily reminders for 6:00 PM (18:00) and 9:00 PM (21:00) IST.
   * Uses both daily repeating alarms and exact timestamp triggers for the next 7 days
   * to guarantee notifications fire reliably even when the app is completely closed.
   */
  scheduleDailyReminders: async (user: UserProfile | null): Promise<void> => {
    if (!user || !user.uid || !Notifications) return;
    if (user.sadhanaRemindersEnabled === false) return;

    try {
      if (!Notifications.scheduleNotificationAsync) return;

      const todayStr = getTodayDateStringIST();
      const todayEntry = await sadhanaService.getDailyEntry(user.uid, todayStr);

      // If today is already filled, dismiss any active notifications
      if (todayEntry) {
        await notificationService.cancelTodayReminders();
      }

      // 1. Repeating 6:00 PM Daily Reminder (18:00 IST)
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

      // 2. Repeating 9:00 PM Daily Reminder (21:00 IST)
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

      // 3. Exact alarms for the upcoming 7 days to pierce through Android Doze & OEM battery killers
      const now = new Date();
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate6pm = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        targetDate6pm.setHours(18, 0, 0, 0);

        const targetDate9pm = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        targetDate9pm.setHours(21, 0, 0, 0);

        const dateStr = targetDate6pm.toISOString().split('T')[0];

        // Only schedule if the alarm time is still in the future
        if (targetDate6pm.getTime() > Date.now()) {
          const id6 = `sadhana_exact_6pm_${dateStr}`;
          await Notifications.scheduleNotificationAsync({
            identifier: id6,
            content: {
              title: 'Sadhana Reminder',
              body: 'Hare Krishna! Please remember to fill your daily sadhana card for today.',
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
              data: { screen: 'DailySadhana', date: dateStr },
            },
            trigger: {
              date: targetDate6pm,
            },
          });
        }

        if (targetDate9pm.getTime() > Date.now()) {
          const id9 = `sadhana_exact_9pm_${dateStr}`;
          await Notifications.scheduleNotificationAsync({
            identifier: id9,
            content: {
              title: 'Sadhana Reminder (Final Call)',
              body: 'Hare Krishna! It is 9:00 PM. Your daily sadhana card is pending. Please fill it before taking rest.',
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
              data: { screen: 'DailySadhana', date: dateStr },
            },
            trigger: {
              date: targetDate9pm,
            },
          });
        }
      }
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
      const exact6Id = `sadhana_exact_6pm_${todayStr}`;
      const exact9Id = `sadhana_exact_9pm_${todayStr}`;

      if (Notifications.cancelScheduledNotificationAsync) {
        await Notifications.cancelScheduledNotificationAsync(reminderId);
        await Notifications.cancelScheduledNotificationAsync(exact6Id);
        await Notifications.cancelScheduledNotificationAsync(exact9Id);
      }
      if (Notifications.dismissNotificationAsync) {
        await Notifications.dismissNotificationAsync(reminderId);
        await Notifications.dismissNotificationAsync(exact6Id);
        await Notifications.dismissNotificationAsync(exact9Id);
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
