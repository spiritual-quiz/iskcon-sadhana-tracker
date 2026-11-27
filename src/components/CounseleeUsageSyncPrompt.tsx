import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { mobileUsageService, formatMinutesToDisplay } from '../services/mobileUsageService';
import { DailyMobileUsageRecord } from '../types/mobileUsage';

export const CounseleeUsageSyncPrompt: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [todayRecord, setTodayRecord] = useState<DailyMobileUsageRecord | null>(null);

  useEffect(() => {
    // Only relevant on Android devices for counselees
    if (Platform.OS !== 'android' || !user || user.role === 'counsellor') {
      return;
    }

    let isMounted = true;
    const checkState = async () => {
      const granted = await mobileUsageService.hasUsagePermission();
      if (!isMounted) return;
      setHasPermission(granted);

      if (granted && user) {
        setIsSyncing(true);
        const record = await mobileUsageService.syncCounseleeUsageIfDue(user);
        if (isMounted) {
          if (record) setTodayRecord(record);
          setIsSyncing(false);
        }
      }
    };

    checkState();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (Platform.OS !== 'android' || !user || user.role === 'counsellor') {
    return null;
  }

  const handleRequestPermission = async () => {
    setIsSyncing(true);
    const granted = await mobileUsageService.requestUsagePermission();
    setHasPermission(granted);
    if (granted && user) {
      const record = await mobileUsageService.syncCounseleeUsageIfDue(user, true);
      setTodayRecord(record);
    }
    setIsSyncing(false);
  };

  if (hasPermission === null) {
    return null; // checking
  }

  // Permission already granted
  if (hasPermission) {
    return (
      <View style={[styles.activeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.activeRow}>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.activeTitle, { color: theme.colors.text }]}>
              Screen Time Sync: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Active</Text>
            </Text>
            <Text style={[styles.activeSubtitle, { color: theme.colors.textMuted }]}>
              {todayRecord
                ? `Today's Screen Time: ${formatMinutesToDisplay(todayRecord.totalScreenMinutes)} synced with counsellor`
                : 'Accountability sync active • Zero background battery drain'}
            </Text>
          </View>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
        </View>
      </View>
    );
  }

  // Permission not yet granted
  return (
    <View style={[styles.promptCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: theme.liteColor }]}>
          <Ionicons name="phone-portrait-outline" size={20} color={theme.thickColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.thickColor }]}>
            Digital Sadhana & Screen Time Sync
          </Text>
          <Text style={[styles.cardDescription, { color: theme.colors.textMuted }]}>
            Share daily screen time with your counsellor to protect chanting & reading hours from social media distractions.
          </Text>
        </View>
      </View>

      <View style={styles.privacyNotice}>
        <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
        <Text style={[styles.privacyText, { color: theme.colors.textMuted }]}>
          Only total app hours are shared. Personal messages, searches, and chats are never accessed.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: theme.thickColor }]}
        onPress={handleRequestPermission}
        disabled={isSyncing}
        activeOpacity={0.8}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Enable Screen Time Sync</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  promptCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  privacyText: {
    fontSize: 11,
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  activeCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
});
