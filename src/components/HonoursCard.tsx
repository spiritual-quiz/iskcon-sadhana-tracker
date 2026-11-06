import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { performerService, HonoursData, CategoryChampion } from '../services/performerService';

interface HonoursCardProps {
  dateStr?: string;
  refreshTrigger?: number;
  initialTab?: 'yesterday' | 'weekly' | 'monthly' | 'all';
  compact?: boolean;
}

export const HonoursCard: React.FC<HonoursCardProps> = ({
  dateStr,
  refreshTrigger,
  initialTab = 'yesterday',
  compact = false,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<HonoursData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'yesterday' | 'weekly' | 'monthly' | 'all'>(initialTab);

  useEffect(() => {
    let isMounted = true;
    const fetchHonours = async () => {
      try {
        const honours = await performerService.getHonoursAndPerformers(dateStr, false);
        if (isMounted) setData(honours);
      } catch (e) {
        // Safe fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHonours();
    return () => {
      isMounted = false;
    };
  }, [dateStr, refreshTrigger]);

  if (loading) {
    return null;
  }

  const hasAnyHonour =
    data &&
    (data.yesterday.firstToFill ||
      data.yesterday.dailyBest ||
      data.firstToFill ||
      data.dailyBest ||
      data.lastWeek.weeklyBest ||
      data.weeklyBest ||
      data.monthlyChampions.championsList.length > 0 ||
      data.monthlyBest);

  if (!hasAnyHonour) {
    return null;
  }

  const yesterdayDevotee = data.yesterday.dailyBest || data.dailyBest;
  const yesterdayFirstDevotee = data.yesterday.firstToFill || data.firstToFill;
  const lastWeekDevotee = data.lastWeek.weeklyBest || data.weeklyBest;
  const monthlyChamps = data.monthlyChampions.championsList;
  const isFirst10Days = data.monthlyChampions.isFirst10Days;
  const quote = data.motivationalQuote;
  const monthNameShort = data.monthlyChampions.previousMonthName.split(' ')[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Motivational Devotional Quote Banner */}
      {quote && (
        <View style={[styles.quoteContainer, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
          <View style={styles.quoteRow}>
            <Ionicons name="sparkles" size={16} color={theme.thickColor} style={styles.quoteIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.quoteText, { color: theme.thickColor }]}>
                "{quote.text}"
              </Text>
              <Text style={[styles.quoteSource, { color: theme.colors.textMuted }]}>
                — {quote.source}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.sparkleIconBox, { backgroundColor: theme.thickColor }]}>
            <Ionicons name="trophy" size={17} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.thickColor }]}>
              Devotional Honours
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
              Celebrating steady sadhana & devotional excellence
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs strictly ordered: Yesterday, Last Week, October Champions, All Honours */}
      <View style={styles.tabsRow}>
        {[
          { key: 'yesterday', label: 'Yesterday' },
          { key: 'weekly', label: 'Last Week' },
          { key: 'monthly', label: `${monthNameShort} Champions` },
          { key: 'all', label: 'All Honours' },
        ].map((tab) => {
          const isActive = activeCategory === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabPill,
                isActive && { backgroundColor: theme.thickColor, borderColor: theme.thickColor },
              ]}
              onPress={() => setActiveCategory(tab.key as any)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabPillText,
                  { color: isActive ? '#FFFFFF' : theme.colors.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: YESTERDAY DETAILS */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'yesterday' || activeCategory === 'all') && (
        <View style={styles.sectionBlock}>
          {/* Yesterday Date Badge */}
          <View style={[styles.dateHeaderBanner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="calendar-outline" size={15} color="#92400E" />
            <Text style={styles.dateHeaderText}>
              Date: <Text style={{ fontWeight: 'bold' }}>{data.yesterday.readableDate}</Text> (Yesterday)
            </Text>
          </View>

          {/* Yesterday First to Submit */}
          {yesterdayFirstDevotee ? (
            <View
              style={[
                styles.honourCard,
                { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.badgePill, { backgroundColor: '#15803D' }]}>
                  <Ionicons name="sunny" size={12} color="#FFFFFF" />
                  <Text style={styles.badgePillText}>Yesterday's First to Submit</Text>
                </View>
                {yesterdayFirstDevotee.timeStr && (
                  <Text style={[styles.timeBadge, { color: '#15803D' }]}>
                    {yesterdayFirstDevotee.timeStr}
                  </Text>
                )}
              </View>
              <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                {yesterdayFirstDevotee.counseleeName}
              </Text>
              <Text style={[styles.honourDetail, { color: theme.colors.textMuted }]}>
                {yesterdayFirstDevotee.detail}
              </Text>
            </View>
          ) : null}

          {/* Yesterday Best Performer */}
          {yesterdayDevotee ? (
            <View
              style={[
                styles.honourCard,
                { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.badgePill, { backgroundColor: '#B45309' }]}>
                  <Ionicons name="ribbon" size={12} color="#FFFFFF" />
                  <Text style={styles.badgePillText}>Yesterday's Best Performer</Text>
                </View>
                <Text style={[styles.scoreBadge, { color: '#B45309' }]}>
                  {yesterdayDevotee.percentage}% Score
                </Text>
              </View>
              <Text style={[styles.devoteeName, { color: '#78350F' }]}>
                {yesterdayDevotee.counseleeName}
              </Text>
              <Text style={[styles.honourDetail, { color: '#92400E' }]}>
                {yesterdayDevotee.detail}
              </Text>
            </View>
          ) : null}

          {/* Yesterday Category Leaders (Chanting, Reading, Hearing) */}
          {data.yesterday.championsList.length > 0 &&
            data.yesterday.championsList.map((champ, idx) => (
              <View
                key={`y_champ_${idx}`}
                style={[styles.categoryMiniCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
              >
                <View style={styles.categoryHeaderRow}>
                  <View style={styles.categoryTitleRow}>
                    <Ionicons name={champ.iconName as any} size={15} color={theme.thickColor} />
                    <Text style={[styles.categoryTitle, { color: theme.thickColor }]}>{champ.title}</Text>
                  </View>
                  <View style={[styles.champBadgePill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                    <Text style={[styles.champBadgeText, { color: theme.thickColor }]}>{champ.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.champDevoteeName, { color: theme.colors.text }]}>
                  {champ.devoteeName} • <Text style={{ fontWeight: 'bold', color: theme.thickColor }}>{champ.valueStr}</Text>
                </Text>
                <Text style={[styles.champDetailText, { color: theme.colors.textMuted }]}>{champ.detail}</Text>
              </View>
            ))}

          {!yesterdayDevotee && !yesterdayFirstDevotee && data.yesterday.championsList.length === 0 && (
            <View style={styles.emptyNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
              <Text style={[styles.emptyNoticeText, { color: theme.colors.textMuted }]}>
                No completed sadhana submissions were recorded for yesterday ({data.yesterday.readableDate}).
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: LAST WEEK DETAILS (Monday to Sunday) */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'weekly' || activeCategory === 'all') && (
        <View style={styles.sectionBlock}>
          {/* Last Week Date Range Badge (Monday to Sunday) */}
          <View style={[styles.dateHeaderBanner, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
            <Ionicons name="calendar-outline" size={15} color="#6D28D9" />
            <Text style={[styles.dateHeaderText, { color: '#581C87' }]}>
              Last Week: <Text style={{ fontWeight: 'bold' }}>{data.lastWeek.fullDateRangeFormatted}</Text>
            </Text>
          </View>

          {/* Last Week Best Performer */}
          {lastWeekDevotee ? (
            <View
              style={[
                styles.honourCard,
                { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.badgePill, { backgroundColor: '#6D28D9' }]}>
                  <Ionicons name="star" size={12} color="#FFFFFF" />
                  <Text style={styles.badgePillText}>Last Week's Best Performer</Text>
                </View>
                <Text style={[styles.scoreBadge, { color: '#6D28D9' }]}>
                  {lastWeekDevotee.percentage}% Avg
                </Text>
              </View>
              <Text style={[styles.devoteeName, { color: '#4C1D95' }]}>
                {lastWeekDevotee.counseleeName}
              </Text>
              <Text style={[styles.honourDetail, { color: '#5B21B6' }]}>
                {lastWeekDevotee.detail}
              </Text>
            </View>
          ) : null}

          {/* Last Week Category Highlights */}
          {data.lastWeek.championsList.length > 0 &&
            data.lastWeek.championsList.map((champ, idx) => (
              <View
                key={`w_champ_${idx}`}
                style={[styles.categoryMiniCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}
              >
                <View style={styles.categoryHeaderRow}>
                  <View style={styles.categoryTitleRow}>
                    <Ionicons name={champ.iconName as any} size={15} color={theme.thickColor} />
                    <Text style={[styles.categoryTitle, { color: theme.thickColor }]}>{champ.title}</Text>
                  </View>
                  <View style={[styles.champBadgePill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
                    <Text style={[styles.champBadgeText, { color: theme.thickColor }]}>{champ.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.champDevoteeName, { color: theme.colors.text }]}>
                  {champ.devoteeName} • <Text style={{ fontWeight: 'bold', color: theme.thickColor }}>{champ.valueStr}</Text>
                </Text>
                <Text style={[styles.champDetailText, { color: theme.colors.textMuted }]}>{champ.detail}</Text>
              </View>
            ))}

          {!lastWeekDevotee && data.lastWeek.championsList.length === 0 && (
            <View style={styles.emptyNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
              <Text style={[styles.emptyNoticeText, { color: theme.colors.textMuted }]}>
                No completed sadhana entries recorded for last week ({data.lastWeek.fullDateRangeFormatted}).
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: MONTHLY CHAMPIONS (e.g. October Champions) */}
      {/* ------------------------------------------------------------- */}
      {(activeCategory === 'monthly' || activeCategory === 'all') && (
        <View style={styles.sectionBlock}>
          {/* Month Header Banner */}
          <View style={[styles.dateHeaderBanner, { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }]}>
            <Ionicons name="medal-outline" size={15} color="#047857" />
            <Text style={[styles.dateHeaderText, { color: '#065F46' }]}>
              Month: <Text style={{ fontWeight: 'bold' }}>{data.monthlyChampions.previousMonthName}</Text> Champions
            </Text>
          </View>

          {/* 10-Days Monthly Champions Celebration Banner */}
          {isFirst10Days && (
            <View style={styles.highlightNoticeBox}>
              <Ionicons name="ribbon" size={16} color="#B45309" />
              <Text style={styles.highlightNoticeText}>
                🌟 {data.monthlyChampions.previousMonthName} Champions • Active for the first 10 days of {data.monthlyChampions.currentMonthName} ({data.monthlyChampions.daysRemainingInHighlight} days remaining)
              </Text>
            </View>
          )}

          {/* Monthly Champions Breakdown across 7 Disciplines */}
          {monthlyChamps.length === 0 ? (
            <View style={styles.emptyNoticeBox}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.textMuted} />
              <Text style={[styles.emptyNoticeText, { color: theme.colors.textMuted }]}>
                No entries recorded for {data.monthlyChampions.previousMonthName} yet.
              </Text>
            </View>
          ) : (
            monthlyChamps.map((champ, idx) => {
              const badgeColor =
                champ.category === 'chanting'
                  ? '#B45309'
                  : champ.category === 'hearing'
                  ? '#0284C7'
                  : champ.category === 'reading'
                  ? '#7C3AED'
                  : champ.category === 'sleep'
                  ? '#059669'
                  : champ.category === 'onlineReading'
                  ? '#4F46E5'
                  : champ.category === 'service'
                  ? '#DC2626'
                  : '#D97706';

              return (
                <View
                  key={`month_${champ.category}_${idx}`}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight },
                  ]}
                >
                  <View style={styles.categoryCardTop}>
                    <View style={[styles.categoryIconCircle, { backgroundColor: badgeColor + '18' }]}>
                      <Ionicons name={champ.iconName as any} size={16} color={badgeColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.categoryTitleRow}>
                        <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{champ.title}</Text>
                        <View style={[styles.champBadgePill, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                          <Text style={[styles.champBadgeText, { color: badgeColor }]}>{champ.badge}</Text>
                        </View>
                      </View>
                      <Text style={[styles.champDevoteeName, { color: theme.colors.text }]}>
                        {champ.devoteeName}
                      </Text>
                      <Text style={[styles.champScoreHighlight, { color: badgeColor }]}>
                        {champ.valueStr}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.champDetailText, { color: theme.colors.textMuted }]}>
                    {champ.detail}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  quoteContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  quoteIcon: {
    marginTop: 2,
  },
  quoteText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 18,
    fontWeight: '600',
  },
  quoteSource: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  headerRow: {
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tabPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  sectionBlock: {
    gap: 10,
    marginBottom: 4,
  },
  dateHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 4,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    flex: 1,
  },
  highlightNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  highlightNoticeText: {
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  honourCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  scoreBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeBadge: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  devoteeName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  honourDetail: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  categoryMiniCard: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  champBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.8,
  },
  champBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  champDevoteeName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  champScoreHighlight: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  champDetailText: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
  },
  categoryCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  emptyNoticeText: {
    fontSize: 11.5,
    flex: 1,
    lineHeight: 16,
  },
});
