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

    // 5. Attempt Cloud Firestore sync (if permissions/network allow)
    try {
      await setDoc(entryRef, entry);
    } catch (cloudErr) {
      console.warn('Cloud Firestore sync deferred/fallback (saved in local storage):', cloudErr);
    }

    // 6. Resolve any open missing-card alert for this user since a valid entry was submitted
    try {
      await monitoringService.resolveMissingCardAlert(params.userId);
    } catch (e) {
      console.warn('Failed to resolve missing-card alert automatically:', e);
    }

    return entry;
  },

  /**
   * Get daily sadhana entry for a specific user and date
   */
  getDailyEntry: async (userId: string, dateStr: string): Promise<SadhanaEntry | null> => {
    const entryId = `${userId}_${dateStr}`;
    try {
      const snap = await getDoc(doc(db, 'sadhana_entries', entryId));
      if (snap.exists()) {
        const data = snap.data() as SadhanaEntry;
        await localStorageService.saveSadhanaEntry(data);
        return data;
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    // Fallback to local storage
    return await localStorageService.getSadhanaEntry(userId, dateStr);
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
      const q = query(
        collection(db, 'sadhana_entries'),
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as SadhanaEntry);
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return await localStorageService.getEntriesForDateRange(userId, startDate, endDate);
  },

  /**
   * Admin: Get all counselees' entries for a specific date
   */
  getAllEntriesForDate: async (dateStr: string): Promise<SadhanaEntry[]> => {
    try {
      const q = query(collection(db, 'sadhana_entries'), where('date', '==', dateStr));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as SadhanaEntry);
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return await localStorageService.getAllEntriesForDate(dateStr);
  },

  /**
   * Admin: Get latest entry of a user to determine inactivity
   */
  getLatestEntryForUser: async (userId: string): Promise<SadhanaEntry | null> => {
    try {
      const q = query(
        collection(db, 'sadhana_entries'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as SadhanaEntry;
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return await localStorageService.getLatestEntryForUser(userId);
  },
};
