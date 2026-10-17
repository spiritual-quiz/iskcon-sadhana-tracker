import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile } from '../../types/auth';
import { reportService } from '../../services/reportService';
import { attendanceService } from '../../services/attendanceService';
import { authService } from '../../services/authService';
import { getTodayDateStringIST, getWeekDetails } from '../../utils/dateUtils';
import { WeeklyReport } from '../../types/report';
import { useAuth } from '../../context/AuthContext';

export const AdminWeeklyReportsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const todayStr = getTodayDateStringIST();
  const { weekId, startDate, endDate } = getWeekDetails(todayStr);

  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = async () => {
    try {
      const allCounselees = await authService.getAllCounselees();
      const approvedUsers = allCounselees.filter((u) => u.status === 'approved');
      setCounselees(approvedUsers);

      const reports = await Promise.all(
        approvedUsers.map((u) =>
          reportService.generateWeeklyReport({
            userId: u.uid,
            counseleeName: u.displayName,
            weekDateString: todayStr,
            publishSharedSummary: true,
            publicConsent: u.publicAppreciationConsent,
          })
        )
      );
      setWeeklyReports(reports);
    } catch (e) {
      console.warn('Error loading weekly reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleToggleAttendance = async (
    userId: string,
    type: 'weekly_class' | 'morning_programme',
    currentAttended: boolean
  ) => {
    setUpdatingId(`${userId}_${type}`);
    try {
      await attendanceService.recordWeeklyAttendance({
        userId,
        weekId,
        type,
        scheduledDate: todayStr,
        attended: !currentAttended,
        updatedBy: user?.uid || 'admin',
      });
      await loadWeeklyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Weekly Reports & Attendance"
        subtitle={`Week: ${weekId} (${startDate} to ${endDate})`}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Compiling weekly reports & attendance...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadWeeklyData(); }} />}
        >
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              Weekly Max Marks: 350 (Daily: 280, Online Reading Mon–Fri: 50, Weekly Class: 10, Morning Programme: 10).
              Tap attendance pills to mark devotee attendance.
            </Text>
          </View>

          {weeklyReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No approved counselees found.</Text>
            </View>
          ) : (
            weeklyReports.map((rep) => (
              <View key={rep.userId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.name}>{rep.counseleeName}</Text>
                    <Text style={styles.scoreText}>
                      Score: {rep.totalScore} / {rep.maxAvailableMarks} ({rep.percentage}%)
                    </Text>
                  </View>
                  <StatusBadge type="grade" value={rep.grade} />
                </View>

                {/* Attendance Toggles */}
                <View style={styles.attendanceRow}>
                  <TouchableOpacity
                    style={[
                      styles.attPill,
                      rep.weeklyClassAttendance ? styles.attPillActive : styles.attPillInactive,
                    ]}
                    onPress={() =>
                      handleToggleAttendance(rep.userId, 'weekly_class', rep.weeklyClassAttendance)
                    }
                    disabled={updatingId === `${rep.userId}_weekly_class`}
                  >
                    <Ionicons
                      name={rep.weeklyClassAttendance ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={rep.weeklyClassAttendance ? THEME.colors.textInverse : THEME.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.attPillText,
                        rep.weeklyClassAttendance && styles.attPillTextActive,
                      ]}
                    >
                      Weekly Class ({rep.weeklyClassMarks}/10)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.attPill,
                      rep.morningProgrammeAttendance ? styles.attPillActive : styles.attPillInactive,
                    ]}
                    onPress={() =>
                      handleToggleAttendance(
                        rep.userId,
                        'morning_programme',
                        rep.morningProgrammeAttendance
                      )
                    }
                    disabled={updatingId === `${rep.userId}_morning_programme`}
                  >
                    <Ionicons
                      name={rep.morningProgrammeAttendance ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={
                        rep.morningProgrammeAttendance ? THEME.colors.textInverse : THEME.colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.attPillText,
                        rep.morningProgrammeAttendance && styles.attPillTextActive,
                      ]}
                    >
                      Morning Prog ({rep.morningProgrammeMarks}/10)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Online Reading Session Strip */}
                <View style={styles.onlineReadingStrip}>
                  <Ionicons name="laptop-outline" size={15} color="#2563EB" />
                  <Text style={styles.onlineReadingStripText}>
                    Online Reading (Mon–Fri): <Text style={{ fontWeight: 'bold', color: '#1D4ED8' }}>{rep.onlineReadingDaysAttended}/5 Days</Text> ({rep.onlineReadingMarks}/50 marks)
                  </Text>
                </View>

                <View style={styles.statsStrip}>
                  <Text style={styles.statItem}>Rounds: {rep.totalRounds}</Text>
                  <Text style={styles.statItem}>Reading: {rep.totalReadingMinutes}m</Text>
                  <Text style={styles.statItem}>Hearing: {rep.totalHearingMinutes}m</Text>
                  {rep.missingReportDays > 0 && (
                    <Text style={styles.missingItem}>Missing: {rep.missingReportDays}d</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: THEME.spacing.sm,
    color: THEME.colors.textMuted,
  },
  scrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  infoBanner: {
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    marginBottom: THEME.spacing.base,
  },
  infoBannerText: {
    fontSize: 11,
    color: THEME.colors.primaryDark,
    lineHeight: 16,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  scoreText: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  attPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  attPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  attPillInactive: {
    backgroundColor: THEME.colors.surfaceVariant,
    borderColor: THEME.colors.border,
  },
  attPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  attPillTextActive: {
    color: THEME.colors.textInverse,
  },
  onlineReadingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 6,
    gap: 6,
  },
  onlineReadingStripText: {
    fontSize: 10,
    color: '#1E40AF',
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  statItem: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  missingItem: {
    fontSize: 10,
    color: THEME.colors.danger,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
  },
});
