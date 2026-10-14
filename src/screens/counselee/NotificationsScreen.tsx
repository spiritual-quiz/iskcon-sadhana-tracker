import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { followUpService } from '../../services/followUpService';
import { FollowUpRecord } from '../../types/monitoring';

export const NotificationsScreen = () => {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadNotifications();
  }, [user?.uid]);

  const loadNotifications = async () => {
    if (!user?.uid) return;
    try {
      const records = await followUpService.getFollowUpHistory(user.uid);
      setFollowUps(records);
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
});
