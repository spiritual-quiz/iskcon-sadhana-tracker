import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { reportService } from '../../services/reportService';
import { appreciationService } from '../../services/appreciationService';
import { getTodayDateStringIST, getWeekDetails, formatMinutesToHours } from '../../utils/dateUtils';
import { SharedWeeklySummary } from '../../types/report';
import { AppreciationCard } from '../../types/appreciation';

export const CommunityReportsScreen = () => {
  const todayStr = getTodayDateStringIST();
  const { weekId } = getWeekDetails(todayStr);

  const [activeTab, setActiveTab] = useState<'summaries' | 'appreciation'>('summaries');
  const [weeklySummaries, setWeeklySummaries] = useState<SharedWeeklySummary[]>([]);
  const [appreciations, setAppreciations] = useState<AppreciationCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCommunityData();
  }, [activeTab]);

  const loadCommunityData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'summaries') {
        const summaries = await reportService.getCommunityWeeklySummaries(weekId);
        setWeeklySummaries(summaries);
      } else {
        const published = await appreciationService.getPublishedAppreciations();
        setAppreciations(published);
      }
    } catch (e) {
      console.warn('Error loading community reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Community Devotee Sanga"
        subtitle={`Encouraging Sincere Sadhana (${weekId})`}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'summaries' && styles.tabBtnActive]}
          onPress={() => setActiveTab('summaries')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'summaries' && styles.tabBtnTextActive]}>
            Weekly Summaries
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'appreciation' && styles.tabBtnActive]}
          onPress={() => setActiveTab('appreciation')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'appreciation' && styles.tabBtnTextActive]}>
            Sadhana Appreciation
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading devotee summaries...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'summaries' && (
            <View>
              <View style={styles.noticeBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.primary} />
                <Text style={styles.noticeText}>
                  Privacy Protected: Only aggregate scores and practice totals are shared. Private sleep,
                  daily details, and phone numbers remain strictly confidential.
                </Text>
              </View>

              {weeklySummaries.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No community summaries published yet for this week.</Text>
                </View>
              ) : (
                weeklySummaries.map((summary) => (
                  <View key={summary.id} style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <View>
                        <Text style={styles.devoteeName}>{summary.counseleeName}</Text>
                        <Text style={styles.weekLabel}>{summary.weekId}</Text>
                      </View>
                      <StatusBadge type="grade" value={summary.grade} />
                    </View>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Total Score</Text>
                        <Text style={styles.metricValue}>
                          {summary.totalScore.toFixed(1)} / {summary.maxAvailableMarks}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Percentage</Text>
                        <Text style={styles.metricValue}>{summary.percentage.toFixed(1)}%</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Rounds</Text>
                        <Text style={styles.metricValue}>{summary.totalRounds}</Text>
                      </View>
                    </View>

                    <View style={styles.readingHearingRow}>
                      <Text style={styles.readHearText}>
                        Reading: {formatMinutesToHours(summary.totalReadingMinutes)}  •  Hearing: {formatMinutesToHours(summary.totalHearingMinutes)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'appreciation' && (
            <View>
              {appreciations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No published appreciation cards yet.</Text>
                </View>
              ) : (
                appreciations.map((card) => (
                  <View key={card.id} style={styles.appreciationCard}>
                    <View style={styles.appreciationBadgeRow}>
                      <View style={styles.categoryBadge}>
                        <Ionicons name="sparkles" size={14} color={THEME.colors.goldDark} />
                        <Text style={styles.categoryText}>{card.category}</Text>
                      </View>
                      <Text style={styles.periodText}>{card.period}</Text>
                    </View>

                    <Text style={styles.appreciationName}>{card.counseleeName}</Text>
                    <Text style={styles.achievementText}>{card.achievement}</Text>

                    <View style={styles.messageBox}>
                      <Text style={styles.messageText}>"{card.message}"</Text>
                    </View>
                  </View>
                ))
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
    backgroundColor: THEME.colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    margin: THEME.spacing.base,
    backgroundColor: THEME.colors.surfaceVariant,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabBtnText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
  },
  tabBtnTextActive: {
    color: THEME.colors.textInverse,
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
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryUltraLight,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
    marginBottom: THEME.spacing.base,
  },
  noticeText: {
    fontSize: 11,
    color: THEME.colors.primary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  devoteeName: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  weekLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginVertical: 4,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  metricValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  readingHearingRow: {
    marginTop: 6,
    alignItems: 'center',
  },
  readHearText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  appreciationCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  appreciationBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 4,
  },
  periodText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  appreciationName: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: 4,
  },
  achievementText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  messageBox: {
    backgroundColor: THEME.colors.surfaceVariant,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  messageText: {
    fontSize: THEME.typography.sizes.sm,
    fontStyle: 'italic',
    color: THEME.colors.text,
  },
  emptyContainer: {
    padding: THEME.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
  },
});
