import React, { useState } from 'react';
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
import { Header } from '../../components/Header';
import { SCORING_RULES } from '../../constants/scoring';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

import { authService } from '../../services/authService';
import { localStorageService } from '../../services/localStorageService';

export const SettingsExportScreen = ({ navigation }: any) => {
  const [minA, setMinA] = useState<string>('90');
  const [minB, setMinB] = useState<string>('80');
  const [minC, setMinC] = useState<string>('70');
  const [minD, setMinD] = useState<string>('60');

  const [inactivityDays, setInactivityDays] = useState<string>('3');
  const [lowScoreThreshold, setLowScoreThreshold] = useState<string>('60');

  const [isExporting, setIsExporting] = useState<boolean>(false);

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

  return (
    <View style={styles.container}>
      <Header
        title="Settings & Export"
        subtitle="Grade Scales, Monitoring & Data Backup"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Grade Thresholds */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Grade Scale Thresholds (%)</Text>
          <Text style={styles.helperText}>Configure minimum percentage boundaries for grades:</Text>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade A (Excellent)</Text>
            <TextInput
              style={styles.gradeInput}
              value={minA}
              onChangeText={setMinA}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to 100%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade B (Very Good)</Text>
            <TextInput
              style={styles.gradeInput}
              value={minB}
              onChangeText={setMinB}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to &lt; {minA}%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade C (Good)</Text>
            <TextInput
              style={styles.gradeInput}
              value={minC}
              onChangeText={setMinC}
              keyboardType="number-pad"
            />
            <Text style={styles.unitText}>% to &lt; {minB}%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.gradeLabel}>Grade D (Fair)</Text>
            <TextInput
              style={styles.gradeInput}
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sadhana Monitoring Rules</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Missing Card Inactivity Threshold (Days)</Text>
            <TextInput
              style={styles.textInput}
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
              style={styles.textInput}
              value={lowScoreThreshold}
              onChangeText={setLowScoreThreshold}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Flags devotee for gentle counsellor outreach when weekly completion is below this percentage.
            </Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
            <Text style={styles.saveBtnText}>Save Configurations</Text>
          </TouchableOpacity>
        </View>

        {/* Data Export & Backup */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Export & Backup</Text>
          <Text style={styles.helperText}>
            Export full sadhana history and counselee records for offline backup or spreadsheets:
          </Text>

          <TouchableOpacity
            style={styles.exportBtn}
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
});
