import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { ScoreCard } from '../../components/ScoreCard';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { sadhanaService } from '../../services/sadhanaService';
import {
  getTodayDateStringIST,
  formatMinutesToHours,
  calculateSleepDurationMinutes,
} from '../../utils/dateUtils';
import { WeeklyReport, MonthlyReport } from '../../types/report';
import { SadhanaEntry } from '../../types/sadhana';

export const MyReportsScreen = () => {
  const { user } = useAuth();
  const todayStr = getTodayDateStringIST();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [recentDailyEntries, setRecentDailyEntries] = useState<SadhanaEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReports();
  }, [user?.uid, activeTab]);

  const loadReports = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const now = new Date();
      if (activeTab === 'weekly') {
        const rep = await reportService.generateWeeklyReport({
          userId: user.uid,
          counseleeName: user.displayName,
          weekDateString: todayStr,
        });
        setWeeklyReport(rep);
      } else if (activeTab === 'monthly') {
        const rep = await reportService.generateMonthlyReport({
          userId: user.uid,
          counseleeName: user.displayName,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        });
        setMonthlyReport(rep);
      } else {
        // Daily: fetch past 14 days entries
        const d = new Date();
        d.setDate(d.getDate() - 14);
        const pastStr = d.toISOString().split('T')[0];
        const entries = await sadhanaService.getEntriesForDateRange(user.uid, pastStr, todayStr);
        setRecentDailyEntries(entries.reverse());
      }
    } catch (e) {
      console.warn('Error fetching reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="My Sadhana Reports" subtitle="Detailed Personal Practice Records" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['weekly', 'monthly', 'daily'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Report
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Generating report...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'weekly' && weeklyReport && (
            <View>
              <ScoreCard
                title={`Weekly Score (${weeklyReport.startDate} to ${weeklyReport.endDate})`}
                score={weeklyReport.totalScore}
                maxScore={weeklyReport.maxAvailableMarks}
                percentage={weeklyReport.percentage}
                grade={weeklyReport.grade}
                breakdown={{
                  classMarks: weeklyReport.weeklyClassMarks,
                  morningMarks: weeklyReport.morningProgrammeMarks,
                }}
              />

              <View style={styles.summaryCard}>
                <Text style={styles.cardHeaderTitle}>Weekly Overview</Text>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Chanting Rounds:</Text>
                  <Text style={styles.metricValue}>{weeklyReport.totalRounds} rounds</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Book Reading:</Text>
                  <Text style={styles.metricValue}>
                    {formatMinutesToHours(weeklyReport.totalReadingMinutes)}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Spiritual Hearing:</Text>
                  <Text style={styles.metricValue}>
                    {formatMinutesToHours(weeklyReport.totalHearingMinutes)}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Weekly Class:</Text>
                  <Text style={styles.metricValue}>
                    {weeklyReport.weeklyClassAttendance ? 'Attended (10 marks)' : 'Not Attended (0 marks)'}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Morning Programme & Maṅgala-ārati:</Text>
                  <Text style={styles.metricValue}>
                    {weeklyReport.morningProgrammeAttendance ? 'Attended (10 marks)' : 'Not Attended (0 marks)'}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Missing Submissions:</Text>
                  <Text style={[styles.metricValue, weeklyReport.missingReportDays > 0 && styles.warningText]}>
                    {weeklyReport.missingReportDays} day(s)
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'monthly' && monthlyReport && (
            <View>
              <ScoreCard
                title={`Monthly Score (${monthlyReport.monthName})`}
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

              <View style={styles.summaryCard}>
                <Text style={styles.cardHeaderTitle}>Monthly Overview</Text>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Consistency Rating:</Text>
                  <Text style={[styles.metricValue, styles.highlightText]}>
                    {monthlyReport.consistencyRating}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Chanting Rounds:</Text>
                  <Text style={styles.metricValue}>{monthlyReport.totalRounds} rounds</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Srila Prabhupada Books Read:</Text>
                  <Text style={styles.metricValue}>
                    {formatMinutesToHours(monthlyReport.totalReadingMinutes)}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Lectures & Classes Heard:</Text>
                  <Text style={styles.metricValue}>
                    {formatMinutesToHours(monthlyReport.totalHearingMinutes)}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Monthly Satsanga:</Text>
                  <Text style={styles.metricValue}>
                    {monthlyReport.satsangaAttended ? 'Attended (10 marks)' : 'Not Attended (0 marks)'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'daily' && (
            <View>
              <Text style={styles.cardHeaderTitle}>Recent Daily Submissions</Text>
              {recentDailyEntries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No recent daily sadhana cards found.</Text>
                </View>
              ) : (
                recentDailyEntries.map((entry) => {
                  const sleepMins = calculateSleepDurationMinutes(entry.sleepTimeStr, entry.wakeUpTimeStr);
                  return (
                    <View key={entry.id} style={styles.dailyItemCard}>
                      <View style={styles.dailyHeader}>
                        <View>
                          <Text style={styles.dailyDate}>{entry.date}</Text>
                          <Text style={styles.dailyScore}>
                            {entry.dailyTotalScore} / 30 marks ({entry.percentage}%)
                          </Text>
                        </View>
                        <StatusBadge type="grade" value={entry.grade} />
                      </View>

                      <View style={styles.dailyDetails}>
                        <Text style={styles.dailyDetailItem}>
                          • Japa: {entry.completedRounds}/{entry.declaredRounds} rounds ({entry.japaMarks} marks at {entry.completionTimeStr || 'N/A'})
                        </Text>
                        <Text style={styles.dailyDetailItem}>
                          • Reading: {entry.readingMinutes} mins ({entry.readingMarks} marks)
                        </Text>
                        <Text style={styles.dailyDetailItem}>
                          • Hearing: {entry.hearingMinutes} mins ({entry.hearingMarks} marks)
                        </Text>
                        <Text style={styles.dailyDetailItem}>
                          • Sleep: {entry.sleepTimeStr || 'N/A'} - {entry.wakeUpTimeStr || 'N/A'} ({formatMinutesToHours(sleepMins)})
                        </Text>
                        {entry.restMinutes > 0 && (
                          <Text style={styles.dailyDetailItem}>
                            • Daytime Rest: {entry.restMinutes} mins
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: 4,
    margin: THEME.spacing.base,
    borderRadius: THEME.borderRadius.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: THEME.colors.textInverse,
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
  summaryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.base,
    ...THEME.shadows.soft,
  },
  cardHeaderTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceVariant,
  },
  metricLabel: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
  },
  metricValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  warningText: {
    color: THEME.colors.danger,
  },
  highlightText: {
    color: THEME.colors.primary,
  },
  dailyItemCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyDate: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  dailyScore: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
  },
  dailyDetails: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  dailyDetailItem: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  emptyContainer: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
  },
});
