import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { ScoreCard } from '../../components/ScoreCard';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { evaluateDailySadhana } from '../../utils/scoringEngine';
import {
  getTodayDateStringIST,
  getCurrentTimeIST,
  calculateSleepDurationMinutes,
  formatMinutesToHours,
} from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';

export const DailySadhanaScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const todayStr = getTodayDateStringIST();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [declaredRounds, setDeclaredRounds] = useState<string>(
    user?.declaredRounds ? String(user.declaredRounds) : '16'
  );
  const [completedRounds, setCompletedRounds] = useState<string>('16');
  const [completionTime, setCompletionTime] = useState<string>('06:30');

  const [readingMinutes, setReadingMinutes] = useState<string>('30');
  const [hearingMinutes, setHearingMinutes] = useState<string>('30');

  const [sleepTime, setSleepTime] = useState<string>('21:30');
  const [wakeUpTime, setWakeUpTime] = useState<string>('04:00');
  const [restMinutes, setRestMinutes] = useState<string>('0');

  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [existingEntry, setExistingEntry] = useState<SadhanaEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load entry for selected date
  useEffect(() => {
    loadDateEntry(selectedDate);
  }, [selectedDate, user?.uid]);

  const loadDateEntry = async (date: string) => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const entry = await sadhanaService.getDailyEntry(user.uid, date);
      setExistingEntry(entry);
      if (entry) {
        setDeclaredRounds(String(entry.declaredRounds));
        setCompletedRounds(String(entry.completedRounds));
        setCompletionTime(entry.completionTimeStr || '');
        setReadingMinutes(String(entry.readingMinutes));
        setHearingMinutes(String(entry.hearingMinutes));
        setSleepTime(entry.sleepTimeStr || '');
        setWakeUpTime(entry.wakeUpTimeStr || '');
        setRestMinutes(String(entry.restMinutes || 0));
      } else {
        // Reset to default for new entry
        setDeclaredRounds(user.declaredRounds ? String(user.declaredRounds) : '16');
        setCompletedRounds(user.declaredRounds ? String(user.declaredRounds) : '16');
        setCompletionTime('06:30');
        setReadingMinutes('30');
        setHearingMinutes('30');
        setSleepTime('21:30');
        setWakeUpTime('04:00');
        setRestMinutes('0');
        setCorrectionReason('');
      }
    } catch (e) {
      console.warn('Error loading daily entry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Live score calculation
  const numDeclared = parseInt(declaredRounds, 10) || 16;
  const numCompleted = parseInt(completedRounds, 10) || 0;
  const numReading = parseInt(readingMinutes, 10) || 0;
  const numHearing = parseInt(hearingMinutes, 10) || 0;
  const numRest = parseInt(restMinutes, 10) || 0;

  const liveEvaluation = evaluateDailySadhana({
    declaredRounds: numDeclared,
    completedRounds: numCompleted,
    completionTimeStr: completionTime.trim(),
    readingMinutes: numReading,
    hearingMinutes: numHearing,
    sleepTimeStr: sleepTime.trim(),
    wakeUpTimeStr: wakeUpTime.trim(),
    restMinutes: numRest,
  });

  const sleepDurationMins = calculateSleepDurationMinutes(sleepTime.trim(), wakeUpTime.trim());

  const handleSave = async () => {
    if (!user?.uid) return;

    if (numDeclared <= 0) {
      Alert.alert('Invalid Rounds', 'Declared commitment must be at least 1 round.');
      return;
    }

    if (numCompleted < 0 || numReading < 0 || numHearing < 0) {
      Alert.alert('Invalid Input', 'Values cannot be negative.');
      return;
    }

    if (existingEntry && !correctionReason.trim()) {
      Alert.alert(
        'Correction Note Required',
        'You are updating an existing entry. Please enter a brief note explaining the update.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const saved = await sadhanaService.saveDailySadhana({
        userId: user.uid,
        counseleeName: user.displayName,
        date: selectedDate,
        input: {
          declaredRounds: numDeclared,
          completedRounds: numCompleted,
          completionTimeStr: completionTime.trim(),
          readingMinutes: numReading,
          hearingMinutes: numHearing,
          sleepTimeStr: sleepTime.trim(),
          wakeUpTimeStr: wakeUpTime.trim(),
          restMinutes: numRest,
        },
        modifiedBy: user.uid,
        correctionReason: correctionReason.trim() || undefined,
      });

      setExistingEntry(saved);
      Alert.alert(
        'Sadhana Submitted!',
        `Your sadhana card for ${selectedDate} has been saved.\nScore: ${saved.dailyTotalScore}/30 (${saved.percentage}%, Grade ${saved.grade})`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save daily sadhana.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="My Daily Sadhana"
        subtitle={`Asia/Kolkata: ${selectedDate}`}
        rightAction={{
          iconName: 'calendar-outline',
          onPress: () => {
            Alert.alert(
              'Select Entry Date',
              `Current Date: ${selectedDate}\nTo record for today, keep ${todayStr}.`
            );
          },
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading sadhana record...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Live Calculated Score Card */}
          <ScoreCard
            title="Live Daily Score Preview"
            score={liveEvaluation.dailyTotalScore}
            maxScore={30}
            percentage={liveEvaluation.percentage}
            grade={liveEvaluation.grade}
            breakdown={{
              japa: liveEvaluation.japaMarks,
              reading: liveEvaluation.readingMarks,
              hearing: liveEvaluation.hearingMarks,
            }}
          />

          {existingEntry && (
            <View style={styles.existingNotice}>
              <Ionicons name="information-circle-outline" size={18} color={THEME.colors.primary} />
              <Text style={styles.existingNoticeText}>
                Entry already submitted for this date. Updating will record an audit entry.
              </Text>
            </View>
          )}

          {/* Section A: Japa Chanting */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="radio-button-on" size={20} color={THEME.colors.gold} />
              <Text style={styles.sectionTitle}>A. Japa — Chanting (Max 10 Marks)</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Declared Rounds</Text>
                <TextInput
                  style={styles.input}
                  value={declaredRounds}
                  onChangeText={setDeclaredRounds}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Completed Rounds</Text>
                <TextInput
                  style={styles.input}
                  value={completedRounds}
                  onChangeText={setCompletedRounds}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Completion Time (HH:mm, 24-hr IST)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 06:45"
                value={completionTime}
                onChangeText={setCompletionTime}
              />
            </View>

            <View style={styles.bracketGuide}>
              <Text style={styles.bracketGuideTitle}>Japa Time Brackets (Completed commitment):</Text>
              <Text style={styles.bracketItem}>• Before 7:00 AM → 10 Marks</Text>
              <Text style={styles.bracketItem}>• 7:00 AM to 9:59 AM → 5 Marks</Text>
              <Text style={styles.bracketItem}>• 10:00 AM to 12:59 PM → 3 Marks</Text>
              <Text style={styles.bracketItem}>• 1:00 PM or later → 1 Mark</Text>
              <Text style={styles.bracketItem}>• Incomplete commitment → 0 Marks</Text>
            </View>

            <Text style={styles.japaMarksResult}>
              Awarded: <Text style={styles.highlightText}>{liveEvaluation.japaMarks} / 10 marks</Text>
            </Text>
          </View>

          {/* Section B: Reading */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book-outline" size={20} color={THEME.colors.primary} />
              <Text style={styles.sectionTitle}>B. Reading — Srila Prabhupada's Books</Text>
            </View>
            <Text style={styles.helperText}>
              Target: 30 minutes for full 10 marks (proportionate marks for less).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minutes Read Today</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                value={readingMinutes}
                onChangeText={setReadingMinutes}
                keyboardType="number-pad"
              />
            </View>

            <Text style={styles.japaMarksResult}>
              Awarded: <Text style={styles.highlightText}>{liveEvaluation.readingMarks} / 10 marks</Text>
            </Text>
          </View>

          {/* Section C: Hearing */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="headset-outline" size={20} color={THEME.colors.primary} />
              <Text style={styles.sectionTitle}>C. Hearing — Classes & Lectures</Text>
            </View>
            <Text style={styles.helperText}>
              Target: 30 minutes for full 10 marks (proportionate marks for less).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minutes Heard Today</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                value={hearingMinutes}
                onChangeText={setHearingMinutes}
                keyboardType="number-pad"
              />
            </View>

            <Text style={styles.japaMarksResult}>
              Awarded: <Text style={styles.highlightText}>{liveEvaluation.hearingMarks} / 10 marks</Text>
            </Text>
          </View>

          {/* Section D: Sleep, Wake-up & Daytime Rest */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="moon-outline" size={20} color={THEME.colors.textMuted} />
              <Text style={styles.sectionTitle}>D. Sleep & Rest (Informational)</Text>
            </View>
            <Text style={styles.helperText}>
              Records healthy rest habits. Has zero impact on your sadhana score.
            </Text>

            <View style={styles.inputRow}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Sleep Time (HH:mm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="21:30"
                  value={sleepTime}
                  onChangeText={setSleepTime}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Wake-up (HH:mm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="04:00"
                  value={wakeUpTime}
                  onChangeText={setWakeUpTime}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Daytime Rest (Minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={restMinutes}
                onChangeText={setRestMinutes}
                keyboardType="number-pad"
              />
            </View>

            {sleepDurationMins > 0 && (
              <Text style={styles.sleepDurationText}>
                Calculated Overnight Rest: {formatMinutesToHours(sleepDurationMins)}
              </Text>
            )}
          </View>

          {/* Section E: Audit Correction Note if existing */}
          {existingEntry && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Correction Note (Required for updates)</Text>
              <TextInput
                style={[styles.input, styles.reasonInput]}
                placeholder="e.g. Corrected japa completion time..."
                value={correctionReason}
                onChangeText={setCorrectionReason}
                multiline
              />
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color={THEME.colors.textInverse} />
                <Text style={styles.saveButtonText}>
                  {existingEntry ? 'Update Sadhana Record' : 'Submit Daily Sadhana'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: THEME.spacing.sm,
    color: THEME.colors.textMuted,
  },
  scrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  existingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryUltraLight,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
  },
  existingNoticeText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primary,
    marginLeft: 6,
    flex: 1,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginLeft: 6,
  },
  helperText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputCol: {
    flex: 1,
    marginRight: 6,
  },
  inputGroup: {
    marginVertical: 6,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: THEME.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    height: 46,
    paddingHorizontal: THEME.spacing.md,
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.text,
  },
  bracketGuide: {
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    marginVertical: 8,
  },
  bracketGuideTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 2,
  },
  bracketItem: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },
  japaMarksResult: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  highlightText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  sleepDurationText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.primary,
    fontWeight: 'bold',
    marginTop: 6,
  },
  reasonInput: {
    height: 60,
    paddingTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    height: 52,
    borderRadius: THEME.borderRadius.md,
    marginTop: THEME.spacing.sm,
    ...THEME.shadows.medium,
  },
  saveButtonText: {
    color: THEME.colors.textInverse,
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
