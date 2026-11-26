import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonItemProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}) => {
  const { currentThemeId } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  const baseBg = currentThemeId === 'black' ? '#334155' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseBg,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <SkeletonItem width={120} height={14} borderRadius={4} />
        <SkeletonItem width={60} height={18} borderRadius={10} />
      </View>
      <View style={{ marginVertical: 12 }}>
        <SkeletonItem width={160} height={32} borderRadius={6} />
      </View>
      <View style={{ gap: 8 }}>
        <SkeletonItem width="100%" height={12} borderRadius={4} />
        <SkeletonItem width="80%" height={12} borderRadius={4} />
      </View>
    </View>
  );
};

export const RowListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.rowsWrapper}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rowItem,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowLeft}>
            <SkeletonItem width={36} height={36} borderRadius={8} />
            <View style={{ gap: 6, flex: 1 }}>
              <SkeletonItem width="65%" height={13} borderRadius={4} />
              <SkeletonItem width="40%" height={10} borderRadius={3} />
            </View>
          </View>
          <SkeletonItem width={50} height={20} borderRadius={6} />
        </View>
      ))}
    </View>
  );
};

export const DashboardMetricsSkeleton: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={styles.metricsGrid}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[
            styles.metricCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <SkeletonItem width={30} height={10} borderRadius={3} />
          <SkeletonItem width={45} height={24} borderRadius={4} style={{ marginVertical: 6 }} />
          <SkeletonItem width="80%" height={9} borderRadius={3} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowsWrapper: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
