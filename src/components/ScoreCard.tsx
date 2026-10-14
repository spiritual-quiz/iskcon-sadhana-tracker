import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
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
    classMarks?: number;
    morningMarks?: number;
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
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <StatusBadge type="grade" value={grade} />
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreValue}>{score.toFixed(1)}</Text>
          <Text style={styles.scoreMax}>/ {maxScore}</Text>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.percentageBlock}>
          <Text style={styles.percentageValue}>{percentage.toFixed(1)}%</Text>
          <Text style={styles.percentageLabel}>Completion</Text>
        </View>
      </View>

      {breakdown && (
        <View style={styles.breakdownContainer}>
          {breakdown.japa !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Japa</Text>
              <Text style={styles.breakdownValue}>{breakdown.japa}/10</Text>
            </View>
          )}
          {breakdown.reading !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Reading</Text>
              <Text style={styles.breakdownValue}>{breakdown.reading}/10</Text>
            </View>
          )}
          {breakdown.hearing !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Hearing</Text>
              <Text style={styles.breakdownValue}>{breakdown.hearing}/10</Text>
            </View>
          )}
          {breakdown.classMarks !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Class</Text>
              <Text style={styles.breakdownValue}>{breakdown.classMarks}/10</Text>
            </View>
          )}
          {breakdown.morningMarks !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Morning</Text>
              <Text style={styles.breakdownValue}>{breakdown.morningMarks}/10</Text>
            </View>
          )}
          {breakdown.satsangaMarks !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Satsanga</Text>
              <Text style={styles.breakdownValue}>{breakdown.satsangaMarks}/10</Text>
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
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.base,
    ...THEME.shadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  title: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surfaceVariant,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  scoreMax: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  dividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: THEME.colors.border,
  },
  percentageBlock: {
    alignItems: 'center',
  },
  percentageValue: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: 'bold',
    color: THEME.colors.goldDark,
  },
  percentageLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  breakdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  breakdownItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginVertical: 4,
  },
  breakdownLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  breakdownValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginTop: 2,
  },
});
