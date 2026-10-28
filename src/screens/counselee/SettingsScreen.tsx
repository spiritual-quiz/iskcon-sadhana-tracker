import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';

export const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  const { theme, openThemePicker } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Settings" subtitle="App & System Preferences" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance & Color Palette */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance & Theme</Text>
          <TouchableOpacity
            style={styles.themeSelectorRow}
            onPress={openThemePicker}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.themeCircle, { backgroundColor: theme.thickColor }]} />
              <View>
                <Text style={styles.themeName}>{theme.name}</Text>
                <Text style={styles.themeDesc}>Tap to choose a new color scheme</Text>
              </View>
            </View>
            <View style={[styles.themePill, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}>
              <Text style={[styles.themePillText, { color: theme.thickColor }]}>Change</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.thickColor} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Logged In Devotee:</Text>
            <Text style={styles.value}>{user?.displayName}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Role:</Text>
            <Text style={styles.value}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* System & Timezone Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timezone & Calculations</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Standard Reporting Zone:</Text>
            <Text style={styles.valueHighlight}>Asia/Kolkata (IST, UTC+05:30)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Daily Cutoff Time:</Text>
            <Text style={styles.value}>12:00 Midnight IST</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Scoring System:</Text>
            <Text style={styles.value}>50 Marks Daily System</Text>
          </View>
        </View>

        {/* Sadhana Reminder */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sadhana Reminder</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Reminder Schedule:</Text>
            <Text style={styles.valueHighlight}>6:00 PM & 9:00 PM IST</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Reminder Status:</Text>
            <Text
              style={[
                styles.value,
                {
                  fontWeight: 'bold',
                  color: user?.sadhanaRemindersEnabled !== false ? '#15803D' : '#6B7280',
                },
              ]}
            >
              {user?.sadhanaRemindersEnabled !== false ? 'Active (Mandatory)' : 'Switched Off by Counsellor'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Control Policy:</Text>
            <Text style={[styles.value, { fontStyle: 'italic', color: THEME.colors.textMuted, fontSize: 11 }]}>
              Cannot be switched off directly. Request counsellor to modify.
            </Text>
          </View>
        </View>

        {/* Application Build Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application Details</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Application Name:</Text>
            <Text style={styles.value}>ISKCON Sadhana Tracker</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.value}>1.0.0 (Production APK)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Package ID:</Text>
            <Text style={styles.value}>org.iskcon.sadhanatracker</Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out" size={20} color="#FFFFFF" />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  themeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  themeDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: THEME.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceVariant,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  value: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  valueHighlight: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#EA580C', // Thick rich orange
    elevation: 3,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginTop: THEME.spacing.lg,
  },
  signOutBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.base,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});
