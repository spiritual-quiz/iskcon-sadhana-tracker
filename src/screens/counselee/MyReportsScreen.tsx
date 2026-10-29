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
import { useTheme } from '../../context/ThemeContext';
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
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();

  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [recentDailyEntries, setRecentDailyEntries] = useState<SadhanaEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReports();
  }, [user?.uid, activeTab]);

  const formatNumericDate = (isoDate?: string) => {
    if (!isoDate || !isoDate.includes('-')) return isoDate || '';
    const [y, m, d] = isoDate.split('-');
    return `${parseInt(d, 10)}-${parseInt(m, 10)}-${y}`;
  };

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
        // Daily: fetch past 30 days (1 month) entries
        const d = new Date();
        d.setDate(d.getDate() - 30);
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="My Sadhana Reports" subtitle="Detailed Personal Practice Records" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['weekly', 'monthly', 'daily'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && [styles.tabButtonActive, { backgroundColor: theme.thickColor }],
            ]}
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

              {weeklyReport.missingReportDays === weeklyReport.dailyEntries.length && (
                <View style={styles.noSubmissionsBanner}>
                  <Ionicons name="information-circle" size={18} color="#D97706" />
                  <Text style={styles.noSubmissionsBannerText}>
                    No daily sadhana cards submitted for this week yet (Score: 0 / 0%).
                  </Text>
                </View>
              )}

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
                  <Text style={styles.metricLabel}>Online Reading:</Text>
                  <Text style={[styles.metricValue, { color: '#2563EB', fontWeight: 'bold' }]}>
                    {weeklyReport.onlineReadingDaysAttended}/5 Days ({weeklyReport.onlineReadingMarks}/50 marks)
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Weekly Class:</Text>
                  <Text style={styles.metricValue}>
                    {weeklyReport.weeklyClassAttendance ? 'Attended (10 marks)' : 'Not Attended (0 marks)'}
                  </Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>MP & MA:</Text>
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
                title={monthlyReport.monthName}
                score={monthlyReport.totalScore}
                maxScore={monthlyReport.maxAvailableMarks}
                percentage={monthlyReport.percentage}
                grade={monthlyReport.grade}
                breakdown={{
                  classMarks: monthlyReport.weeklyClassesMarks,
                  morningMarks: monthlyReport.morningProgrammesMarks,
                  satsangaMarks: monthlyReport.satsangaScheduled ? monthlyReport.satsangaMarks : undefined,
                }}
              />

              {monthlyReport.missingReportDays === monthlyReport.dailyEntries.length && (
                <View style={styles.noSubmissionsBanner}>
                  <Ionicons name="information-circle" size={18} color="#D97706" />
                  <Text style={styles.noSubmissionsBannerText}>
                    No daily sadhana cards submitted for this month yet (Score: 0 / 0%).
                  </Text>
                </View>
              )}

              <View style={styles.summaryCard}>
                <Text style={[styles.cardHeaderTitle, { color: theme.thickColor }]}>Monthly Overview</Text>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Consistency Rating:</Text>
                  <Text style={[styles.metricValue, { color: theme.thickColor }]}>
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
                  <View
                    style={[
                      styles.satsangBadge,
                      monthlyReport.satsangaStatus === 'attended'
                        ? styles.satsangBadgePresent
                        : monthlyReport.satsangaStatus === 'not_conducted'
                        ? styles.satsangBadgeNotConducted
                        : styles.satsangBadgeAbsent,
                    ]}
                  >
                    <Ionicons
                      name={
                        monthlyReport.satsangaStatus === 'attended'
                          ? 'checkmark-circle'
                          : monthlyReport.satsangaStatus === 'not_conducted'
                          ? 'pause-circle-outline'
                          : 'close-circle'
                      }
                      size={13}
                      color={
                        monthlyReport.satsangaStatus === 'attended'
                          ? '#15803D'
                          : monthlyReport.satsangaStatus === 'not_conducted'
                          ? '#B45309'
                          : '#DC2626'
                      }
                    />
                    <Text
                      style={[
                        styles.satsangBadgeText,
                        monthlyReport.satsangaStatus === 'attended'
                          ? styles.satsangBadgeTextPresent
                          : monthlyReport.satsangaStatus === 'not_conducted'
                          ? styles.satsangBadgeTextNotConducted
                          : styles.satsangBadgeTextAbsent,
                      ]}
                    >
                      {monthlyReport.satsangaStatus === 'attended'
                        ? 'Present'
                        : monthlyReport.satsangaStatus === 'not_conducted'
                        ? 'Not Conducted'
                        : 'Absent'}
                    </Text>
                  </View>
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
                            {entry.dailyTotalScore} / 50 marks ({entry.percentage}%)
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
    padding: 10,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
    ...THEME.shadows.soft,
  },
  cardHeaderTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    flexShrink: 1,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.text,
    textAlign: 'right',
    flexShrink: 0,
  },
  warningText: {
    color: THEME.colors.danger,
  },
  highlightText: {
    color: THEME.colors.primary,
  },
  satsangBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  satsangBadgePresent: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  satsangBadgeNotConducted: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  satsangBadgeAbsent: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  satsangBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  satsangBadgeTextPresent: {
    color: '#15803D',
  },
  satsangBadgeTextNotConducted: {
    color: '#B45309',
  },
  satsangBadgeTextAbsent: {
    color: '#DC2626',
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
  noSubmissionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: THEME.spacing.md,
    gap: 8,
  },
  noSubmissionsBannerText: {
    color: '#92400E',
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    flex: 1,
  },
});
