import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { ScoreCard } from '../../components/ScoreCard';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { reportService } from '../../services/reportService';
import { getTodayDateStringIST, getNowInIST } from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';
import { WeeklyReport, MonthlyReport } from '../../types/report';
import { reminderService } from '../../services/reminderService';
import { notificationService } from '../../services/notificationService';

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme, openThemePicker } = useTheme();
  const todayStr = getTodayDateStringIST();

  const [todayEntry, setTodayEntry] = useState<SadhanaEntry | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [user?.uid])
  );

  const formatNumericDate = (isoDate?: string) => {
    if (!isoDate || !isoDate.includes('-')) return isoDate || '';
    const [y, m, d] = isoDate.split('-');
    return `${parseInt(d, 10)}-${parseInt(m, 10)}-${y}`;
  };

  const loadHomeData = async () => {
    if (!user?.uid) return;
    try {
      const now = new Date();
      const [entry, week, month] = await Promise.all([
        sadhanaService.getDailyEntry(user.uid, todayStr),
        reportService.generateWeeklyReport({
          userId: user.uid,
          counseleeName: user.displayName,
          weekDateString: todayStr,
          publishSharedSummary: true,
          publicConsent: user.publicAppreciationConsent,
        }),
        reportService.generateMonthlyReport({
          userId: user.uid,
          counseleeName: user.displayName,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        }),
      ]);
      setTodayEntry(entry);
      setWeeklyReport(week);
      setMonthlyReport(month);

      if (entry) {
        // Today is already filled, ensure reminder notification does NOT come
        await notificationService.cancelTodayReminders();
      } else {
        // Devotee has not filled today's card yet: check and schedule mobile notification with short chime
        await notificationService.setupNotifications();
        await notificationService.checkAndTriggerSadhanaReminder(user);
        await notificationService.scheduleDailyReminders(user);
      }
    } catch (e) {
      console.warn('Error loading home data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadHomeData();
  };

  const remindersInfo = reminderService.getDailyReminders(user, todayEntry);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Bhakti Unnati"
        subtitle={`Hare Krishna, ${user?.displayName || 'Devotee'}`}
        rightAction={{
          iconName: 'notifications-outline',
          onPress: () => navigation.navigate('Notifications'),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading devotional dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Quick Theme Customization Card */}
          <TouchableOpacity
            style={[
              styles.themeCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={openThemePicker}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.themeIconCircle, { backgroundColor: theme.thickColor }]}>
                <Ionicons name="color-palette" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.themeTitle, { color: theme.colors.text }]}>
                  Color Theme: <Text style={{ color: theme.thickColor, fontWeight: 'bold' }}>{theme.name}</Text>
                </Text>
                <Text style={[styles.themeSubtitle, { color: theme.colors.textMuted }]}>
                  Change background & header color
                </Text>
              </View>
            </View>
            <View style={[styles.themePill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
              <Text style={[styles.themePillText, { color: theme.thickColor }]}>Change</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.thickColor} />
            </View>
          </TouchableOpacity>
          {/* Active Mandatory Sadhana Reminder (6 PM & 9 PM) */}
          {remindersInfo.pendingReminders.length > 0 && (
            <View
              style={[
                styles.reminderBanner,
                remindersInfo.pendingReminders[remindersInfo.pendingReminders.length - 1].isUrgent
                  ? styles.reminderBannerUrgent
                  : styles.reminderBannerRegular,
              ]}
            >
              <View style={styles.reminderIconCircle}>
                <Ionicons
                  name={
                    remindersInfo.pendingReminders[remindersInfo.pendingReminders.length - 1].isUrgent
                      ? 'alert-circle'
                      : 'alarm-outline'
                  }
                  size={24}
                  color={
                    remindersInfo.pendingReminders[remindersInfo.pendingReminders.length - 1].isUrgent
                      ? '#DC2626'
                      : '#D97706'
                  }
                />
              </View>
              <View style={styles.reminderTextContainer}>
                <View style={styles.reminderBadgeRow}>
                  <Text style={styles.reminderBadgeText}>
                    {remindersInfo.pendingReminders[remindersInfo.pendingReminders.length - 1].timeLabel}
                  </Text>
                  <Text style={styles.mandatoryBadgeText}>Mandatory Reminder</Text>
                </View>
                <Text style={styles.reminderTitle}>
                  {remindersInfo.pendingReminders[remindersInfo.pendingReminders.length - 1].title}
                </Text>
                <Text style={styles.reminderSubtitle}>
                  {remindersInfo.pendingReminders[remindersInfo.pendingReminders.length - 1].message}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reminderFillBtn}
                onPress={() => navigation.navigate('DailySadhana')}
              >
                <Text style={styles.reminderFillBtnText}>Fill Card</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Today's Status Banner */}
          <View style={[styles.todayBanner, todayEntry ? styles.bannerDone : styles.bannerPending]}>
            <View style={styles.bannerIconCircle}>
              <Ionicons
                name={todayEntry ? 'checkmark-circle' : 'hourglass-outline'}
                size={28}
                color={todayEntry ? THEME.colors.success : THEME.colors.warning}
              />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>
                {todayEntry ? 'Today’s Card Submitted' : 'Daily Card Pending'}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {todayEntry
                  ? `Score: ${todayEntry.dailyTotalScore}/50 (${todayEntry.grade})`
                  : 'Track your japa, reading, hearing & rest today'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bannerButton}
              onPress={() => navigation.navigate('DailySadhana')}
            >
              <Text style={styles.bannerButtonText}>{todayEntry ? 'Edit' : 'Fill Now'}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Devotee Profile Pill */}
          <View style={styles.quickProfileCard}>
            <View style={styles.quickProfileLeft}>
              <View style={styles.quickAvatarCircle}>
                <Ionicons name="person" size={16} color={THEME.colors.gold} />
              </View>
              <View>
                <Text style={styles.quickProfileName}>{user?.displayName || 'Devotee'}</Text>
                <Text style={styles.quickProfilePhone}>{user?.phoneNumber || 'No phone added'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.quickEditBtn}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="create-outline" size={14} color={THEME.colors.primary} />
              <Text style={styles.quickEditBtnText}>Edit Details</Text>
            </TouchableOpacity>
          </View>

          {/* Current Week Summary */}
          {weeklyReport && (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Current Week Progress</Text>
              <ScoreCard
                title={`${formatNumericDate(weeklyReport.startDate)} to ${formatNumericDate(weeklyReport.endDate)}`}
                score={weeklyReport.totalScore}
                maxScore={weeklyReport.maxAvailableMarks}
                percentage={weeklyReport.percentage}
                grade={weeklyReport.grade}
                breakdown={{
                  classMarks: weeklyReport.weeklyClassMarks,
                  morningMarks: weeklyReport.morningProgrammeMarks,
                  onlineReadingMarks: weeklyReport.onlineReadingMarks,
                }}
              />
            </View>
          )}

          {/* Current Month Summary */}
          {monthlyReport && (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Current Month Progress</Text>
              <ScoreCard
                title={monthlyReport.monthName}
                score={monthlyReport.totalScore}
                maxScore={monthlyReport.maxAvailableMarks}
                percentage={monthlyReport.percentage}
                grade={monthlyReport.grade}
                breakdown={{
                  classMarks: monthlyReport.weeklyClassesMarks,
                  morningMarks: monthlyReport.morningProgrammesMarks,
                  satsangaMarks: monthlyReport.satsangaMarks,
                }}
              />
            </View>
          )}

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, styles.statBoxRounds]}>
              <Ionicons name="radio-button-on" size={24} color={THEME.colors.goldDark} />
              <Text style={[styles.statNumber, { color: THEME.colors.goldDark }]}>{weeklyReport?.totalRounds || 0}</Text>
              <Text style={styles.statLabel}>Week Rounds</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxReading]}>
              <Ionicons name="book-outline" size={24} color={THEME.colors.primary} />
              <Text style={[styles.statNumber, { color: THEME.colors.primary }]}>{weeklyReport?.totalReadingMinutes || 0}m</Text>
              <Text style={styles.statLabel}>Week Reading</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxHearing]}>
              <Ionicons name="headset-outline" size={24} color={THEME.colors.info} />
              <Text style={[styles.statNumber, { color: THEME.colors.info }]}>{weeklyReport?.totalHearingMinutes || 0}m</Text>
              <Text style={styles.statLabel}>Week Hearing</Text>
            </View>
          </View>

          {/* Spiritual Quote / Prabhupada Vani */}
          <View style={styles.quoteCard}>
            <Ionicons name="flower" size={20} color={THEME.colors.gold} style={styles.quoteIcon} />
            <Text style={styles.quoteText}>
              "Sadhana-bhakti is the steady practice of devotional service. By chanting sincerely and
              reading every day, one naturally awakens love for Sri Krishna."
            </Text>
            <Text style={styles.quoteAuthor}>— His Divine Grace A.C. Bhaktivedanta Swami Prabhupāda</Text>
          </View>

          {/* Navigation Shortcuts */}
          <View style={styles.shortcutsRow}>
            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('MyReports')}
            >
              <Ionicons name="stats-chart-outline" size={24} color={THEME.colors.primary} />
              <Text style={styles.shortcutTitle}>My Reports</Text>
              <Text style={styles.shortcutSubtitle}>Daily, Weekly & Monthly</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={() => navigation.navigate('Community')}
            >
              <Ionicons name="people-outline" size={24} color={THEME.colors.goldDark} />
              <Text style={styles.shortcutTitle}>Community</Text>
              <Text style={styles.shortcutSubtitle}>Devotee Summaries</Text>
            </TouchableOpacity>
          </View>
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
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  themeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1.5,
    marginBottom: THEME.spacing.base,
    ...THEME.shadows.medium,
  },
  reminderBannerRegular: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  reminderBannerUrgent: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  reminderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reminderTextContainer: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  reminderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  reminderBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  mandatoryBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  reminderTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  reminderSubtitle: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 15,
  },
  reminderFillBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    marginLeft: 8,
  },
  reminderFillBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    marginBottom: 10,
    ...THEME.shadows.soft,
  },
  quickProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.soft,
  },
  quickProfileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  quickAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quickProfileName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  quickProfilePhone: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  quickEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickEditBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  bannerDone: {
    backgroundColor: THEME.colors.successLight,
    borderColor: '#A7F3D0',
  },
  bannerPending: {
    backgroundColor: THEME.colors.warningLight,
    borderColor: '#FDE68A',
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  bannerTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  bannerSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: THEME.borderRadius.md,
  },
  bannerButtonText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.xs,
  },
  section: {
    marginBottom: THEME.spacing.base,
  },
  sectionHeaderTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.base,
  },
  statBox: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.base,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  statBoxRounds: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statBoxReading: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statBoxHearing: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  statNumber: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  quoteCard: {
    backgroundColor: '#FFEDD5',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderLeftWidth: 5,
    borderLeftColor: '#EA580C',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: THEME.spacing.base,
    ...THEME.shadows.soft,
  },
  quoteIcon: {
    marginBottom: 4,
  },
  quoteText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  quoteAuthor: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primaryDark,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'right',
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  shortcutTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: 6,
  },
  shortcutSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
