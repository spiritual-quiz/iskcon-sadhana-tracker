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
import { followUpService } from '../../services/followUpService';
import { FollowUpRecord } from '../../types/monitoring';

export const FollowUpHistoryScreen = ({ navigation }: any) => {
  const [history, setHistory] = useState<FollowUpRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const records = await followUpService.getFollowUpHistory();
      setHistory(records);
    } catch (e) {
      console.warn('Error loading follow-up history:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Follow-up History"
        subtitle="Audit Log of Counsellor Outreach"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Fetching outreach history...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadHistory(); }} />}
        >
          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={54} color={THEME.colors.gold} />
              <Text style={styles.emptyTitle}>No Outreach Records</Text>
              <Text style={styles.emptySubtitle}>
                Follow-ups dispatched via WhatsApp, SMS, Email, or In-App will be logged here.
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerTitleRow}>
                    <Ionicons
                      name={
                        item.channel === 'whatsapp'
                          ? 'logo-whatsapp'
                          : item.channel === 'sms'
                          ? 'chatbubble-ellipses-outline'
                          : item.channel === 'email'
                          ? 'mail-outline'
                          : 'notifications-outline'
                      }
                      size={18}
                      color={THEME.colors.primary}
                    />
                    <Text style={styles.counseleeName}>{item.counseleeName}</Text>
                  </View>
                  <Text style={styles.channelBadge}>{item.channel.toUpperCase()}</Text>
                </View>

                {item.messageSubject ? (
                  <Text style={styles.subjectText}>{item.messageSubject}</Text>
                ) : null}

                <Text style={styles.bodyText}>"{item.messageContent}"</Text>

                <View style={styles.footerRow}>
                  <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.statusBadge}>Status: {item.deliveryStatus}</Text>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counseleeName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 6,
  },
  channelBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    backgroundColor: THEME.colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.goldDark,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  timestamp: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.primary,
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
