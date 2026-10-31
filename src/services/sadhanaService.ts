import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SadhanaEntry, AuditRecord } from '../types/sadhana';
import { evaluateDailySadhana, SadhanaInput } from '../utils/scoringEngine';
import { getTodayDateStringIST } from '../utils/dateUtils';
import { monitoringService } from './monitoringService';
import { localStorageService } from './localStorageService';
import { fastCache } from './fastCacheService';
import { authService } from './authService';
import { UserProfile } from '../types/auth';

export const sadhanaService = {
  /**
   * Save or update a daily sadhana entry with automatic score calculation & audit tracking
   */
  saveDailySadhana: async (params: {
    userId: string;
    counseleeName?: string;
    date?: string; // default today IST
    input: SadhanaInput;
    modifiedBy: string;
    correctionReason?: string;
  }): Promise<SadhanaEntry> => {
    const dateStr = params.date || getTodayDateStringIST();
    const entryId = `${params.userId}_${dateStr}`;
    const entryRef = doc(db, 'sadhana_entries', entryId);

    // 1. Evaluate score through strict scoring engine
    const evaluation = evaluateDailySadhana(params.input);

    if (evaluation.validationErrors.length > 0) {
      throw new Error(evaluation.validationErrors.join(' '));
    }

    const nowIso = new Date().toISOString();

    // 2. Check for existing entry to maintain audit trail (checking Firestore then local storage)
    let prevData: SadhanaEntry | null = null;
    try {
      const existingSnap = await getDoc(entryRef);
      if (existingSnap.exists()) {
        prevData = existingSnap.data() as SadhanaEntry;
      }
    } catch (e) {
      // Permission denied or offline fallback
      prevData = await localStorageService.getSadhanaEntry(params.userId, dateStr);
    }

    let auditHistory: AuditRecord[] = [];
    if (prevData) {
      auditHistory = prevData.auditHistory || [];
      auditHistory.push({
        timestamp: nowIso,
        modifiedBy: params.modifiedBy,
        previousValues: {
          declaredRounds: prevData.declaredRounds,
          completedRounds: prevData.completedRounds,
          completionTimeStr: prevData.completionTimeStr,
          readingMinutes: prevData.readingMinutes,
          hearingMinutes: prevData.hearingMinutes,
          sleepTimeStr: prevData.sleepTimeStr,
          wakeUpTimeStr: prevData.wakeUpTimeStr,
          restMinutes: prevData.restMinutes,
          onlineReadingAttended: prevData.onlineReadingAttended,
          onlineReadingMarks: prevData.onlineReadingMarks,
          dailyTotalScore: prevData.dailyTotalScore,
        },
        reason: params.correctionReason || 'User updated daily record',
      });
    }

    // 3. Assemble complete entry
    const entry: SadhanaEntry = {
      id: entryId,
      userId: params.userId,
      counseleeName: params.counseleeName || '',
      date: dateStr,
      declaredRounds: params.input.declaredRounds,
      completedRounds: params.input.completedRounds,
      completionTimeStr: params.input.completionTimeStr || '',
      japaMarks: evaluation.japaMarks,
      readingMinutes: params.input.readingMinutes,
      readingMarks: evaluation.readingMarks,
      hearingMinutes: params.input.hearingMinutes,
      hearingMarks: evaluation.hearingMarks,
      sleepTimeStr: params.input.sleepTimeStr || '',
      wakeUpTimeStr: params.input.wakeUpTimeStr || '',
      restMinutes: params.input.restMinutes || 0,
      sleepMarks: evaluation.sleepMarks,
      totalSleepMinutes: evaluation.totalRestMinutes,
      onlineReadingAttended: params.input.onlineReadingAttended ?? false,
      onlineReadingMarks: evaluation.onlineReadingMarks,
      serviceAttended: params.input.serviceAttended ?? false,
      serviceMarks: evaluation.serviceMarks,
      monthlyMeetingAttended: params.input.monthlyMeetingAttended ?? false,
      monthlyMeetingMarks: evaluation.monthlyMeetingMarks,
      dailyTotalScore: evaluation.dailyTotalScore,
      percentage: evaluation.percentage,
      grade: evaluation.grade,
      isComplete: evaluation.isComplete,
      isZeroScore: evaluation.isZeroScore,
      auditHistory,
      createdAt: prevData ? (prevData.createdAt || nowIso) : nowIso,
      updatedAt: nowIso,
    };

    // 4. Save to local persistent storage (always succeeds)
    await localStorageService.saveSadhanaEntry(entry);

    // Invalidate fast cache keys so user immediately sees fresh score everywhere
    fastCache.invalidate(`daily_entry_${params.userId}_${dateStr}`);
    fastCache.invalidate(`daily_entries_${dateStr}`);
    fastCache.invalidate(`user_range_${params.userId}`);
    fastCache.invalidate(`weekly_report_${params.userId}`);
    fastCache.invalidate(`monthly_report_${params.userId}`);

    // 5. Attempt Cloud Firestore sync (if permissions/network allow)
    try {
      await setDoc(entryRef, entry);
    } catch (cloudErr) {
      // Gracefully saved in local storage
    }

    // 6. Resolve any open missing-card alert for this user since a valid entry was submitted
    try {
      await monitoringService.resolveMissingCardAlert(params.userId);
    } catch (e: any) {
      // Optional alert resolution fallback
    }

    return entry;
  },

  /**
   * Get daily sadhana entry for a specific user and date
   */
  getDailyEntry: async (userId: string, dateStr: string): Promise<SadhanaEntry | null> => {
    const cacheKey = `daily_entry_${userId}_${dateStr}`;
    const cached = await fastCache.get<SadhanaEntry>(cacheKey);
    if (cached) return cached;

    // 1. Instant check from local persistent storage (0ms latency)
    const local = await localStorageService.getSadhanaEntry(userId, dateStr);
    if (local) {
      await fastCache.set(cacheKey, local, 60);
      return local;
    }

    // 2. Fallback to Cloud Firestore if not present locally
    const entryId = `${userId}_${dateStr}`;
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'sadhana_entries', entryId)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ]);
      if (snap.exists()) {
        const data = snap.data() as SadhanaEntry;
        await localStorageService.saveSadhanaEntry(data);
        await fastCache.set(cacheKey, data, 60);
        return data;
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return null;
  },

  /**
   * Get entries for a user across a date range
   */
  getEntriesForDateRange: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<SadhanaEntry[]> => {
    const cacheKey = `user_range_${userId}_${startDate}_${endDate}`;
    const cached = await fastCache.get<SadhanaEntry[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    // 1. Check local persistent storage first (instant 0ms)
    const localEntries = await localStorageService.getEntriesForDateRange(userId, startDate, endDate);
    if (localEntries && localEntries.length > 0) {
      await fastCache.set(cacheKey, localEntries, 60);
      return localEntries;
    }

    // 2. Query Firestore with single-field filter (NEVER requires composite index)
    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('userId', '==', userId)
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ]);
      if (!snap.empty) {
        const results = snap.docs
          .map((d) => d.data() as SadhanaEntry)
          .filter((d) => d && d.date && d.date >= startDate && d.date <= endDate)
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        if (results.length > 0) {
          await Promise.all(results.map((e) => localStorageService.saveSadhanaEntry(e)));
          await fastCache.set(cacheKey, results, 60);
          return results;
        }
      }
    } catch (e) {
      // Query failed or timeout, proceed to direct doc ID lookups
    }

    // 3. Fallback: Direct doc ID lookups for individual dates in range (bypasses any indexing)
    try {
      const datesInRange: string[] = [];
      const [y1, m1, d1] = startDate.split('-').map(Number);
      const [y2, m2, d2] = endDate.split('-').map(Number);
      const startUtc = Date.UTC(y1, m1 - 1, d1);
      const endUtc = Date.UTC(y2, m2 - 1, d2);
      for (let t = startUtc; t <= endUtc; t += 86400000) {
        datesInRange.push(new Date(t).toISOString().split('T')[0]);
      }

      if (datesInRange.length > 0 && datesInRange.length <= 31) {
        const docSnaps = await Promise.all(
          datesInRange.map(async (d) => {
            const entryId = `${userId}_${d}`;
            try {
              const snap = await getDoc(doc(db, 'sadhana_entries', entryId));
              return snap.exists() ? (snap.data() as SadhanaEntry) : null;
            } catch {
              return null;
            }
          })
        );
        const found = docSnaps.filter((e): e is SadhanaEntry => e !== null);
        if (found.length > 0) {
          found.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
          await Promise.all(found.map((e) => localStorageService.saveSadhanaEntry(e)));
          await fastCache.set(cacheKey, found, 60);
          return found;
        }
      }
    } catch {
      // Ignore
    }

    return localEntries || [];
  },

  /**
   * Admin: Get all counselees' entries for a specific date
   */
  /**
   * Admin: Get all counselees' entries for a specific date
   */
  getAllEntriesForDate: async (dateStr: string, forceRefresh = false): Promise<SadhanaEntry[]> => {
    const cacheKey = `daily_entries_${dateStr}`;
    if (!forceRefresh) {
      const cached = await fastCache.get<SadhanaEntry[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    const entryMap = new Map<string, SadhanaEntry>();

    // 1. Preload any cached local entries
    try {
      const localEntries = await localStorageService.getAllEntriesForDate(dateStr);
      (localEntries || []).forEach((e) => {
        if (e && e.userId) entryMap.set(e.userId, e);
      });
    } catch {}

    // 2. Query Cloud Firestore with robust 6.0s timeout
    try {
      const q = query(collection(db, 'sadhana_entries'), where('date', '==', dateStr));
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ]);
      if (!snap.empty) {
        snap.docs.forEach((d) => {
          const entry = d.data() as SadhanaEntry;
          if (entry && entry.userId) {
            entryMap.set(entry.userId, entry);
          }
        });
      }
    } catch (e) {
      // Query fallback
    }

    // 3. Fallback: If no entries found in collection query, do direct doc lookup for all approved counselees
    if (entryMap.size === 0) {
      try {
        const counselees = await authService.getAllCounselees(forceRefresh);
        const approved = counselees.filter((u: UserProfile) => u.status === 'approved');
        if (approved.length > 0) {
          const directSnaps = await Promise.all(
            approved.map(async (c: UserProfile) => {
              const entryId = `${c.uid}_${dateStr}`;
              try {
                const s = await getDoc(doc(db, 'sadhana_entries', entryId));
                return s.exists() ? (s.data() as SadhanaEntry) : null;
              } catch {
                return null;
              }
            })
          );
          directSnaps.forEach((e: SadhanaEntry | null) => {
            if (e && e.userId) entryMap.set(e.userId, e);
          });
        }
      } catch (err) {}
    }

    const results = Array.from(entryMap.values());
    if (results.length > 0) {
      // Persist across app updates & offline restarts
      await Promise.all(results.map((e) => localStorageService.saveSadhanaEntry(e)));
      await fastCache.set(cacheKey, results, 60);
    }

    return results;
  },

  /**
   * Admin: Get all counselees' entries within a date range (e.g. past 1 week)
   */
  getAllEntriesForDateRange: async (startDate: string, endDate: string, forceRefresh = false): Promise<SadhanaEntry[]> => {
    const cacheKey = `range_entries_${startDate}_${endDate}`;
    if (!forceRefresh) {
      const cached = await fastCache.get<SadhanaEntry[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    const entryMap = new Map<string, SadhanaEntry>();

    // 1. Preload any cached local entries
    try {
      const localEntries = await localStorageService.getAllEntriesForDateRange(startDate, endDate);
      (localEntries || []).forEach((e) => {
        if (e) {
          const key = e.id || `${e.userId}_${e.date}`;
          entryMap.set(key, e);
        }
      });
    } catch {}

    // 2. Query Cloud Firestore with robust 6.0s timeout
    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ]);
      if (!snap.empty) {
        snap.docs.forEach((d) => {
          const entry = d.data() as SadhanaEntry;
          if (entry) {
            const key = entry.id || `${entry.userId}_${entry.date}`;
            entryMap.set(key, entry);
          }
        });
      }
    } catch (e) {
      // Query fallback
    }

    // 3. Fallback: If no entries found in collection range query, fetch per counselee using resilient getEntriesForDateRange
    if (entryMap.size === 0) {
      try {
        const counselees = await authService.getAllCounselees(forceRefresh);
        const approved = counselees.filter((u: UserProfile) => u.status === 'approved');
        const userResults = await Promise.all(
          approved.map((u: UserProfile) => sadhanaService.getEntriesForDateRange(u.uid, startDate, endDate))
        );
        userResults.flat().forEach((e: SadhanaEntry) => {
          if (e) {
            const key = e.id || `${e.userId}_${e.date}`;
            entryMap.set(key, e);
          }
        });
      } catch (err) {}
    }

    const results = Array.from(entryMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (results.length > 0) {
      // Persist across app updates & offline restarts
      await Promise.all(results.map((e) => localStorageService.saveSadhanaEntry(e)));
      await fastCache.set(cacheKey, results, 60);
    }

    return results;
  },

  /**
   * Admin: Get latest entry of a user to determine inactivity
   */
  getLatestEntryForUser: async (userId: string): Promise<SadhanaEntry | null> => {
    const localLatest = await localStorageService.getLatestEntryForUser(userId);
    if (localLatest) {
      return localLatest;
    }

    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ]);
      if (!snap.empty) {
        return snap.docs[0].data() as SadhanaEntry;
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return null;
  },

  /**
   * Update online reading session attendance (present/absent) for a specific date
   */
  updateOnlineReadingAttendance: async (params: {
    userId: string;
    counseleeName?: string;
    date: string;
    attended: boolean;
    modifiedBy: string;
  }): Promise<SadhanaEntry> => {
    const existing = await sadhanaService.getDailyEntry(params.userId, params.date);
    if (existing) {
      return await sadhanaService.saveDailySadhana({
        userId: params.userId,
        counseleeName: params.counseleeName || existing.counseleeName,
        date: params.date,
        input: {
          declaredRounds: existing.declaredRounds,
          completedRounds: existing.completedRounds,
          completionTimeStr: existing.completionTimeStr,
          readingMinutes: existing.readingMinutes,
          hearingMinutes: existing.hearingMinutes,
          sleepTimeStr: existing.sleepTimeStr,
          wakeUpTimeStr: existing.wakeUpTimeStr,
          restMinutes: existing.restMinutes,
          onlineReadingAttended: params.attended,
        },
        modifiedBy: params.modifiedBy,
        correctionReason: 'Updated Online Reading Session attendance',
      });
    } else {
      return await sadhanaService.saveDailySadhana({
        userId: params.userId,
        counseleeName: params.counseleeName || '',
        date: params.date,
        input: {
          declaredRounds: 16,
          completedRounds: 16,
          completionTimeStr: '06:30',
          readingMinutes: 30,
          hearingMinutes: 30,
          sleepTimeStr: '21:30',
          wakeUpTimeStr: '04:00',
          restMinutes: 0,
          onlineReadingAttended: params.attended,
        },
        modifiedBy: params.modifiedBy,
        correctionReason: 'Recorded Online Reading Session attendance',
      });
    }
  },
};
