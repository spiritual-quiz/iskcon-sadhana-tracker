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
import { sadhanaService } from '../../services/sadhanaService';
import { useAuth } from '../../context/AuthContext';
import { getTodayDateStringIST, getWeekDetails, formatMinutesToHours } from '../../utils/dateUtils';
import { SharedWeeklySummary } from '../../types/report';
import { AppreciationCard } from '../../types/appreciation';
import { SadhanaEntry } from '../../types/sadhana';
import { UserProfile } from '../../types/auth';
import { HonoursCard } from '../../components/HonoursCard';

interface DevoteePeerSadhanaSummary {
  user: UserProfile;
  submittedCount: number;
  totalScore: number;
  avgPercentage: number;
  dayMap: { [dateStr: string]: SadhanaEntry | undefined };
}

export const CommunityReportsScreen = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();
  const { weekId } = getWeekDetails(todayStr);

  const [activeTab, setActiveTab] = useState<'summaries' | 'sadhana' | 'appreciation'>('summaries');
  const [weeklySummaries, setWeeklySummaries] = useState<SharedWeeklySummary[]>([]);
  const [peerSummaries, setPeerSummaries] = useState<DevoteePeerSadhanaSummary[]>([]);
  const [expandedDevoteeId, setExpandedDevoteeId] = useState<string | null>(null);
  const [appreciations, setAppreciations] = useState<AppreciationCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Helper to generate past 7 calendar days starting with today
  const getPast7Days = (): { dateStr: string; label: string; dayName: string; dateNum: string }[] => {
    const list: { dateStr: string; label: string; dayName: string; dateNum: string }[] = [];
    const base = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      const dateNum = String(d.getDate());
      list.push({ dateStr, label, dayName, dateNum });
    }
    return list;
  };

  const past7Days = getPast7Days();

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
      } else if (activeTab === 'sadhana') {
        // Fetch all approved counselees
        const allCounselees = await authService.getAllCounselees(forceRefresh);
        const approved = allCounselees.filter(
          (u) => u.status === 'approved' && u.role !== 'counsellor'
        );

        // Filter to devotees with the same invitation code as current logged-in user
        const userCode = user?.invitationCode?.trim();
        const peers = approved.filter((u) => {
          if (userCode) {
            return u.invitationCode?.trim() === userCode;
          }
          return u.counsellorId === user?.counsellorId || !u.invitationCode;
        });

        // Query entries for the 7-day range
        const startDate = past7Days[6].dateStr;
        const endDate = past7Days[0].dateStr;
        const entries = await sadhanaService.getAllEntriesForDateRange(startDate, endDate, forceRefresh);

        const mapByUser = new Map<string, { [dateStr: string]: SadhanaEntry }>();
        entries.forEach((e) => {
          if (!mapByUser.has(e.userId)) {
            mapByUser.set(e.userId, {});
          }
          mapByUser.get(e.userId)![e.date] = e;
        });

        const summaries: DevoteePeerSadhanaSummary[] = peers.map((p) => {
          const dayMap = mapByUser.get(p.uid) || {};
          let submittedCount = 0;
          let totalScore = 0;
          let totalPercentage = 0;
          past7Days.forEach((d) => {
            const e = dayMap[d.dateStr];
            if (e) {
              submittedCount++;
              totalScore += e.dailyTotalScore ?? 0;
              totalPercentage += e.percentage ?? 0;
            }
          });
          const avgPercentage = submittedCount > 0 ? Math.round(totalPercentage / submittedCount) : 0;
          return {
            user: p,
            submittedCount,
            totalScore,
            avgPercentage,
            dayMap,
          };
        });

        // Sort: highest score / submitted days first, then alphabetical
        summaries.sort((a, b) => b.totalScore - a.totalScore || (a.user.displayName || '').localeCompare(b.user.displayName || ''));
        setPeerSummaries(summaries);
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
          style={[styles.tabBtn, activeTab === 'sadhana' && { backgroundColor: theme.thickColor }]}
          onPress={() => setActiveTab('sadhana')}
        >
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'sadhana' ? '#FFFFFF' : theme.colors.textMuted },
            ]}
          >
            Sadhana
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
            Appreciation
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
          {/* Devotional Honours: First to Fill, Daily Best, Weekly Best, Monthly Best */}
          <HonoursCard dateStr={todayStr} />

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
                      (summary.grade as any) === 'Card Pending' ||
                      (summary.grade as any) === 'Daily Sadhana Pending');

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
                          value={isUnsubmitted ? 'Daily Sadhana Pending' : summary.grade}
                          label={isUnsubmitted ? 'Daily Sadhana Pending' : undefined}
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
                            {summary.totalScore.toFixed(1)} / 410
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.colors.textMuted }]}>
                            Percentage
                          </Text>
                          <Text style={[styles.metricValue, { color: theme.thickColor }]}>
                            {((summary.totalScore / 410) * 100).toFixed(1)}%
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

          {activeTab === 'sadhana' && (
            <View>
              {/* Notice Box for Group / Invitation Code */}
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: theme.liteColor,
                    borderColor: theme.colors.borderLight,
                  },
                ]}
              >
                <Ionicons name="people-outline" size={20} color={theme.thickColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noticeTitle, { color: theme.thickColor }]}>
                    {user?.invitationName || 'Devotee Sanga'} (Code: {user?.invitationCode || 'General'})
                  </Text>
                  <Text style={[styles.noticeText, { color: theme.thickColor, marginTop: 2 }]}>
                    Showing 1-Week Daily Sadhana ({past7Days[6].label} - {past7Days[0].label}) for counselees under the same invitation group.
                  </Text>
                </View>
              </View>

              {peerSummaries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={44} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No counselees found under this invitation code yet.
                  </Text>
                </View>
              ) : (
                peerSummaries.map((ds) => {
                  const isExpanded = expandedDevoteeId === ds.user.uid;
                  const isCurrentUser = ds.user.uid === user?.uid;

                  return (
                    <View
                      key={ds.user.uid}
                      style={[
                        styles.matrixCard,
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                        isCurrentUser && { borderColor: theme.thickColor, borderWidth: 1.5 },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.matrixHeader}
                        onPress={() => setExpandedDevoteeId(isExpanded ? null : ds.user.uid)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.matrixDevoteeName, { color: theme.thickColor }]}>
                              {ds.user.displayName || 'Devotee'}
                            </Text>
                            {isCurrentUser && (
                              <View style={[styles.youBadge, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                                <Text style={[styles.youBadgeText, { color: theme.thickColor }]}>You</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.matrixSubInfo, { color: theme.colors.textMuted }]}>
                            Commitment: {ds.user.declaredRounds || 16} Rounds
                          </Text>
                        </View>

                        <View style={styles.matrixScoreBadge}>
                          <Text style={[styles.matrixSubmittedDays, { color: theme.thickColor }]}>
                            {ds.submittedCount}/7 Days
                          </Text>
                          <Text
                            style={[
                              styles.matrixAvgScore,
                              ds.avgPercentage < 50 ? { color: '#DC2626' } : { color: '#15803D' },
                            ]}
                          >
                            {ds.submittedCount > 0 ? `${ds.avgPercentage}% avg` : 'No Cards'}
                          </Text>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.colors.textMuted}
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>

                      {/* 7-Day Dot Visualizer */}
                      <View style={styles.dotVisualizerRow}>
                        {past7Days.map((d) => {
                          const entry = ds.dayMap[d.dateStr];
                          const submitted = !!entry;
                          const perc = entry?.percentage ?? 0;
                          const isGood = perc >= 70;
                          const isAvg = perc >= 50 && perc < 70;

                          return (
                            <View key={d.dateStr} style={styles.dotCol}>
                              <Text style={[styles.dotDateNum, { color: theme.colors.text }]}>{d.dateNum}</Text>
                              <Text style={styles.dotDayLabel}>{d.dayName}</Text>
                              <View
                                style={[
                                  styles.dotCircle,
                                  !submitted && styles.dotMissed,
                                  submitted && isGood && styles.dotGood,
                                  submitted && isAvg && styles.dotAvg,
                                  submitted && !isGood && !isAvg && styles.dotPoor,
                                ]}
                              >
                                <Text style={styles.dotCircleText}>
                                  {submitted ? `${perc}%` : '—'}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {/* Expandable Breakdown Details */}
                      {isExpanded && (
                        <View style={styles.expandedBreakdown}>
                          <Text style={[styles.expandedTitle, { color: theme.thickColor }]}>
                            7-Day Daily Sadhana Details:
                          </Text>
                          {past7Days.map((d) => {
                            const item = ds.dayMap[d.dateStr];
                            if (!item) {
                              return (
                                <View key={d.dateStr} style={styles.expandedDayRowEmpty}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.expandedDayDate, { color: theme.colors.text }]}>
                                      {d.label} ({d.dayName}):
                                    </Text>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.colors.textMuted }}>
                                      0/50
                                    </Text>
                                  </View>
                                  <Text style={styles.expandedMissedText}>Daily Sadhana Pending</Text>
                                </View>
                              );
                            }
                            return (
                              <View key={d.dateStr} style={styles.expandedDayRow}>
                                <View style={styles.expandedDayLeft}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <Text style={[styles.expandedDayDate, { color: theme.thickColor }]}>
                                      {d.label} ({d.dayName}):
                                    </Text>
                                    <View
                                      style={{
                                        backgroundColor: theme.liteColor,
                                        borderColor: theme.thickColor,
                                        borderWidth: 1,
                                        borderRadius: 6,
                                        paddingHorizontal: 6,
                                        paddingVertical: 1,
                                      }}
                                    >
                                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.thickColor }}>
                                        {item.dailyTotalScore ?? 0}/50
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={[styles.expandedDayDetails, { color: theme.colors.textMuted }]}>
                                    Japa: {item.completedRounds}/{item.declaredRounds} • Read: {item.readingMinutes}m • Hear: {item.hearingMinutes}m
                                  </Text>
                                  <Text style={[styles.expandedDayDetails, { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                                    Sleep: {item.sleepTimeStr || 'N/A'} - {item.wakeUpTimeStr || 'N/A'} • Rest: {item.restMinutes || 0}m
                                    {item.onlineReadingAttended ? ' • Online: 10m' : ''}
                                  </Text>
                                </View>
                                <View style={styles.expandedDayRight}>
                                  <Text style={[styles.expandedDayScore, { color: theme.thickColor }]}>
                                    {item.dailyTotalScore}m ({item.percentage}%)
                                  </Text>
                                  <StatusBadge type="grade" value={item.grade} />
                                </View>
                              </View>
                            );
                          })}
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
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  matrixCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  matrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matrixDevoteeName: {
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  matrixSubInfo: {
    fontSize: 11,
    marginTop: 2,
  },
  matrixScoreBadge: {
    alignItems: 'flex-end',
  },
  matrixSubmittedDays: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  matrixAvgScore: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 1,
  },
  dotVisualizerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dotCol: {
    alignItems: 'center',
    flex: 1,
  },
  dotDateNum: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  dotDayLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 3,
  },
  dotCircle: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMissed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dotGood: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  dotAvg: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dotPoor: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  dotCircleText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  expandedBreakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  expandedTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  expandedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expandedDayRowEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  expandedDayLeft: {
    flex: 1,
    paddingRight: 8,
  },
  expandedDayRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  expandedDayDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedDayDetails: {
    fontSize: 10.5,
    marginTop: 1,
  },
  expandedDayScore: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  expandedMissedText: {
    fontSize: 11,
    color: '#DC2626',
    fontStyle: 'italic',
    marginLeft: 6,
  },
});
