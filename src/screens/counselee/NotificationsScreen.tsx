import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { followUpService } from '../../services/followUpService';
import { authService } from '../../services/authService';
import { sadhanaService } from '../../services/sadhanaService';
import { reminderService } from '../../services/reminderService';
import { getTodayDateStringIST } from '../../utils/dateUtils';
import { FollowUpRecord } from '../../types/monitoring';
import { SadhanaEntry } from '../../types/sadhana';

export const NotificationsScreen = () => {
  const { user, reloadUser } = useAuth();
  const todayStr = getTodayDateStringIST();

  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [todayEntry, setTodayEntry] = useState<SadhanaEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  useEffect(() => {
    loadNotifications();
  }, [user?.uid]);

  const loadNotifications = async () => {
    if (!user?.uid) return;
    try {
      const [records, entry] = await Promise.all([
        followUpService.getFollowUpHistory(user.uid),
        sadhanaService.getDailyEntry(user.uid, todayStr),
      ]);
      setFollowUps(records);
      setTodayEntry(entry);
    } catch (e) {
      console.warn('Error loading notifications:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadNotifications();
  };

  const handleRequestTurnOff = () => {
    if (!user?.uid) return;
    Alert.alert(
      'Request Counsellor to Turn Off Reminders?',
      'You cannot disable sadhana reminders directly. Submitting this request sends a notification to your counsellor, who can switch off the 6 PM & 9 PM reminders for your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            try {
              setIsRequesting(true);
              await authService.requestReminderTurnOff(user.uid);
              await reloadUser();
              Alert.alert(
                'Request Sent',
                'Your request has been submitted to your counsellor. Once approved, the daily reminders will be turned off.'
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not send request.');
            } finally {
              setIsRequesting(false);
            }
          },
        },
      ]
    );
  };

  const remindersInfo = reminderService.getDailyReminders(user, todayEntry);

  return (
    <View style={styles.container}>
      <Header title="Notifications" subtitle="Counsellor Messages & Spiritual Reminders" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Sadhana Reminder Policy & Controls Card */}
          <View style={styles.remindersCard}>
            <View style={styles.remindersCardHeader}>
              <View style={styles.remindersHeaderLeft}>
                <Ionicons name="alarm" size={22} color={THEME.colors.primary} />
                <Text style={styles.remindersCardTitle}>Sadhana Reminder</Text>
              </View>
              <View
                style={[
                  styles.remindersStatusBadge,
                  remindersInfo.remindersEnabled
                    ? styles.statusBadgeActive
                    : styles.statusBadgeDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.remindersStatusText,
                    remindersInfo.remindersEnabled
                      ? styles.statusTextActive
                      : styles.statusTextDisabled,
                  ]}
                >
                  {remindersInfo.remindersEnabled ? 'Active (6 PM & 9 PM)' : 'Switched Off'}
                </Text>
              </View>
            </View>

            <Text style={styles.remindersDesc}>
              Daily notifications are sent automatically at 6:00 PM and 9:00 PM IST if today's sadhana card is not yet submitted.
            </Text>

            <View style={styles.remindersPolicyBox}>
              <Ionicons name="lock-closed-outline" size={16} color="#B45309" />
              <Text style={styles.remindersPolicyText}>
                This reminder cannot be switched off directly by students. To turn it off, you must submit a request to your counsellor. The counsellor can disable it and reactivate it whenever needed.
              </Text>
            </View>

            {remindersInfo.remindersEnabled ? (
              user?.reminderOptOutRequested ? (
                <View style={styles.pendingRequestBadge}>
                  <Ionicons name="hourglass-outline" size={16} color="#B45309" />
                  <Text style={styles.pendingRequestText}>
                    Request Sent to Counsellor (Pending Turn-Off)
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.requestTurnOffBtn}
                  onPress={handleRequestTurnOff}
                  disabled={isRequesting}
                >
                  <Ionicons name="mail-unread-outline" size={16} color="#DC2626" />
                  <Text style={styles.requestTurnOffBtnText}>
                    {isRequesting ? 'Submitting...' : 'Request Counsellor to Turn Off'}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <View style={styles.offNoticeBox}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
                <Text style={styles.offNoticeText}>
                  Reminders are currently switched off by your counsellor.
                </Text>
              </View>
            )}
          </View>

          {/* Active Pending Reminders Today */}
          {remindersInfo.pendingReminders.map((rem) => (
            <View
              key={rem.id}
              style={[
                styles.activeReminderCard,
                rem.isUrgent ? styles.activeReminderUrgent : styles.activeReminderRegular,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerTitleRow}>
                  <Ionicons
                    name={rem.isUrgent ? 'alert-circle' : 'time'}
                    size={18}
                    color={rem.isUrgent ? '#DC2626' : '#D97706'}
                  />
                  <Text style={[styles.messageType, { color: rem.isUrgent ? '#DC2626' : '#D97706' }]}>
                    {rem.title}
                  </Text>
                </View>
                <Text style={styles.mandatoryBadgeSmall}>Mandatory</Text>
              </View>
              <Text style={styles.bodyText}>{rem.message}</Text>
            </View>
          ))}

          <Text style={styles.sectionHeaderTitle}>Counsellor Messages & Logs</Text>
          {followUps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={48} color={THEME.colors.gold} />
              <Text style={styles.emptyTitle}>No New Messages</Text>
              <Text style={styles.emptySubtitle}>
                You have no pending follow-ups or counsellor messages. Keep up your sincere sadhana!
              </Text>
            </View>
          ) : (
            followUps.map((msg) => (
              <View key={msg.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerTitleRow}>
                    <Ionicons name="chatbubble-ellipses" size={18} color={THEME.colors.primary} />
                    <Text style={styles.messageType}>
                      {msg.messageType === 'missing_card'
                        ? 'Sadhana Check-in'
                        : msg.messageType === 'meeting_invite'
                        ? 'Meeting Invitation'
                        : 'Devotional Encouragement'}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {msg.messageSubject ? (
                  <Text style={styles.subjectText}>{msg.messageSubject}</Text>
                ) : null}

                <Text style={styles.bodyText}>{msg.messageContent}</Text>

                <View style={styles.footerRow}>
                  <Text style={styles.channelBadge}>Received via {msg.channel.toUpperCase()}</Text>
                </View>
              </View>
            ))
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
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageType: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 6,
  },
  timestamp: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  subjectText: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '600',
    color: THEME.colors.goldDark,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  channelBadge: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    backgroundColor: THEME.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
    marginTop: THEME.spacing.xl,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: THEME.spacing.md,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: THEME.spacing.lg,
  },
  sectionHeaderTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
    marginTop: THEME.spacing.sm,
  },
  remindersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...THEME.shadows.soft,
  },
  remindersCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  remindersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remindersCardTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  remindersStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBadgeDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  remindersStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextActive: {
    color: '#15803D',
  },
  statusTextDisabled: {
    color: '#6B7280',
  },
  remindersDesc: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  remindersPolicyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  remindersPolicyText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  pendingRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingRequestText: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B45309',
    lineHeight: 16,
  },
  requestTurnOffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  requestTurnOffBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  offNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: THEME.borderRadius.md,
  },
  offNoticeText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  activeReminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1.5,
    ...THEME.shadows.soft,
  },
  activeReminderRegular: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  activeReminderUrgent: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  mandatoryBadgeSmall: {
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
