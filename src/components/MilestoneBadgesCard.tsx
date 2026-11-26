import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { MilestoneBadge } from '../services/streakMilestoneService';

interface MilestoneBadgesCardProps {
  badges: MilestoneBadge[];
}

export const MilestoneBadgesCard: React.FC<MilestoneBadgesCardProps> = ({ badges }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="trophy" size={17} color="#D97706" />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.thickColor }]}>Spiritual Milestones</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Personal growth & consistency (Private to you)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {badges.map((b) => (
          <View
            key={b.id}
            style={[
              styles.badgeItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: b.isUnlocked ? '#F59E0B' : theme.colors.border,
              },
            ]}
          >
            <View style={styles.badgeTop}>
              <View
                style={[
                  styles.badgeIconBox,
                  { backgroundColor: b.isUnlocked ? `${b.iconColor}20` : '#E2E8F0' },
                ]}
              >
                <Ionicons
                  name={b.iconName as any}
                  size={20}
                  color={b.isUnlocked ? b.iconColor : '#94A3B8'}
                />
              </View>

              {b.isUnlocked ? (
                <View style={styles.unlockedTag}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.unlockedText}>Earned</Text>
                </View>
              ) : (
                <View style={styles.lockedTag}>
                  <Text style={styles.lockedText}>
                    {b.currentValue}/{b.targetValue} {b.unit}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.badgeTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {b.title}
            </Text>
            <Text style={[styles.badgeSub, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {b.subtitle}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${b.progressPercent}%`,
                    backgroundColor: b.isUnlocked ? '#059669' : '#F59E0B',
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
  },
  badgeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
  },
  lockedTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeSub: {
    fontSize: 10,
    lineHeight: 13,
    marginBottom: 8,
    minHeight: 26,
  },
  progressBg: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
});
