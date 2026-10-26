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
      if (daysSince > 3) {
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
            title: 'Missing Daily Sadhana Card',
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
      if (daysSinceCreation > 3) {
        const alertId = `missing_new_${counselee.uid}`;
        const alertRef = doc(db, 'monitoring_alerts', alertId);
        const alert: MonitoringAlert = {
          id: alertId,
          userId: counselee.uid,
          counseleeName: counselee.displayName,
          alertType: 'missing_card',
          severity: 'warning',
          title: 'Awaiting Initial Sadhana Card',
          description: `${counselee.displayName} registered ${daysSinceCreation} days ago but has not submitted their first daily sadhana card yet.`,
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
   * Get all active (open) monitoring alerts for admin dashboard
   */
  getOpenAlerts: async (): Promise<MonitoringAlert[]> => {
    try {
      const q = query(
        collection(db, 'monitoring_alerts'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as MonitoringAlert);
      }
    } catch (e) {
      // Gracefully fall back to dynamic local evaluation
    }

    // Dynamic evaluation fallback: evaluate approved counselees
    try {
      const allUsers = await localStorageService.getAllUsers();
      const approved = allUsers.filter((u) => u.role === 'counselee' && u.status === 'approved');
      const todayStr = getTodayDateStringIST();
      const fallbackAlerts: MonitoringAlert[] = [];

      for (const c of approved) {
        const latestEntry = await localStorageService.getLatestEntryForUser(c.uid);
        const lastDate = latestEntry?.date;
        const daysSince = lastDate
          ? getDaysDifference(lastDate, todayStr)
          : getDaysDifference(c.createdAt ? c.createdAt.split('T')[0] : todayStr, todayStr);

        if (daysSince > 3) {
          fallbackAlerts.push({
            id: `missing_${c.uid}`,
            userId: c.uid,
            counseleeName: c.displayName,
            alertType: 'missing_card',
            severity: 'warning',
            title: 'Missing Daily Sadhana Card',
            description: `${c.displayName} has not submitted a daily sadhana card for ${daysSince} consecutive days${lastDate ? ` (Last: ${lastDate})` : ''}.`,
            lastSubmissionDate: lastDate,
            consecutiveMissingDays: daysSince,
            status: 'open',
            createdAt: new Date().toISOString(),
          });
        }
      }
      return fallbackAlerts;
    } catch (err) {
      return [];
    }
  },
};
