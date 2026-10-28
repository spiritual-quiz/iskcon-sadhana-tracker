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
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { sadhanaService } from '../../services/sadhanaService';
import { authService } from '../../services/authService';
import { getTodayDateStringIST, formatMinutesToHours, calculateSleepDurationMinutes } from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';
import { UserProfile } from '../../types/auth';

interface DevoteeWeekSummary {
  user: UserProfile;
  submittedCount: number;
  totalScore: number;
  avgPercentage: number;
  dayMap: { [dateStr: string]: SadhanaEntry | undefined };
}

export const AdminDailyReportsScreen = ({ navigation }: any) => {
  const [viewMode, setViewMode] = useState<'week' | 'single'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStringIST());
  
  // Single day data
  const [entries, setEntries] = useState<SadhanaEntry[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'lowScore'>('all');

  // 1-Week data
  const [weekEntries, setWeekEntries] = useState<SadhanaEntry[]>([]);
  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [selectedWeekDay, setSelectedWeekDay] = useState<string | null>(null); // null = all 7 days
  const [weekFilterMode, setWeekFilterMode] = useState<'all' | 'attention'>('all');
  const [expandedDevoteeId, setExpandedDevoteeId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Helper to generate past 7 calendar days starting with today
  const getPast7Days = (): { dateStr: string; label: string; dayName: string }[] => {
    const list: { dateStr: string; label: string; dayName: string }[] = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Yest' : dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      list.push({ dateStr, label, dayName });
    }
    return list;
  };

  const past7Days = getPast7Days();
  const weekStartDate = past7Days[6].dateStr;
  const weekEndDate = past7Days[0].dateStr;

  useEffect(() => {
    if (viewMode === 'week') {
      loadWeekReports();
    } else {
      loadSingleDayReports();
    }
  }, [viewMode, selectedDate]);

  const loadSingleDayReports = async () => {
    setIsLoading(true);
    try {
      const data = await sadhanaService.getAllEntriesForDate(selectedDate);
      setEntries(data);
    } catch (e) {
      console.warn('Error loading single day reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadWeekReports = async () => {
    setIsLoading(true);
    try {
      const [allDevotees, rangeEntries] = await Promise.all([
        authService.getAllCounselees(),
        sadhanaService.getAllEntriesForDateRange(weekStartDate, weekEndDate),
      ]);
      const approved = allDevotees.filter((u) => u.status === 'approved');
      setCounselees(approved);
      setWeekEntries(rangeEntries);
    } catch (e) {
      console.warn('Error loading week reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  // Build Devotee Week Summaries
  const devoteeSummaries: DevoteeWeekSummary[] = counselees.map((devotee) => {
    const userEntries = weekEntries.filter((e) => e.userId === devotee.uid);
    const dayMap: { [dateStr: string]: SadhanaEntry | undefined } = {};
    let totalScore = 0;
    let totalPerc = 0;

    userEntries.forEach((e) => {
      dayMap[e.date] = e;
      totalScore += e.dailyTotalScore ?? 0;
      totalPerc += e.percentage ?? 0;
    });

    const submittedCount = userEntries.length;
    const avgPercentage = submittedCount > 0 ? Math.round(totalPerc / submittedCount) : 0;

    return {
      user: devotee,
      submittedCount,
      totalScore,
      avgPercentage,
      dayMap,
    };
  });

  // 1-Week stats
  const totalWeekCards = weekEntries.length;
  const avgWeekPercentage =
    totalWeekCards > 0
      ? Math.round(weekEntries.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalWeekCards)
      : 0;
  const weekNeedsAttentionCount = devoteeSummaries.filter(
    (d) => d.submittedCount < 5 || d.avgPercentage < 50
  ).length;

  const displayedDevoteeSummaries =
    weekFilterMode === 'attention'
      ? devoteeSummaries.filter((d) => d.submittedCount < 5 || d.avgPercentage < 50)
      : devoteeSummaries;

  // Single Day stats
  const lowScoreCount = entries.filter((e) => (e.percentage ?? 0) < 50).length;
  const displayedEntries = filterMode === 'lowScore' ? entries.filter((e) => (e.percentage ?? 0) < 50) : entries;

  // Filtered week entries if a specific day pill is clicked
  const activeDayEntries = selectedWeekDay
    ? weekEntries.filter((e) => e.date === selectedWeekDay)
    : weekEntries;

  return (
    <View style={styles.container}>
      <Header
        title="Daily Sadhana Reports"
        subtitle={
          viewMode === 'week'
            ? `Recent 1 Week Audit (${past7Days[6].label} - ${past7Days[0].label})`
            : `Single Day Audit (${selectedDate})`
        }
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Top View Mode Selector */}
      <View style={styles.viewModeBar}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'week' && styles.viewModeTabActive]}
          onPress={() => setViewMode('week')}
        >
          <Ionicons
            name="calendar"
            size={16}
            color={viewMode === 'week' ? '#FFFFFF' : THEME.colors.primaryDark}
          />
          <Text style={[styles.viewModeTabText, viewMode === 'week' && styles.viewModeTabTextActive]}>
            Recent 1 Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'single' && styles.viewModeTabActive]}
          onPress={() => setViewMode('single')}
        >
          <Ionicons
            name="today-outline"
            size={16}
            color={viewMode === 'single' ? '#FFFFFF' : THEME.colors.primaryDark}
          />
          <Text style={[styles.viewModeTabText, viewMode === 'single' && styles.viewModeTabTextActive]}>
            Single Day Audit
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'single' ? (
        /* Single Day Audit View */
        <>
          {/* Date Navigation Bar */}
          <View style={styles.dateBar}>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => shiftDate(-1)}>
              <Ionicons name="chevron-back" size={20} color={THEME.colors.primary} />
              <Text style={styles.dateNavBtnText}>Previous</Text>
            </TouchableOpacity>

            <Text style={styles.currentDateText}>{selectedDate}</Text>

            <TouchableOpacity style={styles.dateNavBtn} onPress={() => shiftDate(1)}>
              <Text style={styles.dateNavBtnText}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={THEME.colors.primary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Fetching reports for {selectedDate}...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => {
                    setIsRefreshing(true);
                    loadSingleDayReports();
                  }}
                />
              }
            >
              {/* Summary & Highlight Filter Bar */}
              <View style={styles.summaryBar}>
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[styles.filterPill, filterMode === 'all' && styles.filterPillActive]}
                    onPress={() => setFilterMode('all')}
                  >
                    <Text style={[styles.filterPillText, filterMode === 'all' && styles.filterPillTextActive]}>
                      All Submissions ({entries.length})
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
              </View>

              {displayedEntries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={48} color={THEME.colors.gold} />
                  <Text style={styles.emptyTitle}>
                    {filterMode === 'lowScore' ? 'No Low-Score Devotees' : 'No Submissions Recorded'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {filterMode === 'lowScore'
                      ? 'All counselees who submitted have scored 50% or above!'
                      : `No counselees have submitted a sadhana card for ${selectedDate} yet.`}
                  </Text>
                </View>
              ) : (
                displayedEntries.map((item) => {
                  const sleepMins = calculateSleepDurationMinutes(item.sleepTimeStr, item.wakeUpTimeStr);
                  const isLowScore = (item.percentage ?? 0) < 50;
                  const maxDailyMarks = item.onlineReadingAttended ? 50 : 40;

                  return (
                    <View key={item.id} style={[styles.card, isLowScore && styles.cardLowScore]}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <Text style={[styles.devoteeName, isLowScore && styles.devoteeNameAlert]}>
                              {item.counseleeName || 'Devotee'}
                            </Text>
                            {isLowScore && (
                              <View style={styles.lowScoreAlertBadge}>
                                <Ionicons name="warning" size={11} color="#DC2626" />
                                <Text style={styles.lowScoreAlertBadgeText}>&lt; 50% Attention</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.cardScore, isLowScore && styles.cardScoreAlert]}>
                            {item.dailyTotalScore} / {maxDailyMarks} marks ({item.percentage}%)
                          </Text>
                        </View>
                        <StatusBadge type="grade" value={item.grade} />
                      </View>

                      <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Japa</Text>
                          <Text style={styles.detailValue}>
                            {item.completedRounds}/{item.declaredRounds} ({item.japaMarks}m @ {item.completionTimeStr || 'N/A'})
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Reading</Text>
                          <Text style={styles.detailValue}>
                            {item.readingMinutes}m ({item.readingMarks} marks)
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Hearing</Text>
                          <Text style={styles.detailValue}>
                            {item.hearingMinutes}m ({item.hearingMarks} marks)
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Sleep & Rest</Text>
                          <Text style={styles.detailValue}>
                            {formatMinutesToHours(sleepMins)} ({item.sleepMarks ?? 0}m)
                          </Text>
                        </View>
                        {item.onlineReadingAttended && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Online Reading</Text>
                            <Text style={[styles.detailValue, { color: '#15803D', fontWeight: 'bold' }]}>
                              Attended (10 marks)
                            </Text>
                          </View>
                        )}
                      </View>

                      {item.auditHistory && item.auditHistory.length > 0 && (
                        <View style={styles.auditBox}>
                          <Ionicons name="time" size={14} color={THEME.colors.goldDark} />
                          <Text style={styles.auditText}>
                            Updated {item.auditHistory.length} time(s). Last note: {item.auditHistory[item.auditHistory.length - 1].reason}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </>
      ) : (
        /* Recent 1 Week Audit View */
        <>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Compiling 1-week sadhana records...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => {
                    setIsRefreshing(true);
                    loadWeekReports();
                  }}
                />
              }
            >
              {/* 1-Week Summary Banner */}
              <View style={styles.weekOverviewCard}>
                <View style={styles.weekStatBox}>
                  <Text style={styles.weekStatVal}>{totalWeekCards}</Text>
                  <Text style={styles.weekStatLbl}>7-Day Cards</Text>
                </View>
                <View style={styles.weekStatDivider} />
                <View style={styles.weekStatBox}>
                  <Text style={styles.weekStatVal}>{avgWeekPercentage}%</Text>
                  <Text style={styles.weekStatLbl}>Avg Score</Text>
                </View>
                <View style={styles.weekStatDivider} />
                <View style={styles.weekStatBox}>
                  <Text style={[styles.weekStatVal, weekNeedsAttentionCount > 0 && { color: '#DC2626' }]}>
                    {weekNeedsAttentionCount}
                  </Text>
                  <Text style={styles.weekStatLbl}>Attention</Text>
                </View>
              </View>

              {/* Day Selector Chips (Past 7 Days) */}
              <View style={styles.dayStripContainer}>
                <Text style={styles.sectionSubtitle}>Select Day to Filter Submissions:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayChipsScroll}>
                  <TouchableOpacity
                    style={[styles.dayChip, selectedWeekDay === null && styles.dayChipActive]}
                    onPress={() => setSelectedWeekDay(null)}
                  >
                    <Text style={[styles.dayChipTop, selectedWeekDay === null && styles.dayChipTopActive]}>
                      All
                    </Text>
                    <Text style={[styles.dayChipSub, selectedWeekDay === null && styles.dayChipSubActive]}>
                      7 Days
                    </Text>
                  </TouchableOpacity>

                  {past7Days.map((d) => {
                    const dayCount = weekEntries.filter((e) => e.date === d.dateStr).length;
                    const isSelected = selectedWeekDay === d.dateStr;
                    return (
                      <TouchableOpacity
                        key={d.dateStr}
                        style={[styles.dayChip, isSelected && styles.dayChipActive]}
                        onPress={() => setSelectedWeekDay(isSelected ? null : d.dateStr)}
                      >
                        <Text style={[styles.dayChipTop, isSelected && styles.dayChipTopActive]}>
                          {d.dayName}
                        </Text>
                        <Text style={[styles.dayChipSub, isSelected && styles.dayChipSubActive]}>
                          {d.label}
                        </Text>
                        <View style={[styles.dayCountBadge, isSelected && styles.dayCountBadgeActive]}>
                          <Text style={[styles.dayCountBadgeText, isSelected && styles.dayCountBadgeTextActive]}>
                            {dayCount}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Filter Pills for Devotees */}
              <View style={styles.filterPillsRow}>
                <TouchableOpacity
                  style={[styles.filterPill, weekFilterMode === 'all' && styles.filterPillActive]}
                  onPress={() => setWeekFilterMode('all')}
                >
                  <Text style={[styles.filterPillText, weekFilterMode === 'all' && styles.filterPillTextActive]}>
                    All Devotees ({devoteeSummaries.length})
                  </Text>
                </TouchableOpacity>

                {weekNeedsAttentionCount > 0 && (
                  <TouchableOpacity
                    style={[styles.filterPillAlert, weekFilterMode === 'attention' && styles.filterPillAlertActive]}
                    onPress={() => setWeekFilterMode(weekFilterMode === 'attention' ? 'all' : 'attention')}
                  >
                    <Ionicons
                      name="warning"
                      size={13}
                      color={weekFilterMode === 'attention' ? '#FFFFFF' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.filterPillAlertText,
                        weekFilterMode === 'attention' && styles.filterPillAlertTextActive,
                      ]}
                    >
                      Needs Attention ({weekNeedsAttentionCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Counselees 7-Day Performance Matrix */}
              <View style={styles.matrixSection}>
                <Text style={styles.sectionTitle}>Devotee Weekly Attendance & Scores</Text>

                {displayedDevoteeSummaries.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle" size={44} color="#15803D" />
                    <Text style={styles.emptyTitle}>All Devotees on Track</Text>
                    <Text style={styles.emptySubtitle}>All registered counselees have consistent attendance and scores.</Text>
                  </View>
                ) : (
                  displayedDevoteeSummaries.map((ds) => {
                    const isExpanded = expandedDevoteeId === ds.user.uid;
                    const needsAttention = ds.submittedCount < 5 || (ds.submittedCount > 0 && ds.avgPercentage < 50);

                    return (
                      <View key={ds.user.uid} style={[styles.matrixCard, needsAttention && styles.matrixCardAlert]}>
                        <TouchableOpacity
                          style={styles.matrixHeader}
                          onPress={() => setExpandedDevoteeId(isExpanded ? null : ds.user.uid)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.matrixDevoteeName}>{ds.user.displayName}</Text>
                              {needsAttention && (
                                <View style={styles.lowScoreAlertBadge}>
                                  <Ionicons name="alert-circle" size={11} color="#DC2626" />
                                  <Text style={styles.lowScoreAlertBadgeText}>
                                    {ds.submittedCount < 5 ? `${7 - ds.submittedCount} missed` : '<50% avg'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.matrixSubInfo}>
                              Commitment: {ds.user.declaredRounds || 16} Rounds • Phone: {ds.user.phoneNumber || 'N/A'}
                            </Text>
                          </View>

                          <View style={styles.matrixScoreBadge}>
                            <Text style={styles.matrixSubmittedDays}>
                              {ds.submittedCount}/7 Days
                            </Text>
                            <Text
                              style={[
                                styles.matrixAvgScore,
                                ds.avgPercentage < 50 ? { color: '#DC2626' } : { color: '#15803D' },
                              ]}
                            >
                              {ds.submittedCount > 0 ? `${ds.avgPercentage}%` : 'No Cards'}
                            </Text>
                          </View>

                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={THEME.colors.textMuted}
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
                                <Text style={styles.dotDayLabel}>{d.dayName.substring(0, 2)}</Text>
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
                            <Text style={styles.expandedTitle}>7-Day Daily Details:</Text>
                            {past7Days.map((d) => {
                              const item = ds.dayMap[d.dateStr];
                              if (!item) {
                                return (
                                  <View key={d.dateStr} style={styles.expandedDayRowEmpty}>
                                    <Text style={styles.expandedDayDate}>{d.dayName} ({d.label}):</Text>
                                    <Text style={styles.expandedMissedText}>No Card Submitted</Text>
                                  </View>
                                );
                              }
                              return (
                                <View key={d.dateStr} style={styles.expandedDayRow}>
                                  <View style={styles.expandedDayLeft}>
                                    <Text style={styles.expandedDayDate}>{d.dayName} ({d.label}):</Text>
                                    <Text style={styles.expandedDayDetails}>
                                      Japa: {item.completedRounds}/{item.declaredRounds} • Read: {item.readingMinutes}m • Hear: {item.hearingMinutes}m
                                    </Text>
                                  </View>
                                  <View style={styles.expandedDayRight}>
                                    <Text style={styles.expandedDayScore}>
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

              {/* Submissions Section if specific day is selected */}
              {selectedWeekDay && (
                <View style={styles.selectedDaySubmissionsSection}>
                  <Text style={styles.sectionTitle}>
                    Submissions for {selectedWeekDay} ({activeDayEntries.length})
                  </Text>
                  {activeDayEntries.length === 0 ? (
                    <Text style={styles.emptyDayNotice}>No submissions logged for this date.</Text>
                  ) : (
                    activeDayEntries.map((item) => (
                      <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.devoteeName}>{item.counseleeName || 'Devotee'}</Text>
                            <Text style={styles.cardScore}>
                              {item.dailyTotalScore} marks ({item.percentage}%)
                            </Text>
                          </View>
                          <StatusBadge type="grade" value={item.grade} />
                        </View>
                        <View style={styles.detailsGrid}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Japa</Text>
                            <Text style={styles.detailValue}>
                              {item.completedRounds}/{item.declaredRounds} ({item.japaMarks}m)
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Reading</Text>
                            <Text style={styles.detailValue}>{item.readingMinutes}m</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Hearing</Text>
                            <Text style={styles.detailValue}>{item.hearingMinutes}m</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Sleep</Text>
                            <Text style={styles.detailValue}>
                              {formatMinutesToHours(calculateSleepDurationMinutes(item.sleepTimeStr, item.wakeUpTimeStr))}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  viewModeBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 8,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  viewModeTabActive: {
    backgroundColor: THEME.colors.primary,
  },
  viewModeTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  viewModeTabTextActive: {
    color: '#FFFFFF',
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.base,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  dateNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dateNavBtnText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  currentDateText: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
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
  weekOverviewCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  weekStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  weekStatVal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  weekStatLbl: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  weekStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: THEME.colors.border,
  },
  dayStripContainer: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  dayChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  dayChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 62,
  },
  dayChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  dayChipTop: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  dayChipTopActive: {
    color: '#FFFFFF',
  },
  dayChipSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  dayChipSubActive: {
    color: '#FEF3C7',
  },
  dayCountBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 4,
  },
  dayCountBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  dayCountBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  dayCountBadgeTextActive: {
    color: THEME.colors.primary,
  },
  summaryBar: {
    marginBottom: THEME.spacing.sm,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
  matrixSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 8,
  },
  matrixCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  matrixCardAlert: {
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  matrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matrixDevoteeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  matrixSubInfo: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  matrixScoreBadge: {
    alignItems: 'flex-end',
  },
  matrixSubmittedDays: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
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
  dotDayLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 6,
  },
  expandedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  expandedDayRowEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandedDayLeft: {
    flex: 1,
  },
  expandedDayDate: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  expandedDayDetails: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  expandedDayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedDayScore: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  expandedMissedText: {
    fontSize: 11,
    color: '#DC2626',
    fontStyle: 'italic',
    marginLeft: 6,
  },
  selectedDaySubmissionsSection: {
    marginTop: 8,
  },
  emptyDayNotice: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    padding: 8,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.sm,
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
    marginBottom: 6,
  },
  devoteeName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  devoteeNameAlert: {
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
  cardScore: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 1,
  },
  cardScoreAlert: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginVertical: 4,
  },
  detailItem: {
    width: '48%',
    marginVertical: 3,
  },
  detailLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  detailValue: {
    fontSize: 11,
    color: THEME.colors.text,
    fontWeight: '500',
    marginTop: 1,
  },
  auditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  auditText: {
    fontSize: 10,
    color: THEME.colors.goldDark,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
    marginTop: THEME.spacing.lg,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: THEME.spacing.sm,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
