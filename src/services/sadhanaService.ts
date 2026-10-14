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

    // 2. Check for existing entry to maintain audit trail
    const existingSnap = await getDoc(entryRef);
    let auditHistory: AuditRecord[] = [];

    if (existingSnap.exists()) {
      const prevData = existingSnap.data() as SadhanaEntry;
      auditHistory = prevData.auditHistory || [];

      // Record audit change
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
      dailyTotalScore: evaluation.dailyTotalScore,
      percentage: evaluation.percentage,
      grade: evaluation.grade,
      isComplete: evaluation.isComplete,
      isZeroScore: evaluation.isZeroScore,
      auditHistory,
      createdAt: existingSnap.exists() ? (existingSnap.data().createdAt || nowIso) : nowIso,
      updatedAt: nowIso,
    };

    await setDoc(entryRef, entry);

    // 4. Resolve any open missing-card alert for this user since a valid entry was submitted
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
    const snap = await getDoc(doc(db, 'sadhana_entries', entryId));
    return snap.exists() ? (snap.data() as SadhanaEntry) : null;
  },

  /**
   * Get entries for a user across a date range
   */
  getEntriesForDateRange: async (
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<SadhanaEntry[]> => {
    const q = query(
      collection(db, 'sadhana_entries'),
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SadhanaEntry);
  },

  /**
   * Admin: Get all counselees' entries for a specific date
   */
  getAllEntriesForDate: async (dateStr: string): Promise<SadhanaEntry[]> => {
    const q = query(collection(db, 'sadhana_entries'), where('date', '==', dateStr));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SadhanaEntry);
  },

  /**
   * Admin: Get latest entry of a user to determine inactivity
   */
  getLatestEntryForUser: async (userId: string): Promise<SadhanaEntry | null> => {
    const q = query(
      collection(db, 'sadhana_entries'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as SadhanaEntry;
  },
};
