import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WeeklyAttendance, MonthlySatsangaAttendance } from '../types/sadhana';
import { localStorageService } from './localStorageService';

export const attendanceService = {
  /**
   * Save Weekly Activity Attendance (Weekly Class or Morning Programme)
   */
  recordWeeklyAttendance: async (params: {
    userId: string;
    weekId: string; // e.g. "2026-W41"
    type: 'weekly_class' | 'morning_programme';
    scheduledDate: string;
    attended: boolean;
    updatedBy: string;
  }): Promise<WeeklyAttendance> => {
    const id = `${params.userId}_${params.weekId}_${params.type}`;
    const docRef = doc(db, 'weekly_attendance', id);

    const record: WeeklyAttendance = {
      id,
      userId: params.userId,
      weekId: params.weekId,
      type: params.type,
      scheduledDate: params.scheduledDate,
      attended: params.attended,
      marks: params.attended ? 10 : 0,
      isRecorded: true,
      updatedBy: params.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    await localStorageService.saveWeeklyAttendance(record);

    try {
      await setDoc(docRef, record);
    } catch (e) {
      console.warn('Firestore weekly attendance write fallback:', e);
    }

    return record;
  },

  /**
   * Get Weekly Attendance for a user and week
   */
  getWeeklyAttendanceForUser: async (
    userId: string,
    weekId: string
  ): Promise<{ weeklyClass?: WeeklyAttendance; morningProgramme?: WeeklyAttendance }> => {
    const classId = `${userId}_${weekId}_weekly_class`;
    const morningId = `${userId}_${weekId}_morning_programme`;

    try {
      const [classSnap, morningSnap] = await Promise.all([
        getDoc(doc(db, 'weekly_attendance', classId)),
        getDoc(doc(db, 'weekly_attendance', morningId)),
      ]);

      if (classSnap.exists() || morningSnap.exists()) {
        const result = {
          weeklyClass: classSnap.exists() ? (classSnap.data() as WeeklyAttendance) : undefined,
          morningProgramme: morningSnap.exists() ? (morningSnap.data() as WeeklyAttendance) : undefined,
        };
        if (result.weeklyClass) await localStorageService.saveWeeklyAttendance(result.weeklyClass);
        if (result.morningProgramme) await localStorageService.saveWeeklyAttendance(result.morningProgramme);
        return result;
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return await localStorageService.getWeeklyAttendanceForUser(userId, weekId);
  },

  /**
   * Save Monthly Satsanga Attendance
   */
  recordMonthlySatsanga: async (params: {
    userId: string;
    monthId: string; // e.g. "2026-10"
    scheduledDate: string;
    attended: boolean;
    updatedBy: string;
  }): Promise<MonthlySatsangaAttendance> => {
    const id = `${params.userId}_${params.monthId}`;
    const docRef = doc(db, 'monthly_satsanga', id);

    const record: MonthlySatsangaAttendance = {
      id,
      userId: params.userId,
      monthId: params.monthId,
      scheduledDate: params.scheduledDate,
      attended: params.attended,
      marks: params.attended ? 10 : 0,
      isRecorded: true,
      updatedBy: params.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    await localStorageService.saveMonthlySatsanga(record);

    try {
      await setDoc(docRef, record);
    } catch (e) {
      console.warn('Firestore monthly satsanga write fallback:', e);
    }

    return record;
  },

  /**
   * Get Monthly Satsanga Attendance
   */
  getMonthlySatsangaForUser: async (
    userId: string,
    monthId: string
  ): Promise<MonthlySatsangaAttendance | null> => {
    const id = `${userId}_${monthId}`;
    try {
      const snap = await getDoc(doc(db, 'monthly_satsanga', id));
      if (snap.exists()) {
        const data = snap.data() as MonthlySatsangaAttendance;
        await localStorageService.saveMonthlySatsanga(data);
        return data;
      }
    } catch (e) {
      // Fallback
    }

    return await localStorageService.getMonthlySatsangaForUser(userId, monthId);
  },
};
