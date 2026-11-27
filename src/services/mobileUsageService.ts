import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../types/auth';
import { getTodayDateStringIST } from '../utils/dateUtils';
import {
  AppSession,
  AppUsageSummary,
  DailyMobileUsageRecord,
  TimeSlot,
} from '../types/mobileUsage';

// Minimum duration in ms to record an app session (e.g. 15 seconds) to filter out momentary accidental app switches
const MIN_SESSION_DURATION_MS = 15 * 1000;

// Throttle interval for battery safety: sync at most once every 120 minutes per device
const SYNC_THROTTLE_MS = 120 * 60 * 1000;

const KNOWN_PACKAGES: Record<
  string,
  { name: string; icon: string; color: string; category: AppUsageSummary['category'] }
> = {
  'com.google.android.youtube': {
    name: 'YouTube',
    icon: 'logo-youtube',
    color: '#FF0000',
    category: 'video',
  },
  'com.whatsapp': {
    name: 'WhatsApp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    category: 'chat',
  },
  'com.whatsapp.w4b': {
    name: 'WhatsApp Business',
    icon: 'logo-whatsapp',
    color: '#128C7E',
    category: 'chat',
  },
  'com.instagram.android': {
    name: 'Instagram',
    icon: 'logo-instagram',
    color: '#E1306C',
    category: 'social',
  },
  'com.facebook.katana': {
    name: 'Facebook',
    icon: 'logo-facebook',
    color: '#1877F2',
    category: 'social',
  },
  'com.facebook.orca': {
    name: 'Messenger',
    icon: 'chatbubble-ellipses',
    color: '#0084FF',
    category: 'chat',
  },
  'com.android.chrome': {
    name: 'Chrome Browser',
    icon: 'globe-outline',
    color: '#4285F4',
    category: 'browser',
  },
  'org.mozilla.firefox': {
    name: 'Firefox Browser',
    icon: 'globe-outline',
    color: '#FF7139',
    category: 'browser',
  },
  'com.opera.browser': {
    name: 'Opera Browser',
    icon: 'globe-outline',
    color: '#FF1B2D',
    category: 'browser',
  },
  'com.microsoft.emmx': {
    name: 'Edge Browser',
    icon: 'globe-outline',
    color: '#0078D7',
    category: 'browser',
  },
  'com.google.android.apps.messaging': {
    name: 'Messages',
    icon: 'chatbox-outline',
    color: '#1A73E8',
    category: 'chat',
  },
  'org.telegram.messenger': {
    name: 'Telegram',
    icon: 'paper-plane-outline',
    color: '#0088CC',
    category: 'chat',
  },
  'com.twitter.android': {
    name: 'X (Twitter)',
    icon: 'logo-twitter',
    color: '#111827',
    category: 'social',
  },
  'com.x.android': {
    name: 'X (Twitter)',
    icon: 'logo-twitter',
    color: '#111827',
    category: 'social',
  },
  'com.snapchat.android': {
    name: 'Snapchat',
    icon: 'chatbubble-outline',
    color: '#EAB308',
    category: 'social',
  },
  'com.netflix.mediaclient': {
    name: 'Netflix',
    icon: 'film-outline',
    color: '#E50914',
    category: 'video',
  },
  'com.amazon.avod.thirdpartyclient': {
    name: 'Prime Video',
    icon: 'videocam-outline',
    color: '#00A8E1',
    category: 'video',
  },
  'in.startv.hotstar': {
    name: 'JioCinema / Hotstar',
    icon: 'play-circle-outline',
    color: '#1E40AF',
    category: 'video',
  },
};

// Internal helper to safely get native module methods
const getNativeModule = () => {
  if (Platform.OS !== 'android') return null;
  try {
    // Dynamic require so tests and other platforms don't crash
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nativeModule = require('rn-app-usage-stats');
    return nativeModule;
  } catch {
    return null;
  }
};

export const formatMinutesToDisplay = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

export const formatTimestampTime = (ms: number): string => {
  const d = new Date(ms);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour should be 12
  const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
  return `${hours}:${minutesStr} ${ampm}`;
};

