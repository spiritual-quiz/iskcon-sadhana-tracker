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
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile } from '../../types/auth';
import { reportService } from '../../services/reportService';
import { attendanceService } from '../../services/attendanceService';
import { authService } from '../../services/authService';
import { getTodayDateStringIST, getWeekDetails, formatMinutesToHours, calculateSleepDurationMinutes } from '../../utils/dateUtils';
import { WeeklyReport } from '../../types/report';
import { useAuth } from '../../context/AuthContext';

export const AdminWeeklyReportsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();
  const { weekId, startDate, endDate } = getWeekDetails(todayStr);

  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'lowScore'>('all');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
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

  const lowScoreCount = weeklyReports.filter((r) => (r.percentage ?? 0) < 50).length;
  const displayedReports = filterMode === 'lowScore' ? weeklyReports.filter((r) => (r.percentage ?? 0) < 50) : weeklyReports;

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

          {/* Quick Filter Bar */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[styles.filterPill, filterMode === 'all' && styles.filterPillActive]}
              onPress={() => setFilterMode('all')}
            >
              <Text style={[styles.filterPillText, filterMode === 'all' && styles.filterPillTextActive]}>
                All Counselees ({weeklyReports.length})
              </Text>
            </TouchableOpacity>

            {lowScoreCount > 0 && (
              <TouchableOpacity
                style={[styles.filterPillAlert, filterMode === 'lowScore' && styles.filterPillAlertActive]}
                onPress={() => setFilterMode(filterMode === 'lowScore' ? 'all' : 'lowScore')}
              >
                <Ionicons
                  name="warning"
                  size={13}
                  color={filterMode === 'lowScore' ? '#FFFFFF' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.filterPillAlertText,
                    filterMode === 'lowScore' && styles.filterPillAlertTextActive,
                  ]}
                >
                  &lt; 50% Needs Attention ({lowScoreCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {displayedReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {filterMode === 'lowScore'
                  ? 'All counselees have scored 50% or above this week!'
                  : 'No approved counselees found.'}
              </Text>
            </View>
          ) : (
            displayedReports.map((rep) => {
              const isLowScore = (rep.percentage ?? 0) < 50;
              const isExpanded = expandedUserId === rep.userId;

              return (
              <View key={rep.userId} style={[styles.card, isLowScore && styles.cardLowScore]}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => setExpandedUserId(isExpanded ? null : rep.userId)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={[styles.name, { color: theme.thickColor }, isLowScore && styles.nameAlert]}>{rep.counseleeName}</Text>
                      {isLowScore && (
                        <View style={styles.lowScoreAlertBadge}>
                          <Ionicons name="warning" size={11} color="#DC2626" />
                          <Text style={styles.lowScoreAlertBadgeText}>&lt; 50% Attention</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.scoreText, isLowScore && styles.scoreTextAlert]}>
                      Score: {rep.totalScore} / {rep.maxAvailableMarks} ({rep.percentage}%)
                    </Text>
                  </View>
                  <StatusBadge type="grade" value={rep.grade} />
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={THEME.colors.textMuted}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>

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
                      Morning Prog ({rep.morningProgrammeMarks}/50)
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

                {/* Expandable 7-Day Detailed Breakdown (Requirement 2) */}
                {isExpanded && (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.thickColor, marginBottom: 6 }}>
                      Full 7-Day Devotee Sadhana Details:
                    </Text>
                    {rep.dailyEntries.map((dayEntry, idx) => {
                      if (!dayEntry) {
                        return (
                          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, color: THEME.colors.textMuted }}>Day {idx + 1}:</Text>
                            <Text style={{ fontSize: 11, color: '#DC2626' }}>No Card Submitted</Text>
                          </View>
                        );
                      }
                      const sleepM = calculateSleepDurationMinutes(dayEntry.sleepTimeStr, dayEntry.wakeUpTimeStr);
                      return (
                        <View key={dayEntry.id || idx} style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.thickColor }}>{dayEntry.date}</Text>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#15803D' }}>
                              {dayEntry.dailyTotalScore}/50 marks ({dayEntry.percentage}%)
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: THEME.colors.text }}>
                            • Japa: {dayEntry.completedRounds}/{dayEntry.declaredRounds} rounds ({dayEntry.japaMarks}m @ {dayEntry.completionTimeStr || 'N/A'})
                          </Text>
                          <Text style={{ fontSize: 11, color: THEME.colors.text }}>
                            • Read: {dayEntry.readingMinutes}m ({dayEntry.readingMarks}m) • Hear: {dayEntry.hearingMinutes}m ({dayEntry.hearingMarks}m)
                          </Text>
                          <Text style={{ fontSize: 11, color: THEME.colors.text }}>
                            • Sleeping: Bed {dayEntry.sleepTimeStr || 'N/A'} - Wake {dayEntry.wakeUpTimeStr || 'N/A'} ({formatMinutesToHours(sleepM)}) • Day Rest: {dayEntry.restMinutes || 0}m
                          </Text>
                          <Text style={{ fontSize: 11, color: dayEntry.onlineReadingAttended ? '#15803D' : '#9CA3AF' }}>
                            • Online Reading Session: {dayEntry.onlineReadingAttended ? 'Present (10m)' : 'Absent (0m)'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
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
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: THEME.spacing.base,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  filterPillAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 5,
  },
  filterPillAlertActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterPillAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  filterPillAlertTextActive: {
    color: '#FFFFFF',
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
  cardLowScore: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 5,
    borderLeftColor: '#DC2626',
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
  nameAlert: {
    color: '#991B1B',
  },
  lowScoreAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  lowScoreAlertBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  scoreText: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreTextAlert: {
    color: '#DC2626',
    fontWeight: 'bold',
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
