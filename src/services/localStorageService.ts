import AsyncStorage from '@react-native-async-storage/async-storage';
import { SadhanaEntry, WeeklyAttendance, MonthlySatsangaAttendance } from '../types/sadhana';
import { WeeklyReport, MonthlyReport, SharedWeeklySummary, SharedMonthlySummary } from '../types/report';
import { UserProfile, UserStatus } from '../types/auth';
import { InvitationCode } from '../types/monitoring';

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
  INVITATIONS: '@iskcon_invitations',
  DELETED_INVITATIONS: '@iskcon_deleted_invitations',
  DELETED_USERS: '@iskcon_deleted_users',
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
      // Auto-prune older entries (> 30 days)
      await localStorageService.applyRetentionPolicy(entry.userId);
    } catch (e) {
      console.warn('Error saving sadhana entry to local storage:', e);
    }
  },

  /**
   * Automatically enforces retention limits:
   * - Daily entries: kept for 30 days (1 month), older deleted
   * - Weekly summaries: kept up to 20 reports, older deleted
   * - Monthly summaries: kept up to 12 reports, older deleted
   */
  applyRetentionPolicy: async (userId?: string): Promise<void> => {
    try {
      // 1. Purge daily entries older than 30 days (1 month)
      const existingEntriesRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      if (existingEntriesRaw) {
        const entries: Record<string, SadhanaEntry> = JSON.parse(existingEntriesRaw);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const prunedEntries: Record<string, SadhanaEntry> = {};
        for (const [key, entry] of Object.entries(entries)) {
          if (entry.date >= cutoffStr || (userId && entry.userId !== userId)) {
            prunedEntries[key] = entry;
          }
        }
        await AsyncStorage.setItem(KEYS.SADHANA_ENTRIES, JSON.stringify(prunedEntries));
      }

      // 2. Limit weekly reports to last 20
      const existingWeeklyRaw = await AsyncStorage.getItem(KEYS.SHARED_WEEKLY);
      if (existingWeeklyRaw) {
        const weeklyData: Record<string, SharedWeeklySummary> = JSON.parse(existingWeeklyRaw);
        const userSummaries = Object.values(weeklyData)
          .filter((s) => !userId || s.userId === userId)
          .sort((a, b) => b.weekId.localeCompare(a.weekId));

        if (userSummaries.length > 20) {
          const keepIds = new Set(userSummaries.slice(0, 20).map((s) => s.id));
          const prunedWeekly: Record<string, SharedWeeklySummary> = {};
          for (const [id, s] of Object.entries(weeklyData)) {
            if (s.userId !== userId || keepIds.has(id)) {
              prunedWeekly[id] = s;
            }
          }
          await AsyncStorage.setItem(KEYS.SHARED_WEEKLY, JSON.stringify(prunedWeekly));
        }
      }

      // 3. Limit monthly reports to last 12
      const existingMonthlyRaw = await AsyncStorage.getItem(KEYS.SHARED_MONTHLY);
      if (existingMonthlyRaw) {
        const monthlyData: Record<string, SharedMonthlySummary> = JSON.parse(existingMonthlyRaw);
        const userSummaries = Object.values(monthlyData)
          .filter((s) => !userId || s.userId === userId)
          .sort((a, b) => b.monthId.localeCompare(a.monthId));

        if (userSummaries.length > 12) {
          const keepIds = new Set(userSummaries.slice(0, 12).map((s) => s.id));
          const prunedMonthly: Record<string, SharedMonthlySummary> = {};
          for (const [id, s] of Object.entries(monthlyData)) {
            if (s.userId !== userId || keepIds.has(id)) {
              prunedMonthly[id] = s;
            }
          }
          await AsyncStorage.setItem(KEYS.SHARED_MONTHLY, JSON.stringify(prunedMonthly));
        }
      }
    } catch (e) {
      // Retention cleanup error fallback
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
      await localStorageService.applyRetentionPolicy(summary.userId);
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
      await localStorageService.applyRetentionPolicy(summary.userId);
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
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_USERS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (deletedList.includes(uid)) return null;

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
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_USERS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      if (!existingRaw) {
        if (clean === 'madhavcarandas@gmail.com' && !deletedList.includes('counsellor_admin_uid')) {
          return {
            uid: 'counsellor_admin_uid',
            email: 'madhavcarandas@gmail.com',
            displayName: 'Madhav Charan Das',
            phoneNumber: '+919876543210',
            role: 'counsellor',
            status: 'approved',
            declaredRounds: 16,
            publicAppreciationConsent: false,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          };
        }
        return null;
      }
      const users: Record<string, LocalStoredUser> = JSON.parse(existingRaw);
      if (clean === 'madhavcarandas@gmail.com' && !deletedList.includes('counsellor_admin_uid')) {
        const admin = users['counsellor_admin_uid'] || {
          uid: 'counsellor_admin_uid',
          email: 'madhavcarandas@gmail.com',
          displayName: 'Madhav Charan Das',
          phoneNumber: '+919876543210',
          role: 'counsellor',
          status: 'approved',
          declaredRounds: 16,
          publicAppreciationConsent: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        };
        admin.displayName = 'Madhav Charan Das';
        admin.email = 'madhavcarandas@gmail.com';
        return admin;
      }
      const match = Object.values(users).find(
        (u) => u.email.toLowerCase() === clean && !deletedList.includes(u.uid)
      );
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
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_USERS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const localUsers: Record<string, UserProfile> = existingRaw ? JSON.parse(existingRaw) : {};

      // Seed baseline demo accounts if not already present and not deleted
      const defaultUsers: Record<string, UserProfile> = {
        'counsellor_admin_uid': {
          uid: 'counsellor_admin_uid',
          email: 'madhavcarandas@gmail.com',
          displayName: 'Madhav Charan Das',
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

      for (const dUid of deletedList) {
        delete defaultUsers[dUid];
        delete localUsers[dUid];
      }

      if (localUsers['counsellor_admin_uid']) {
        localUsers['counsellor_admin_uid'].displayName = 'Madhav Charan Das';
        localUsers['counsellor_admin_uid'].email = 'madhavcarandas@gmail.com';
      }

      const merged = { ...defaultUsers, ...localUsers };
      return Object.values(merged);
    } catch (e) {
      return [];
    }
  },

  /**
   * Permanently delete a user from local storage and purge all their related records
   */
  deleteUser: async (uid: string): Promise<void> => {
    try {
      // 1. Remove from local users map
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const users: Record<string, LocalStoredUser> = existingRaw ? JSON.parse(existingRaw) : {};
      delete users[uid];
      await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));

      // 2. Mark in tombstone list so baseline seed never resurrects
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_USERS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedList.includes(uid)) {
        deletedList.push(uid);
        await AsyncStorage.setItem(KEYS.DELETED_USERS, JSON.stringify(deletedList));
      }

      // 3. Purge all sadhana entries belonging to this user
      const entriesRaw = await AsyncStorage.getItem(KEYS.SADHANA_ENTRIES);
      if (entriesRaw) {
        const entries: Record<string, SadhanaEntry> = JSON.parse(entriesRaw);
        const filteredEntries: Record<string, SadhanaEntry> = {};
        for (const [k, v] of Object.entries(entries)) {
          if (v.userId !== uid) filteredEntries[k] = v;
        }
        await AsyncStorage.setItem(KEYS.SADHANA_ENTRIES, JSON.stringify(filteredEntries));
      }

      // 4. Purge attendance records belonging to this user
      const attRaw = await AsyncStorage.getItem(KEYS.WEEKLY_ATTENDANCE);
      if (attRaw) {
        const att: Record<string, WeeklyAttendance> = JSON.parse(attRaw);
        const filteredAtt: Record<string, WeeklyAttendance> = {};
        for (const [k, v] of Object.entries(att)) {
          if (v.userId !== uid) filteredAtt[k] = v;
        }
        await AsyncStorage.setItem(KEYS.WEEKLY_ATTENDANCE, JSON.stringify(filteredAtt));
      }

      // 5. Purge monthly satsanga attendance
      const satsangaRaw = await AsyncStorage.getItem(KEYS.MONTHLY_SATSANGA);
      if (satsangaRaw) {
        const sat: Record<string, MonthlySatsangaAttendance> = JSON.parse(satsangaRaw);
        const filteredSat: Record<string, MonthlySatsangaAttendance> = {};
        for (const [k, v] of Object.entries(sat)) {
          if (v.userId !== uid) filteredSat[k] = v;
        }
        await AsyncStorage.setItem(KEYS.MONTHLY_SATSANGA, JSON.stringify(filteredSat));
      }

      // 6. Purge shared weekly and monthly summaries
      const weeklyRaw = await AsyncStorage.getItem(KEYS.SHARED_WEEKLY);
      if (weeklyRaw) {
        const weeklyData: Record<string, SharedWeeklySummary> = JSON.parse(weeklyRaw);
        const filteredWeekly: Record<string, SharedWeeklySummary> = {};
        for (const [k, v] of Object.entries(weeklyData)) {
          if (v.userId !== uid) filteredWeekly[k] = v;
        }
        await AsyncStorage.setItem(KEYS.SHARED_WEEKLY, JSON.stringify(filteredWeekly));
      }

      const monthlyRaw = await AsyncStorage.getItem(KEYS.SHARED_MONTHLY);
      if (monthlyRaw) {
        const monthlyData: Record<string, SharedMonthlySummary> = JSON.parse(monthlyRaw);
        const filteredMonthly: Record<string, SharedMonthlySummary> = {};
        for (const [k, v] of Object.entries(monthlyData)) {
          if (v.userId !== uid) filteredMonthly[k] = v;
        }
        await AsyncStorage.setItem(KEYS.SHARED_MONTHLY, JSON.stringify(filteredMonthly));
      }
    } catch (e) {
      // safe fallback
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

  /**
   * Update a user's password in local storage
   */
  updateUserPassword: async (email: string, newPassword: string): Promise<boolean> => {
    try {
      const clean = email.trim().toLowerCase();
      const existingRaw = await AsyncStorage.getItem(KEYS.USERS);
      const users: Record<string, LocalStoredUser> = existingRaw ? JSON.parse(existingRaw) : {};

      let targetUid = Object.keys(users).find(
        (uid) => users[uid].email && users[uid].email.toLowerCase() === clean
      );

      // If counsellor admin is not yet explicitly written into local users
      if (!targetUid && clean === 'madhavcarandas@gmail.com') {
        targetUid = 'counsellor_admin_uid';
        users[targetUid] = {
          uid: 'counsellor_admin_uid',
          email: 'madhavcarandas@gmail.com',
          displayName: 'Madhav Charan Das',
          phoneNumber: '+919876543210',
          role: 'counsellor',
          status: 'approved',
          declaredRounds: 16,
          publicAppreciationConsent: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };
      }

      if (targetUid) {
        users[targetUid] = {
          ...users[targetUid],
          password: newPassword,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
        return true;
      }

      return false;
    } catch (e) {
      console.warn('Error updating user password in local storage:', e);
      return false;
    }
  },

  /**
   * Save or update an invitation code in local storage
   */
  saveInvitation: async (invitation: InvitationCode): Promise<void> => {
    try {
      const existingRaw = await AsyncStorage.getItem(KEYS.INVITATIONS);
      const data: Record<string, InvitationCode> = existingRaw ? JSON.parse(existingRaw) : {};
      data[invitation.code] = invitation;
      await AsyncStorage.setItem(KEYS.INVITATIONS, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving invitation to local storage:', e);
    }
  },

  /**
   * Delete an invitation code permanently from local storage
   */
  deleteInvitation: async (code: string): Promise<void> => {
    try {
      const clean = code.trim().toUpperCase();
      const existingRaw = await AsyncStorage.getItem(KEYS.INVITATIONS);
      const data: Record<string, InvitationCode> = existingRaw ? JSON.parse(existingRaw) : {};
      delete data[clean];
      await AsyncStorage.setItem(KEYS.INVITATIONS, JSON.stringify(data));

      // Record in deleted tombstone list so seeds never resurrect
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_INVITATIONS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (!deletedList.includes(clean)) {
        deletedList.push(clean);
        await AsyncStorage.setItem(KEYS.DELETED_INVITATIONS, JSON.stringify(deletedList));
      }
    } catch (e) {
      console.warn('Error deleting invitation from local storage:', e);
    }
  },

  /**
   * Get an invitation code by code string
   */
  getInvitation: async (code: string): Promise<InvitationCode | null> => {
    try {
      const clean = code.trim().toUpperCase();

      // Check if code was permanently deleted
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_INVITATIONS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      if (deletedList.includes(clean)) {
        return null;
      }

      const existingRaw = await AsyncStorage.getItem(KEYS.INVITATIONS);
      const data: Record<string, InvitationCode> = existingRaw ? JSON.parse(existingRaw) : {};
      if (data[clean]) return data[clean];

      // Check default seeds if not deleted
      if (clean === 'KRISHNA7' || clean === 'SADHANA16') {
        return {
          code: clean,
          createdBy: 'counsellor_admin_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          expiresAt: '2030-01-01T00:00:00.000Z',
          maxUses: 100,
          usedCount: clean === 'KRISHNA7' ? 1 : 0,
          isRevoked: false,
          usedByUids: [],
          notes: clean === 'KRISHNA7' ? 'General Devotee Registration' : '16 Rounds Devotee Group',
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get all invitations from local storage (including default seeds unless deleted)
   */
  getAllInvitations: async (): Promise<InvitationCode[]> => {
    try {
      const deletedRaw = await AsyncStorage.getItem(KEYS.DELETED_INVITATIONS);
      const deletedList: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];

      const defaultInvitations: Record<string, InvitationCode> = {};
      if (!deletedList.includes('KRISHNA7')) {
        defaultInvitations['KRISHNA7'] = {
          code: 'KRISHNA7',
          createdBy: 'counsellor_admin_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          expiresAt: '2030-01-01T00:00:00.000Z',
          maxUses: 100,
          usedCount: 1,
          isRevoked: false,
          usedByUids: ['devotee_uid_108'],
          notes: 'General Devotee Registration (Default)',
        };
      }
      if (!deletedList.includes('SADHANA16')) {
        defaultInvitations['SADHANA16'] = {
          code: 'SADHANA16',
          createdBy: 'counsellor_admin_uid',
          createdAt: '2025-01-01T00:00:00.000Z',
          expiresAt: '2030-01-01T00:00:00.000Z',
          maxUses: 100,
          usedCount: 0,
          isRevoked: false,
          usedByUids: [],
          notes: '16 Rounds Committed Devotees',
        };
      }

      const existingRaw = await AsyncStorage.getItem(KEYS.INVITATIONS);
      const localData: Record<string, InvitationCode> = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = { ...defaultInvitations, ...localData };

      return Object.values(merged)
        .filter((inv) => !deletedList.includes(inv.code))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      return [];
    }
  },

  /**
   * Update invitation code in local storage
   */
  updateInvitation: async (code: string, updates: Partial<InvitationCode>): Promise<void> => {
    try {
      const clean = code.trim().toUpperCase();
      const existingRaw = await AsyncStorage.getItem(KEYS.INVITATIONS);
      const data: Record<string, InvitationCode> = existingRaw ? JSON.parse(existingRaw) : {};
      const existing = data[clean] || (await localStorageService.getInvitation(clean));
      if (existing) {
        data[clean] = {
          ...existing,
          ...updates,
        };
        await AsyncStorage.setItem(KEYS.INVITATIONS, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Error updating invitation in local storage:', e);
    }
  },
};
