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
import { ScoreCard } from '../../components/ScoreCard';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { reportService } from '../../services/reportService';
import { getTodayDateStringIST, getNowInIST } from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';
import { WeeklyReport } from '../../types/report';

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const todayStr = getTodayDateStringIST();

  const [todayEntry, setTodayEntry] = useState<SadhanaEntry | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadHomeData();
  }, [user?.uid]);

  const loadHomeData = async () => {
    if (!user?.uid) return;
    try {
      const [entry, week] = await Promise.all([
        sadhanaService.getDailyEntry(user.uid, todayStr),
        reportService.generateWeeklyReport({
          userId: user.uid,
          counseleeName: user.displayName,
          weekDateString: todayStr,
          publishSharedSummary: true,
          publicConsent: user.publicAppreciationConsent,
        }),
      ]);
      setTodayEntry(entry);
      setWeeklyReport(week);
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

  return (
    <View style={styles.container}>
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
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading devotional dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
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
                  ? `Score: ${todayEntry.dailyTotalScore}/40 (Grade ${todayEntry.grade})`
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

          {/* Current Week Summary */}
          {weeklyReport && (
            <View style={styles.section}>
              <Text style={styles.sectionHeaderTitle}>Current Week Progress</Text>
              <ScoreCard
                title={`Week (${weeklyReport.startDate} to ${weeklyReport.endDate})`}
                score={weeklyReport.totalScore}
                maxScore={weeklyReport.maxAvailableMarks}
                percentage={weeklyReport.percentage}
                grade={weeklyReport.grade}
                breakdown={{
                  classMarks: weeklyReport.weeklyClassMarks,
                  morningMarks: weeklyReport.morningProgrammeMarks,
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
              onPress={() => navigation.navigate('CommunityReports')}
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
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    marginBottom: THEME.spacing.base,
    ...THEME.shadows.soft,
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
