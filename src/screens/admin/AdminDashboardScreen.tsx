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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
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
import { notificationService } from '../../services/notificationService';
import { biometricService } from '../../services/biometricService';
import { BiometricEnrollModal } from '../../components/BiometricEnrollModal';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { theme, openThemePicker } = useTheme();
  const todayStr = getTodayDateStringIST();

  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [reminderRequestsCount, setReminderRequestsCount] = useState<number>(0);
  const [targetRequestsCount, setTargetRequestsCount] = useState<number>(0);
  const [todaySubmissionsCount, setTodaySubmissionsCount] = useState<number>(0);
  const [missingAlertsCount, setMissingAlertsCount] = useState<number>(0);
  const [lowScoreCount, setLowScoreCount] = useState<number>(0);
  const [upcomingBirthdaysCount, setUpcomingBirthdaysCount] = useState<number>(0);
  const [dailyLowScoreCount, setDailyLowScoreCount] = useState<number>(0);
  const [weeklyLowScoreCount, setWeeklyLowScoreCount] = useState<number>(0);
  const [monthlyLowScoreCount, setMonthlyLowScoreCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showAutoBioPrompt, setShowAutoBioPrompt] = useState<boolean>(false);

  useEffect(() => {
    loadDashboardMetrics();
    const checkPostLoginBio = async () => {
      if (user?.email) {
        const isEnrolled = await biometricService.isUserEnrolled(user.email);
        if (!isEnrolled) {
          const hw = await biometricService.isHardwareAvailable();
          if (hw) {
            setTimeout(() => {
              setShowAutoBioPrompt(true);
            }, 800);
          }
        }
      }
    };
    checkPostLoginBio();
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      const now = new Date();
      const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Parallelized instant fetch across all metrics
      const [allUsers, todayEntries, alerts, sharedWeekly, sharedMonthly] = await Promise.all([
        authService.getAllUsers(),
        sadhanaService.getAllEntriesForDate(todayStr),
        monitoringService.getOpenAlerts(),
        localStorageService.getSharedWeeklySummaries(todayStr).catch(() => []),
        localStorageService.getSharedMonthlySummaries(monthId).catch(() => []),
      ]);

      const approved = allUsers.filter((u) => u.role === 'counselee' && u.status === 'approved');
      const pending = allUsers.filter((u) => u.role === 'counselee' && u.status === 'pending');
      const reminderReqs = allUsers.filter((u) => u.role === 'counselee' && u.reminderOptOutRequested === true);
      const targetReqs = allUsers.filter((u) => u.role === 'counselee' && u.targetRoundsRequested && u.targetRoundsRequested > 0);
      setApprovedCount(approved.length);
      setPendingCount(pending.length);
      setReminderRequestsCount(reminderReqs.length);
      setTargetRequestsCount(targetReqs.length);

      setTodaySubmissionsCount(todayEntries.length);
      const dailyLow = todayEntries.filter((e) => (e.percentage ?? 0) < 50).length;
      setDailyLowScoreCount(dailyLow);

      const missing = alerts.filter((a) => a.alertType === 'missing_card');
      const low = alerts.filter((a) => a.alertType === 'low_score');
      setMissingAlertsCount(missing.length);
      setLowScoreCount(low.length);

      setWeeklyLowScoreCount(sharedWeekly.filter((r) => (r.percentage ?? 0) < 50).length);
      setMonthlyLowScoreCount(sharedMonthly.filter((r) => (r.percentage ?? 0) < 50).length);

      const bdays = birthdayService.getUpcomingBirthdays(approved, 30);
      setUpcomingBirthdaysCount(bdays.length);

      await notificationService.checkAndDispatchAdminAlerts(user);
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
      badge: (reminderRequestsCount + targetRequestsCount) > 0 ? `${reminderRequestsCount + targetRequestsCount} Req` : null,
      badgeColor: THEME.colors.warning,
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
      id: 'AdminReports',
      title: 'Reports',
      subtitle: 'Daily, Weekly & Monthly Audits',
      icon: 'stats-chart-outline',
      badge: (dailyLowScoreCount + weeklyLowScoreCount + monthlyLowScoreCount) > 0
        ? `${dailyLowScoreCount + weeklyLowScoreCount + monthlyLowScoreCount} < 50%`
        : `${todaySubmissionsCount} today`,
      badgeColor: (dailyLowScoreCount + weeklyLowScoreCount + monthlyLowScoreCount) > 0
        ? theme.colors.danger
        : theme.thickColor,
      color: theme.thickColor,
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading counsellor console...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
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
                  Customize background & dashboard colors
                </Text>
              </View>
            </View>
            <View style={[styles.themePill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
              <Text style={[styles.themePillText, { color: theme.thickColor }]}>Change</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.thickColor} />
            </View>
          </TouchableOpacity>

          {/* Executive Metrics Overview Strip */}
          <View style={[styles.metricsStrip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: theme.thickColor }]}>{approvedCount}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Counselees</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: theme.thickColor }, pendingCount > 0 && styles.textWarning]}>
                {pendingCount}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Pending</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: theme.thickColor }]}>{todaySubmissionsCount}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Today's Cards</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: theme.thickColor }, missingAlertsCount > 0 && styles.textDanger]}>
                {missingAlertsCount}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Inactivity</Text>
            </View>
          </View>

          {/* Alert Highlights Banner if any pending, missing, or reminder requests */}
          {(pendingCount > 0 || missingAlertsCount > 0 || reminderRequestsCount > 0 || targetRequestsCount > 0) && (
            <View style={styles.attentionBanner}>
              <Ionicons name="alert-circle" size={22} color={THEME.colors.warning} />
              <View style={styles.bannerText}>
                {targetRequestsCount > 0 && (
                  <TouchableOpacity onPress={() => navigation.navigate('ManageCounselees')} activeOpacity={0.8}>
                    <Text style={[styles.bannerItemText, { color: '#B45309' }]}>
                      📿 {targetRequestsCount} student(s) requested chanting target round change
                    </Text>
                  </TouchableOpacity>
                )}
                {reminderRequestsCount > 0 && (
                  <TouchableOpacity onPress={() => navigation.navigate('ManageCounselees')} activeOpacity={0.8}>
                    <Text style={[styles.bannerItemText, { color: '#B45309' }]}>
                      🔔 {reminderRequestsCount} student(s) requested to switch off sadhana reminders
                    </Text>
                  </TouchableOpacity>
                )}
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

          {/* Master Admin Sections Grid */}
          <Text style={[styles.sectionsTitle, { color: theme.thickColor }]}>Counselling & Monitoring Modules</Text>
          <View style={styles.grid}>
            {adminSections.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate(sec.id)}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconContainer, { backgroundColor: `${sec.color}15` }]}>
                    <Ionicons name={sec.icon as any} size={22} color={sec.color} />
                  </View>
                  {sec.badge && (
                    <View style={[styles.badge, { backgroundColor: sec.badgeColor || theme.thickColor }]}>
                      <Text style={styles.badgeText}>{sec.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{sec.title}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>{sec.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Automatic Banking Post-Login Touch Sensor Prompt */}
      <BiometricEnrollModal
        visible={showAutoBioPrompt}
        user={user}
        onClose={() => setShowAutoBioPrompt(false)}
      />
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
    padding: 12,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
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
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    marginBottom: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  metricLabel: {
    fontSize: 9,
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
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerText: {
    marginLeft: THEME.spacing.sm,
    flex: 1,
  },
  bannerItemText: {
    fontSize: 11,
    color: THEME.colors.text,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48.5%',
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
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
