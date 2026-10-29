import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { Grade } from '../types/sadhana';

interface StatusBadgeProps {
  type: 'grade' | 'status' | 'custom';
  value: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, label }) => {
  let backgroundColor = THEME.colors.primaryUltraLight;
  let textColor = THEME.colors.primary;

  if (type === 'grade') {
    switch (value as Grade) {
      case 'Advancing':
      case 'A':
        backgroundColor = THEME.colors.primaryUltraLight;
        textColor = THEME.colors.gradeA;
        break;
      case 'Good, Please Improve':
      case 'B':
        backgroundColor = '#EFF6FF';
        textColor = THEME.colors.gradeB;
        break;
      case 'Your Bhakti Is at Risk':
      case 'Your Sādhana Is at Risk':
      case 'Your Sadhana Is at Risk':
      case 'C':
        backgroundColor = THEME.colors.warningLight;
        textColor = THEME.colors.gradeC;
        break;
      case 'Māyā Is Distracting You':
      case 'D':
        backgroundColor = '#FFF7ED';
        textColor = THEME.colors.gradeD;
        break;
      case 'You Are in Māyā':
        backgroundColor = '#FEE2E2';
        textColor = '#DC2626';
        break;
      case 'You Are Fallen':
      case 'E':
        backgroundColor = THEME.colors.dangerLight;
        textColor = THEME.colors.gradeE;
        break;
    }
  } else if (type === 'status') {
    switch (value) {
      case 'approved':
        backgroundColor = THEME.colors.successLight;
        textColor = THEME.colors.success;
        break;
      case 'pending':
        backgroundColor = THEME.colors.warningLight;
        textColor = THEME.colors.warning;
        break;
      case 'rejected':
      case 'disabled':
        backgroundColor = THEME.colors.dangerLight;
        textColor = THEME.colors.danger;
        break;
    }
  }

  const isLegacyLetter = ['A', 'B', 'C', 'D', 'E'].includes(value);
  const displayText = label || (type === 'grade' ? (isLegacyLetter ? `Grade ${value}` : value) : value.toUpperCase());

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  badgeText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
  },
});