export const getTimeSlotForTimestamp = (ms: number): TimeSlot => {
  const d = new Date(ms);
  const hour = d.getHours();
  // Night: 10:00 PM (22) to 4:00 AM (4)
  if (hour >= 22 || hour < 4) return 'night';
  // Morning: 4:00 AM (4) to 12:00 PM (12)
  if (hour >= 4 && hour < 12) return 'morning';
  // Afternoon: 12:00 PM (12) to 5:00 PM (17)
  if (hour >= 12 && hour < 17) return 'afternoon';
  // Evening: 5:00 PM (17) to 10:00 PM (22)
  return 'evening';
};

export const mobileUsageService = {
  /**
   * Check if Android Usage Access permission has been granted by the counselee
   */
  hasUsagePermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    const mod = getNativeModule();
    if (!mod || typeof mod.hasUsageStatsPermission !== 'function') return false;
    try {
      const granted = await mod.hasUsageStatsPermission();
      await AsyncStorage.setItem('mobile_usage_permission_granted', granted ? 'true' : 'false');
      return Boolean(granted);
    } catch {
      return false;
    }
  },

  /**
   * Request Android Usage Access permission by opening system settings
   */
  requestUsagePermission: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    const mod = getNativeModule();
    if (!mod || typeof mod.requestUsageStatsPermission !== 'function') return false;
    try {
      const granted = await mod.requestUsageStatsPermission();
      await AsyncStorage.setItem('mobile_usage_permission_granted', granted ? 'true' : 'false');
      return Boolean(granted);
    } catch {
      return false;
    }
  },

  /**
   * Battery-safe sync method:
   * Called when Counselee opens the app.
   * Throttled so it executes at most once every 2 hours, using zero background battery.
   */
  syncCounseleeUsageIfDue: async (
    user: UserProfile,
    force = false
  ): Promise<DailyMobileUsageRecord | null> => {
    if (!user || user.role === 'counsellor') return null;

    // Check throttle timestamp
    const now = Date.now();
    const lastSyncStr = await AsyncStorage.getItem('mobile_usage_last_sync_time');
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    if (!force && now - lastSync < SYNC_THROTTLE_MS) {
      return null; // Throttled for battery protection
    }

    const hasPermission = await mobileUsageService.hasUsagePermission();
    if (!hasPermission) {
      return null;
    }

    const mod = getNativeModule();
    if (!mod || typeof mod.queryAppUsageSessions !== 'function') return null;

    try {
      // Query past 24 hours
      const todayStr = getTodayDateStringIST();
      const startTime = now - 24 * 60 * 60 * 1000;
      const endTime = now;

      const sessionsByPackage: Record<string, { packageName: string; startTime: number; endTime: number }[]> =
        await mod.queryAppUsageSessions(startTime, endTime);

      if (!sessionsByPackage || typeof sessionsByPackage !== 'object') return null;

      // Filter and aggregate
      const hourlyUsage = new Array(24).fill(0);
      const appSummaries: AppUsageSummary[] = [];
      const nightSessions: AppSession[] = [];
      let totalScreenMinutes = 0;
      let totalNightMinutes = 0;

      for (const [pkg, rawSessions] of Object.entries(sessionsByPackage)) {
        if (!Array.isArray(rawSessions) || rawSessions.length === 0) continue;

        // Skip our own app or common system launchers
        if (
          pkg === 'org.iskcon.sadhanatracker' ||
          pkg === 'com.android.systemui' ||
          pkg.includes('launcher') ||
          pkg.includes('settings')
        ) {
          continue;
        }

        const validSessions: AppSession[] = [];
        let appTotalMinutes = 0;

        for (const s of rawSessions) {
          const durationMs = s.endTime - s.startTime;
          if (durationMs < MIN_SESSION_DURATION_MS) continue; // Skip accidental clicks

          const durationMin = Math.round((durationMs / (1000 * 60)) * 10) / 10;
          if (durationMin <= 0) continue;

          const slot = getTimeSlotForTimestamp(s.startTime);
          const startHour = new Date(s.startTime).getHours();

          // Add to hourly distribution
          hourlyUsage[startHour] = Math.round((hourlyUsage[startHour] + durationMin) * 10) / 10;

          const mappedMeta = KNOWN_PACKAGES[pkg] || {
            name: pkg.split('.').pop() || 'App',
            icon: 'apps-outline',
            color: '#64748B',
            category: 'other' as const,
          };

          const sessionObj: AppSession = {
            appName: mappedMeta.name,
            packageName: pkg,
            startTime: s.startTime,
            endTime: s.endTime,
            durationMinutes: durationMin,
            timeSlot: slot,
            startTimeFormatted: formatTimestampTime(s.startTime),
            endTimeFormatted: formatTimestampTime(s.endTime),
          };

          validSessions.push(sessionObj);
          appTotalMinutes += durationMin;

          if (slot === 'night') {
            nightSessions.push(sessionObj);
            totalNightMinutes += durationMin;
          }
        }

        if (validSessions.length > 0) {
          const meta = KNOWN_PACKAGES[pkg] || {
            name: pkg.split('.').pop() || 'App',
            icon: 'apps-outline',
            color: '#64748B',
            category: 'other' as const,
          };

          // Sort sessions by start time
          validSessions.sort((a, b) => a.startTime - b.startTime);

          appSummaries.push({
            appName: meta.name,
            packageName: pkg,
            iconName: meta.icon,
            iconColor: meta.color,
            totalMinutes: Math.round(appTotalMinutes),
            percentage: 0, // calculated below
            sessionsCount: validSessions.length,
            sessions: validSessions,
            category: meta.category,
          });

          totalScreenMinutes += appTotalMinutes;
        }
      }

      // Calculate percentages and sort apps descending by usage
      totalScreenMinutes = Math.round(totalScreenMinutes);
      appSummaries.forEach((app) => {
        app.percentage = totalScreenMinutes > 0 ? Math.round((app.totalMinutes / totalScreenMinutes) * 100) : 0;
      });
      appSummaries.sort((a, b) => b.totalMinutes - a.totalMinutes);
      nightSessions.sort((a, b) => a.startTime - b.startTime);

      const record: DailyMobileUsageRecord = {
        id: `${user.uid}_${todayStr}`,
        uid: user.uid,
        counseleeName: user.displayName || 'Devotee',
        counseleeEmail: user.email || '',
        counseleePhone: user.phoneNumber || '',
        date: todayStr,
        totalScreenMinutes,
        nightUsageMinutes: Math.round(totalNightMinutes),
        nightSessions,
        hasLateNightActivity: totalNightMinutes >= 5,
        apps: appSummaries,
        hourlyUsage,
        syncedAt: new Date().toISOString(),
        permissionGranted: true,
      };

      // Upload to Firestore
      const docRef = doc(db, 'mobile_usage', record.id);
      await setDoc(docRef, record, { merge: true });

      // Cache locally
      await AsyncStorage.setItem('mobile_usage_last_sync_time', String(now));
      await AsyncStorage.setItem(`mobile_usage_cache_${todayStr}`, JSON.stringify(record));

      return record;
    } catch {
      return null;
    }
  },

  /**
   * Counsellor: Fetch all counselees' mobile usage records for a specific date
   */
  getDailyUsageForCounsellor: async (dateStr: string): Promise<DailyMobileUsageRecord[]> => {
    try {
      const q = query(collection(db, 'mobile_usage'), where('date', '==', dateStr));
      const snap = await getDocs(q);
      const results: DailyMobileUsageRecord[] = [];
      snap.forEach((d) => {
        results.push(d.data() as DailyMobileUsageRecord);
      });
      return results;
    } catch {
      return [];
    }
  },

  /**
   * Counsellor: Fetch date range usage for weekly or monthly view
   */
  getWeeklyOrMonthlyUsageForCounsellor: async (
    startDateStr: string,
    endDateStr: string
  ): Promise<DailyMobileUsageRecord[]> => {
    try {
      const q = query(
        collection(db, 'mobile_usage'),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr)
      );
      const snap = await getDocs(q);
      const results: DailyMobileUsageRecord[] = [];
      snap.forEach((d) => {
        results.push(d.data() as DailyMobileUsageRecord);
      });
      return results;
    } catch {
      return [];
    }
  },
};
