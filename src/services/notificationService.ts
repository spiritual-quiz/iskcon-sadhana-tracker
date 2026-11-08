import { UserProfile } from '../types/auth';
import { sadhanaService } from './sadhanaService';
import { getTodayDateStringIST, getNowInIST, getDaysDifference } from '../utils/dateUtils';
import { authService } from './authService';
import { monitoringService } from './monitoringService';
import { birthdayService } from './birthdayService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Persistent storage key so notifications fire ONLY ONCE and never pop up repeatedly on app open
const NOTIFIED_KEYS_STORAGE = 'bhakti_notified_alert_keys_v2';
const inMemoryDispatched = new Set<string>();

const hasAlertBeenNotified = async (key: string): Promise<boolean> => {
  if (inMemoryDispatched.has(key)) return true;
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_KEYS_STORAGE);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (parsed.includes(key)) {
        inMemoryDispatched.add(key);
        return true;
      }
    }
  } catch (e) {
    // Ignore
  }
  return false;
};

const markAlertAsNotified = async (key: string): Promise<void> => {
  inMemoryDispatched.add(key);
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_KEYS_STORAGE);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(key)) {
      list.push(key);
      if (list.length > 200) list.splice(0, list.length - 200);
      await AsyncStorage.setItem(NOTIFIED_KEYS_STORAGE, JSON.stringify(list));
    }
  } catch (e) {
    // Ignore
  }
};

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
      const title = isPast9pm ? 'Fill Sadhana - Final Call ⚠️' : 'Fill Sadhana - Daily Reminder';
      const body = isPast9pm
        ? 'Hare Krishna! It is 9:00 PM. Your daily sadhana card is still pending. Please fill sadhana before taking rest.'
        : 'Hare Krishna! Please remember to fill sadhana card for today.';

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
      if (await hasAlertBeenNotified(identifier)) return false;
      await markAlertAsNotified(identifier);

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
   * Schedules standard daily reminders for 6:00 PM (18:00) and 9:00 PM (21:00) IST,
   * plus a continuous 3-day inactivity alert that triggers even if the app remains closed.
   * Optimized for zero battery drain (native Android AlarmManager triggers).
   */
  scheduleDailyReminders: async (user: UserProfile | null): Promise<void> => {
    if (!user || !user.uid || !Notifications) return;
    if (user.sadhanaRemindersEnabled === false) return;

    try {
      if (!Notifications.scheduleNotificationAsync) return;

      const todayStr = getTodayDateStringIST();
      const todayEntry = await sadhanaService.getDailyEntry(user.uid, todayStr);

      // If today is already filled, dismiss today's banner notification from the tray
      if (todayEntry) {
        await notificationService.cancelTodayReminders();
      }

      // Check if daily repeating 6pm & 9pm alarms are already registered in Android AlarmManager
      const lastScheduledDate = await AsyncStorage.getItem('bhakti_last_scheduled_alarm_date');
      if (Notifications.getAllScheduledNotificationsAsync) {
        try {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          const has6pm = scheduled.some((n: any) => n.identifier === 'sadhana_scheduled_6pm');
          const has9pm = scheduled.some((n: any) => n.identifier === 'sadhana_scheduled_9pm');
          if (has6pm && has9pm && lastScheduledDate === todayStr) {
            return;
          }
        } catch {
          // Continue to scheduling
        }
      }

      // 1. Repeating 6:00 PM Daily Reminder (18:00 IST) - fires even when app is closed
      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_scheduled_6pm',
        content: {
          title: 'Fill Sadhana - Daily Reminder',
          body: 'Hare Krishna! Please remember to fill sadhana card for today.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'DailySadhana' },
        },
        trigger: {
          type: 'daily',
          hour: 18,
          minute: 0,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
        },
      });

      // 2. Repeating 9:00 PM Daily Reminder (21:00 IST) - fires even when app is closed
      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_scheduled_9pm',
        content: {
          title: 'Fill Sadhana - Final Call ⚠️',
          body: 'Hare Krishna! It is 9:00 PM. Your daily sadhana card is still pending. Please fill sadhana before taking rest.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'DailySadhana' },
        },
        trigger: {
          type: 'daily',
          hour: 21,
          minute: 0,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
        },
      });

      // 3. Continuous 3-Day Inactivity Alert (triggers on Day 3 at 7:00 PM IST if app was not filled)
      const day3Target = new Date();
      day3Target.setDate(day3Target.getDate() + 3);
      day3Target.setHours(19, 0, 0, 0); // 7:00 PM IST 3 days from now

      await Notifications.scheduleNotificationAsync({
        identifier: 'sadhana_inactivity_3days',
        content: {
          title: 'Fill Sadhana - 3-Day Inactivity Alert ⚠️',
          body: 'Hare Krishna! You have not submitted your daily sadhana card for 3 consecutive days. Please fill sadhana to maintain your devotional vows.',
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
          data: { screen: 'DailySadhana' },
        },
        trigger: {
          type: 'date',
          date: day3Target,
          channelId: NOTIFICATION_CHANNELS.SADHANA_REMINDER,
        },
      });

      await AsyncStorage.setItem('bhakti_last_scheduled_alarm_date', todayStr);
    } catch (e) {
      console.warn('Error scheduling daily reminders:', e);
    }
  },

  /**
   * Cancel/dismiss today's sadhana reminders immediately (called once the devotee submits today's card)
   * Dismisses banner from status tray while preserving recurring daily alarm schedules for tomorrow.
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
        await Notifications.dismissNotificationAsync('sadhana_inactivity_3days');
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

      // 1. New Counselees joined / pending approval (Notified ONCE, then tracked in tab)
      const pendingUsers = counselees.filter((u) => u.status === 'pending');
      if (pendingUsers.length > 0) {
        const key = `admin_pending_${pendingUsers.map((u) => u.uid).sort().join('_')}`;
        if (!(await hasAlertBeenNotified(key))) {
          await markAlertAsNotified(key);
          await Notifications.scheduleNotificationAsync({
            identifier: key,
            content: {
              title: 'New Counselee Registration',
              body: `${pendingUsers.length} devotee(s) registered (${pendingUsers[0].displayName}${pendingUsers.length > 1 ? ' +' + (pendingUsers.length - 1) + ' more' : ''}) and await your approval.`,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'PendingRegistrations' },
            },
            trigger: null,
          });
        }
      }

      // 2. Reminder Switch-Off Requests (Notified ONCE, then tracked in Manage Counselees tab)
      const reminderReqs = counselees.filter((u) => u.reminderOptOutRequested === true);
      if (reminderReqs.length > 0) {
        const key = `admin_reminder_optout_${reminderReqs.map((u) => u.uid).sort().join('_')}`;
        if (!(await hasAlertBeenNotified(key))) {
          await markAlertAsNotified(key);
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

      // 3. Target Rounds Change Requests (Notified ONCE, then tracked in Manage Counselees tab)
      const targetReqs = counselees.filter(
        (u) => u.targetRoundsRequested && u.targetRoundsRequested > 0
      );
      if (targetReqs.length > 0) {
        const key = `admin_rounds_req_${targetReqs.map((u) => `${u.uid}_${u.targetRoundsRequested}`).sort().join('_')}`;
        if (!(await hasAlertBeenNotified(key))) {
          await markAlertAsNotified(key);
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

      // 4. Devotees Missing Sadhana for 3+ Continuous Days
      // DOES NOT pop up repeatedly inside the app. Listed in "Sadhana Monitoring" tab.
      // Schedules a native repeating alarm at 9:30 AM IST that fires when the app is CLOSED.
      const openAlerts = await monitoringService.getOpenAlerts();
      const missingAlerts = openAlerts.filter((a) => a.alertType === 'missing_card');
      if (missingAlerts.length > 0) {
        const devoteeSummary =
          missingAlerts.length === 1
            ? `${missingAlerts[0].counseleeName} has not submitted sadhana for ${missingAlerts[0].consecutiveMissingDays || 3} consecutive days.`
            : `${missingAlerts[0].counseleeName} and ${missingAlerts.length - 1} other devotee(s) have not submitted sadhana for 3+ consecutive days.`;

        // If a new devotee entered 3+ day missing state today, notify ONCE only
        const missingKey = `admin_missing_${todayStr}_${missingAlerts.map((a) => a.userId).sort().join('_')}`;
        if (!(await hasAlertBeenNotified(missingKey))) {
          await markAlertAsNotified(missingKey);
          await Notifications.scheduleNotificationAsync({
            identifier: missingKey,
            content: {
              title: 'Sadhana Pending (3+ Days) ⚠️',
              body: devoteeSummary,
              sound: 'default',
              vibrate: [0, 250, 250, 250],
              priority: Notifications.AndroidNotificationPriority.MAX,
              channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
              data: { screen: 'MonitoringAlerts' },
            },
            trigger: null,
          });
        }

        // Schedule repeating morning notification for counsellor at 9:30 AM IST (fires when app is CLOSED)
        await Notifications.scheduleNotificationAsync({
          identifier: 'counsellor_scheduled_3day_alert',
          content: {
            title: 'Sadhana Inactivity Alert (3+ Days) ⚠️',
            body: devoteeSummary,
            sound: 'default',
            vibrate: [0, 250, 250, 250],
            priority: Notifications.AndroidNotificationPriority.MAX,
            channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
            data: { screen: 'MonitoringAlerts' },
          },
          trigger: {
            type: 'daily',
            hour: 9,
            minute: 30,
            channelId: NOTIFICATION_CHANNELS.ADMIN_ALERTS,
          },
        });
      } else {
        // Cancel the closed-app 3-day inactivity alarm for counsellor if everyone is active
        if (Notifications.cancelScheduledNotificationAsync) {
          await Notifications.cancelScheduledNotificationAsync('counsellor_scheduled_3day_alert');
        }
      }

      // 5. Devotee Birthdays Today (Notified ONCE on birthday)
      const upcomingBdays = birthdayService.getUpcomingBirthdays(counselees, 1);
      const todayBdays = upcomingBdays.filter((b) => b.reminderDate === todayStr);
      if (todayBdays.length > 0) {
        const key = `admin_birthday_${todayStr}_${todayBdays.map((b) => b.userId).sort().join('_')}`;
        if (!(await hasAlertBeenNotified(key))) {
          await markAlertAsNotified(key);
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
