import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { ScoreCard } from '../../components/ScoreCard';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { attendanceService } from '../../services/attendanceService';
import {
  getTodayDateStringIST,
  getWeekDetails,
  formatMinutesToHours,
  calculateSleepDurationMinutes,
} from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';
import { UserProfile } from '../../types/auth';
import { WeeklyReport, MonthlyReport } from '../../types/report';

interface DevoteeWeekSummary {
  user: UserProfile;
  submittedCount: number;
  totalScore: number;
  avgPercentage: number;
  dayMap: { [dateStr: string]: SadhanaEntry | undefined };
}

export const AdminReportsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();

  // Active Top Tab: Daily | Weekly | Monthly
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Search box state (filters all 3 tabs in real-time)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Common Loading / Refreshing
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // DAILY TAB STATE
  // -------------------------------------------------------------
  const [dailyViewMode, setDailyViewMode] = useState<'week' | 'single'>('week');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(todayStr);
  const [dailyFilterMode, setDailyFilterMode] = useState<'all' | 'lowScore'>('all');
  const [singleDayEntries, setSingleDayEntries] = useState<SadhanaEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<SadhanaEntry[]>([]);
  const [allCounselees, setAllCounselees] = useState<UserProfile[]>([]);
  const [expandedDevoteeId, setExpandedDevoteeId] = useState<string | null>(null);

  const formatFriendlyTime = (t24?: string) => {
    if (!t24 || !t24.includes(':')) return t24 || 'N/A';
    const [hStr, mStr] = t24.split(':');
    let h = parseInt(hStr, 10);
    const m = (mStr || '00').padStart(2, '0');
    if (isNaN(h)) return t24;
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m} ${period}`;
  };

  // Helper for past 7 days with offset support
  const [dailyWeekOffset, setDailyWeekOffset] = useState<number>(0);
  const getPast7Days = (offset = 0) => {
    const list: { dateStr: string; label: string; dayName: string }[] = [];
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayName = (offset === 0 && i === 0) ? 'Today' : (offset === 0 && i === 1) ? 'Yest' : dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      list.push({ dateStr, label, dayName });
    }
    return list;
  };

  const past7Days = getPast7Days(dailyWeekOffset);
  const weekStartDate = past7Days[6].dateStr;
  const weekEndDate = past7Days[0].dateStr;

  // -------------------------------------------------------------
  // WEEKLY TAB STATE
  // -------------------------------------------------------------
  const { weekId: currentWeekId, startDate: currentWeekStart, endDate: currentWeekEnd } = getWeekDetails(todayStr);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [weeklyFilterMode, setWeeklyFilterMode] = useState<'all' | 'lowScore'>('all');
  const [expandedWeeklyUserId, setExpandedWeeklyUserId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // MONTHLY TAB STATE
  // -------------------------------------------------------------
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [monthlyFilterMode, setMonthlyFilterMode] = useState<'all' | 'lowScore'>('all');

  // Load data when tab changes or parameters change
  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailyData();
    } else if (activeTab === 'weekly') {
      loadWeeklyData();
    } else if (activeTab === 'monthly') {
      loadMonthlyData();
    }
  }, [activeTab, dailyViewMode, selectedDailyDate, dailyWeekOffset, selectedYear, selectedMonth]);

  // -------------------------------------------------------------
  // DATA LOADERS
  // -------------------------------------------------------------
  const loadDailyData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const [devotees, sDay, wRange] = await Promise.all([
        authService.getAllCounselees(forceRefresh),
        sadhanaService.getAllEntriesForDate(selectedDailyDate, forceRefresh),
        sadhanaService.getAllEntriesForDateRange(weekStartDate, weekEndDate, forceRefresh),
      ]);
      setAllCounselees(devotees.filter((u) => u.status === 'approved'));
      setSingleDayEntries(sDay);
      setWeekEntries(wRange);
    } catch (e) {
      console.warn('Error loading daily reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadWeeklyData = async () => {
    setIsLoading(true);
    try {
      const devotees = await authService.getAllCounselees();
      const approved = devotees.filter((u) => u.status === 'approved');
      setAllCounselees(approved);

      const reports = await Promise.all(
        approved.map((u) =>
          reportService.generateWeeklyReport({
            userId: u.uid,
            counseleeName: u.displayName,
            weekDateString: todayStr,
            publishSharedSummary: true,
            publicConsent: u.publicAppreciationConsent,
          })
        )
      );
      setWeeklyReports(reports);
    } catch (e) {
      console.warn('Error loading weekly reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMonthlyData = async () => {
    setIsLoading(true);
    try {
      const devotees = await authService.getAllCounselees();
      const approved = devotees.filter((u) => u.status === 'approved');
      setAllCounselees(approved);

      const reports = await Promise.all(
        approved.map((u) =>
          reportService.generateMonthlyReport({
            userId: u.uid,
            counseleeName: u.displayName,
            year: selectedYear,
            month: selectedMonth,
            publicConsent: u.publicAppreciationConsent,
          })
        )
      );
      setMonthlyReports(reports);
    } catch (e) {
      console.warn('Error loading monthly reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === 'daily') loadDailyData(true);
    else if (activeTab === 'weekly') loadWeeklyData();
    else if (activeTab === 'monthly') loadMonthlyData();
  };

  // Helper date shifting for Single Day view
  const shiftDailyDate = (days: number) => {
    const [y, m, d] = selectedDailyDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setSelectedDailyDate(`${newY}-${newM}-${newD}`);
  };

  // Helper month shifting
  const shiftMonth = (delta: number) => {
    let newM = selectedMonth + delta;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    } else if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedYear(newY);
    setSelectedMonth(newM);
  };

  // Attendance toggling
  const handleToggleWeeklyAttendance = async (
    userId: string,
    type: 'morning_programme' | 'weekly_class',
    currentAttended: boolean
  ) => {
    setUpdatingId(`${userId}_${type}`);
    try {
      await attendanceService.recordWeeklyAttendance({
        userId,
        weekId: currentWeekId,
        type,
        scheduledDate: todayStr,
        attended: !currentAttended,
        updatedBy: user?.uid || 'admin',
      });
      await loadWeeklyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleMonthlySatsanga = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    const monthId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setUpdatingId(`${userId}_satsanga`);
    try {
      await attendanceService.recordMonthlySatsanga({
        userId,
        monthId,
        scheduledDate: todayStr,
        status: nextStatus as any,
        updatedBy: user?.uid || 'admin',
      });
      await loadMonthlyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update satsanga attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME SEARCH FILTERING
  // -------------------------------------------------------------
  const queryLower = searchQuery.trim().toLowerCase();

  const filterDevotee = (name?: string, phone?: string, declared?: number) => {
    if (!queryLower) return true;
    if (name && name.toLowerCase().includes(queryLower)) return true;
    if (phone && phone.toLowerCase().includes(queryLower)) return true;
    if (declared !== undefined && String(declared).includes(queryLower)) return true;
    return false;
  };

  // Daily: Devotee Week Summaries
  const devoteeWeekSummaries: DevoteeWeekSummary[] = useMemo(() => {
    return allCounselees
      .filter((d) => filterDevotee(d.displayName, d.phoneNumber, d.declaredRounds))
      .map((devotee) => {
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
  }, [allCounselees, weekEntries, queryLower]);

  // Daily: Single Day Entries
  const filteredSingleDayEntries = useMemo(() => {
    return singleDayEntries.filter((e) => {
      const matchSearch = filterDevotee(e.counseleeName, undefined, undefined);
      if (!matchSearch) return false;
      if (dailyFilterMode === 'lowScore') return (e.percentage ?? 0) < 50;
      return true;
    });
  }, [singleDayEntries, queryLower, dailyFilterMode]);

  // Weekly: Reports
  const filteredWeeklyReports = useMemo(() => {
    return weeklyReports.filter((r) => {
      const devotee = allCounselees.find((c) => c.uid === r.userId);
      const matchSearch = filterDevotee(r.counseleeName, devotee?.phoneNumber, devotee?.declaredRounds);
      if (!matchSearch) return false;
      if (weeklyFilterMode === 'lowScore') return (r.percentage ?? 0) < 50;
      return true;
    });
  }, [weeklyReports, allCounselees, queryLower, weeklyFilterMode]);

  // Monthly: Reports
  const filteredMonthlyReports = useMemo(() => {
    return monthlyReports.filter((r) => {
      const devotee = allCounselees.find((c) => c.uid === r.userId);
      const matchSearch = filterDevotee(r.counseleeName, devotee?.phoneNumber, devotee?.declaredRounds);
      if (!matchSearch) return false;
      if (monthlyFilterMode === 'lowScore') return (r.percentage ?? 0) < 50;
      return true;
    });
  }, [monthlyReports, allCounselees, queryLower, monthlyFilterMode]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Reports"
        subtitle="Devotee Daily, Weekly & Monthly Audits"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* 3 Main Tabs: Daily, Weekly, Monthly (Matches Counselee layout) */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                isActive && [styles.tabButtonActive, { backgroundColor: theme.thickColor }],
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : theme.colors.textMuted },
                  isActive && { fontWeight: 'bold' },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Reports
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Real-time Search Box */}
      <View style={[styles.searchBoxCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={18} color={theme.thickColor} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search devotee by name, phone or rounds..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading {activeTab} devotional audit records...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================================= */}
          {/* TAB 1: DAILY REPORTS                                      */}
          {/* ========================================================= */}
          {activeTab === 'daily' && (
            <View>
              {/* Daily View Mode Selector: 1-Week Matrix vs Single Day */}
              <View style={styles.subModeRow}>
                <TouchableOpacity
                  style={[
                    styles.subModeBtn,
                    dailyViewMode === 'week' && [styles.subModeBtnActive, { backgroundColor: theme.thickColor }],
                  ]}
                  onPress={() => setDailyViewMode('week')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={dailyViewMode === 'week' ? '#FFFFFF' : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.subModeBtnText,
                      { color: dailyViewMode === 'week' ? '#FFFFFF' : theme.colors.textMuted },
                    ]}
                  >
                    7-Day Devotee Matrix
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subModeBtn,
                    dailyViewMode === 'single' && [styles.subModeBtnActive, { backgroundColor: theme.thickColor }],
                  ]}
                  onPress={() => setDailyViewMode('single')}
                >
                  <Ionicons
                    name="today-outline"
                    size={15}
                    color={dailyViewMode === 'single' ? '#FFFFFF' : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.subModeBtnText,
                      { color: dailyViewMode === 'single' ? '#FFFFFF' : theme.colors.textMuted },
                    ]}
                  >
                    Single Day Detailed View
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Single Day Date Picker Bar */}
              {dailyViewMode === 'single' && (
                <View style={[styles.dateSelectorBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <TouchableOpacity onPress={() => shiftDailyDate(-1)} style={styles.dateArrowBtn}>
                    <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                  </TouchableOpacity>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                      {selectedDailyDate === todayStr ? 'Today (IST)' : selectedDailyDate}
                    </Text>
                    <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                      {filteredSingleDayEntries.length} Devotee Cards Submitted
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => shiftDailyDate(1)} style={styles.dateArrowBtn}>
                    <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Single Day Filter Chips */}
              {dailyViewMode === 'single' && (
                <View style={styles.filterChipRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      dailyFilterMode === 'all' && [styles.filterChipActive, { backgroundColor: theme.thickColor }],
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setDailyFilterMode('all')}
                  >
                    <Text style={[styles.filterChipText, { color: dailyFilterMode === 'all' ? '#FFFFFF' : theme.colors.text }]}>
                      All Cards ({singleDayEntries.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      dailyFilterMode === 'lowScore' && [styles.filterChipActive, { backgroundColor: theme.colors.danger }],
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setDailyFilterMode(dailyFilterMode === 'lowScore' ? 'all' : 'lowScore')}
                  >
                    <Text style={[styles.filterChipText, { color: dailyFilterMode === 'lowScore' ? '#FFFFFF' : theme.colors.danger }]}>
                      Low Score &lt; 50% ({singleDayEntries.filter((e) => (e.percentage ?? 0) < 50).length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 7-DAY MATRIX VIEW */}
              {dailyViewMode === 'week' && (
                <View>
                  {/* Week Navigation Selector Bar */}
                  <View
                    style={[
                      styles.dateSelectorBar,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setDailyWeekOffset((prev) => prev - 1)}
                      style={styles.dateArrowBtn}
                    >
                      <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                        {dailyWeekOffset === 0
                          ? 'Current 7 Days'
                          : `${past7Days[6].label} — ${past7Days[0].label}`}
                      </Text>
                      <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                        {past7Days[6].dateStr} to {past7Days[0].dateStr}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDailyWeekOffset((prev) => Math.min(0, prev + 1))}
                      style={[styles.dateArrowBtn, dailyWeekOffset >= 0 && { opacity: 0.3 }]}
                      disabled={dailyWeekOffset >= 0}
                    >
                      <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
                    Past 7 Days Audit: {past7Days[6].label} to {past7Days[0].label} ({devoteeWeekSummaries.length} devotees)
                  </Text>

                  {devoteeWeekSummaries.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="search-outline" size={36} color={theme.colors.textMuted} />
                      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                        No devotees match "{searchQuery}"
                      </Text>
                    </View>
                  ) : (
                    devoteeWeekSummaries.map((item) => {
                      const isExpanded = expandedDevoteeId === item.user.uid;
                      return (
                        <View
                          key={item.user.uid}
                          style={[
                            styles.devoteeCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                          ]}
                        >
                          {/* Devotee Header Row */}
                          <TouchableOpacity
                            style={styles.devoteeHeaderRow}
                            onPress={() => setExpandedDevoteeId(isExpanded ? null : item.user.uid)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                                  {item.user.displayName || 'Devotee'}
                                </Text>
                                <View style={[styles.targetPill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                                  <Text style={[styles.targetPillText, { color: theme.thickColor }]}>
                                    🎯 {item.user.declaredRounds || 16} Rds
                                  </Text>
                                </View>
                              </View>
                              <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                                {item.user.phoneNumber || 'No phone'} • Submitted {item.submittedCount}/7 days
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <Text style={[styles.avgScoreText, { color: item.avgPercentage >= 50 ? theme.thickColor : theme.colors.danger }]}>
                                {item.avgPercentage}% Avg
                              </Text>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={theme.colors.textMuted}
                              />
                            </View>
                          </TouchableOpacity>

                          {/* 7-Day Mini Dots Strip */}
                          <View style={[styles.weekDaysStrip, { borderTopColor: theme.colors.borderLight }]}>
                            {past7Days.map((day) => {
                              const entry = item.dayMap[day.dateStr];
                              const isFilled = !!entry;
                              const isGood = (entry?.percentage ?? 0) >= 50;
                              return (
                                <View key={day.dateStr} style={styles.dayMiniCol}>
                                  <Text style={[styles.dayMiniLabel, { color: theme.colors.textMuted }]}>{day.dayName}</Text>
                                  <View
                                    style={[
                                      styles.dayDot,
                                      {
                                        backgroundColor: isFilled
                                          ? isGood
                                            ? theme.colors.success
                                            : theme.colors.danger
                                          : theme.colors.surfaceVariant,
                                      },
                                    ]}
                                  >
                                    <Text style={styles.dayDotText}>
                                      {isFilled ? `${entry?.dailyTotalScore ?? 0}` : '—'}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          {/* Expanded Full Devotee Details */}
                          {isExpanded && (
                            <View style={[styles.expandedContent, { borderTopColor: theme.colors.borderLight }]}>
                              <Text style={[styles.expandedHeading, { color: theme.thickColor }]}>
                                7-Day Detailed Submissions
                              </Text>
                              {past7Days.map((day) => {
                                const entry = item.dayMap[day.dateStr];
                                if (!entry) {
                                  return (
                                    <View key={day.dateStr} style={[styles.missingDayRow, { backgroundColor: theme.liteColor }]}>
                                      <Text style={[styles.missingDayDate, { color: theme.colors.textMuted }]}>
                                        {day.label} ({day.dayName})
                                      </Text>
                                      <Text style={[styles.missingDayBadge, { color: theme.colors.danger }]}>
                                        Pending / Not Submitted
                                      </Text>
                                    </View>
                                  );
                                }
                                const nightSleepMins = calculateSleepDurationMinutes(entry.sleepTimeStr, entry.wakeUpTimeStr);
                                const totalSleptMins = nightSleepMins + (Number(entry.restMinutes) || 0);
                                return (
                                  <View key={day.dateStr} style={[styles.entryDetailRow, { borderColor: theme.colors.borderLight }]}>
                                    <View style={styles.entryDetailHeader}>
                                      <Text style={[styles.entryDetailDate, { color: theme.colors.text }]}>
                                        {day.label} ({day.dayName})
                                      </Text>
                                      <StatusBadge type="grade" value={entry.grade} />
                                    </View>
                                    <Text style={[styles.entryDetailStats, { color: theme.colors.textMuted }]}>
                                      📿 Chanting: {entry.completedRounds || 0} / {entry.declaredRounds || 16} rounds ({entry.japaMarks}/10) • Done at {formatFriendlyTime(entry.completionTimeStr)}
                                      {'\n'}📖 Reading: {entry.readingMinutes || 0}m ({entry.readingMarks}/10)
                                      {'\n'}🎧 Hearing: {entry.hearingMinutes || 0}m ({entry.hearingMarks}/10)
                                      {'\n'}🛏️ Sleep Routine: Bed {formatFriendlyTime(entry.sleepTimeStr || '21:30')}, Wake {formatFriendlyTime(entry.wakeUpTimeStr || '03:30')} (Night: {formatMinutesToHours(nightSleepMins)}), Day Rest: {entry.restMinutes || 0}m • Total Slept: {formatMinutesToHours(totalSleptMins)} ({entry.sleepMarks}/10)
                                      {'\n'}💻 Online Reading: {entry.onlineReadingAttended ? 'Attended (+50)' : 'Not attended'}
                                      {'\n'}🌅 Morning Programme: {entry.morningProgrammeAttended ? 'Attended (+50)' : 'Not attended'}
                                      {entry.serviceAttended ? `\n🙏 Service: Attended (+10)` : ''}
                                    </Text>
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

              {/* SINGLE DAY DETAILED VIEW */}
              {dailyViewMode === 'single' && (
                <View>
                  {filteredSingleDayEntries.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="document-text-outline" size={36} color={theme.colors.textMuted} />
                      <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                        No submitted cards found for {selectedDailyDate} matching filter.
                      </Text>
                    </View>
                  ) : (
                    filteredSingleDayEntries.map((entry) => {
                      const nightSleepMins = calculateSleepDurationMinutes(entry.sleepTimeStr, entry.wakeUpTimeStr);
                      const totalSleptMins = nightSleepMins + (Number(entry.restMinutes) || 0);
                      return (
                        <View
                          key={entry.id || entry.userId}
                          style={[
                            styles.singleCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                          ]}
                        >
                          <View style={styles.singleCardHeader}>
                            <View>
                              <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                                {entry.counseleeName || 'Devotee'}
                              </Text>
                              <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                                Total Score: {entry.dailyTotalScore}/50 • {entry.percentage}%
                              </Text>
                            </View>
                            <StatusBadge type="grade" value={entry.grade} />
                          </View>

                          <View style={[styles.dividerH, { backgroundColor: theme.colors.borderLight }]} />

                          {/* Complete Devotee Breakdown */}
                          <View style={styles.breakdownGrid}>
                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Chanting</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                {entry.completedRounds || 0} Rds
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                Done @ {formatFriendlyTime(entry.completionTimeStr)} ({entry.japaMarks}/10)
                              </Text>
                            </View>

                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Reading</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                {entry.readingMinutes || 0}m
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                {entry.readingMarks}/10 pts
                              </Text>
                            </View>

                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Hearing</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                {entry.hearingMinutes || 0}m
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                {entry.hearingMarks}/10 pts
                              </Text>
                            </View>

                            <View style={styles.breakdownBox}>
                              <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Sleep & Rest</Text>
                              <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                                Total: {formatMinutesToHours(totalSleptMins)}
                              </Text>
                              <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                                Bed {formatFriendlyTime(entry.sleepTimeStr || '21:30')} • Wake {formatFriendlyTime(entry.wakeUpTimeStr || '03:30')} (Night {formatMinutesToHours(nightSleepMins)}, Rest {entry.restMinutes || 0}m)
                              </Text>
                            </View>
                          </View>

                          {/* Extra Session Badges */}
                          <View style={styles.extraSessionsRow}>
                            <View
                              style={[
                                styles.sessionBadge,
                                {
                                  backgroundColor: entry.onlineReadingAttended ? '#DCFCE7' : '#F3F4F6',
                                  borderColor: entry.onlineReadingAttended ? '#86EFAC' : '#E5E7EB',
                                },
                              ]}
                            >
                              <Ionicons
                                name={entry.onlineReadingAttended ? 'checkmark-circle' : 'close-circle'}
                                size={14}
                                color={entry.onlineReadingAttended ? '#15803D' : '#9CA3AF'}
                              />
                              <Text
                                style={[
                                  styles.sessionBadgeText,
                                  { color: entry.onlineReadingAttended ? '#15803D' : '#6B7280' },
                                ]}
                              >
                                Online Reading: {entry.onlineReadingAttended ? 'Yes (+50)' : 'No'}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.sessionBadge,
                                {
                                  backgroundColor: entry.morningProgrammeAttended ? '#DCFCE7' : '#F3F4F6',
                                  borderColor: entry.morningProgrammeAttended ? '#86EFAC' : '#E5E7EB',
                                },
                              ]}
                            >
                              <Ionicons
                                name={entry.morningProgrammeAttended ? 'checkmark-circle' : 'close-circle'}
                                size={14}
                                color={entry.morningProgrammeAttended ? '#15803D' : '#9CA3AF'}
                              />
                              <Text
                                style={[
                                  styles.sessionBadgeText,
                                  { color: entry.morningProgrammeAttended ? '#15803D' : '#6B7280' },
                                ]}
                              >
                                Morning Prog: {entry.morningProgrammeAttended ? 'Yes (+50)' : 'No'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 2: WEEKLY REPORTS                                     */}
          {/* ========================================================= */}
          {activeTab === 'weekly' && (
            <View>
              {/* Week Info Banner */}
              <View style={[styles.infoBanner, { backgroundColor: theme.liteColor, borderColor: theme.colors.border }]}>
                <Ionicons name="information-circle-outline" size={20} color={theme.thickColor} />
                <Text style={[styles.infoBannerText, { color: theme.colors.text }]}>
                  Week: {currentWeekStart} to {currentWeekEnd} ({filteredWeeklyReports.length} Devotees)
                </Text>
              </View>

              {/* Weekly Filter Chips */}
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    weeklyFilterMode === 'all' && [styles.filterChipActive, { backgroundColor: theme.thickColor }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setWeeklyFilterMode('all')}
                >
                  <Text style={[styles.filterChipText, { color: weeklyFilterMode === 'all' ? '#FFFFFF' : theme.colors.text }]}>
                    All Devotees ({weeklyReports.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    weeklyFilterMode === 'lowScore' && [styles.filterChipActive, { backgroundColor: theme.colors.danger }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setWeeklyFilterMode(weeklyFilterMode === 'lowScore' ? 'all' : 'lowScore')}
                >
                  <Text style={[styles.filterChipText, { color: weeklyFilterMode === 'lowScore' ? '#FFFFFF' : theme.colors.danger }]}>
                    Low Score &lt; 50% ({weeklyReports.filter((r) => (r.percentage ?? 0) < 50).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredWeeklyReports.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="bar-chart-outline" size={36} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No weekly reports match "{searchQuery}"
                  </Text>
                </View>
              ) : (
                filteredWeeklyReports.map((report) => {
                  const devotee = allCounselees.find((u) => u.uid === report.userId);
                  const isExpanded = expandedWeeklyUserId === report.userId;
                  const isMorningUpdating = updatingId === `${report.userId}_morning_programme`;
                  const isClassUpdating = updatingId === `${report.userId}_weekly_class`;

                  return (
                    <View
                      key={report.userId}
                      style={[styles.reportCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      {/* Devotee Row */}
                      <View style={styles.reportCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                              {report.counseleeName || 'Devotee'}
                            </Text>
                            <View style={[styles.targetPill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                              <Text style={[styles.targetPillText, { color: theme.thickColor }]}>
                                🎯 {devotee?.declaredRounds || 16} Rds
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                            {devotee?.phoneNumber || 'No phone'}
                          </Text>
                        </View>
                        <StatusBadge type="grade" value={report.grade} />
                      </View>

                      {/* Weekly Score Summary */}
                      <ScoreCard
                        title={`Score: ${report.totalScore.toFixed(1)} / ${report.maxAvailableMarks}`}
                        score={report.totalScore}
                        maxScore={report.maxAvailableMarks}
                        percentage={report.percentage}
                        grade={report.grade}
                        breakdown={{
                          classMarks: report.weeklyClassMarks,
                          morningMarks: report.morningProgrammeMarks,
                          onlineReadingMarks: report.onlineReadingMarks,
                        }}
                      />

                      {/* Attendance Toggles for Counsellor */}
                      <View style={[styles.attendanceSection, { borderTopColor: theme.colors.borderLight }]}>
                        <Text style={[styles.attendanceTitle, { color: theme.thickColor }]}>
                          Counsellor Attendance Verification (Tap to Grant/Revoke):
                        </Text>
                        <View style={styles.attendanceButtonsRow}>
                          {/* Morning Programme (50 Marks) Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.attendanceBtn,
                              {
                                backgroundColor: report.morningProgrammeAttendance ? '#DCFCE7' : '#FEE2E2',
                                borderColor: report.morningProgrammeAttendance ? '#86EFAC' : '#FCA5A5',
                              },
                            ]}
                            disabled={isMorningUpdating}
                            onPress={() =>
                              handleToggleWeeklyAttendance(
                                report.userId,
                                'morning_programme',
                                report.morningProgrammeAttendance
                              )
                            }
                          >
                            {isMorningUpdating ? (
                              <ActivityIndicator size="small" color="#15803D" />
                            ) : (
                              <>
                                <Ionicons
                                  name={report.morningProgrammeAttendance ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={report.morningProgrammeAttendance ? '#15803D' : '#DC2626'}
                                />
                                <Text
                                  style={[
                                    styles.attendanceBtnText,
                                    { color: report.morningProgrammeAttendance ? '#15803D' : '#DC2626' },
                                  ]}
                                >
                                  Morning Prog: {report.morningProgrammeAttendance ? '50 Marks' : 'Pending'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>

                          {/* Weekly Class (10 Marks) Toggle */}
                          <TouchableOpacity
                            style={[
                              styles.attendanceBtn,
                              {
                                backgroundColor: report.weeklyClassAttendance ? '#DCFCE7' : '#FEE2E2',
                                borderColor: report.weeklyClassAttendance ? '#86EFAC' : '#FCA5A5',
                              },
                            ]}
                            disabled={isClassUpdating}
                            onPress={() =>
                              handleToggleWeeklyAttendance(
                                report.userId,
                                'weekly_class',
                                report.weeklyClassAttendance
                              )
                            }
                          >
                            {isClassUpdating ? (
                              <ActivityIndicator size="small" color="#15803D" />
                            ) : (
                              <>
                                <Ionicons
                                  name={report.weeklyClassAttendance ? 'checkmark-circle' : 'close-circle'}
                                  size={16}
                                  color={report.weeklyClassAttendance ? '#15803D' : '#DC2626'}
                                />
                                <Text
                                  style={[
                                    styles.attendanceBtnText,
                                    { color: report.weeklyClassAttendance ? '#15803D' : '#DC2626' },
                                  ]}
                                >
                                  Weekly Class: {report.weeklyClassAttendance ? '10 Marks' : 'Pending'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Expandable Daily Breakdown */}
                      <TouchableOpacity
                        style={[styles.expandToggleBtn, { borderTopColor: theme.colors.borderLight }]}
                        onPress={() => setExpandedWeeklyUserId(isExpanded ? null : report.userId)}
                      >
                        <Text style={[styles.expandToggleText, { color: theme.thickColor }]}>
                          {isExpanded ? 'Hide 7-Day Daily Breakdown' : 'View 7-Day Daily Breakdown'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.thickColor}
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={[styles.expandedDailyList, { borderTopColor: theme.colors.borderLight }]}>
                          {report.dailyEntries.filter((e) => e !== null).length === 0 ? (
                            <Text style={[styles.noDailyEntriesText, { color: theme.colors.textMuted }]}>
                              No daily entries submitted during this week.
                            </Text>
                          ) : (
                            report.dailyEntries.map((e) => {
                              if (!e) return null;
                              const eNightSleep = calculateSleepDurationMinutes(e.sleepTimeStr, e.wakeUpTimeStr);
                              const eTotalSleep = eNightSleep + (Number(e.restMinutes) || 0);
                              return (
                                <View key={e.date} style={[styles.weeklyDailyEntryRow, { borderColor: theme.colors.borderLight }]}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.weeklyDailyEntryDate, { color: theme.colors.text }]}>
                                      {e.date}
                                    </Text>
                                    <Text style={[styles.weeklyDailyEntryDetails, { color: theme.colors.textMuted }]}>
                                      📿 {e.completedRounds || 0} rds (@ {formatFriendlyTime(e.completionTimeStr)}) • 📖 {e.readingMinutes || 0}m • 🎧 {e.hearingMinutes || 0}m • 🛏️ Slept {formatMinutesToHours(eTotalSleep)}
                                    </Text>
                                  </View>
                                  <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.weeklyDailyScore, { color: theme.thickColor }]}>
                                      {e.dailyTotalScore}/50
                                    </Text>
                                    <StatusBadge type="grade" value={e.grade} />
                                  </View>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* TAB 3: MONTHLY REPORTS                                    */}
          {/* ========================================================= */}
          {activeTab === 'monthly' && (
            <View>
              {/* Month Selector Bar */}
              <View style={[styles.dateSelectorBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.dateArrowBtn}>
                  <Ionicons name="chevron-back" size={20} color={theme.thickColor} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.dateSelectorTitle, { color: theme.colors.text }]}>
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </Text>
                  <Text style={[styles.dateSelectorSubtitle, { color: theme.colors.textMuted }]}>
                    {filteredMonthlyReports.length} Active Devotee Records
                  </Text>
                </View>
                <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.dateArrowBtn}>
                  <Ionicons name="chevron-forward" size={20} color={theme.thickColor} />
                </TouchableOpacity>
              </View>

              {/* Monthly Filter Chips */}
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    monthlyFilterMode === 'all' && [styles.filterChipActive, { backgroundColor: theme.thickColor }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setMonthlyFilterMode('all')}
                >
                  <Text style={[styles.filterChipText, { color: monthlyFilterMode === 'all' ? '#FFFFFF' : theme.colors.text }]}>
                    All Devotees ({monthlyReports.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    monthlyFilterMode === 'lowScore' && [styles.filterChipActive, { backgroundColor: theme.colors.danger }],
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setMonthlyFilterMode(monthlyFilterMode === 'lowScore' ? 'all' : 'lowScore')}
                >
                  <Text style={[styles.filterChipText, { color: monthlyFilterMode === 'lowScore' ? '#FFFFFF' : theme.colors.danger }]}>
                    Low Score &lt; 50% ({monthlyReports.filter((r) => (r.percentage ?? 0) < 50).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredMonthlyReports.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="pie-chart-outline" size={36} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                    No monthly reports match "{searchQuery}"
                  </Text>
                </View>
              ) : (
                filteredMonthlyReports.map((report) => {
                  const devotee = allCounselees.find((u) => u.uid === report.userId);
                  const isSatsangaUpdating = updatingId === `${report.userId}_satsanga`;
                  const isSatsangaAttended = report.satsangaStatus === 'attended';
                  const submittedCount = report.dailyEntries.filter((e) => e !== null).length;

                  return (
                    <View
                      key={report.userId}
                      style={[styles.reportCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    >
                      {/* Devotee Row */}
                      <View style={styles.reportCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                              {report.counseleeName || 'Devotee'}
                            </Text>
                            <View style={[styles.targetPill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                              <Text style={[styles.targetPillText, { color: theme.thickColor }]}>
                                🎯 {devotee?.declaredRounds || 16} Rds
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                            {devotee?.phoneNumber || 'No phone'} • Submitted {submittedCount} days
                          </Text>
                        </View>
                        <StatusBadge type="grade" value={report.grade} />
                      </View>

                      {/* Score Summary */}
                      <ScoreCard
                        title={`Score: ${report.totalScore.toFixed(1)} / ${report.maxAvailableMarks}`}
                        score={report.totalScore}
                        maxScore={report.maxAvailableMarks}
                        percentage={report.percentage}
                        grade={report.grade}
                        breakdown={{
                          classMarks: report.weeklyClassesMarks,
                          morningMarks: report.morningProgrammesMarks,
                          satsangaMarks: report.satsangaMarks,
                        }}
                      />

                      {/* Monthly Metrics Box */}
                      <View style={styles.breakdownGrid}>
                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Rounds</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {report.totalRounds}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Total Japa
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Reading</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {formatMinutesToHours(report.totalReadingMinutes)}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Hours read
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Hearing</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {formatMinutesToHours(report.totalHearingMinutes)}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Hours heard
                          </Text>
                        </View>

                        <View style={styles.breakdownBox}>
                          <Text style={[styles.breakdownBoxLabel, { color: theme.colors.textMuted }]}>Rating</Text>
                          <Text style={[styles.breakdownBoxVal, { color: theme.thickColor }]}>
                            {report.consistencyRating}
                          </Text>
                          <Text style={[styles.breakdownBoxSub, { color: theme.colors.textMuted }]}>
                            Consistency
                          </Text>
                        </View>
                      </View>

                      {/* Monthly Satsanga Attendance Verification */}
                      <View style={[styles.attendanceSection, { borderTopColor: theme.colors.borderLight }]}>
                        <Text style={[styles.attendanceTitle, { color: theme.thickColor }]}>
                          Monthly Counsellor Satsanga (50 Marks):
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.attendanceBtn,
                            {
                              backgroundColor: isSatsangaAttended ? '#DCFCE7' : '#FEE2E2',
                              borderColor: isSatsangaAttended ? '#86EFAC' : '#FCA5A5',
                            },
                          ]}
                          disabled={isSatsangaUpdating}
                          onPress={() => handleToggleMonthlySatsanga(report.userId, report.satsangaStatus)}
                        >
                          {isSatsangaUpdating ? (
                            <ActivityIndicator size="small" color="#15803D" />
                          ) : (
                            <>
                              <Ionicons
                                name={isSatsangaAttended ? 'checkmark-circle' : 'close-circle'}
                                size={16}
                                color={isSatsangaAttended ? '#15803D' : '#DC2626'}
                              />
                              <Text
                                style={[
                                  styles.attendanceBtnText,
                                  { color: isSatsangaAttended ? '#15803D' : '#DC2626' },
                                ]}
                              >
                                Monthly Satsanga: {isSatsangaAttended ? 'Attended (50 Marks)' : 'Not Attended / Pending'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
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
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    ...THEME.shadows.soft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBoxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12.5,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  subModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  subModeBtnActive: {
    ...THEME.shadows.soft,
  },
  subModeBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  dateSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    ...THEME.shadows.soft,
  },
  dateArrowBtn: {
    padding: 6,
  },
  dateSelectorTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  dateSelectorSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  devoteeCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  devoteeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devoteeName: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  targetPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  targetPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  devoteePhone: {
    fontSize: 11,
    marginTop: 2,
  },
  avgScoreText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  weekDaysStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  dayMiniCol: {
    alignItems: 'center',
    gap: 3,
  },
  dayMiniLabel: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  dayDot: {
    width: 28,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  expandedHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  missingDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  missingDayDate: {
    fontSize: 11,
  },
  missingDayBadge: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  entryDetailRow: {
    paddingVertical: 5,
    borderBottomWidth: 0.8,
  },
  entryDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  entryDetailDate: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  entryDetailStats: {
    fontSize: 10.5,
    lineHeight: 16,
  },
  singleCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  singleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dividerH: {
    height: 1,
    marginVertical: 8,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 4,
    gap: 6,
  },
  breakdownBox: {
    width: '48.5%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownBoxLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  breakdownBoxVal: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 1,
  },
  breakdownBoxSub: {
    fontSize: 10,
    marginTop: 1,
  },
  extraSessionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  sessionBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  serviceNote: {
    fontSize: 10.5,
    marginTop: 6,
    fontStyle: 'italic',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  infoBannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  reportCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    ...THEME.shadows.soft,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attendanceSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attendanceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  attendanceButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  attendanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  attendanceBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  expandedDailyList: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  noDailyEntriesText: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
  },
  weeklyDailyEntryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.8,
  },
  weeklyDailyEntryDate: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  weeklyDailyEntryDetails: {
    fontSize: 10,
    marginTop: 1,
  },
  weeklyDailyScore: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
});
