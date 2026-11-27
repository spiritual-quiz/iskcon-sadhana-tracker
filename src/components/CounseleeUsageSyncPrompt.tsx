import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { mobileUsageService, formatMinutesToDisplay } from '../services/mobileUsageService';
import { DailyMobileUsageRecord } from '../types/mobileUsage';

export const CounseleeUsageSyncPrompt: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isOpeningSettings, setIsOpeningSettings] = useState<boolean>(false);
  const [todayRecord, setTodayRecord] = useState<DailyMobileUsageRecord | null>(null);

  const checkPermissionState = async () => {
    if (Platform.OS !== 'android' || !user || user.role === 'counsellor') {
      return;
    }
    const granted = await mobileUsageService.hasUsagePermission();
    setHasPermission(granted);

    if (granted && user) {
      const record = await mobileUsageService.syncCounseleeUsageIfDue(user);
      if (record) setTodayRecord(record);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || !user || user.role === 'counsellor') {
      return;
    }

    checkPermissionState();

    // Re-check automatically when user returns from phone Settings to app
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkPermissionState();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [user]);

  if (Platform.OS !== 'android' || !user || user.role === 'counsellor') {
    return null;
  }

  const handleEnableClick = async () => {
    setIsOpeningSettings(true);
    try {
      await mobileUsageService.requestUsagePermission();
      // Permission will be checked again upon app resume via AppState listener
      const granted = await mobileUsageService.hasUsagePermission();
      setHasPermission(granted);
      if (granted && user) {
        const record = await mobileUsageService.syncCounseleeUsageIfDue(user, true);
        if (record) setTodayRecord(record);
      }
    } finally {
      setIsOpeningSettings(false);
    }
  };

  // Checking state initially
  if (hasPermission === null) {
    return null;
  }

  return (
    <>
      {/* 1. Subtle Active Pill when permission is granted */}
      {hasPermission && (
        <View style={[styles.activeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.activeRow}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeTitle, { color: theme.colors.text }]}>
                Digital Sadhana Sync: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Active</Text>
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
      )}

      {/* 2. Mandatory Full-Screen Modal when permission is NOT granted */}
      {!hasPermission && (
        <Modal
          visible={!hasPermission}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {}} // Cannot be dismissed via back button
        >
          <View style={styles.mandatoryOverlay}>
            <View style={[styles.mandatoryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {/* Devotional Icon */}
              <View style={[styles.mandatoryIconCircle, { backgroundColor: theme.liteColor }]}>
                <Ionicons name="phone-portrait-outline" size={32} color={theme.thickColor} />
              </View>

              {/* Exact Message from User */}
              <Text style={[styles.greetingText, { color: theme.thickColor }]}>
                Hare Krishna,
              </Text>

              <Text style={[styles.bodyText, { color: theme.colors.text }]}>
                As guided by your counsellor, Digital Sadhana Sync is mandatory to track and submit your sadhana.
              </Text>

              <Text style={[styles.instructionText, { color: theme.colors.textMuted }]}>
                Please tap below to enable Usage Access in your phone settings to continue.
              </Text>

              {/* Privacy Note */}
              <View style={styles.privacyBox}>
                <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} />
                <Text style={[styles.privacyBoxText, { color: theme.colors.textMuted }]}>
                  Only total application hours are shared. Personal messages, searches, and chats are never accessed.
                </Text>
              </View>

              {/* Mandatory Enable Button (Jumps directly to Settings) */}
              <TouchableOpacity
                style={[styles.enableBtn, { backgroundColor: theme.thickColor }]}
                onPress={handleEnableClick}
                disabled={isOpeningSettings}
                activeOpacity={0.8}
              >
                {isOpeningSettings ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.enableBtnText}>Enable Usage Access</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
  mandatoryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mandatoryCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  mandatoryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    marginBottom: 20,
  },
  privacyBoxText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
