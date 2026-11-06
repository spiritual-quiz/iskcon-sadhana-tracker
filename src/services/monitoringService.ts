import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MonitoringAlert } from '../types/monitoring';
import { getTodayDateStringIST, getDaysDifference } from '../utils/dateUtils';
import { UserProfile } from '../types/auth';
import { localStorageService } from './localStorageService';
import { authService } from './authService';
import { sadhanaService } from './sadhanaService';

import { fastCache } from './fastCacheService';

export const monitoringService = {
  /**
   * Run automated audit check for a counselee:
   * 1. Check for missing daily card (>3 consecutive calendar days)
   * 2. Check for weekly score <60% ("Needs Encouragement")
   */
  evaluateCounseleeForAlerts: async (
    counselee: UserProfile,
    lastEntryDate?: string,
    currentWeeklyPercentage?: number
  ): Promise<MonitoringAlert[]> => {
    const todayStr = getTodayDateStringIST();
    const generatedAlerts: MonitoringAlert[] = [];

    // 1. Missing Daily Sadhana Card check
    if (lastEntryDate) {
      const daysSince = getDaysDifference(lastEntryDate, todayStr);
      if (daysSince >= 3) {
        const alertId = `missing_${counselee.uid}_${lastEntryDate}`;
        const alertRef = doc(db, 'monitoring_alerts', alertId);
        const existingSnap = await getDoc(alertRef);

        if (!existingSnap.exists() || existingSnap.data()?.status !== 'open') {
          const alert: MonitoringAlert = {
            id: alertId,
            userId: counselee.uid,
            counseleeName: counselee.displayName,
            alertType: 'missing_card',
            severity: 'warning',
            title: 'Missing Daily Sadhana Card (3+ Days)',
            description: `${counselee.displayName} has not submitted a daily sadhana card for ${daysSince} consecutive days (Last submitted: ${lastEntryDate}).`,
            lastSubmissionDate: lastEntryDate,
            consecutiveMissingDays: daysSince,
            status: 'open',
            createdAt: new Date().toISOString(),
          };
          await setDoc(alertRef, alert);
          generatedAlerts.push(alert);
        }
      }
    } else {
      // No entries ever submitted
      const daysSinceCreation = getDaysDifference(
        counselee.createdAt ? counselee.createdAt.split('T')[0] : todayStr,
        todayStr
      );
      if (daysSinceCreation >= 3) {
        const alertId = `missing_new_${counselee.uid}`;
        const alertRef = doc(db, 'monitoring_alerts', alertId);
        const alert: MonitoringAlert = {
          id: alertId,
          userId: counselee.uid,
          counseleeName: counselee.displayName,
          alertType: 'missing_card',
          severity: 'warning',
          title: 'Awaiting Initial Sadhana Card (3+ Days)',
          description: `${counselee.displayName} registered ${daysSinceCreation} days ago but has not submitted their daily sadhana card for continuous 3 days.`,
          consecutiveMissingDays: daysSinceCreation,
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        await setDoc(alertRef, alert);
        generatedAlerts.push(alert);
      }
    }

    // 2. Needs Encouragement check (< 60% weekly marks)
    if (currentWeeklyPercentage !== undefined && currentWeeklyPercentage < 60) {
      const alertId = `low_score_${counselee.uid}_${todayStr.substring(0, 7)}`;
      const alertRef = doc(db, 'monitoring_alerts', alertId);
      const existingSnap = await getDoc(alertRef);

      if (!existingSnap.exists()) {
        const alert: MonitoringAlert = {
          id: alertId,
          userId: counselee.uid,
          counseleeName: counselee.displayName,
          alertType: 'low_score',
          severity: 'info',
          title: 'Needs Encouragement',
          description: `${counselee.displayName} completed ${currentWeeklyPercentage}% of available marks this period. A gentle word of spiritual encouragement can help uplift their practice.`,
          currentWeeklyScore: currentWeeklyPercentage,
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        await setDoc(alertRef, alert);
        generatedAlerts.push(alert);
      }
    }

    return generatedAlerts;
  },

  /**
   * Resolve any open missing-card alerts when user submits a new valid report
   */
  resolveMissingCardAlert: async (userId: string): Promise<void> => {
    const q = query(
      collection(db, 'monitoring_alerts'),
      where('userId', '==', userId),
      where('alertType', '==', 'missing_card'),
      where('status', '==', 'open')
    );
    const snap = await getDocs(q);
    const nowIso = new Date().toISOString();
    for (const docSnap of snap.docs) {
      await updateDoc(docSnap.ref, {
        status: 'resolved',
        resolvedAt: nowIso,
      });
    }
  },

  /**
   * Get all active (open) monitoring alerts for admin dashboard.
   * Dynamically evaluates all approved counselees for continuous 3+ days of missing sadhana.
   */
  getOpenAlerts: async (forceRefresh = false): Promise<MonitoringAlert[]> => {
    const todayStr = getTodayDateStringIST();
    const cacheKey = `open_alerts_${todayStr}`;

    if (!forceRefresh) {
      const cached = await fastCache.get<MonitoringAlert[]>(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    const alertMap = new Map<string, MonitoringAlert>();

    // 1. First, load any existing open alerts from Firestore (e.g. low_score or manual followups)
    try {
      const q = query(
        collection(db, 'monitoring_alerts'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc')
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      if (snap && !snap.empty) {
        snap.docs.forEach((d) => {
          const alert = d.data() as MonitoringAlert;
          alertMap.set(alert.id, alert);
        });
      }
    } catch (e) {
      // Continue to dynamic evaluation
    }

    // 2. Perform live dynamic audit for 3+ continuous missing days across all approved counselees
    try {
      const allUsers = await authService.getAllUsers();
      const approved = allUsers.filter((u) => u.role === 'counselee' && u.status === 'approved');

      // Date 3 days ago in IST
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      // Query entries submitted in the last 3 days in a single fast query
      const recentEntriesQuery = query(
        collection(db, 'sadhana_entries'),
        where('date', '>=', threeDaysAgoStr)
      );

      let recentSnap: any = null;
      try {
        recentSnap = await Promise.race([
          getDocs(recentEntriesQuery),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
      } catch (e) {
        // Fallback to local entries if offline
      }

      const activeInLast3Days = new Set<string>();
      if (recentSnap && !recentSnap.empty) {
        recentSnap.docs.forEach((docSnap: any) => {
          const data = docSnap.data();
          if (data.userId) {
            activeInLast3Days.add(data.userId);
          }
        });
      }

      const inactiveCounselees = approved.filter((c) => !activeInLast3Days.has(c.uid));
      await Promise.all(
        inactiveCounselees.map(async (c) => {
          try {
            const latestEntry = await Promise.race([
              sadhanaService.getLatestEntryForUser(c.uid),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
            ]);
            const lastDate = latestEntry?.date;
            const daysSince = lastDate
              ? getDaysDifference(lastDate, todayStr)
              : getDaysDifference(c.createdAt ? c.createdAt.split('T')[0] : todayStr, todayStr);

            if (daysSince >= 3) {
              const alertId = `missing_${c.uid}`;
              const alert: MonitoringAlert = {
                id: alertId,
                userId: c.uid,
                counseleeName: c.displayName,
                alertType: 'missing_card',
                severity: 'warning',
                title: 'Sadhana Pending (3+ Days)',
                description: `${c.displayName} has not submitted a daily sadhana card for ${daysSince} consecutive days${lastDate ? ` (Last submitted: ${lastDate})` : ''}.`,
                lastSubmissionDate: lastDate,
                consecutiveMissingDays: daysSince,
                status: 'open',
                createdAt: new Date().toISOString(),
              };

              alertMap.set(alertId, alert);
              // Persist alert to Firestore asynchronously
              setDoc(doc(db, 'monitoring_alerts', alertId), alert).catch(() => {});
            }
          } catch {}
        })
      );
    } catch (err) {
      console.warn('Error in dynamic open alerts evaluation:', err);
    }

    const results = Array.from(alertMap.values()).sort((a, b) => {
      // Prioritize missing_card alerts, then descending missing days
      if (a.alertType === 'missing_card' && b.alertType !== 'missing_card') return -1;
      if (b.alertType === 'missing_card' && a.alertType !== 'missing_card') return 1;
      return (b.consecutiveMissingDays || 0) - (a.consecutiveMissingDays || 0);
    });

    await fastCache.set(cacheKey, results, 90);
    return results;
  },
};
