import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { performerService, HonoursData } from '../services/performerService';

interface HonoursCardProps {
  dateStr?: string;
  refreshTrigger?: number;
}

export const HonoursCard: React.FC<HonoursCardProps> = ({ dateStr, refreshTrigger }) => {
  const { theme } = useTheme();
  const [data, setData] = useState<HonoursData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');

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
    data && (data.firstToFill || data.dailyBest || data.weeklyBest || data.monthlyBest);

  if (!hasAnyHonour) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.sparkleIconBox, { backgroundColor: theme.thickColor }]}>
            <Ionicons name="trophy" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.thickColor }]}>
              Devotional Honours
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
              Recognizing dedicated sadhana & early submission
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: 'All Honours' },
          { key: 'daily', label: 'Daily' },
          { key: 'weekly', label: 'Weekly' },
          { key: 'monthly', label: 'Monthly' },
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

      {/* Cards Grid / List */}
      <View style={styles.itemsList}>
        {/* 1. FIRST TO FILL TODAY */}
        {(activeCategory === 'all' || activeCategory === 'daily') && data?.firstToFill && (
          <View
            style={[
              styles.honourCard,
              { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight },
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.badgePill, { backgroundColor: '#15803D' }]}>
                <Ionicons name="sunny" size={12} color="#FFFFFF" />
                <Text style={styles.badgePillText}>First to Fill (Early Bird)</Text>
              </View>
              {data.firstToFill.timeStr && (
                <Text style={[styles.timeBadge, { color: '#15803D' }]}>
                  {data.firstToFill.timeStr}
                </Text>
              )}
            </View>
            <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
              {data.firstToFill.counseleeName}
            </Text>
            <Text style={[styles.honourDetail, { color: theme.colors.textMuted }]}>
              {data.firstToFill.detail}
            </Text>
          </View>
        )}

        {/* 2. DAILY BEST PERFORMER */}
        {(activeCategory === 'all' || activeCategory === 'daily') && data?.dailyBest && (
          <View
            style={[
              styles.honourCard,
              { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.badgePill, { backgroundColor: '#B45309' }]}>
                <Ionicons name="ribbon" size={12} color="#FFFFFF" />
                <Text style={styles.badgePillText}>Daily Best Performer</Text>
              </View>
              <Text style={[styles.scoreBadge, { color: '#B45309' }]}>
                {data.dailyBest.percentage}%
              </Text>
            </View>
            <Text style={[styles.devoteeName, { color: '#78350F' }]}>
              {data.dailyBest.counseleeName}
            </Text>
            <Text style={[styles.honourDetail, { color: '#92400E' }]}>
              {data.dailyBest.detail}
            </Text>
          </View>
        )}

        {/* 3. WEEKLY BEST PERFORMER */}
        {(activeCategory === 'all' || activeCategory === 'weekly') && data?.weeklyBest && (
          <View
            style={[
              styles.honourCard,
              { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.badgePill, { backgroundColor: '#6D28D9' }]}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.badgePillText}>Weekly Best Performer</Text>
              </View>
              <Text style={[styles.scoreBadge, { color: '#6D28D9' }]}>
                {data.weeklyBest.percentage}% Avg
              </Text>
            </View>
            <Text style={[styles.devoteeName, { color: '#4C1D95' }]}>
              {data.weeklyBest.counseleeName}
            </Text>
            <Text style={[styles.honourDetail, { color: '#5B21B6' }]}>
              {data.weeklyBest.detail}
            </Text>
          </View>
        )}

        {/* 4. MONTHLY BEST PERFORMER */}
        {(activeCategory === 'all' || activeCategory === 'monthly') && data?.monthlyBest && (
          <View
            style={[
              styles.honourCard,
              { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.badgePill, { backgroundColor: '#047857' }]}>
                <Ionicons name="medal" size={12} color="#FFFFFF" />
                <Text style={styles.badgePillText}>Monthly Best Performer</Text>
              </View>
              <Text style={[styles.scoreBadge, { color: '#047857' }]}>
                {data.monthlyBest.percentage}% Avg
              </Text>
            </View>
            <Text style={[styles.devoteeName, { color: '#064E3B' }]}>
              {data.monthlyBest.counseleeName}
            </Text>
            <Text style={[styles.honourDetail, { color: '#065F46' }]}>
              {data.monthlyBest.detail}
            </Text>
          </View>
        )}
      </View>
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
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemsList: {
    gap: 8,
  },
  honourCard: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  devoteeName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  honourDetail: {
    fontSize: 11,
    marginTop: 2,
  },
});
