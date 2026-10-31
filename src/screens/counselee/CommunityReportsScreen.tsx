import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { reportService } from '../../services/reportService';
import { appreciationService } from '../../services/appreciationService';
import { authService } from '../../services/authService';
import { getTodayDateStringIST, getWeekDetails, formatMinutesToHours } from '../../utils/dateUtils';
import { SharedWeeklySummary } from '../../types/report';
import { AppreciationCard } from '../../types/appreciation';

export const CommunityReportsScreen = () => {
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();
  const { weekId } = getWeekDetails(todayStr);

  const [activeTab, setActiveTab] = useState<'summaries' | 'appreciation'>('summaries');
  const [weeklySummaries, setWeeklySummaries] = useState<SharedWeeklySummary[]>([]);
  const [appreciations, setAppreciations] = useState<AppreciationCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadCommunityData(false);
  }, [activeTab]);

  const loadCommunityData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      if (activeTab === 'summaries') {
        // Fetch all approved counselees who have granted public consent
        const devotees = await authService.getAllCounselees();
        const approved = devotees.filter(
          (u) => u.status === 'approved' && u.publicAppreciationConsent !== false
        );

        // Always compute live, updated weekly reports from daily entries for this Monday-to-Sunday week
        const computedReports = await Promise.all(
          approved.map((u) =>
            reportService.generateWeeklyReport({
              userId: u.uid,
              counseleeName: u.displayName || 'Devotee',
              weekDateString: todayStr,
              publishSharedSummary: true,
              publicConsent: u.publicAppreciationConsent ?? true,
              forceRefresh: forceRefresh,
            })
          )
        );

        const summaries: SharedWeeklySummary[] = computedReports.map((r) => ({
          id: `${r.userId}_${weekId}`,
          userId: r.userId,
          counseleeName: r.counseleeName,
          weekId,
          totalRounds: r.totalRounds,
          totalReadingMinutes: r.totalReadingMinutes,
          totalHearingMinutes: r.totalHearingMinutes,
          onlineReadingDaysAttended: r.onlineReadingDaysAttended,
          onlineReadingMarks: r.onlineReadingMarks,
          morningProgrammeAttendance: r.morningProgrammeAttendance,
          weeklyServiceAttendance: r.weeklyServiceAttendance,
          totalScore: r.totalScore,
          maxAvailableMarks: 410,
          percentage: r.percentage,
          grade: r.grade,
          publicConsent: true,
        }));

        // Sort: active participants with scores first (descending), then alphabetically
        summaries.sort((a, b) => b.totalScore - a.totalScore || a.counseleeName.localeCompare(b.counseleeName));
        setWeeklySummaries(summaries);
      } else {
        const published = await appreciationService.getPublishedAppreciations();
        setAppreciations(published);
      }
    } catch (e) {
      console.warn('Error loading community reports:', e);
      // Fallback to cached summaries if network fails
      try {
        const fallback = await reportService.getCommunityWeeklySummaries(weekId);
        setWeeklySummaries(fallback);
      } catch {}
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Community Devotee Sanga"
        subtitle={`Encouraging Sincere Sadhana (${weekId})`}
        rightAction={{
          iconName: 'refresh',
          onPress: () => loadCommunityData(true),
        }}
      />

      {/* Tabs */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: theme.liteColor, borderColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'summaries' && { backgroundColor: theme.thickColor }]}
          onPress={() => setActiveTab('summaries')}
        >
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'summaries' ? '#FFFFFF' : theme.colors.textMuted },
            ]}
          >
            Weekly Summaries
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'appreciation' && { backgroundColor: theme.thickColor }]}
          onPress={() => setActiveTab('appreciation')}
        >
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'appreciation' ? '#FFFFFF' : theme.colors.textMuted },
            ]}
          >
            Sadhana Appreciation
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading devotee summaries...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadCommunityData(true)}
              colors={[theme.thickColor]}
              tintColor={theme.thickColor}
            />
          }
        >
          {activeTab === 'summaries' && (
            <View>
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: theme.liteColor,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.thickColor} />
                <Text style={[styles.noticeText, { color: theme.thickColor }]}>
                  Privacy Protected: Only aggregate scores and practice totals are shared. Private sleep,
                  daily details, and phone numbers remain strictly confidential.
                </Text>
              </View>

              {weeklySummaries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No community summaries published yet for this week.
                  </Text>
                </View>
              ) : (
                weeklySummaries.map((summary) => {
                  const isUnsubmitted =
                    ((summary.totalScore === 0 &&
                      summary.totalRounds === 0 &&
                      summary.totalReadingMinutes === 0 &&
                      summary.totalHearingMinutes === 0) ||
                      (summary.grade as any) === 'Card Pending');

                  return (
                    <View
                      key={summary.id}
                      style={[
                        styles.summaryCard,
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                      ]}
                    >
                      <View style={styles.summaryHeader}>
                        <View>
                          <Text style={[styles.devoteeName, { color: theme.thickColor }]}>
                            {summary.counseleeName}
                          </Text>
                          <Text style={[styles.weekLabel, { color: theme.colors.textMuted }]}>
                            {summary.weekId}
                          </Text>
                        </View>
                        <StatusBadge
                          type={isUnsubmitted ? 'custom' : 'grade'}
                          value={isUnsubmitted ? 'Card Pending' : summary.grade}
                          label={isUnsubmitted ? 'Card Pending' : undefined}
                        />
                      </View>

                      <View
                        style={[
                          styles.metricsRow,
                          {
                            backgroundColor: theme.liteColor,
                            borderColor: theme.colors.borderLight,
                          },
                        ]}
                      >
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>
                            Total Score
                          </Text>
                          <Text style={[styles.metricValue, { color: theme.thickColor }]}>
                            {summary.totalScore.toFixed(1)} / {summary.maxAvailableMarks || 410}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>
                            Percentage
                          </Text>
                          <Text style={[styles.metricValue, { color: theme.thickColor }]}>
                            {summary.percentage.toFixed(1)}%
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>
                            Rounds
                          </Text>
                          <Text style={[styles.metricValue, { color: theme.thickColor }]}>
                            {summary.totalRounds}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.readingHearingRow}>
                        <Text style={[styles.readHearText, { color: theme.colors.textMuted }]}>
                          Reading: {formatMinutesToHours(summary.totalReadingMinutes)} • Hearing:{' '}
                          {formatMinutesToHours(summary.totalHearingMinutes)}
                          {(summary.onlineReadingDaysAttended || 0) > 0 ? ` • Online: ${summary.onlineReadingDaysAttended}d` : ''}
                        </Text>
                      </View>

                      {/* Badges for Morning Program and Service if attended */}
                      {(!isUnsubmitted && (summary.morningProgrammeAttendance || summary.weeklyServiceAttendance)) && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                          {summary.morningProgrammeAttendance && (
                            <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#86EFAC' }}>
                              <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '600' }}>🌅 Morning Prog (50M)</Text>
                            </View>
                          )}
                          {summary.weeklyServiceAttendance && (
                            <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE' }}>
                              <Text style={{ fontSize: 11, color: '#6D28D9', fontWeight: '600' }}>🙏 Service (10M)</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {activeTab === 'appreciation' && (
            <View>
              {appreciations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No published appreciation cards yet.
                  </Text>
                </View>
              ) : (
                appreciations.map((card) => (
                  <View
                    key={card.id}
                    style={[
                      styles.appreciationCard,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                  >
                    <View style={styles.appreciationBadgeRow}>
                      <View style={[styles.categoryBadge, { backgroundColor: theme.liteColor }]}>
                        <Ionicons name="sparkles" size={14} color={theme.thickColor} />
                        <Text style={[styles.categoryText, { color: theme.thickColor }]}>
                          {card.category}
                        </Text>
                      </View>
                      <Text style={[styles.periodText, { color: theme.colors.textMuted }]}>
                        {card.period}
                      </Text>
                    </View>

                    <Text style={[styles.appreciationName, { color: theme.thickColor }]}>
                      {card.counseleeName}
                    </Text>

                    <View
                      style={[
                        styles.appreciationContentBox,
                        {
                          backgroundColor: theme.liteColor,
                          borderColor: theme.colors.borderLight,
                        },
                      ]}
                    >
                      {card.achievement ? (
                        <Text style={[styles.appreciationAchievement, { color: theme.thickColor }]}>
                          ★ {card.achievement}
                        </Text>
                      ) : null}
                      <Text style={[styles.appreciationNote, { color: theme.thickColor }]}>
                        "{card.message}"
                      </Text>
                    </View>
                  </View>
                ))
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
  },
  refreshHeaderBtn: {
    padding: 6,
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  devoteeName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  readingHearingRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  readHearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  appreciationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  appreciationBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  periodText: {
    fontSize: 11,
  },
  appreciationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appreciationContentBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  appreciationAchievement: {
    fontSize: 12.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appreciationNote: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 6,
  },
  counsellorSign: {
    fontSize: 11,
    textAlign: 'right',
  },
});
