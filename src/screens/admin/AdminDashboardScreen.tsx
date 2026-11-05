import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
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
import { updateService } from '../../services/updateService';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { theme, openThemePicker } = useTheme();
  const todayStr = getTodayDateStringIST();
  const currentAppVersion = updateService.getCurrentVersion();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);

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

  const alertedPendingUidsRef = useRef<Set<string>>(new Set());
  const lastFetchedTimeRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      // Re-check metrics with cache (<1ms response time) without freezing the UI
      loadDashboardMetrics(false);
    }, [])
  );

  useEffect(() => {
    // 1. Initial metrics load
    loadDashboardMetrics();

    // 2. Real-time listener for newly registered pending counselees from Firestore
    try {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const pendingDevotees = snap.docs
              .map((d) => d.data() as UserProfile)
              .filter((u) => u.role !== 'counsellor' && u.status === 'pending');
            setPendingCount(pendingDevotees.length);

            // Find any newly arrived pending devotee who has not been popped up yet
            const unalerted = pendingDevotees.filter((d) => !alertedPendingUidsRef.current.has(d.uid));
            if (unalerted.length > 0) {
              unalerted.forEach((d) => alertedPendingUidsRef.current.add(d.uid));
              Alert.alert(
                'New Counselee Registration',
                `Hare Krishna! ${unalerted[0].displayName}${
                  unalerted.length > 1 ? ` and ${unalerted.length - 1} more devotee(s)` : ''
                } registered and are awaiting your approval.`,
                [
                  { text: 'Review Later', style: 'cancel' },
                  {
                    text: 'Review Now',
                    onPress: () => navigation.navigate('PendingRegistrations'),
                  },
                ]
              );
            }
          } else {
            setPendingCount(0);
          }
        },
        () => {
          // offline listener fallback
        }
      );

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

      return () => unsubscribe();
    } catch {
      // offline fallback
    }
  }, []);

  const loadDashboardMetrics = async (force = false) => {
    const nowMs = Date.now();
    // Throttle metric loads to at most once per 8 seconds unless forced
    if (!force && nowMs - lastFetchedTimeRef.current < 8000) {
      return;
    }
    lastFetchedTimeRef.current = nowMs;

    try {
      const now = new Date();
      const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Parallelized instant fetch across all metrics with forceRefresh support
      const [allUsers, todayEntries, alerts, sharedWeekly, sharedMonthly] = await Promise.all([
        authService.getAllUsers(force),
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
    loadDashboardMetrics(true);
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const res = await updateService.checkForUpdate();
      if (res.isAvailable) {
        Alert.alert(
          'Update Available',
          `A new software update (${res.versionInfo?.version || 'Latest'}) is available.`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Download & Apply',
              onPress: async () => {
                await updateService.fetchAndApplyUpdate(res.versionInfo);
                Alert.alert('Update Applied', 'Update package downloaded. Restart app to apply?', [
                  { text: 'Restart Now', onPress: () => updateService.reloadApp() },
                  { text: 'Later' },
                ]);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Software Up to Date',
          `You are running the latest software version: v${currentAppVersion.version} (Build #${currentAppVersion.versionCode}).`
        );
      }
    } catch (e: any) {
      Alert.alert('Update Check', e.message || 'Could not verify update status.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const adminSections = [
    {
      id: 'ManageCounselees',
      title: 'Manage Counselees',
      subtitle: `${approvedCount} active devotees`,
      icon: 'people-outline',
      badge: (reminderRequestsCount + targetRequestsCount) > 0 ? `${reminderRequestsCount + targetRequestsCount} Req` : null,
      badgeColor: THEME.colors.warning,
      color: theme.thickColor,
    },
    {
      id: 'PendingRegistrations',
      title: 'Pending Approvals',
      subtitle: `${pendingCount} awaiting approval`,
      icon: 'person-add-outline',
      badge: pendingCount > 0 ? String(pendingCount) : null,
      badgeColor: THEME.colors.warning,
      color: theme.thickColor,
    },
    {
      id: 'Invitations',
      title: 'Invitations & QR',
      subtitle: 'Generate & share codes',
      icon: 'qr-code-outline',
      badge: null,
      color: theme.thickColor,
    },
    {
      id: 'SadhanaMonitoring',
      title: 'Sadhana Monitoring',
      subtitle: `${missingAlertsCount} missing cards, ${lowScoreCount} flags`,
      icon: 'pulse-outline',
      badge: missingAlertsCount > 0 ? String(missingAlertsCount) : null,
      badgeColor: THEME.colors.danger,
      color: theme.thickColor,
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
      color: theme.thickColor,
    },
    {
      id: 'FollowUpHistory',
      title: 'Follow-up History',
      subtitle: 'Audit logs & messages',
      icon: 'chatbubbles-outline',
      badge: null,
      color: theme.thickColor,
    },
    {
      id: 'SadhanaAppreciation',
      title: 'Sadhana Appreciation',
      subtitle: 'Inspire sincere effort',
      icon: 'sparkles-outline',
      badge: null,
      color: theme.thickColor,
    },
    {
      id: 'SettingsExport',
      title: 'Settings & Export',
      subtitle: 'Grades, rules & export',
      icon: 'settings-outline',
      badge: null,
      color: theme.thickColor,
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
            <TouchableOpacity
              style={styles.metricBox}
              onPress={() => navigation.navigate('ManageCounselees')}
              activeOpacity={0.7}
            >
              <Text style={[styles.metricValue, { color: theme.thickColor }]}>{approvedCount}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Counselees</Text>
            </TouchableOpacity>
            <View style={[styles.metricDivider, { backgroundColor: theme.colors.borderLight }]} />
            <TouchableOpacity
              style={styles.metricBox}
              onPress={() => navigation.navigate('PendingRegistrations')}
              activeOpacity={0.7}
            >
              <Text style={[styles.metricValue, { color: theme.thickColor }, pendingCount > 0 && styles.textWarning]}>
                {pendingCount}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>Pending</Text>
            </TouchableOpacity>
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
                  <View style={[styles.iconContainer, { backgroundColor: theme.liteColor }]}>
                    <Ionicons name={sec.icon as any} size={22} color={theme.thickColor} />
                  </View>
                  {sec.badge && (
                    <View style={[styles.badge, { backgroundColor: sec.badgeColor || theme.thickColor }]}>
                      <Text style={styles.badgeText}>{sec.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardTitle, { color: theme.thickColor }]}>{sec.title}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>{sec.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Software Version & Updates Banner */}
          <View style={[styles.versionStripCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.versionIconCircle, { backgroundColor: theme.liteColor }]}>
                <Ionicons name="sparkles" size={16} color={theme.thickColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.versionTitle, { color: theme.colors.text }]}>
                  Software Version: <Text style={{ color: theme.thickColor, fontWeight: 'bold' }}>v{currentAppVersion.version}</Text> (Build #{currentAppVersion.versionCode})
                </Text>
                <Text style={[styles.versionSubtitle, { color: theme.colors.textMuted }]}>
                  Asia/Kolkata (IST) • Real-time cloud sync active
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.versionCheckBtn, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}
              onPress={handleCheckUpdates}
              disabled={isCheckingUpdates}
              activeOpacity={0.8}
            >
              {isCheckingUpdates ? (
                <ActivityIndicator size="small" color={theme.thickColor} />
              ) : (
                <>
                  <Ionicons name="refresh" size={13} color={theme.thickColor} />
                  <Text style={[styles.versionCheckBtnText, { color: theme.thickColor }]}>Check Updates</Text>
                </>
              )}
            </TouchableOpacity>
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
  versionStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    gap: 8,
  },
  versionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  versionSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  versionCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  versionCheckBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
