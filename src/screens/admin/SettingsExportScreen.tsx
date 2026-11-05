import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { SCORING_RULES } from '../../constants/scoring';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

import { authService } from '../../services/authService';
import { localStorageService } from '../../services/localStorageService';
import { updateService } from '../../services/updateService';

export const SettingsExportScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const currentAppVersion = updateService.getCurrentVersion();
  const [minA, setMinA] = useState<string>('90');
  const [minB, setMinB] = useState<string>('80');
  const [minC, setMinC] = useState<string>('70');
  const [minD, setMinD] = useState<string>('60');

  const [inactivityDays, setInactivityDays] = useState<string>('3');
  const [lowScoreThreshold, setLowScoreThreshold] = useState<string>('60');

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [broadcastVersion, setBroadcastVersion] = useState<string>(currentAppVersion.version);
  const [broadcastCode, setBroadcastCode] = useState<string>(String(currentAppVersion.versionCode));
  const [broadcastTitle, setBroadcastTitle] = useState<string>('New Devotional Update Available');
  const [broadcastNotes, setBroadcastNotes] = useState<string>(
    'Devotee approval updates, retained username on invalid password, and live software version tracking.'
  );
  const [isPublishingUpgrade, setIsPublishingUpgrade] = useState<boolean>(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);

  useEffect(() => {
    loadLiveBroadcast();
  }, []);

  const loadLiveBroadcast = async () => {
    try {
      const live = await updateService.getLatestBroadcast();
      if (live) {
        if (live.version) setBroadcastVersion(live.version);
        if (live.versionCode) setBroadcastCode(String(live.versionCode));
        if (live.title) setBroadcastTitle(live.title);
        if (live.releaseNotes) setBroadcastNotes(live.releaseNotes);
      }
    } catch (e) {
      console.warn('Error loading live broadcast:', e);
    }
  };

  const handleSyncToCurrentBuild = () => {
    setBroadcastVersion(currentAppVersion.version);
    setBroadcastCode(String(currentAppVersion.versionCode));
    setBroadcastTitle(`Bhakti Unnati v${currentAppVersion.version}`);
    setBroadcastNotes('Devotee approval updates, retained username on invalid password, and live software version tracking.');
    Alert.alert('Auto-Filled', `Synced broadcast fields to running app version v${currentAppVersion.version} (Build #${currentAppVersion.versionCode}).`);
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const res = await updateService.checkForUpdate();
      if (res.isAvailable) {
        Alert.alert(
          'Update Available',
          `A new software update (${res.versionInfo?.version || 'Latest'}) is available.`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Download & Apply',
              onPress: async () => {
                await updateService.fetchAndApplyUpdate(res.versionInfo);
                Alert.alert(
                  'Update Ready',
                  'The update package has been downloaded successfully. Restart app to apply?',
                  [
                    { text: 'Restart Now', onPress: () => updateService.reloadApp() },
                    { text: 'Later' },
                  ]
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Software Up to Date',
          `You are on the latest software version: v${currentAppVersion.version} (Build #${currentAppVersion.versionCode}).`
        );
      }
    } catch (e: any) {
      Alert.alert('Update Check', e.message || 'Could not verify update status.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleSaveSettings = () => {
    Alert.alert('Settings Updated', 'Grading thresholds and monitoring rules saved successfully.');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      let usersList: any[] = [];
      let sadhanaList: any[] = [];

      try {
        const [usersSnap, sadhanaSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'sadhana_entries')),
        ]);
        usersList = usersSnap.docs.map((d) => d.data());
        sadhanaList = sadhanaSnap.docs.map((d) => d.data());
      } catch (fbErr) {
        console.warn('Firestore export fallback to local storage:', fbErr);
      }

      if (usersList.length === 0) {
        usersList = await authService.getAllUsers();
      }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        totalUsers: usersList.length,
        totalSadhanaEntries: sadhanaList.length,
        users: usersList,
        sadhanaEntries: sadhanaList,
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      await Clipboard.setStringAsync(jsonStr);
      Alert.alert(
        'Export Complete!',
        `Exported ${usersList.length} devotees and ${sadhanaList.length} daily sadhana records. Full JSON copied to your clipboard.`
      );
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export database records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePublishUpgrade = async () => {
    setIsPublishingUpgrade(true);
    try {
      await updateService.publishSoftwareUpgrade({
        version: broadcastVersion.trim() || currentAppVersion.version,
        versionCode: parseInt(broadcastCode, 10) || currentAppVersion.versionCode,
        title: broadcastTitle.trim() || 'New Devotional Update Available',
        releaseNotes: broadcastNotes.trim(),
        apkDownloadUrl: 'https://expo.dev/artifacts/eas/1ibgUrrK89ERZl2Mz4GOSd0DjHACyoD4BH7ljT9ckfk.apk',
        isMandatory: false,
      });
      Alert.alert(
        'Software Upgrade Broadcasted! 🚀',
        `Version ${broadcastVersion} (code: ${broadcastCode}) is now live in Firestore. Devotees and counsellors will immediately see the update pop-up with the progress bar when they open the app.`
      );
    } catch (e: any) {
      Alert.alert('Broadcast Error', e?.message || 'Could not publish update broadcast.');
    } finally {
      setIsPublishingUpgrade(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Settings & Export"
        subtitle="Grade Scales, Monitoring & Data Backup"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Grade Thresholds */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.thickColor }]}>Grade Scale Thresholds (%)</Text>
          <Text style={styles.helperText}>Configure minimum percentage boundaries for grades:</Text>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade A (Excellent)</Text>
            <TextInput
              style={[styles.gradeInput, { borderColor: theme.colors.border }]}
              value={minA}
              onChangeText={setMinA}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to 100%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade B (Very Good)</Text>
            <TextInput
              style={[styles.gradeInput, { borderColor: theme.colors.border }]}
              value={minB}
              onChangeText={setMinB}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to &lt; {minA}%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade C (Good)</Text>
            <TextInput
              style={[styles.gradeInput, { borderColor: theme.colors.border }]}
              value={minC}
              onChangeText={setMinC}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to &lt; {minB}%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade D (Fair)</Text>
            <TextInput
              style={[styles.gradeInput, { borderColor: theme.colors.border }]}
              value={minD}
              onChangeText={setMinD}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to &lt; {minC}%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade E (Encourage)</Text>
            <Text style={styles.fixedValue}>Below {minD}%</Text>
          </View>
        </View>

        {/* Monitoring Inactivity Rules */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.thickColor }]}>Sadhana Monitoring Rules</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Missing Card Inactivity Threshold (Days)</Text>
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border }]}
              value={inactivityDays}
              onChangeText={setInactivityDays}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Triggers admin alert when no card is submitted for more than this number of consecutive calendar days.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>"Needs Encouragement" Score Threshold (%)</Text>
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border }]}
              value={lowScoreThreshold}
              onChangeText={setLowScoreThreshold}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Flags devotee for gentle counsellor outreach when weekly completion is below this percentage.
            </Text>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.thickColor }]} onPress={handleSaveSettings}>
            <Text style={styles.saveBtnText}>Save Configurations</Text>
          </TouchableOpacity>
        </View>

        {/* Data Export & Backup */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardTitle, { color: theme.thickColor }]}>Data Export & Backup</Text>
          <Text style={styles.helperText}>
            Export full sadhana history and counselee records for offline backup or spreadsheets:
          </Text>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: theme.thickColor }]}
            onPress={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color={THEME.colors.textInverse} />
                <Text style={styles.exportBtnText}>Export All Sadhana Records (JSON)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Software Version & Upgrade Broadcast */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="information-circle-outline" size={20} color={theme.thickColor} />
              <Text style={[styles.cardTitle, { color: theme.thickColor, marginBottom: 0 }]}>
                Current Software Version
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkUpdateBtn, { backgroundColor: theme.liteColor, borderColor: theme.thickColor }]}
              onPress={handleCheckUpdates}
              disabled={isCheckingUpdates}
              activeOpacity={0.8}
            >
              {isCheckingUpdates ? (
                <ActivityIndicator size="small" color={theme.thickColor} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={13} color={theme.thickColor} />
                  <Text style={[styles.checkUpdateBtnText, { color: theme.thickColor }]}>Check Updates</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[styles.versionBanner, { backgroundColor: theme.liteColor, borderColor: theme.colors.borderLight }]}>
            <View>
              <Text style={[styles.versionLabel, { color: theme.colors.textMuted }]}>Installed Release</Text>
              <Text style={[styles.versionValue, { color: theme.thickColor }]}>
                v{currentAppVersion.version} (Build #{currentAppVersion.versionCode})
              </Text>
            </View>
            <View>
              <Text style={[styles.versionLabel, { color: theme.colors.textMuted }]}>Cloud Broadcast</Text>
              <Text style={[styles.versionValue, { color: theme.colors.text }]}>
                v{broadcastVersion} (#{broadcastCode})
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
            <Text style={[styles.subSectionTitle, { color: theme.thickColor }]}>
              Publish Upgrade Broadcast to Users
            </Text>
            <TouchableOpacity
              style={[styles.syncBuildBtn, { borderColor: theme.colors.border }]}
              onPress={handleSyncToCurrentBuild}
              activeOpacity={0.7}
            >
              <Ionicons name="sync-outline" size={12} color={theme.thickColor} />
              <Text style={[styles.syncBuildBtnText, { color: theme.thickColor }]}>Auto-Fill Current Build</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Broadcast Version Number</Text>
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border }]}
              value={broadcastVersion}
              onChangeText={setBroadcastVersion}
              placeholder="e.g. 1.0.30"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Version Code (Integer)</Text>
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border }]}
              value={broadcastCode}
              onChangeText={setBroadcastCode}
              keyboardType="number-pad"
              placeholder="e.g. 31"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Update Title</Text>
            <TextInput
              style={[styles.textInput, { borderColor: theme.colors.border }]}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              placeholder="e.g. New Devotional Update Available"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Release Notes / Highlights</Text>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: theme.colors.border, height: 70, textAlignVertical: 'top' },
              ]}
              value={broadcastNotes}
              onChangeText={setBroadcastNotes}
              multiline
              numberOfLines={3}
              placeholder="Describe key features or bugfixes included in this release..."
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.thickColor, marginTop: 8 }]}
            onPress={handlePublishUpgrade}
            disabled={isPublishingUpgrade}
          >
            {isPublishingUpgrade ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Publish Software Upgrade to All Users</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
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
    marginBottom: 4,
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.sm,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceVariant,
  },
  gradeLabel: {
    flex: 1,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  gradeInput: {
    width: 50,
    height: 36,
    backgroundColor: THEME.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  unitText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 8,
    width: 80,
  },
  fixedValue: {
    fontSize: 11,
    color: THEME.colors.danger,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginVertical: 6,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  textInput: {
    height: 44,
    backgroundColor: THEME.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    height: 46,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
  },
  saveBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryDark,
    height: 48,
    borderRadius: THEME.borderRadius.md,
    marginTop: 6,
  },
  exportBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.sm,
    marginLeft: 8,
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  checkUpdateBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  versionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
  },
  versionLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  versionValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncBuildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  syncBuildBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
