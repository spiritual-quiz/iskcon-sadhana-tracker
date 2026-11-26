import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { getTodayDateStringIST } from '../../utils/dateUtils';
import { showCrossPlatformAlert } from '../../utils/alertUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const JapaCounterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, currentThemeId } = useTheme();
  const { user } = useAuth();
  const todayStr = getTodayDateStringIST();

  const [currentBead, setCurrentBead] = useState<number>(0); // 0 to 108
  const [completedRounds, setCompletedRounds] = useState<number>(0);
  const [targetRounds, setTargetRounds] = useState<number>(user?.declaredRounds || 16);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load saved counter progress from storage
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedBead = await AsyncStorage.getItem(`japa_bead_${todayStr}`);
        const savedRounds = await AsyncStorage.getItem(`japa_rounds_${todayStr}`);
        if (savedBead) setCurrentBead(parseInt(savedBead, 10) || 0);
        if (savedRounds) setCompletedRounds(parseInt(savedRounds, 10) || 0);
      } catch {}
    };
    loadSavedState();
  }, [todayStr]);

  const saveCounterState = async (bead: number, rounds: number) => {
    try {
      await AsyncStorage.setItem(`japa_bead_${todayStr}`, bead.toString());
      await AsyncStorage.setItem(`japa_rounds_${todayStr}`, rounds.toString());
    } catch {}
  };

  const handleBeadTap = () => {
    // Gentle haptic feedback
    if (hapticsEnabled) {
      if (Platform.OS !== 'web') {
        Vibration.vibrate(30);
      }
    }

    const nextBead = currentBead + 1;

    if (nextBead >= 108) {
      // Completed a full round of 108 beads!
      const newRounds = completedRounds + 1;
      setCurrentBead(0);
      setCompletedRounds(newRounds);
      saveCounterState(0, newRounds);

      if (hapticsEnabled && Platform.OS !== 'web') {
        // Distinct vibration for round completion
        Vibration.vibrate([0, 100, 60, 150]);
      }

      showCrossPlatformAlert(
        'Round Completed! 🎉',
        `Hare Krishna! You have completed round ${newRounds} of your Japa.`
      );
    } else {
      setCurrentBead(nextBead);
      saveCounterState(nextBead, completedRounds);
    }
  };

  const handleUndo = () => {
    if (currentBead > 0) {
      const prev = currentBead - 1;
      setCurrentBead(prev);
      saveCounterState(prev, completedRounds);
      if (hapticsEnabled && Platform.OS !== 'web') {
        Vibration.vibrate(15);
      }
    }
  };

  const handleResetBeadOnly = () => {
    setCurrentBead(0);
    saveCounterState(0, completedRounds);
  };

  const handleSaveToDailySadhana = async () => {
    if (!user?.uid) return;
    if (completedRounds <= 0) {
      showCrossPlatformAlert('No Rounds Yet', 'Complete at least 1 round to log it in your daily sadhana card.');
      return;
    }
    setIsSyncing(true);
    try {
      const currentEntry = await sadhanaService.getDailyEntry(user.uid, todayStr);
      const existingRounds = currentEntry?.completedRounds || 0;

      if (completedRounds > existingRounds) {
        await sadhanaService.saveDailySadhana({
          userId: user.uid,
          counseleeName: user.displayName,
          date: todayStr,
          input: {
            declaredRounds: user.declaredRounds || 16,
            completedRounds,
            completionTimeStr: currentEntry?.completionTimeStr || '',
            readingMinutes: currentEntry?.readingMinutes || 0,
            hearingMinutes: currentEntry?.hearingMinutes || 0,
            sleepTimeStr: currentEntry?.sleepTimeStr || '',
            wakeUpTimeStr: currentEntry?.wakeUpTimeStr || '',
            restMinutes: currentEntry?.restMinutes || 0,
          },
          modifiedBy: user.uid,
        });
        showCrossPlatformAlert(
          'Sadhana Card Updated! 📿',
          `Successfully saved ${completedRounds} rounds into today's sadhana card.`
        );
      } else {
        showCrossPlatformAlert(
          'Already Recorded',
          `Your sadhana card already has ${existingRounds} rounds recorded for today.`
        );
      }
    } catch (e: any) {
      showCrossPlatformAlert('Sync Error', e?.message || 'Could not update daily sadhana.');
    } finally {
      setIsSyncing(false);
    }
  };

  const progressPercent = Math.round((currentBead / 108) * 100);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Digital Japa Counter"
        subtitle="Mala Mode"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Rounds Status */}
        <View style={[styles.statusBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.statusCol}>
            <Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>ROUNDS TODAY</Text>
            <View style={styles.roundsRow}>
              <Text style={[styles.roundsValue, { color: theme.thickColor }]}>{completedRounds}</Text>
              <Text style={[styles.targetValue, { color: theme.colors.textMuted }]}>/ {targetRounds}</Text>
            </View>
          </View>

          <View style={styles.dividerVertical} />

          <View style={styles.statusCol}>
            <Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>CURRENT BEAD</Text>
            <View style={styles.roundsRow}>
              <Text style={[styles.roundsValue, { color: theme.thickColor }]}>{currentBead}</Text>
              <Text style={[styles.targetValue, { color: theme.colors.textMuted }]}>/ 108</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.hapticsBtn, { backgroundColor: hapticsEnabled ? '#FEF3C7' : theme.colors.surface }]}
            onPress={() => setHapticsEnabled(!hapticsEnabled)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hapticsEnabled ? 'phone-portrait' : 'phone-portrait-outline'}
              size={18}
              color={hapticsEnabled ? '#D97706' : theme.colors.textMuted}
            />
            <Text style={[styles.hapticsText, { color: hapticsEnabled ? '#D97706' : theme.colors.textMuted }]}>
              {hapticsEnabled ? 'Vibration On' : 'Vibration Off'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: currentThemeId === 'black' ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.thickColor }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textMuted }]}>
            {progressPercent}% of current round
          </Text>
        </View>

        {/* Big Interactive Bead Button */}
        <View style={styles.beadArea}>
          <TouchableOpacity
            style={[
              styles.bigBead,
              {
                backgroundColor: currentThemeId === 'black' ? '#1E293B' : '#FFFBEB',
                borderColor: theme.thickColor,
              },
            ]}
            onPress={handleBeadTap}
            activeOpacity={0.75}
          >
            <View style={[styles.innerBead, { backgroundColor: theme.thickColor }]}>
              <Text style={styles.beadNumber}>{currentBead}</Text>
              <Text style={styles.beadLabel}>TAP TO CHANT</Text>
            </View>
            <Text style={[styles.mahaMantraHint, { color: theme.colors.textMuted }]}>
              Hare Krishna Hare Krishna Krishna Krishna Hare Hare{'\n'}
              Hare Rama Hare Rama Rama Rama Hare Hare
            </Text>
          </TouchableOpacity>
        </View>

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleUndo}
            disabled={currentBead === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo" size={16} color={theme.colors.text} />
            <Text style={[styles.btnText, { color: theme.colors.text }]}>Undo Bead</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={handleResetBeadOnly}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.text} />
            <Text style={[styles.btnText, { color: theme.colors.text }]}>Reset Bead</Text>
          </TouchableOpacity>
        </View>

        {/* Log to Daily Sadhana Card Button */}
        <TouchableOpacity
          style={[styles.saveSadhanaBtn, { backgroundColor: theme.thickColor }]}
          onPress={handleSaveToDailySadhana}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          <Text style={styles.saveSadhanaText}>
            {isSyncing ? 'Saving to Sadhana...' : `Update Daily Sadhana (${completedRounds} Rounds)`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  statusBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusCol: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  roundsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  roundsValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  targetValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  hapticsBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 3,
  },
  hapticsText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  beadArea: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  bigBead: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  innerBead: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  beadNumber: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },
  beadLabel: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  mahaMantraHint: {
    textAlign: 'center',
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
    marginTop: 12,
    maxWidth: 200,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveSadhanaBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveSadhanaText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
