import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { performerService, MonthlyChampionsData, CategoryChampion } from '../services/performerService';
import { getTodayDateStringIST } from '../utils/dateUtils';

interface MonthlyChampionsBannerProps {
  year?: number;
  month?: number;
  showAlways?: boolean;
}

export const MonthlyChampionsBanner: React.FC<MonthlyChampionsBannerProps> = ({
  year,
  month,
  showAlways = true,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<MonthlyChampionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchChampions = async () => {
      try {
        if (year && month) {
          const res = await performerService.getMonthlyCategoryChampions(year, month);
          if (isMounted) setData(res);
        } else {
          // Default: fetch previous month champions
          const honours = await performerService.getHonoursAndPerformers();
          if (isMounted) setData(honours.monthlyChampions);
        }
      } catch (e) {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchChampions();
    return () => {
      isMounted = false;
    };
  }, [year, month]);

  if (isLoading) {
    return null;
  }

  if (!data || data.championsList.length === 0) {
    return null;
  }

  // If not showAlways and not in first 10 days, hide
  if (!showAlways && !data.isFirst10Days) {
    return null;
  }

  const champs = data.championsList;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header Row */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.trophyCircle, { backgroundColor: '#047857' }]}>
            <Ionicons name="trophy" size={17} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.thickColor }]}>
              {data.previousMonthName} Best Performers
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>
              Monthly Discipline Champions ({champs.length} Categories)
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.thickColor}
        />
      </TouchableOpacity>

      {/* 10-Days Celebration Pill */}
      {data.isFirst10Days && (
        <View style={styles.celebrationPill}>
          <Ionicons name="sparkles" size={13} color="#B45309" />
          <Text style={styles.celebrationPillText}>
            Displayed in {data.currentMonthName} for 10 days ({data.daysRemainingInHighlight} days remaining)
          </Text>
        </View>
      )}

      {/* Expanded List of 7 Disciplines */}
      {isExpanded && (
        <View style={styles.list}>
          {champs.map((champ, index) => {
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
                key={`${champ.category}_${index}`}
                style={[
                  styles.champRow,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: badgeColor + '15' }]}>
                  <Ionicons name={champ.iconName as any} size={16} color={badgeColor} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.champTopLine}>
                    <Text style={[styles.champCategoryTitle, { color: theme.colors.textMuted }]}>
                      {champ.title}
                    </Text>
                    <View style={[styles.badgePill, { backgroundColor: badgeColor + '18', borderColor: badgeColor }]}>
                      <Text style={[styles.badgePillText, { color: badgeColor }]}>{champ.badge}</Text>
                    </View>
                  </View>

                  <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                    {champ.devoteeName}
                  </Text>
                  <Text style={[styles.champValueText, { color: badgeColor }]}>
                    {champ.valueStr}
                  </Text>
                  <Text style={[styles.champDetailText, { color: theme.colors.textMuted }]}>
                    {champ.detail}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 14,
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  trophyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  celebrationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
    marginBottom: 4,
  },
  celebrationPillText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  list: {
    marginTop: 10,
    gap: 8,
  },
  champRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  champTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  champCategoryTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  badgePillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  devoteeName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 1,
  },
  champValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  champDetailText: {
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
});
