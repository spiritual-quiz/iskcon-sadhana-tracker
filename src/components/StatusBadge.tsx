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
      case 'A':
        backgroundColor = THEME.colors.primaryUltraLight;
        textColor = THEME.colors.gradeA;
        break;
      case 'B':
        backgroundColor = '#EFF6FF';
        textColor = THEME.colors.gradeB;
        break;
      case 'C':
        backgroundColor = THEME.colors.warningLight;
        textColor = THEME.colors.gradeC;
        break;
      case 'D':
        backgroundColor = '#FFF7ED';
        textColor = THEME.colors.gradeD;
        break;
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

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>
        {label || (type === 'grade' ? `Grade ${value}` : value.toUpperCase())}
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
