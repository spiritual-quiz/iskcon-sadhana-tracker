import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: {
    iconName: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Bhakti Unnati',
  subtitle = 'Advancement in Devotion',
  showBack,
  onBackPress,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const topInset = Math.max(insets.top, 8);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topInset + 4,
          backgroundColor: theme.colors.header,
          borderBottomColor: theme.colors.headerBorder,
        },
      ]}
    >
      <View style={styles.topRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            style={[styles.iconButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.headerText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.headerText }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.headerSubtitle }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={[styles.iconButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={rightAction.iconName} size={20} color={theme.colors.headerText} />
          </TouchableOpacity>
        ) : (
          <View style={styles.rightPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 34,
    height: 34,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightPlaceholder: {
    width: 36,
    height: 36,
  },
});
