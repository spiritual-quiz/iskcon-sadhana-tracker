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

interface DevoteeFillSummary {
  uid: string;
  name: string;
  filledDays: number;
  totalDays: number;
  percentage: number;
  dayMap: { [dateStr: string]: boolean };
}

export const SadhanaDaysFilledScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Month navigation state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Calendar Weeks for selected month
  const [monthWeeks, setMonthWeeks] = useState<CalendarWeek[]>([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(1);

  const [weeklySummaries, setWeeklySummaries] = useState<DevoteeFillSummary[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<DevoteeFillSummary[]>([]);

  const todayStr = getTodayDateStringIST();

  useEffect(() => {
    // Generate calendar weeks for selected year/month
    const weeks = getMonthCalendarWeeks(selectedYear, selectedMonth, todayStr);
    setMonthWeeks(weeks);

    // Default to the current active week if it exists in this month, else Week 1
    const currentWeek = weeks.find((w) => w.isCurrentWeek);
    if (currentWeek) {
      setSelectedWeekIndex(currentWeek.weekIndex);
    } else {
      setSelectedWeekIndex(1);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (monthWeeks.length > 0) {
      loadData();
    }
  }, [selectedYear, selectedMonth, selectedWeekIndex, monthWeeks.length]);

  const activeWeek = monthWeeks.find((w) => w.weekIndex === selectedWeekIndex) || monthWeeks[0];

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

  const loadData = async (force = false) => {
    if (!activeWeek) return;
    setIsLoading(true);
    try {
      // 1. Fetch all approved counselees
      const allCounselees = await authService.getAllCounselees(force);
      const approved = allCounselees.filter(
        (u: UserProfile) => u.role !== 'counsellor' && u.status === 'approved'
      );

      // Sort in strict ascending order (A to Z) as required
      const sortedDevotees = [...approved].sort((a, b) =>
        (a.displayName || 'Devotee').localeCompare(b.displayName || 'Devotee')
      );

      // 2. Active Week Range (Monday to Sunday)
      const weekStartDate = activeWeek.startDate;
      const weekEndDate = activeWeek.endDate;

      // 3. Current Month Range
      const monthStr = String(selectedMonth).padStart(2, '0');
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const monthStartDate = `${selectedYear}-${monthStr}-01`;
      const monthEndDate = `${selectedYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

      // 4. Batch query entries for selected week & month
      const [weekEntries, monthEntries] = await Promise.all([
        sadhanaService.getAllEntriesForDateRange(weekStartDate, weekEndDate, force),
        sadhanaService.getAllEntriesForDateRange(monthStartDate, monthEndDate, force),
      ]);

      // Group week entries by user
      const weekUserEntries = new Map<string, Set<string>>();
      weekEntries.forEach((e: SadhanaEntry) => {
        if (!weekUserEntries.has(e.userId)) {
          weekUserEntries.set(e.userId, new Set());
        }
        weekUserEntries.get(e.userId)!.add(e.date);
      });

      // Group month entries by user
      const monthUserEntries = new Map<string, Set<string>>();
      monthEntries.forEach((e: SadhanaEntry) => {
        if (!monthUserEntries.has(e.userId)) {
          monthUserEntries.set(e.userId, new Set());
        }
        monthUserEntries.get(e.userId)!.add(e.date);
      });

      // 5. Build weekly summaries for this Monday-to-Sunday week
      const weekList: DevoteeFillSummary[] = sortedDevotees.map((d: UserProfile) => {
        const filledDates = weekUserEntries.get(d.uid) || new Set();
        const dayMap: { [dateStr: string]: boolean } = {};
        activeWeek.dates.forEach((pDate) => {
          dayMap[pDate] = filledDates.has(pDate);
        });
        const filledDays = activeWeek.dates.filter((pDate) => filledDates.has(pDate)).length;
        const percentage = Math.round((filledDays / 7) * 100);
        return {
          uid: d.uid,
          name: d.displayName || 'Devotee',
          filledDays,
          totalDays: 7,
          percentage,
          dayMap,
        };
      });

      // 6. Build monthly summaries (A to Z)
      const monthList: DevoteeFillSummary[] = sortedDevotees.map((d: UserProfile) => {
        const filledDates = monthUserEntries.get(d.uid) || new Set();
        const filledDays = filledDates.size;
        const percentage = Math.round((filledDays / daysInMonth) * 100);
        return {
          uid: d.uid,
          name: d.displayName || 'Devotee',
          filledDays,
          totalDays: daysInMonth,
          percentage,
          dayMap: {},
        };
      });

      setWeeklySummaries(weekList);
      setMonthlySummaries(monthList);
    } catch (e) {
      console.warn('Error loading sadhana days filled data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
  };

  const displayedList = activeTab === 'weekly' ? weeklySummaries : monthlySummaries;
  const monthName = MONTH_NAMES_SHORT[selectedMonth - 1];
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const dayShortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Sadhana Days Filled"
        subtitle={
          activeTab === 'weekly'
            ? `${activeWeek ? `${activeWeek.label}: ${activeWeek.rangeLabel}` : 'Weekly Breakdown'}`
            : `${monthName} ${selectedYear} (${daysInMonth} Days)`
        }
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Weekly vs Monthly Tab Bar */}
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
            name="calendar"
            size={16}
            color={activeTab === 'weekly' ? '#FFFFFF' : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'weekly' ? '#FFFFFF' : theme.colors.textMuted },
            ]}
          >
            Weekly (Mon - Sun)
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
            Monthly (Whole Month)
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

      {/* Under Weekly: Week 1, Week 2, Week 3, Week 4, Week 5 Tabs */}
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
                  <View style={styles.weekPillContent}>
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
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Sub-header info banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.thickColor} />
        <Text style={[styles.infoBannerText, { color: theme.thickColor }]}>
          {activeTab === 'weekly'
            ? activeWeek
              ? `Showing ${activeWeek.label} (${activeWeek.rangeLabel}, Mon-Sun). Sorted A to Z across ${weeklySummaries.length} devotees.`
              : 'Weekly calendar view (Mon to Sun).'
            : `Showing full month (${monthName} ${selectedYear}) submission count. Sorted A to Z across ${monthlySummaries.length} devotees.`}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Calculating sadhana submission frequency...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {displayedList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="documents-outline" size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No approved counselees found.
              </Text>
            </View>
          ) : (
            displayedList.map((item, index) => {
              const isGood = item.percentage >= 70;
              const isAvg = item.percentage >= 40 && item.percentage < 70;

              const badgeColor = isGood ? '#15803D' : isAvg ? '#B45309' : '#DC2626';
              const badgeBg = isGood ? '#DCFCE7' : isAvg ? '#FEF3C7' : '#FEE2E2';

              return (
                <View
                  key={item.uid}
                  style={[
                    styles.devoteeCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.avatarCircle, { backgroundColor: theme.liteColor }]}>
                        <Text style={[styles.avatarText, { color: theme.thickColor }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.devoteeSub, { color: theme.colors.textMuted }]}>
                          {item.percentage}% submission consistency
                        </Text>
                      </View>
                    </View>

                    {/* Days Filled Count Badge */}
                    <View style={[styles.daysBadge, { backgroundColor: badgeBg }]}>
                      <Ionicons
                        name={isGood ? 'checkmark-circle' : 'time-outline'}
                        size={14}
                        color={badgeColor}
                      />
                      <Text style={[styles.daysBadgeText, { color: badgeColor }]}>
                        {item.filledDays} / {item.totalDays} Days
                      </Text>
                    </View>
                  </View>

                  {/* If Weekly: Show 7-Day Checklist Row (Monday to Sunday) */}
                  {activeTab === 'weekly' && activeWeek && (
                    <View style={styles.dayStripRow}>
                      {activeWeek.dates.map((dateStr, dIdx) => {
                        const isFilled = !!item.dayMap[dateStr];
                        const dayNum = dateStr.split('-')[2];
                        const dayLetter = dayShortNames[dIdx];
                        return (
                          <View
                            key={dateStr}
                            style={[
                              styles.dayChip,
                              {
                                backgroundColor: isFilled ? '#DCFCE7' : '#F3F4F6',
                                borderColor: isFilled ? '#86EFAC' : '#E5E7EB',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayChipLetter,
                                { color: isFilled ? '#15803D' : '#6B7280' },
                              ]}
                            >
                              {dayLetter}
                            </Text>
                            <Text
                              style={[
                                styles.dayChipNum,
                                { color: isFilled ? '#15803D' : '#9CA3AF' },
                              ]}
                            >
                              {dayNum}
                            </Text>
                            <Ionicons
                              name={isFilled ? 'checkmark-circle' : 'close-circle-outline'}
                              size={12}
                              color={isFilled ? '#16A34A' : '#D1D5DB'}
                              style={{ marginTop: 2 }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: badgeColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
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
    paddingVertical: 10,
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
    fontSize: 12,
    fontWeight: 'bold',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 6,
  },
  monthLabelCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekPillsWrapper: {
    marginTop: 10,
  },
  weekPillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  weekPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekPillContent: {
    alignItems: 'center',
  },
  weekPillTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  weekPillSub: {
    fontSize: 10,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBannerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  devoteeCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  devoteeName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  devoteeSub: {
    fontSize: 11,
    marginTop: 1,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dayChip: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 38,
  },
  dayChipLetter: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayChipNum: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});
