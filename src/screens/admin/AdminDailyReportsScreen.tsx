import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { sadhanaService } from '../../services/sadhanaService';
import { getTodayDateStringIST, formatMinutesToHours, calculateSleepDurationMinutes } from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';

export const AdminDailyReportsScreen = ({ navigation }: any) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStringIST());
  const [entries, setEntries] = useState<SadhanaEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadDailyReports();
  }, [selectedDate]);

  const loadDailyReports = async () => {
    try {
      const data = await sadhanaService.getAllEntriesForDate(selectedDate);
      setEntries(data);
    } catch (e) {
      console.warn('Error loading daily reports:', e);
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

  return (
    <View style={styles.container}>
      <Header
        title="Daily Sadhana Reports"
        subtitle={`Audit All Devotee Cards (${selectedDate})`}
        showBack
        onBackPress={() => navigation.goBack()}
      />

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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadDailyReports(); }} />}
        >
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Total Submissions: <Text style={styles.bold}>{entries.length}</Text>
            </Text>
          </View>

          {entries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={THEME.colors.gold} />
              <Text style={styles.emptyTitle}>No Submissions Recorded</Text>
              <Text style={styles.emptySubtitle}>
                No counselees have submitted a sadhana card for {selectedDate} yet.
              </Text>
            </View>
          ) : (
            entries.map((item) => {
              const sleepMins = calculateSleepDurationMinutes(item.sleepTimeStr, item.wakeUpTimeStr);

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.devoteeName}>{item.counseleeName || 'Devotee'}</Text>
                      <Text style={styles.cardScore}>
                        {item.dailyTotalScore} / 30 marks ({item.percentage}%)
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
                        {formatMinutesToHours(sleepMins)} (Rest: {item.restMinutes || 0}m)
                      </Text>
                    </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
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
  summaryBar: {
    marginBottom: THEME.spacing.sm,
  },
  summaryText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  bold: {
    fontWeight: 'bold',
    color: THEME.colors.primary,
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
  cardScore: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 1,
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
