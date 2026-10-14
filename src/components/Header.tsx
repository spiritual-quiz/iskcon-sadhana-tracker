import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    iconName: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBackPress,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {showBack ? (
          <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={THEME.colors.gold} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder}>
            <Ionicons name="flower-outline" size={22} color={THEME.colors.gold} />
          </View>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightAction ? (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.iconButton}>
            <Ionicons name={rightAction.iconName} size={22} color={THEME.colors.gold} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.base,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.base,
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.gold,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: THEME.spacing.sm,
  },
  title: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: THEME.colors.goldLight,
    fontSize: THEME.typography.sizes.xs,
    marginTop: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
