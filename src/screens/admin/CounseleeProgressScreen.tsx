import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Svg, {
  Line,
  Rect,
  Circle,
  Text as SvgText,
  Polyline,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { sadhanaService } from '../../services/sadhanaService';
import { SadhanaEntry } from '../../types/sadhana';
import { UserProfile } from '../../types/auth';
import {
  getTodayDateStringIST,
  getMonthCalendarWeeks,
  CalendarWeek,
  MONTH_NAMES_SHORT,
} from '../../utils/dateUtils';

const { width: screenWidth } = Dimensions.get('window');

interface DayGraphPoint {
  dateStr: string;
  dayLabel: string;
  dayNumber: string;
  score: number; // 0 to 100
  isFilled: boolean;
  entry?: SadhanaEntry;
}

export const CounseleeProgressScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const todayStr = getTodayDateStringIST();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDevotee, setSelectedDevotee] = useState<UserProfile | null>(null);

  // Active View Tab: 'weekly' | 'monthly'
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  // Month navigation
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Weekly selector
  const [monthWeeks, setMonthWeeks] = useState<CalendarWeek[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(1);

  // Entries for selected devotee
  const [devoteeEntries, setDevoteeEntries] = useState<SadhanaEntry[]>([]);

  useEffect(() => {
    loadCounselees();
  }, []);

  useEffect(() => {
    const weeks = getMonthCalendarWeeks(selectedYear, selectedMonth, todayStr);
    setMonthWeeks(weeks);
    const curr = weeks.find((w) => w.isCurrentWeek);
    if (curr) {
      setSelectedWeekIndex(curr.weekIndex);
    } else {
      setSelectedWeekIndex(1);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedDevotee) {
      loadDevoteeData(selectedDevotee.uid);
    }
  }, [selectedDevotee, selectedYear, selectedMonth]);

  const loadCounselees = async (force = false) => {
    setIsLoading(true);
    try {
      const all = await authService.getAllCounselees(force);
      const approved = all
        .filter((u) => u.role !== 'counsellor' && u.status === 'approved')
        .sort((a, b) => (a.displayName || 'Devotee').localeCompare(b.displayName || 'Devotee'));
      setCounselees(approved);
      if (approved.length > 0 && !selectedDevotee) {
        setSelectedDevotee(approved[0]);
      }
    } catch (e) {
      console.warn('Error loading counselees:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDevoteeData = async (userId: string, force = false) => {
    setIsRefreshing(true);
    try {
      const monthStr = String(selectedMonth).padStart(2, '0');
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const startDate = `${selectedYear}-${monthStr}-01`;
      const endDate = `${selectedYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

      // We load all entries for the whole month for this user
      const entries = await sadhanaService.getEntriesForDateRange(userId, startDate, endDate, force);
      setDevoteeEntries(entries);
    } catch (e) {
      console.warn('Error loading devotee entries:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Filter counselees by search
  const filteredCounselees = useMemo(() => {
    if (!searchQuery.trim()) return counselees;
    const q = searchQuery.toLowerCase();
    return counselees.filter(
      (c) =>
        (c.displayName || '').toLowerCase().includes(q) ||
        (c.phoneNumber || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    );
  }, [counselees, searchQuery]);

  // Current active calendar week
  const activeWeek = monthWeeks.find((w) => w.weekIndex === selectedWeekIndex) || monthWeeks[0];

  // Map entries by date
  const entryMap = useMemo(() => {
    const map = new Map<string, SadhanaEntry>();
    devoteeEntries.forEach((e) => map.set(e.date, e));
    return map;
  }, [devoteeEntries]);

  // Weekly data points (Mon to Sun: exactly 7 points)
  const weeklyPoints: DayGraphPoint[] = useMemo(() => {
    if (!activeWeek) return [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return activeWeek.dates.map((dateStr, idx) => {
      const entry = entryMap.get(dateStr);
      const score = entry ? Math.min(100, Math.max(0, entry.percentage ?? 0)) : 0;
      return {
        dateStr,
        dayLabel: dayNames[idx],
        dayNumber: dateStr.split('-')[2],
        score,
        isFilled: !!entry,
        entry,
      };
    });
  }, [activeWeek, entryMap]);

  // Monthly data points (Day 1 to 30/31)
  const monthlyPoints: DayGraphPoint[] = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const monthStr = String(selectedMonth).padStart(2, '0');
    const points: DayGraphPoint[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dd = String(day).padStart(2, '0');
      const dateStr = `${selectedYear}-${monthStr}-${dd}`;
      const entry = entryMap.get(dateStr);
      const score = entry ? Math.min(100, Math.max(0, entry.percentage ?? 0)) : 0;
      const dObj = new Date(selectedYear, selectedMonth - 1, day);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      points.push({
        dateStr,
        dayLabel: dayNames[dObj.getDay()],
        dayNumber: String(day),
        score,
        isFilled: !!entry,
        entry,
      });
    }
    return points;
  }, [selectedYear, selectedMonth, entryMap]);

  const monthName = MONTH_NAMES_SHORT[selectedMonth - 1];

  // Helper to compute trend between two points
  const getTrendSummary = (points: DayGraphPoint[]) => {
    const filled = points.filter((p) => p.isFilled);
    if (filled.length === 0) return 'No sadhana cards filled for this period.';
    const avg = Math.round(filled.reduce((sum, p) => sum + p.score, 0) / filled.length);

    // Look for day-over-day movement
    let increases = 0;
    let decreases = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].isFilled && points[i - 1].isFilled) {
        if (points[i].score > points[i - 1].score) increases++;
        if (points[i].score < points[i - 1].score) decreases++;
      }
    }
    return `Filled ${filled.length} / ${points.length} days • Average: ${avg}% • ${
      increases >= decreases ? 'Upward / consistent trend' : 'Needs encouragement'
    }`;
  };

  // -------------------------------------------------------------
  // SVG CHART RENDERERS
  // -------------------------------------------------------------
  const renderWeeklyChart = () => {
    const chartHeight = 220;
    const paddingLeft = 36;
    const paddingRight = 24;
    const paddingTop = 26;
    const paddingBottom = 40;
    const chartWidth = Math.min(screenWidth - 32, 450);
    const plotWidth = chartWidth - paddingLeft - paddingRight;
    const plotHeight = chartHeight - paddingTop - paddingBottom;

    const n = weeklyPoints.length; // 7
    const xStep = plotWidth / (n - 1);

    // Coordinates
    const coords = weeklyPoints.map((pt, i) => {
      const x = paddingLeft + i * xStep;
      const y = paddingTop + plotHeight - (pt.score / 100) * plotHeight;
      return { x, y, pt };
    });

    // Polyline points
    const pointsStr = coords.map((c) => `${c.x},${c.y}`).join(' ');

    // Closed polygon for gradient area
    const areaPoints = `${coords[0].x},${paddingTop + plotHeight} ` +
      coords.map((c) => `${c.x},${c.y}`).join(' ') +
      ` ${coords[coords.length - 1].x},${paddingTop + plotHeight}`;

    return (
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
              {activeWeek?.label}: Daily Sadhana Trend
            </Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textMuted }]}>
              {activeWeek?.rangeLabel} (Monday to Sunday)
            </Text>
          </View>
          <View style={[styles.chartPill, { backgroundColor: theme.liteColor }]}>
            <Text style={[styles.chartPillText, { color: theme.thickColor }]}>
              Score %
            </Text>
          </View>
        </View>

        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="weekGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.thickColor} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={theme.thickColor} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Grid lines: 100%, 75%, 50%, 25%, 0% */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = paddingTop + plotHeight - (val / 100) * plotHeight;
            return (
              <React.Fragment key={val}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray={val === 0 || val === 100 ? undefined : '3,3'}
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 3}
                  fontSize="9"
                  fill="#9CA3AF"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {val}%
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Area under curve */}
          <Polygon points={areaPoints} fill="url(#weekGrad)" />

          {/* Connecting trend line */}
          <Polyline
            points={pointsStr}
            fill="none"
            stroke={theme.thickColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {coords.map((c, i) => {
            const isFilled = c.pt.isFilled;
            const dotColor = isFilled
              ? c.pt.score >= 70
                ? '#16A34A'
                : c.pt.score >= 50
                ? '#D97706'
                : '#DC2626'
              : '#9CA3AF';

            return (
              <React.Fragment key={i}>
                {/* Outer halo */}
                <Circle
                  cx={c.x}
                  cy={c.y}
                  r="6"
                  fill="#FFFFFF"
                  stroke={dotColor}
                  strokeWidth="2.5"
                />
                {/* Score value label above point */}
                {isFilled && (
                  <SvgText
                    x={c.x}
                    y={c.y - 10}
                    fontSize="10"
                    fill={dotColor}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {c.pt.score}%
                  </SvgText>
                )}
                {/* Day of Week Label & Date Number below */}
                <SvgText
                  x={c.x}
                  y={paddingTop + plotHeight + 16}
                  fontSize="10"
                  fill={isFilled ? theme.colors.text : '#9CA3AF'}
                  fontWeight={isFilled ? 'bold' : 'normal'}
                  textAnchor="middle"
                >
                  {c.pt.dayLabel}
                </SvgText>
                <SvgText
                  x={c.x}
                  y={paddingTop + plotHeight + 28}
                  fontSize="9"
                  fill={isFilled ? theme.thickColor : '#9CA3AF'}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {c.pt.dayNumber}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Legend strip */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>&gt;= 70% (High)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.legendText}>50-69% (Average)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>&lt; 50% (Low)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={styles.legendText}>Not Filled</Text>
          </View>
        </View>

        {/* Dynamic Trend Text */}
        <View style={[styles.trendBanner, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
          <Ionicons name="analytics" size={15} color={theme.thickColor} />
          <Text style={[styles.trendBannerText, { color: theme.thickColor }]}>
            {getTrendSummary(weeklyPoints)}
          </Text>
        </View>
      </View>
    );
  };

  const renderMonthlyChart = () => {
    const daysCount = monthlyPoints.length;
    const barWidth = 14;
    const barGap = 6;
    const paddingLeft = 36;
    const paddingRight = 20;
    const paddingTop = 26;
    const paddingBottom = 40;
    const chartHeight = 220;
    const plotHeight = chartHeight - paddingTop - paddingBottom;
    const totalSvgWidth = paddingLeft + daysCount * (barWidth + barGap) + paddingRight;

    return (
      <View style={[styles.chartContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
              {monthName} {selectedYear}: Full Month Progress
            </Text>
            <Text style={[styles.chartSubtitle, { color: theme.colors.textMuted }]}>
              Day 1 to Day {daysCount} (Scroll horizontally)
            </Text>
          </View>
          <View style={[styles.chartPill, { backgroundColor: theme.liteColor }]}>
            <Text style={[styles.chartPillText, { color: theme.thickColor }]}>
              30/31 Days
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 6 }}>
          <Svg width={totalSvgWidth} height={chartHeight}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = paddingTop + plotHeight - (val / 100) * plotHeight;
              return (
                <React.Fragment key={val}>
                  <Line
                    x1={paddingLeft}
                    y1={y}
                    x2={totalSvgWidth - paddingRight}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray={val === 0 || val === 100 ? undefined : '3,3'}
                  />
                  <SvgText
                    x={paddingLeft - 6}
                    y={y + 3}
                    fontSize="9"
                    fill="#9CA3AF"
                    textAnchor="end"
                  >
                    {val}%
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Bars for each day of the month */}
            {monthlyPoints.map((pt, i) => {
              const x = paddingLeft + i * (barWidth + barGap);
              const bHeight = pt.isFilled ? Math.max(6, (pt.score / 100) * plotHeight) : 4;
              const y = paddingTop + plotHeight - bHeight;

              const barColor = pt.isFilled
                ? pt.score >= 70
                  ? '#16A34A'
                  : pt.score >= 50
                  ? '#D97706'
                  : '#DC2626'
                : '#E5E7EB';

              return (
                <React.Fragment key={i}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={bHeight}
                    rx="3"
                    fill={barColor}
                  />
                  {pt.isFilled && (
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 4}
                      fontSize="7"
                      fill={barColor}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pt.score}
                    </SvgText>
                  )}
                  <SvgText
                    x={x + barWidth / 2}
                    y={paddingTop + plotHeight + 14}
                    fontSize="8"
                    fill={pt.isFilled ? theme.colors.text : '#9CA3AF'}
                    fontWeight={pt.isFilled ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {pt.dayNumber}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </ScrollView>

        {/* Dynamic Trend Text */}
        <View style={[styles.trendBanner, { backgroundColor: theme.liteColor, borderColor: theme.thickColor, marginTop: 8 }]}>
          <Ionicons name="bar-chart" size={15} color={theme.thickColor} />
          <Text style={[styles.trendBannerText, { color: theme.thickColor }]}>
            {getTrendSummary(monthlyPoints)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Counselee Progress"
        subtitle={selectedDevotee ? `Progress graph for ${selectedDevotee.displayName}` : 'Visual Sadhana Analytics'}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Devotee Selection Horizontal Drawer / Search */}
      <View style={[styles.searchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search counselee name..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Horizontal Counselee Chips */}
      <View style={styles.devoteeChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.devoteeChipsScroll}>
          {filteredCounselees.map((devotee) => {
            const isSelected = selectedDevotee?.uid === devotee.uid;
            return (
              <TouchableOpacity
                key={devotee.uid}
                style={[
                  styles.devoteeChip,
                  {
                    backgroundColor: isSelected ? theme.thickColor : theme.colors.card,
                    borderColor: isSelected ? theme.thickColor : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedDevotee(devotee)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.devoteeChipAvatar,
                    { backgroundColor: isSelected ? '#FFFFFF' : theme.liteColor },
                  ]}
                >
                  <Text style={[styles.devoteeChipAvatarText, { color: theme.thickColor }]}>
                    {(devotee.displayName || 'D')[0].toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.devoteeChipName,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {devotee.displayName || 'Devotee'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main View Mode Tabs: Weekly vs Monthly */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'weekly' && [styles.tabButtonActive, { backgroundColor: theme.thickColor }],
          ]}
          onPress={() => setActiveTab('weekly')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={activeTab === 'weekly' ? '#FFFFFF' : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'weekly' ? '#FFFFFF' : theme.colors.textMuted },
            ]}
          >
            Weekly Graph (Mon - Sun)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'monthly' && [styles.tabButtonActive, { backgroundColor: theme.thickColor }],
          ]}
          onPress={() => setActiveTab('monthly')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === 'monthly' ? '#FFFFFF' : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'monthly' ? '#FFFFFF' : theme.colors.textMuted },
            ]}
          >
            Monthly Graph (Day 1 - End)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Navigator Header */}
      <View style={[styles.monthNavRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={theme.thickColor} />
        </TouchableOpacity>
        <View style={styles.monthLabelCenter}>
          <Ionicons name="calendar-sharp" size={15} color={theme.thickColor} />
          <Text style={[styles.monthLabelText, { color: theme.colors.text }]}>
            {monthName} {selectedYear}
          </Text>
        </View>
        <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={18} color={theme.thickColor} />
        </TouchableOpacity>
      </View>

      {/* Under Weekly: Week Pills Selector */}
      {activeTab === 'weekly' && monthWeeks.length > 0 && (
        <View style={styles.weekPillsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekPillsScroll}>
            {monthWeeks.map((w) => {
              const isSelected = w.weekIndex === selectedWeekIndex;
              return (
                <TouchableOpacity
                  key={w.weekIndex}
                  style={[
                    styles.weekPill,
                    {
                      backgroundColor: isSelected ? theme.thickColor : theme.colors.card,
                      borderColor: isSelected ? theme.thickColor : theme.colors.border,
                    },
                  ]}
                  onPress={() => setSelectedWeekIndex(w.weekIndex)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.weekPillTitle,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    {w.label} {w.isCurrentWeek && '• Current'}
                  </Text>
                  <Text
                    style={[
                      styles.weekPillSub,
                      { color: isSelected ? 'rgba(255,255,255,0.85)' : theme.colors.textMuted },
                    ]}
                  >
                    {w.rangeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading counselee analytics...
          </Text>
        </View>
      ) : !selectedDevotee ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={48} color={theme.colors.textMuted} />
          <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            No approved counselees found.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDevoteeData(selectedDevotee.uid, true)}
            />
          }
        >
          {/* Selected Devotee Profile Header */}
          <View style={[styles.devoteeProfileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.devoteeAvatarLarge, { backgroundColor: theme.liteColor }]}>
              <Text style={[styles.devoteeAvatarLargeText, { color: theme.thickColor }]}>
                {(selectedDevotee.displayName || 'D')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.colors.text }]}>
                {selectedDevotee.displayName || 'Devotee'}
              </Text>
              <Text style={[styles.profileSub, { color: theme.colors.textMuted }]}>
                Target: {selectedDevotee.declaredRounds || 16} rounds • {selectedDevotee.phoneNumber || selectedDevotee.email || 'Active'}
              </Text>
            </View>
          </View>

          {/* Interactive Graph Render */}
          {activeTab === 'weekly' ? renderWeeklyChart() : renderMonthlyChart()}

          {/* Detailed Day-by-Day Inspection Table */}
          <View style={[styles.tableCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.tableHeaderTitle, { color: theme.thickColor }]}>
              {activeTab === 'weekly' ? `${activeWeek?.label} Day-by-Day Details` : `${monthName} Daily Submissions`}
            </Text>

            {(activeTab === 'weekly' ? weeklyPoints : monthlyPoints).map((pt) => {
              const e = pt.entry;
              const hasEntry = !!e;

              return (
                <View
                  key={pt.dateStr}
                  style={[styles.tableRow, { borderBottomColor: theme.colors.borderLight || '#F3F4F6' }]}
                >
                  <View style={styles.tableRowDate}>
                    <Text style={[styles.tableRowDay, { color: hasEntry ? theme.colors.text : '#9CA3AF' }]}>
                      {pt.dayLabel}
                    </Text>
                    <Text style={[styles.tableRowDateNum, { color: theme.thickColor }]}>
                      {pt.dateStr.split('-')[2]} {monthName}
                    </Text>
                  </View>

                  <View style={styles.tableRowMetrics}>
                    {hasEntry ? (
                      <>
                        <Text style={[styles.metricSnippet, { color: theme.colors.text }]}>
                          📿 {e?.completedRounds ?? 0} rnds • 📖 {e?.readingMinutes ?? 0}m • 🎧 {e?.hearingMinutes ?? 0}m
                        </Text>
                        <Text style={[styles.metricSnippetSub, { color: theme.colors.textMuted }]}>
                          Wake: {e?.wakeUpTimeStr || 'N/A'} • Bed: {e?.sleepTimeStr || 'N/A'}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.notFilledText, { color: '#9CA3AF' }]}>
                        Card Not Submitted
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor: hasEntry
                          ? pt.score >= 70
                            ? '#DCFCE7'
                            : pt.score >= 50
                            ? '#FEF3C7'
                            : '#FEE2E2'
                          : '#F3F4F6',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scoreBadgeText,
                        {
                          color: hasEntry
                            ? pt.score >= 70
                              ? '#15803D'
                              : pt.score >= 50
                              ? '#B45309'
                              : '#DC2626'
                            : '#9CA3AF',
                        },
                      ]}
                    >
                      {hasEntry ? `${pt.score}%` : '0%'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  devoteeChipsContainer: {
    marginTop: 8,
  },
  devoteeChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  devoteeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  devoteeChipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devoteeChipAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  devoteeChipName: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthNavBtn: {
    padding: 4,
    borderRadius: 6,
  },
  monthLabelCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthLabelText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  weekPillsWrapper: {
    marginTop: 8,
  },
  weekPillsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  weekPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekPillTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  weekPillSub: {
    fontSize: 9,
    marginTop: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  devoteeProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  devoteeAvatarLarge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devoteeAvatarLargeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileSub: {
    fontSize: 11,
    marginTop: 2,
  },
  chartContainer: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  chartSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  chartPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chartPillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },
  trendBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  trendBannerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  tableCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  tableHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  tableRowDate: {
    width: 60,
  },
  tableRowDay: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tableRowDateNum: {
    fontSize: 9,
    marginTop: 1,
  },
  tableRowMetrics: {
    flex: 1,
  },
  metricSnippet: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricSnippetSub: {
    fontSize: 10,
    marginTop: 2,
  },
  notFilledText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 42,
    alignItems: 'center',
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
