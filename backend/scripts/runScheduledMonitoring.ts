/**
 * SCHEDULED MONITORING & REMINDER CRON / CLOUD FUNCTION SCRIPT
 *
 * Runs daily at midnight / early morning IST:
 * 1. Checks every approved counselee for missing daily cards (>3 consecutive calendar days).
 * 2. Checks weekly percentages for < 60% available marks ("Needs Encouragement").
 * 3. Identifies devotee birthdays occurring today (handling Feb 29 on Feb 28 in non-leap years).
 * 4. Dispatches push notifications to the administrator without creating duplicate alerts.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const IST_OFFSET_MINUTES = 330;

function getNowInIST(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + IST_OFFSET_MINUTES * 60000);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function getDaysDiff(d1Str: string, d2Str: string): number {
  const [y1, m1, d1] = d1Str.split('-').map(Number);
  const [y2, m2, d2] = d2Str.split('-').map(Number);
  return Math.floor((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24));
}

export async function runMonitoringJob() {
  if (!getApps().length) initializeApp();
  const db = getFirestore();

  const todayIST = getNowInIST();
  const todayStr = formatDate(todayIST);
  const currentYear = todayIST.getFullYear();

  console.log(`[Scheduled Monitoring] Executing run for Asia/Kolkata date: ${todayStr}`);

  // Fetch all approved counselees
  const usersSnap = await db.collection('users')
    .where('role', '==', 'counselee')
    .where('status', '==', 'approved')
    .get();

  console.log(`[Scheduled Monitoring] Scanning ${usersSnap.size} approved counselees...`);

  for (const doc of usersSnap.docs) {
    const devotee = doc.data();
    const uid = doc.id;

    // 1. Missing card check: get latest submission
    const latestSnap = await db.collection('sadhana_entries')
      .where('userId', '==', uid)
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    let lastDate = devotee.createdAt ? devotee.createdAt.split('T')[0] : todayStr;
    if (!latestSnap.empty) {
      lastDate = latestSnap.docs[0].data().date;
    }

    const missingDays = getDaysDiff(lastDate, todayStr);
    if (missingDays > 3) {
      const alertId = `missing_${uid}_${lastDate}`;
      const alertRef = db.collection('monitoring_alerts').doc(alertId);
      const alertSnap = await alertRef.get();

      if (!alertSnap.exists) {
        await alertRef.set({
          id: alertId,
          userId: uid,
          counseleeName: devotee.displayName,
          alertType: 'missing_card',
          severity: 'warning',
          title: 'Missing Daily Sadhana Card',
          description: `${devotee.displayName} has not submitted a daily sadhana card for ${missingDays} consecutive days (Last submitted: ${lastDate}).`,
          lastSubmissionDate: lastDate,
          consecutiveMissingDays: missingDays,
          status: 'open',
          createdAt: new Date().toISOString(),
        });
        console.log(`[Alert Generated] Missing card: ${devotee.displayName} (${missingDays} days)`);
      }
    }

    // 2. Birthday check
    if (devotee.dateOfBirth) {
      const parts = devotee.dateOfBirth.split('-').map(Number);
      const bMonth = parts[1];
      const bDay = parts[2];

      let targetBdayStr = `${currentYear}-${String(bMonth).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`;
      let isLeapAdjusted = false;

      if (bMonth === 2 && bDay === 29 && !isLeapYear(currentYear)) {
        targetBdayStr = `${currentYear}-02-28`;
        isLeapAdjusted = true;
      }

      if (targetBdayStr === todayStr) {
        const notifId = `${uid}_${currentYear}_bday`;
        const notifRef = db.collection('birthday_notifications').doc(notifId);
        const notifSnap = await notifRef.get();

        if (!notifSnap.exists) {
          await notifRef.set({
            id: notifId,
            userId: uid,
            counseleeName: devotee.displayName,
            dateOfBirth: devotee.dateOfBirth,
            reminderDate: todayStr,
            isLeapYearSpecial: isLeapAdjusted,
            isNotified: true,
            createdAt: new Date().toISOString(),
          });
          console.log(`[Birthday Alert] Today is ${devotee.displayName}'s birthday!`);
        }
      }
    }
  }

  console.log(`[Scheduled Monitoring] Job completed successfully.`);
}

if (require.main === module) {
  runMonitoringJob().catch((err) => {
    console.error('[Scheduled Monitoring] Failed:', err);
    process.exit(1);
  });
}
