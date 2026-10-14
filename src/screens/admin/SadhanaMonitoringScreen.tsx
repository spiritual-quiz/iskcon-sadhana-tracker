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
import { FollowUpModal } from '../../components/FollowUpModal';
import { monitoringService } from '../../services/monitoringService';
import { MonitoringAlert } from '../../types/monitoring';

export const SadhanaMonitoringScreen = ({ navigation }: any) => {
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Follow-up modal state
  const [followUpDevotee, setFollowUpDevotee] = useState<{
    uid: string;
    displayName: string;
    phoneNumber?: string;
    email?: string;
  } | null>(null);
  const [initialTemplate, setInitialTemplate] = useState<
    'missing_card' | 'meeting_invite' | 'encouragement' | 'custom'
  >('missing_card');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const activeAlerts = await monitoringService.getOpenAlerts();
      setAlerts(activeAlerts);
    } catch (e) {
      console.warn('Error loading monitoring alerts:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleOpenFollowUp = (
    alert: MonitoringAlert,
    template: 'missing_card' | 'meeting_invite' | 'encouragement' | 'custom'
  ) => {
    setFollowUpDevotee({
      uid: alert.userId,
      displayName: alert.counseleeName,
    });
    setInitialTemplate(template);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Sadhana Monitoring"
        subtitle="Low-Progress & Inactivity Detection"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Scanning sadhana logs for alerts...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadAlerts(); }} />}
        >
          {/* Legend Banner */}
          <View style={styles.legendBanner}>
            <Text style={styles.legendTitle}>Devotional Monitoring Guidelines:</Text>
            <Text style={styles.legendText}>
              • <Text style={styles.bold}>Missing Daily Card</Text>: More than 3 days without a submission.
            </Text>
            <Text style={styles.legendText}>
              • <Text style={styles.bold}>Needs Encouragement</Text>: Weekly score below 60%. Always use supportive, inspiring words.
            </Text>
          </View>

          {alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark" size={54} color={THEME.colors.success} />
              <Text style={styles.emptyTitle}>All Devotees Practicing Steadiy!</Text>
              <Text style={styles.emptySubtitle}>
                No inactive submissions (&gt;3 days) or low-progress alerts detected.
              </Text>
            </View>
          ) : (
            alerts.map((al) => {
              const isMissingCard = al.alertType === 'missing_card';
              return (
                <View key={al.id} style={styles.alertCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerTitleRow}>
                      <Ionicons
                        name={isMissingCard ? 'alert-circle' : 'heart-outline'}
                        size={20}
                        color={isMissingCard ? THEME.colors.danger : THEME.colors.warning}
                      />
                      <Text style={styles.alertTitle}>{al.title}</Text>
                    </View>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor: isMissingCard
                            ? THEME.colors.dangerLight
                            : THEME.colors.warningLight,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          {
                            color: isMissingCard ? THEME.colors.danger : THEME.colors.warning,
                          },
                        ]}
                      >
                        {isMissingCard ? 'INACTIVE' : 'ENCOURAGE'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.counseleeName}>{al.counseleeName}</Text>
                  <Text style={styles.description}>{al.description}</Text>

                  {al.lastSubmissionDate && (
                    <Text style={styles.metaText}>
                      Last Valid Submission: {al.lastSubmissionDate} ({al.consecutiveMissingDays} days ago)
                    </Text>
                  )}

                  {al.currentWeeklyScore !== undefined && (
                    <Text style={styles.metaText}>
                      Current Score: {al.currentWeeklyScore}% of available marks
                    </Text>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() =>
                        handleOpenFollowUp(
                          al,
                          isMissingCard ? 'missing_card' : 'encouragement'
                        )
                      }
                    >
                      <Ionicons name="chatbubble-ellipses" size={16} color={THEME.colors.textInverse} />
                      <Text style={styles.contactBtnText}>Contact Devotee</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 1-Click Follow Up Modal */}
      {followUpDevotee && (
        <FollowUpModal
          visible={!!followUpDevotee}
          onClose={() => setFollowUpDevotee(null)}
          counselee={followUpDevotee}
          initialTemplate={initialTemplate}
          onFollowUpLogged={() => {
            loadAlerts();
          }}
        />
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
  legendBanner: {
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.base,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.gold,
    marginBottom: THEME.spacing.base,
  },
  legendTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 4,
  },
  legendText: {
    fontSize: 11,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  bold: {
    fontWeight: 'bold',
  },
  alertCard: {
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
  alertTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  counseleeName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 2,
  },
  description: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: THEME.spacing.md,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  contactBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.xs,
    marginLeft: 6,
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
    paddingHorizontal: THEME.spacing.lg,
  },
});
