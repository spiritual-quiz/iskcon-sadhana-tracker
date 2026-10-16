import AsyncStorage from '@react-native-async-storage/async-storage';
import { SadhanaEntry, WeeklyAttendance, MonthlySatsangaAttendance } from '../types/sadhana';
import { WeeklyReport, MonthlyReport, SharedWeeklySummary, SharedMonthlySummary } from '../types/report';
import { UserProfile, UserStatus } from '../types/auth';

export interface LocalStoredUser extends UserProfile {
  password?: string;
}

const KEYS = {
  SADHANA_ENTRIES: '@iskcon_sadhana_entries',
  WEEKLY_ATTENDANCE: '@iskcon_weekly_attendance',
  MONTHLY_SATSANGA: '@iskcon_monthly_satsanga',
  WEEKLY_REPORTS: '@iskcon_weekly_reports',
  MONTHLY_REPORTS: '@iskcon_monthly_reports',
  SHARED_WEEKLY: '@iskcon_shared_weekly',
  SHARED_MONTHLY: '@iskcon_shared_monthly',
  USERS: '@iskcon_users',
};

export const localStorageService = {
  /**
   * Save or update a daily sadhana entry in local persistent storage
   */
  saveSadhanaEntry: async (entry: SadhanaEntry): Promise<void> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      const entries: Record<string, SadhanaEntry> = existingRaw ? JSON.parse(existingRaw) : {};
      entries[entry.id] = entry;
      await AsyncStorage.setItem(KEYS.SADHANA_ENTRIES, JSON.stringify(entries));
    } catch (e) {
      console.warn('Error saving sadhana entry to local storage:', e);
    }
  },

  /**
   * Get a daily sadhana entry for a user and date
   */
  getSadhanaEntry: async (userId: string, dateStr: string): Promise<SadhanaEntry | null> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      if (!existingRaw) return null;
      const entries: Record<string, SadhanaEntry> = JSON.parse(existingRaw);
      const entryId = `${userId}_${dateStr}`;
      return entries[entryId] || null;
    } catch (e) {
      console.warn('Error loading sadhana entry from local storage:', e);
      return null;
    }
  },

  /**
   * Get entries for a user across a date range
   */
  getEntriesForDateRange: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<SadhanaEntry[]> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      if (!existingRaw) return [];
      const entries: Record<string, SadhanaEntry> = JSON.parse(existingRaw);
      return Object.values(entries)
        .filter((e) => e.userId === userId && e.date >= startDate && e.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      console.warn('Error loading range entries from local storage:', e);
      return [];
    }
  },

  /**
   * Get all entries for a specific date (used by admin/counsellor)
   */
  getAllEntriesForDate: async (dateStr: string): Promise<SadhanaEntry[]> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      if (!existingRaw) return [];
      const entries: Record<string, SadhanaEntry> = JSON.parse(existingRaw);
      return Object.values(entries).filter((e) => e.date === dateStr);
    } catch (e) {
      console.warn('Error loading all entries for date from local storage:', e);
      return [];
    }
  },

  /**
   * Get latest entry for a user
   */
  getLatestEntryForUser: async (userId: string): Promise<SadhanaEntry | null> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      if (!existingRaw) return null;
      const entries: Record<string, SadhanaEntry> = JSON.parse(existingRaw);
      const userEntries = Object.values(entries)
        .filter((e) => e.userId === userId)
        .sort((a, b) => b.date.localeCompare(a.date));
      return userEntries.length > 0 ? userEntries[0] : null;
    } catch (e) {
      console.warn('Error loading latest entry from local storage:', e);
      return null;
    }
  },

  /**
   * Save weekly attendance
   */
  saveWeeklyAttendance: async (attendance: WeeklyAttendance): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.WEEKLY_ATTENDANCE);
      const data: Record<string, WeeklyAttendance> = raw ? JSON.parse(raw) : {};
      data[attendance.id] = attendance;
      await AsyncStorage.setItem(KEYS.WEEKLY_ATTENDANCE, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving weekly attendance to local storage:', e);
    }
  },

  /**
   * Get weekly attendance for user
   */
  getWeeklyAttendanceForUser: async (
    userId: string,
    weekId: string
  ): Promise<{ weeklyClass?: WeeklyAttendance; morningProgramme?: WeeklyAttendance }> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.WEEKLY_ATTENDANCE);
      if (!raw) return {};
      const data: Record<string, WeeklyAttendance> = JSON.parse(raw);
      const classId = `${userId}_${weekId}_weekly_class`;
      const morningId = `${userId}_${weekId}_morning_programme`;
      return {
        weeklyClass: data[classId],
        morningProgramme: data[morningId],
      };
    } catch (e) {
      return {};
    }
  },

  /**
   * Save monthly satsanga attendance
   */
  saveMonthlySatsanga: async (attendance: MonthlySatsangaAttendance): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.MONTHLY_SATSANGA);
      const data: Record<string, MonthlySatsangaAttendance> = raw ? JSON.parse(raw) : {};
      data[attendance.id] = attendance;
      await AsyncStorage.setItem(KEYS.MONTHLY_SATSANGA, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving monthly satsanga to local storage:', e);
    }
  },

  /**
   * Get monthly satsanga for user
   */
  getMonthlySatsangaForUser: async (
    userId: string,
    monthId: string
  ): Promise<MonthlySatsangaAttendance | null> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.MONTHLY_SATSANGA);
      if (!raw) return null;
      const data: Record<string, MonthlySatsangaAttendance> = JSON.parse(raw);
      return data[`${userId}_${monthId}`] || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Save shared weekly summary
   */
  saveSharedWeeklySummary: async (summary: SharedWeeklySummary): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SHARED_WEEKLY);
      const data: Record<string, SharedWeeklySummary> = raw ? JSON.parse(raw) : {};
      data[summary.id] = summary;
      await AsyncStorage.setItem(KEYS.SHARED_WEEKLY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving shared weekly summary to local storage:', e);
    }
  },

  /**
   * Get shared weekly summaries
   */
  getSharedWeeklySummaries: async (weekId: string): Promise<SharedWeeklySummary[]> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SHARED_WEEKLY);
      if (!raw) return [];
      const data: Record<string, SharedWeeklySummary> = JSON.parse(raw);
      return Object.values(data).filter((s) => s.weekId === weekId);
    } catch (e) {
      return [];
    }
  },

  /**
   * Save shared monthly summary
   */
  saveSharedMonthlySummary: async (summary: SharedMonthlySummary): Promise<void> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SHARED_MONTHLY);
      const data: Record<string, SharedMonthlySummary> = raw ? JSON.parse(raw) : {};
      data[summary.id] = summary;
      await AsyncStorage.setItem(KEYS.SHARED_MONTHLY, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving shared monthly summary to local storage:', e);
    }
  },

  /**
   * Get shared monthly summaries
   */
  getSharedMonthlySummaries: async (monthId: string): Promise<SharedMonthlySummary[]> => {
    try {
      const raw = await AsyncStorage.getItem(KEYS.SHARED_MONTHLY);
      if (!raw) return [];
      const data: Record<string, SharedMonthlySummary> = JSON.parse(raw);
      return Object.values(data).filter((s) => s.monthId === monthId);
    } catch (e) {
      return [];
    }
  },

  /**
   * Save or update a user in local persistent storage
   */
  saveUser: async (user: UserProfile, password?: string): Promise<void> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const users: Record<string, LocalStoredUser> = existingRaw ? JSON.parse(existingRaw) : {};
      users[user.uid] = { ...user, ...(password ? { password } : {}) };
      await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving user to local storage:', e);
    }
  },

  /**
   * Get a user by UID from local storage
   */
  getUser: async (uid: string): Promise<LocalStoredUser | null> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      if (!existingRaw) return null;
      const users: Record<string, LocalStoredUser> = JSON.parse(existingRaw);
      return users[uid] || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get a user by Email from local storage
   */
  getUserByEmail: async (email: string): Promise<LocalStoredUser | null> => {
    try {
      const clean = email.trim().toLowerCase();
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      if (!existingRaw) return null;
      const users: Record<string, LocalStoredUser> = JSON.parse(existingRaw);
      const match = Object.values(users).find((u) => u.email.toLowerCase() === clean);
      return match || null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get all registered users from local storage
   */
  getAllUsers: async (): Promise<UserProfile[]> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const localUsers: Record<string, UserProfile> = existingRaw ? JSON.parse(existingRaw) : {};

      // Seed baseline demo accounts if not already present
      const defaultUsers: Record<string, UserProfile> = {
        'counsellor_admin_uid': {
          uid: 'counsellor_admin_uid',
          email: 'counsellor@iskcon.org',
          displayName: 'H.G. Counsellor Das',
          phoneNumber: '+919876543210',
          role: 'counsellor',
          status: 'approved',
          declaredRounds: 16,
          publicAppreciationConsent: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        'devotee_user_uid': {
          uid: 'devotee_user_uid',
          email: 'devotee@iskcon.org',
          displayName: 'Ramesh Das',
          phoneNumber: '+919876543211',
          role: 'counselee',
          status: 'approved',
          counsellorId: 'counsellor_admin_uid',
          dateOfBirth: '1995-08-25',
          iskconConnectDate: '2020-01-15',
          declaredRounds: 16,
          invitationCode: 'KRISHNA7',
          publicAppreciationConsent: true,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      };

      const merged = { ...defaultUsers, ...localUsers };
      return Object.values(merged);
    } catch (e) {
      return [];
    }
  },

  /**
   * Update a user's status in local storage
   */
  updateUserStatus: async (uid: string, status: UserStatus): Promise<void> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const users: Record<string, LocalStoredUser> = existingRaw ? JSON.parse(existingRaw) : {};
      if (users[uid]) {
        users[uid].status = status;
        users[uid].updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }
    } catch (e) {
      console.warn('Error updating user status in local storage:', e);
    }
  },

  /**
   * Update user details in local storage
   */
  updateUser: async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const users: Record<string, LocalStoredUser> = existingRaw ? JSON.parse(existingRaw) : {};
      if (users[uid]) {
        users[uid] = {
          ...users[uid],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }
    } catch (e) {
      console.warn('Error updating user in local storage:', e);
    }
  },
};
