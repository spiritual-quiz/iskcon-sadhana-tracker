import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { THEME } from '../constants/theme';
import { getTodayDateStringIST, formatDateToDevoteeFormat } from '../utils/dateUtils';
import {
  mobileUsageService,
  formatMinutesToDisplay,
} from '../services/mobileUsageService';
import {
  DailyMobileUsageRecord,
  AppSession,
  TimeSlot,
} from '../types/mobileUsage';
import { UserProfile } from '../types/auth';

interface Props {
  approvedCounselees: UserProfile[];
}

type FilterPeriod = 'today' | 'yesterday' | 'week' | 'month';

export const CounsellorMobileUsageCard: React.FC<Props> = ({ approvedCounselees }) => {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [loading, setLoading] = useState<boolean>(false);
  const [records, setRecords] = useState<DailyMobileUsageRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DailyMobileUsageRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);

  const todayStr = getTodayDateStringIST();

  const getDateForPeriod = (p: FilterPeriod): { start: string; end: string } => {
    const today = new Date();
    if (p === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (p === 'yesterday') {
      const y = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (p === 'week') {
      const w = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const wStr = w.toISOString().split('T')[0];
      return { start: wStr, end: todayStr };
    }
    // month
    const m = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const mStr = m.toISOString().split('T')[0];
    return { start: mStr, end: todayStr };
  };

  const loadUsageData = async (targetPeriod: FilterPeriod) => {
    setLoading(true);
    try {
      const dates = getDateForPeriod(targetPeriod);
      let data: DailyMobileUsageRecord[] = [];
      if (dates.start === dates.end) {
        data = await mobileUsageService.getDailyUsageForCounsellor(dates.start);
      } else {
        data = await mobileUsageService.getWeeklyOrMonthlyUsageForCounsellor(dates.start, dates.end);
      }
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsageData(period);
  }, [period]);

  // Aggregate records by counselee UID
  const recordsByUid = new Map<string, DailyMobileUsageRecord>();
  records.forEach((r) => {
    // If multiple records (weekly/monthly), keep or merge into latest record
    const existing = recordsByUid.get(r.uid);
    if (!existing) {
      recordsByUid.set(r.uid, { ...r });
    } else {
      // Merge for multi-day period
      existing.totalScreenMinutes += r.totalScreenMinutes;
      existing.nightUsageMinutes += r.nightUsageMinutes;
      if (r.hasLateNightActivity) existing.hasLateNightActivity = true;
      existing.nightSessions = [...existing.nightSessions, ...r.nightSessions];
      // merge app totals
      r.apps.forEach((app) => {
        const found = existing.apps.find((a) => a.packageName === app.packageName);
        if (found) {
          found.totalMinutes += app.totalMinutes;
          found.sessionsCount += app.sessionsCount;
          found.sessions = [...found.sessions, ...app.sessions];
        } else {
          existing.apps.push({ ...app });
        }
      });
      // recalculate percentage
      if (existing.totalScreenMinutes > 0) {
        existing.apps.forEach((a) => {
          a.percentage = Math.round((a.totalMinutes / existing.totalScreenMinutes) * 100);
        });
      }
      existing.apps.sort((a, b) => b.totalMinutes - a.totalMinutes);
    }
  });

  const lateNightAlertCount = Array.from(recordsByUid.values()).filter(
    (r) => r.hasLateNightActivity
  ).length;

  const handleOpenDetail = (record: DailyMobileUsageRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // Group sessions by time slot for the detail modal
  const groupSessionsBySlot = (sessions: AppSession[]) => {
    const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);
    const groups: Record<TimeSlot, AppSession[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };
    sorted.forEach((s) => {
      groups[s.timeSlot].push(s);
    });
    return groups;
  };

  return (
    <View style={[styles.containerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
          <Ionicons name="phone-portrait" size={20} color="#7E22CE" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.title, { color: theme.thickColor }]}>
              Counselees Mobile & App Usage
            </Text>
            {lateNightAlertCount > 0 && (
              <View style={styles.alertBadge}>
                <Ionicons name="moon" size={10} color="#FFFFFF" />
                <Text style={styles.alertBadgeText}>{lateNightAlertCount} Night</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Daily, weekly & monthly screen time with session intervals
          </Text>
        </View>
      </View>

      {/* Period Selector Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: theme.liteColor, borderColor: theme.colors.border }]}>
        {(['today', 'yesterday', 'week', 'month'] as FilterPeriod[]).map((p) => {
          const isActive = period === p;
          const labels: Record<FilterPeriod, string> = {
            today: 'Today',
            yesterday: 'Yesterday',
            week: '7 Days',
            month: '30 Days',
          };
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.tabBtn,
                isActive && [styles.activeTabBtn, { backgroundColor: theme.thickColor }],
              ]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : theme.colors.textMuted },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {labels[p]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading screen usage...
          </Text>
        </View>
      ) : recordsByUid.size === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={28} color={theme.colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            No Mobile Usage Synced Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
            When counselees enable Screen Time Sync on their Android app, their daily app hours will appear here automatically.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {approvedCounselees.map((counselee) => {
            const usage = recordsByUid.get(counselee.uid);
            if (!usage) {
              return (
                <View
                  key={counselee.uid}
                  style={[styles.counseleeRow, { borderColor: theme.colors.borderLight }]}
                >
                  <View style={styles.devoteeInfo}>
                    <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                      {counselee.displayName || 'Devotee'}
                    </Text>
                    <Text style={[styles.devoteeSub, { color: theme.colors.textMuted }]}>
                      Permission pending
                    </Text>
                  </View>
                  <View style={[styles.pendingPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.pendingPillText, { color: '#B45309' }]}>Not Synced</Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={counselee.uid}
                style={[styles.counseleeCard, { borderColor: theme.colors.borderLight }]}
                onPress={() => handleOpenDetail(usage)}
                activeOpacity={0.7}
              >
                {/* Top Row: Name, Total Time, Night Warning */}
                <View style={styles.counseleeTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                        {counselee.displayName || usage.counseleeName}
                      </Text>
                      {usage.hasLateNightActivity && (
                        <View style={styles.nightAlertPill}>
                          <Ionicons name="moon" size={11} color="#DC2626" />
                          <Text style={styles.nightAlertPillText}>
                            Night: {formatMinutesToDisplay(usage.nightUsageMinutes)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.totalTimeText, { color: theme.thickColor }]}>
                      Total: {formatMinutesToDisplay(usage.totalScreenMinutes)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.viewDetailsText, { color: theme.thickColor }]}>Sessions</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.thickColor} />
                  </View>
                </View>

                {/* Top Apps Preview Bar */}
                {usage.apps.length > 0 && (
                  <View style={styles.appChipsRow}>
                    {usage.apps.slice(0, 4).map((app) => (
                      <View
                        key={app.packageName}
                        style={[styles.appChip, { backgroundColor: theme.liteColor }]}
                      >
                        <Ionicons name={app.iconName as any} size={12} color={app.iconColor} />
                        <Text style={[styles.appChipText, { color: theme.colors.text }]}>
                          {app.appName}: <Text style={{ fontWeight: '700' }}>{formatMinutesToDisplay(app.totalMinutes)}</Text> ({app.percentage}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Detail Modal: Exact App Sessions (Morning, Afternoon, Evening, Night) */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.card }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {selectedRecord?.counseleeName} — Mobile Activity
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
                  {selectedRecord ? formatDateToDevoteeFormat(selectedRecord.date) : ''} • Total:{' '}
                  {formatMinutesToDisplay(selectedRecord?.totalScreenMinutes || 0)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: theme.liteColor }]}
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedRecord && (
                <>
                  {/* Late Night Banner Alert if active */}
                  {selectedRecord.hasLateNightActivity && (
                    <View style={styles.lateNightBanner}>
                      <Ionicons name="moon" size={18} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lateNightTitle}>
                          Late Night Activity: {formatMinutesToDisplay(selectedRecord.nightUsageMinutes)}
                        </Text>
                        <Text style={styles.lateNightSub}>
                          Screen was active during sleep hours (10:00 PM – 4:00 AM).
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* App Summary List with Time Breakdown */}
                  <Text style={[styles.sectionHeading, { color: theme.thickColor }]}>
                    Apps Used & Session Times
                  </Text>

                  {selectedRecord.apps.map((app) => (
                    <View
                      key={app.packageName}
                      style={[styles.appSummaryCard, { borderColor: theme.colors.borderLight }]}
                    >
                      <View style={styles.appSummaryHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name={app.iconName as any} size={18} color={app.iconColor} />
                          <Text style={[styles.appSummaryName, { color: theme.colors.text }]}>
                            {app.appName}
                          </Text>
                        </View>
                        <Text style={[styles.appSummaryTotal, { color: theme.thickColor }]}>
                          {formatMinutesToDisplay(app.totalMinutes)} ({app.percentage}%)
                        </Text>
                      </View>

                      {/* Sessions List */}
                      <View style={styles.sessionsList}>
                        {app.sessions.map((sess, idx) => (
                          <View key={idx} style={styles.sessionItemRow}>
                            <View style={styles.sessionBullet} />
                            <Text style={[styles.sessionSlotText, { color: theme.colors.textMuted }]}>
                              {sess.timeSlot.toUpperCase()}:
                            </Text>
                            <Text style={[styles.sessionIntervalText, { color: theme.colors.text }]}>
                              {sess.startTimeFormatted} – {sess.endTimeFormatted}
                            </Text>
                            <Text style={[styles.sessionDurationText, { color: theme.colors.textMuted }]}>
                              ({formatMinutesToDisplay(sess.durationMinutes)})
                            </Text>
                            {sess.timeSlot === 'night' && (
                              <Ionicons name="moon" size={12} color="#DC2626" style={{ marginLeft: 4 }} />
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}

                  {/* Chronological Timeline by Time Slots */}
                  <Text style={[styles.sectionHeading, { color: theme.thickColor, marginTop: 18 }]}>
                    Chronological Day Timeline
                  </Text>

                  {(() => {
                    const allSessions = selectedRecord.apps.flatMap((a) => a.sessions);
                    const grouped = groupSessionsBySlot(allSessions);

                    const slotLabels: { slot: TimeSlot; title: string; icon: string; color: string }[] = [
                      { slot: 'morning', title: 'Morning (4:00 AM – 12:00 PM)', icon: 'sunny-outline', color: '#F59E0B' },
                      { slot: 'afternoon', title: 'Afternoon (12:00 PM – 5:00 PM)', icon: 'partly-sunny-outline', color: '#3B82F6' },
                      { slot: 'evening', title: 'Evening (5:00 PM – 10:00 PM)', icon: 'sunset-outline', color: '#EA580C' },
                      { slot: 'night', title: 'Late Night (10:00 PM – 4:00 AM)', icon: 'moon-outline', color: '#DC2626' },
                    ];

                    return slotLabels.map((sl) => {
                      const list = grouped[sl.slot];
                      if (list.length === 0) return null;

                      return (
                        <View
                          key={sl.slot}
                          style={[
                            styles.slotBlock,
                            sl.slot === 'night' && styles.slotBlockNight,
                            { borderColor: theme.colors.borderLight },
                          ]}
                        >
                          <View style={styles.slotHeader}>
                            <Ionicons name={sl.icon as any} size={15} color={sl.color} />
                            <Text style={[styles.slotTitle, { color: sl.color }]}>{sl.title}</Text>
                          </View>

                          {list.map((sess, idx) => (
                            <View key={idx} style={styles.timelineRow}>
                              <Text style={[styles.timelineTime, { color: theme.colors.textMuted }]}>
                                {sess.startTimeFormatted} – {sess.endTimeFormatted}
                              </Text>
                              <Text style={[styles.timelineApp, { color: theme.colors.text }]}>
                                {sess.appName}
                              </Text>
                              <Text style={[styles.timelineDuration, { color: theme.thickColor }]}>
                                {formatMinutesToDisplay(sess.durationMinutes)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    });
                  })()}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  containerCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  alertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
  },
  loadingBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  listContainer: {
    gap: 10,
  },
  counseleeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  devoteeInfo: {
    flex: 1,
  },
  devoteeName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  devoteeSub: {
    fontSize: 11,
    marginTop: 1,
  },
  pendingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  counseleeCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  counseleeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nightAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nightAlertPillText: {
    color: '#DC2626',
    fontSize: 10.5,
    fontWeight: '700',
  },
  totalTimeText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appChipText: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  lateNightBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  },
  lateNightTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  lateNightSub: {
    color: '#991B1B',
    fontSize: 11.5,
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  appSummaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  appSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appSummaryName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  appSummaryTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  sessionsList: {
    paddingLeft: 10,
    gap: 4,
  },
  sessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  sessionSlotText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  sessionIntervalText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  sessionDurationText: {
    fontSize: 11,
  },
  slotBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  slotBlockNight: {
    backgroundColor: 'rgba(220, 38, 38, 0.03)',
    borderColor: '#FECACA',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  slotTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  timelineTime: {
    fontSize: 11.5,
    width: 140,
  },
  timelineApp: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  timelineDuration: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
