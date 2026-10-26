import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getTodayDateStringIST } from '../../utils/dateUtils';
import { UserProfile } from '../../types/auth';
import { monitoringService } from '../../services/monitoringService';
import { birthdayService } from '../../services/birthdayService';
import { authService } from '../../services/authService';
import { sadhanaService } from '../../services/sadhanaService';
import { reportService } from '../../services/reportService';
import { localStorageService } from '../../services/localStorageService';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, signOut } = useAuth();
  const todayStr = getTodayDateStringIST();

  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [todaySubmissionsCount, setTodaySubmissionsCount] = useState<number>(0);
  const [missingAlertsCount, setMissingAlertsCount] = useState<number>(0);
  const [lowScoreCount, setLowScoreCount] = useState<number>(0);
  const [upcomingBirthdaysCount, setUpcomingBirthdaysCount] = useState<number>(0);
  const [dailyLowScoreCount, setDailyLowScoreCount] = useState<number>(0);
  const [weeklyLowScoreCount, setWeeklyLowScoreCount] = useState<number>(0);
  const [monthlyLowScoreCount, setMonthlyLowScoreCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      // 1. Fetch Users
      const allUsers = await authService.getAllUsers();

      const approved = allUsers.filter((u) => u.role === 'counselee' && u.status === 'approved');
      const pending = allUsers.filter((u) => u.role === 'counselee' && u.status === 'pending');
      setApprovedCount(approved.length);
      setPendingCount(pending.length);

      // 2. Today's submissions & low score count (<50%)
      const todayEntries = await sadhanaService.getAllEntriesForDate(todayStr);
      setTodaySubmissionsCount(todayEntries.length);
      const dailyLow = todayEntries.filter((e) => (e.percentage ?? 0) < 50).length;
      setDailyLowScoreCount(dailyLow);

      // 3. Open monitoring alerts
      const alerts = await monitoringService.getOpenAlerts();
      const missing = alerts.filter((a) => a.alertType === 'missing_card');
      const low = alerts.filter((a) => a.alertType === 'low_score');
      setMissingAlertsCount(missing.length);
      setLowScoreCount(low.length);

      // 4. Weekly & Monthly <50% counts (read directly from cached summaries for instant speed)
      try {
        const sharedWeekly = await localStorageService.getSharedWeeklySummaries(todayStr);
        setWeeklyLowScoreCount(sharedWeekly.filter((r) => (r.percentage ?? 0) < 50).length);

        const now = new Date();
        const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const sharedMonthly = await localStorageService.getSharedMonthlySummaries(monthId);
        setMonthlyLowScoreCount(sharedMonthly.filter((r) => (r.percentage ?? 0) < 50).length);
      } catch (repErr) {
        // Safe fallback
      }

      // 5. Upcoming birthdays
      const bdays = birthdayService.getUpcomingBirthdays(approved, 30);
      setUpcomingBirthdaysCount(bdays.length);
    } catch (e) {
      console.warn('Error loading admin dashboard metrics:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDashboardMetrics();
  };

  const adminSections = [
    {
      id: 'ManageCounselees',
      title: 'Manage Counselees',
      subtitle: `${approvedCount} active devotees`,
      icon: 'people-outline',
      badge: null,
      color: THEME.colors.primary,
    },
    {
      id: 'PendingRegistrations',
      title: 'Pending Approvals',
      subtitle: `${pendingCount} awaiting approval`,
      icon: 'person-add-outline',
      badge: pendingCount > 0 ? String(pendingCount) : null,
      badgeColor: THEME.colors.warning,
      color: THEME.colors.goldDark,
    },
    {
      id: 'Invitations',
      title: 'Invitations & QR',
      subtitle: 'Generate & share codes',
      icon: 'qr-code-outline',
      badge: null,
      color: THEME.colors.primaryLight,
    },
    {
      id: 'SadhanaMonitoring',
      title: 'Sadhana Monitoring',
      subtitle: `${missingAlertsCount} missing cards, ${lowScoreCount} flags`,
      icon: 'pulse-outline',
      badge: missingAlertsCount > 0 ? String(missingAlertsCount) : null,
      badgeColor: THEME.colors.danger,
      color: THEME.colors.danger,
    },
    {
      id: 'AdminDailyReports',
      title: 'Daily Reports',
      subtitle: `${todaySubmissionsCount} submissions today`,
      icon: 'calendar-outline',
      badge: dailyLowScoreCount > 0 ? `${dailyLowScoreCount} < 50%` : null,
      badgeColor: THEME.colors.danger,
      color: THEME.colors.primary,
    },
    {
      id: 'AdminWeeklyReports',
      title: 'Weekly Reports',
      subtitle: 'Class & morning attendance',
      icon: 'bar-chart-outline',
      badge: weeklyLowScoreCount > 0 ? `${weeklyLowScoreCount} < 50%` : null,
      badgeColor: THEME.colors.danger,
      color: THEME.colors.info,
    },
    {
      id: 'AdminMonthlyReports',
      title: 'Monthly Reports',
      subtitle: 'Satsanga & consistency',
      icon: 'pie-chart-outline',
      badge: monthlyLowScoreCount > 0 ? `${monthlyLowScoreCount} < 50%` : null,
      badgeColor: THEME.colors.danger,
      color: THEME.colors.goldDark,
    },
    {
      id: 'BirthdayReminders',
      title: 'Birthday Reminders',
      subtitle: `${upcomingBirthdaysCount} upcoming in 30 days`,
      icon: 'gift-outline',
      badge: upcomingBirthdaysCount > 0 ? String(upcomingBirthdaysCount) : null,
      badgeColor: THEME.colors.goldDark,
      color: THEME.colors.goldDark,
    },
    {
      id: 'FollowUpHistory',
      title: 'Follow-up History',
      subtitle: 'Audit logs & messages',
      icon: 'chatbubbles-outline',
      badge: null,
      color: THEME.colors.primaryDark,
    },
    {
      id: 'SadhanaAppreciation',
      title: 'Sadhana Appreciation',
      subtitle: 'Inspire sincere effort',
      icon: 'sparkles-outline',
      badge: null,
      color: THEME.colors.gold,
    },
    {
      id: 'SettingsExport',
      title: 'Settings & Export',
      subtitle: 'Grades, rules & export',
      icon: 'settings-outline',
      badge: null,
      color: THEME.colors.textMuted,
    },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Counsellor Dashboard"
        subtitle={`Hare Krishna, ${user?.displayName || 'Madhav Charan Das'}`}
        rightAction={{
          iconName: 'log-out-outline',
          onPress: signOut,
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading counsellor console...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Executive Metrics Overview Strip */}
          <View style={styles.metricsStrip}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{approvedCount}</Text>
              <Text style={styles.metricLabel}>Counselees</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, pendingCount > 0 && styles.textWarning]}>
                {pendingCount}
              </Text>
              <Text style={styles.metricLabel}>Pending</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{todaySubmissionsCount}</Text>
              <Text style={styles.metricLabel}>Today's Cards</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, missingAlertsCount > 0 && styles.textDanger]}>
                {missingAlertsCount}
              </Text>
              <Text style={styles.metricLabel}>Inactivity</Text>
            </View>
          </View>

          {/* Alert Highlights Banner if any pending or missing */}
          {(pendingCount > 0 || missingAlertsCount > 0) && (
            <View style={styles.attentionBanner}>
              <Ionicons name="alert-circle" size={22} color={THEME.colors.warning} />
              <View style={styles.bannerText}>
                {pendingCount > 0 && (
                  <Text style={styles.bannerItemText}>
                    • {pendingCount} new devotee registration(s) awaiting approval
                  </Text>
                )}
                {missingAlertsCount > 0 && (
                  <Text style={styles.bannerItemText}>
                    • {missingAlertsCount} counselee(s) haven't submitted cards for &gt;3 days
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* 12 Master Admin Sections Grid */}
          <Text style={styles.sectionsTitle}>Counselling & Monitoring Modules</Text>
          <View style={styles.grid}>
            {adminSections.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                style={styles.card}
                onPress={() => navigation.navigate(sec.id)}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconContainer, { backgroundColor: `${sec.color}15` }]}>
                    <Ionicons name={sec.icon as any} size={22} color={sec.color} />
                  </View>
                  {sec.badge && (
                    <View style={[styles.badge, { backgroundColor: sec.badgeColor || THEME.colors.primary }]}>
                      <Text style={styles.badgeText}>{sec.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitle}>{sec.title}</Text>
                <Text style={styles.cardSubtitle}>{sec.subtitle}</Text>
              </TouchableOpacity>
            ))}
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
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: THEME.spacing.md,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '70%',
    backgroundColor: THEME.colors.borderLight,
    alignSelf: 'center',
  },
  metricValue: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  textWarning: {
    color: THEME.colors.warning,
  },
  textDanger: {
    color: THEME.colors.danger,
  },
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.warningLight,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerText: {
    marginLeft: THEME.spacing.sm,
    flex: 1,
  },
  bannerItemText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionsTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textInverse,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  cardSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
