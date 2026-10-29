import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Grade } from '../types/sadhana';
import { StatusBadge } from './StatusBadge';

interface ScoreCardProps {
  title?: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: Grade;
  breakdown?: {
    japa?: number;
    reading?: number;
    hearing?: number;
    sleep?: number;
    classMarks?: number;
    morningMarks?: number;
    onlineReadingMarks?: number;
    satsangaMarks?: number;
  };
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title = 'Sadhana Score',
  score,
  maxScore,
  percentage,
  grade,
  breakdown,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.thickColor }]}>{title}</Text>
        <StatusBadge type="grade" value={grade} />
      </View>

      <View style={[styles.scoreRow, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreValue, { color: theme.thickColor }]}>{score.toFixed(1)}</Text>
          <Text style={[styles.scoreMax, { color: theme.colors.textMuted }]}>/ {maxScore}</Text>
        </View>

        <View style={[styles.dividerVertical, { backgroundColor: theme.colors.border }]} />

        <View style={styles.percentageBlock}>
          <Text style={[styles.percentageValue, { color: theme.thickColor }]}>{percentage.toFixed(1)}%</Text>
          <Text style={[styles.percentageLabel, { color: theme.colors.textMuted }]}>Completion</Text>
        </View>
      </View>

      {breakdown && (
        <View style={[styles.breakdownContainer, { borderTopColor: theme.colors.borderLight }]}>
          {breakdown.japa !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Japa</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.japa}/10</Text>
            </View>
          )}
          {breakdown.reading !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Reading</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.reading}/10</Text>
            </View>
          )}
          {breakdown.hearing !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Hearing</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.hearing}/10</Text>
            </View>
          )}
          {breakdown.sleep !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Sleep</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.sleep}/10</Text>
            </View>
          )}
          {breakdown.classMarks !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Class</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.classMarks}/10</Text>
            </View>
          )}
          {breakdown.morningMarks !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Morning</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.morningMarks}/50</Text>
            </View>
          )}
          {breakdown.onlineReadingMarks !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Online Read</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.onlineReadingMarks}/50</Text>
            </View>
          )}
          {breakdown.satsangaMarks !== undefined && (
            <View style={[styles.breakdownItem, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textMuted }]}>Satsanga</Text>
              <Text style={[styles.breakdownValue, { color: theme.thickColor }]}>{breakdown.satsangaMarks}/50</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
    ...THEME.shadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 6,
    backgroundColor: THEME.colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  scoreMax: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  dividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: THEME.colors.border,
  },
  percentageBlock: {
    alignItems: 'center',
  },
  percentageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.goldDark,
  },
  percentageLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  breakdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  breakdownItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginVertical: 4,
    backgroundColor: '#FFF7ED',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  breakdownLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: 1,
  },
});
