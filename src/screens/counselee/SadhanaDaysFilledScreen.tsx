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
import { getTodayDateStringIST } from '../../utils/dateUtils';

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

  const [weeklySummaries, setWeeklySummaries] = useState<DevoteeFillSummary[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<DevoteeFillSummary[]>([]);
  const [weekRangeLabel, setWeekRangeLabel] = useState<string>('');
  const [monthLabel, setMonthLabel] = useState<string>('');

  const todayStr = getTodayDateStringIST();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (force = false) => {
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

      // 2. Compute Weekly (Recent 7 Days)
      const baseDate = new Date();
      const past7Dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        past7Dates.push(`${y}-${m}-${day}`);
      }
      const weekStartDate = past7Dates[0];
      const weekEndDate = past7Dates[past7Dates.length - 1];
      setWeekRangeLabel(`${past7Dates[0]} to ${past7Dates[6]} (Past 7 Days)`);

      // 3. Compute Monthly (Current Month)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const monthStr = String(currentMonth).padStart(2, '0');
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const monthStartDate = `${currentYear}-${monthStr}-01`;
      const monthEndDate = `${currentYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      setMonthLabel(`${monthNames[currentMonth - 1]} ${currentYear} (${daysInMonth} Days)`);

      // 4. Batch query entries
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

      // 5. Build weekly summaries (A to Z)
      const weekList: DevoteeFillSummary[] = sortedDevotees.map((d: UserProfile) => {
        const filledDates = weekUserEntries.get(d.uid) || new Set();
        const dayMap: { [dateStr: string]: boolean } = {};
        past7Dates.forEach((pDate) => {
          dayMap[pDate] = filledDates.has(pDate);
        });
        const filledDays = past7Dates.filter((pDate) => filledDates.has(pDate)).length;
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Sadhana Days Filled"
        subtitle={activeTab === 'weekly' ? weekRangeLabel : monthLabel}
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
            Weekly (Recent 7 Days)
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

      {/* Sub-header info banner */}
      <View style={[styles.infoBanner, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.thickColor} />
        <Text style={[styles.infoBannerText, { color: theme.thickColor }]}>
          {activeTab === 'weekly'
            ? `Showing recent week sadhana submission frequency. Sorted ascending (A to Z) across ${weeklySummaries.length} devotees.`
            : `Showing whole month sadhana submission count. Sorted ascending (A to Z) across ${monthlySummaries.length} devotees.`}
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
              const isFull = item.filledDays === item.totalDays;
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
