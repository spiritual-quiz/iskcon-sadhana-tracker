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
          {breakdown.sleep !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Sleep</Text>
              <Text style={styles.breakdownValue}>{breakdown.sleep}/10</Text>
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
          {breakdown.onlineReadingMarks !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Online Read</Text>
              <Text style={styles.breakdownValue}>{breakdown.onlineReadingMarks}/50</Text>
            </View>
          )}
          {breakdown.satsangaMarks !== undefined && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Satsanga</Text>
              <Text style={styles.breakdownValue}>{breakdown.satsangaMarks}/50</Text>
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
