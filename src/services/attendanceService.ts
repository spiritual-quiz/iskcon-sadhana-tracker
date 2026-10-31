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
import { WeeklyAttendance, MonthlySatsangaAttendance, MonthlyMeetingAttendance } from '../types/sadhana';
import { localStorageService } from './localStorageService';

export const attendanceService = {
  /**
   * Save Weekly Activity Attendance (Weekly Class, Morning Programme, or Service)
   */
  recordWeeklyAttendance: async (params: {
    userId: string;
    weekId: string; // e.g. "2026-W41"
    type: 'weekly_class' | 'morning_programme' | 'service';
    scheduledDate: string;
    attended: boolean;
    updatedBy: string;
  }): Promise<WeeklyAttendance> => {
    const id = `${params.userId}_${params.weekId}_${params.type}`;
    const docRef = doc(db, 'weekly_attendance', id);

    let marks = 0;
    if (params.attended) {
      if (params.type === 'morning_programme') {
        marks = 50;
      } else if (params.type === 'service') {
        marks = 10;
      } else {
        marks = 10;
      }
    }

    const record: WeeklyAttendance = {
      id,
      userId: params.userId,
      weekId: params.weekId,
      type: params.type,
      scheduledDate: params.scheduledDate,
      attended: params.attended,
      marks,
      isRecorded: true,
      updatedBy: params.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    await localStorageService.saveWeeklyAttendance(record);

    try {
      await setDoc(docRef, record);
    } catch (e) {
      // Gracefully saved in local storage
    }

    return record;
  },

  /**
   * Get Weekly Attendance for a user and week
   */
  getWeeklyAttendanceForUser: async (
    userId: string,
    weekId: string
  ): Promise<{ weeklyClass?: WeeklyAttendance; morningProgramme?: WeeklyAttendance; service?: WeeklyAttendance }> => {
    // 1. Instant check from local persistent storage (0ms latency)
    const local = await localStorageService.getWeeklyAttendanceForUser(userId, weekId);
    if (local.weeklyClass || local.morningProgramme || local.service) {
      return local;
    }

    const classId = `${userId}_${weekId}_weekly_class`;
    const morningId = `${userId}_${weekId}_morning_programme`;
    const serviceId = `${userId}_${weekId}_service`;

    try {
      const [classSnap, morningSnap, serviceSnap] = await Promise.race([
        Promise.all([
          getDoc(doc(db, 'weekly_attendance', classId)),
          getDoc(doc(db, 'weekly_attendance', morningId)),
          getDoc(doc(db, 'weekly_attendance', serviceId)),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);

      if (classSnap.exists() || morningSnap.exists() || serviceSnap.exists()) {
        const result = {
          weeklyClass: classSnap.exists() ? (classSnap.data() as WeeklyAttendance) : undefined,
          morningProgramme: morningSnap.exists() ? (morningSnap.data() as WeeklyAttendance) : undefined,
          service: serviceSnap.exists() ? (serviceSnap.data() as WeeklyAttendance) : undefined,
        };
        if (result.weeklyClass) await localStorageService.saveWeeklyAttendance(result.weeklyClass);
        if (result.morningProgramme) await localStorageService.saveWeeklyAttendance(result.morningProgramme);
        if (result.service) await localStorageService.saveWeeklyAttendance(result.service);
        return result;
      }
    } catch (e) {
      // Permission denied or offline fallback
    }

    return local;
  },

  /**
   * Save Monthly Satsanga Attendance (50 marks, dynamic attendance)
   */
  recordMonthlySatsanga: async (params: {
    userId: string;
    monthId: string; // e.g. "2026-10"
    scheduledDate: string;
    status?: 'attended' | 'absent' | 'not_conducted';
    attended?: boolean;
    conducted?: boolean;
    updatedBy: string;
  }): Promise<MonthlySatsangaAttendance> => {
    const id = `${params.userId}_${params.monthId}`;
    const docRef = doc(db, 'monthly_satsanga', id);

    const isAttended = params.status ? params.status === 'attended' : !!params.attended;
    const isConducted = params.status ? params.status !== 'not_conducted' : (params.conducted ?? true);
    const resolvedStatus = params.status || (isAttended ? 'attended' : (isConducted ? 'absent' : 'not_conducted'));

    const record: MonthlySatsangaAttendance = {
      id,
      userId: params.userId,
      monthId: params.monthId,
      scheduledDate: params.scheduledDate,
      attended: isAttended,
      conducted: isConducted,
      status: resolvedStatus,
      marks: isAttended ? 50 : 0,
      isRecorded: true,
      updatedBy: params.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    await localStorageService.saveMonthlySatsanga(record);

    try {
      await setDoc(docRef, record);
    } catch (e) {
      // Gracefully saved in local storage
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
    // 1. Instant check from local persistent storage (0ms latency)
    const local = await localStorageService.getMonthlySatsangaForUser(userId, monthId);
    if (local) {
      return local;
    }

    const id = `${userId}_${monthId}`;
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'monthly_satsanga', id)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      if (snap.exists()) {
        const data = snap.data() as MonthlySatsangaAttendance;
        await localStorageService.saveMonthlySatsanga(data);
        return data;
      }
    } catch (e) {
      // Fallback
    }

    return null;
  },

  /**
   * Save Monthly Counsellor Meeting Attendance (50 marks, monthly meeting with counsellor)
   */
  recordMonthlyMeeting: async (params: {
    userId: string;
    monthId: string; // e.g. "2026-10"
    scheduledDate: string;
    status?: 'attended' | 'absent' | 'not_conducted';
    attended?: boolean;
    conducted?: boolean;
    updatedBy: string;
  }): Promise<MonthlyMeetingAttendance> => {
    const id = `${params.userId}_${params.monthId}`;
    const docRef = doc(db, 'monthly_meeting', id);

    const isAttended = params.status ? params.status === 'attended' : !!params.attended;
    const isConducted = params.status ? params.status !== 'not_conducted' : (params.conducted ?? true);
    const resolvedStatus = params.status || (isAttended ? 'attended' : (isConducted ? 'absent' : 'not_conducted'));

    const record: MonthlyMeetingAttendance = {
      id,
      userId: params.userId,
      monthId: params.monthId,
      scheduledDate: params.scheduledDate,
      attended: isAttended,
      conducted: isConducted,
      status: resolvedStatus,
      marks: isAttended ? 50 : 0,
      isRecorded: true,
      updatedBy: params.updatedBy,
      updatedAt: new Date().toISOString(),
    };

    await localStorageService.saveMonthlyMeeting(record);

    try {
      await setDoc(docRef, record);
    } catch (e) {
      // Gracefully saved in local storage
    }

    return record;
  },

  /**
   * Get Monthly Counsellor Meeting Attendance
   */
  getMonthlyMeetingForUser: async (
    userId: string,
    monthId: string
  ): Promise<MonthlyMeetingAttendance | null> => {
    // 1. Instant check from local persistent storage (0ms latency)
    const local = await localStorageService.getMonthlyMeetingForUser(userId, monthId);
    if (local) {
      return local;
    }

    const id = `${userId}_${monthId}`;
    try {
      const snap = await Promise.race([
        getDoc(doc(db, 'monthly_meeting', id)),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      if (snap.exists()) {
        const data = snap.data() as MonthlyMeetingAttendance;
        await localStorageService.saveMonthlyMeeting(data);
        return data;
      }
    } catch (e) {
      // Fallback
    }

    return null;
  },
};
