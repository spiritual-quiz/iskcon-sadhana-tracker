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
  Keyboard,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { sadhanaService } from '../../services/sadhanaService';
import { evaluateDailySadhana } from '../../utils/scoringEngine';
import {
  getTodayDateStringIST,
  calculateSleepDurationMinutes,
  formatMinutesToHours,
} from '../../utils/dateUtils';
import { SadhanaEntry } from '../../types/sadhana';
import { TimeSelectorModal } from '../../components/TimeSelectorModal';
import { PastDateSelectorModal } from '../../components/PastDateSelectorModal';

export const DailySadhanaScreen = ({ navigation }: any) => {
  const { user, updateDeclaredRounds } = useAuth();
  const todayStr = getTodayDateStringIST();

  // Date selection states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Time picker modal states
  const [timePickerTarget, setTimePickerTarget] = useState<
    'japa' | 'sleep' | 'wake' | null
  >(null);

  // Edit Declared Commitment Modal state
  const [showEditDeclaredModal, setShowEditDeclaredModal] = useState<boolean>(false);
  const [newDeclaredTarget, setNewDeclaredTarget] = useState<string>(
    user?.declaredRounds ? String(user.declaredRounds) : '16'
  );

  // Form states
  const [declaredRounds, setDeclaredRounds] = useState<string>(
    user?.declaredRounds ? String(user.declaredRounds) : '16'
  );
  const [completedRounds, setCompletedRounds] = useState<string>(
    user?.declaredRounds ? String(user.declaredRounds) : '16'
  );
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
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
        setCompletionTime(entry.completionTimeStr || '06:30');
        setReadingMinutes(String(entry.readingMinutes));
        setHearingMinutes(String(entry.hearingMinutes));
        setSleepTime(entry.sleepTimeStr || '21:30');
        setWakeUpTime(entry.wakeUpTimeStr || '04:00');
        setRestMinutes(String(entry.restMinutes || 0));
      } else {
        // Reset defaults for fresh entry
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

  // Helper date generators for quick pills
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getDayBeforeYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  };

  const handleSaveDeclaredTarget = async () => {
    const val = parseInt(newDeclaredTarget, 10);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid Target', 'Please enter a valid round commitment (e.g. 16).');
      return;
    }
    try {
      await updateDeclaredRounds(val);
      setDeclaredRounds(String(val));
      setShowEditDeclaredModal(false);
      Alert.alert('Commitment Updated', `Your registered daily chanting commitment is now set to ${val} rounds.`);
    } catch (e: any) {
      Alert.alert('Update Failed', e.message || 'Could not update commitment.');
    }
  };

  // Live score calculation (out of 40)
  const numDeclared = parseInt(declaredRounds, 10) || (user?.declaredRounds || 16);
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
  const totalRestDurationMins = sleepDurationMins + numRest;

  // Format 24-hr time to friendly 12-hr for display
  const formatFriendlyTime = (t24: string) => {
    if (!t24 || !t24.includes(':')) return t24;
    const [hStr, mStr] = t24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr.padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${m} ${period}`;
  };

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
        'You are updating an existing entry for this date. Please enter a brief reason for the update.'
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
        `Your sadhana card for ${selectedDate} has been saved.\n\nScore: ${saved.dailyTotalScore}/40 (${saved.percentage}%, Grade ${saved.grade})\n• Japa: ${saved.japaMarks}/10\n• Reading: ${saved.readingMarks}/10\n• Hearing: ${saved.hearingMarks}/10\n• Sleep & Rest: ${saved.sleepMarks}/10`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save daily sadhana.');
    } finally {
      setIsSaving(false);
    }
  };

  // Presets for Time Selectors
  const japaPresets = [
    { label: '5:30 AM', time: '05:30' },
    { label: '6:00 AM', time: '06:00' },
    { label: '6:30 AM', time: '06:30' },
    { label: '7:00 AM', time: '07:00' },
    { label: '8:00 AM', time: '08:00' },
    { label: '9:30 AM', time: '09:30' },
    { label: '11:00 AM', time: '11:00' },
    { label: '1:00 PM', time: '13:00' },
  ];

  const sleepPresets = [
    { label: '9:00 PM', time: '21:00' },
    { label: '9:30 PM', time: '21:30' },
    { label: '10:00 PM', time: '22:00' },
    { label: '10:30 PM', time: '22:30' },
    { label: '11:00 PM', time: '23:00' },
  ];

  const wakePresets = [
    { label: '3:30 AM', time: '03:30' },
    { label: '4:00 AM', time: '04:00' },
    { label: '4:30 AM', time: '04:30' },
    { label: '5:00 AM', time: '05:00' },
    { label: '5:30 AM', time: '05:30' },
    { label: '6:00 AM', time: '06:00' },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Bhakti Unnati"
        subtitle={`Daily Sadhana: ${selectedDate}`}
        rightAction={{
          iconName: 'calendar',
          onPress: () => setShowDatePicker(true),
        }}
      />

      {/* Date Selection Bar */}
      <View style={styles.dateBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateBarScroll}>
          <TouchableOpacity
            style={[styles.datePill, selectedDate === todayStr && styles.datePillActive]}
            onPress={() => setSelectedDate(todayStr)}
          >
            <Ionicons
              name="today"
              size={13}
              color={selectedDate === todayStr ? '#FFFFFF' : THEME.colors.primary}
            />
            <Text style={[styles.datePillText, selectedDate === todayStr && styles.datePillTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.datePill, selectedDate === getYesterdayStr() && styles.datePillActive]}
            onPress={() => setSelectedDate(getYesterdayStr())}
          >
            <Text
              style={[
                styles.datePillText,
                selectedDate === getYesterdayStr() && styles.datePillTextActive,
              ]}
            >
              Yesterday
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.datePill,
              selectedDate === getDayBeforeYesterdayStr() && styles.datePillActive,
            ]}
            onPress={() => setSelectedDate(getDayBeforeYesterdayStr())}
          >
            <Text
              style={[
                styles.datePillText,
                selectedDate === getDayBeforeYesterdayStr() && styles.datePillTextActive,
              ]}
            >
              2 Days Ago
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.datePill,
              styles.calendarPill,
              selectedDate !== todayStr &&
                selectedDate !== getYesterdayStr() &&
                selectedDate !== getDayBeforeYesterdayStr() &&
                styles.datePillActive,
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={
                selectedDate !== todayStr &&
                selectedDate !== getYesterdayStr() &&
                selectedDate !== getDayBeforeYesterdayStr()
                  ? '#FFFFFF'
                  : THEME.colors.goldDark
              }
            />
            <Text
              style={[
                styles.datePillText,
                selectedDate !== todayStr &&
                  selectedDate !== getYesterdayStr() &&
                  selectedDate !== getDayBeforeYesterdayStr() &&
                  styles.datePillTextActive,
              ]}
            >
              {selectedDate !== todayStr &&
              selectedDate !== getYesterdayStr() &&
              selectedDate !== getDayBeforeYesterdayStr()
                ? selectedDate
                : 'Custom Day...'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Editing Past Date Indicator */}
      {selectedDate !== todayStr && (
        <View style={styles.pastDateBanner}>
          <Ionicons name="information-circle-outline" size={16} color={THEME.colors.primary} />
          <Text style={styles.pastDateBannerText}>
            Submitting for past date: <Text style={{ fontWeight: 'bold' }}>{selectedDate}</Text>
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading sadhana record...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {/* Live Score Preview Header Card */}
          <View style={styles.summaryCard}>
            <View style={styles.scoreRow}>
              <View>
                <Text style={styles.scoreLabel}>Daily Score Preview</Text>
                <Text style={styles.scoreValue}>
                  {liveEvaluation.dailyTotalScore}
                  <Text style={styles.scoreDenom}> / 40</Text>
                </Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: THEME.colors.primary }]}>
                <Text style={styles.gradeText}>Grade {liveEvaluation.grade}</Text>
                <Text style={styles.percentText}>{liveEvaluation.percentage}%</Text>
              </View>
            </View>

            {/* Quick Breakdown Pills */}
            <View style={styles.breakdownRow}>
              <View style={[styles.breakdownChip, styles.chipJapa]}>
                <Text style={styles.breakdownChipLabel}>Japa</Text>
                <Text style={[styles.breakdownChipValue, { color: '#EA580C' }]}>{liveEvaluation.japaMarks}/10</Text>
              </View>
              <View style={[styles.breakdownChip, styles.chipReading]}>
                <Text style={styles.breakdownChipLabel}>Read</Text>
                <Text style={[styles.breakdownChipValue, { color: '#15803D' }]}>{liveEvaluation.readingMarks}/10</Text>
              </View>
              <View style={[styles.breakdownChip, styles.chipHearing]}>
                <Text style={styles.breakdownChipLabel}>Hear</Text>
                <Text style={[styles.breakdownChipValue, { color: '#0284C7' }]}>{liveEvaluation.hearingMarks}/10</Text>
              </View>
              <View style={[styles.breakdownChip, styles.chipSleep]}>
                <Text style={styles.breakdownChipLabel}>Sleep</Text>
                <Text style={[styles.breakdownChipValue, { color: '#7C3AED' }]}>{liveEvaluation.sleepMarks}/10</Text>
              </View>
            </View>
          </View>

          {/* Section A: Japa Chanting */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="disc-outline" size={18} color="#EA580C" />
              </View>
              <Text style={styles.sectionTitle}>A. Japa - Chanting</Text>
              <View style={[styles.marksBadge, { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' }]}>
                <Text style={[styles.marksBadgeText, { color: '#EA580C' }]}>{liveEvaluation.japaMarks}/10 M</Text>
              </View>
            </View>

            {/* Target Commitment Banner with Edit Option */}
            <View style={styles.commitmentBanner}>
              <View style={styles.commitmentLeft}>
                <Ionicons name="ribbon" size={16} color={THEME.colors.primary} />
                <Text style={styles.commitmentLabel}>
                  Chanting Target: <Text style={styles.commitmentValue}>{numDeclared} Rounds</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editCommitmentBtn}
                onPress={() => {
                  setNewDeclaredTarget(String(numDeclared));
                  setShowEditDeclaredModal(true);
                }}
              >
                <Ionicons name="pencil" size={12} color={THEME.colors.goldDark} />
                <Text style={styles.editCommitmentBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* ONLY Completed Rounds */}
            <View style={styles.completedSection}>
              <Text style={styles.inputLabel}>Completed Rounds</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const cur = parseInt(completedRounds, 10) || 0;
                    if (cur > 0) setCompletedRounds(String(cur - 1));
                  }}
                >
                  <Ionicons name="remove" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>

                <TextInput
                  style={styles.stepperInput}
                  keyboardType="numeric"
                  value={completedRounds}
                  onChangeText={setCompletedRounds}
                  placeholder="16"
                  selectTextOnFocus
                />

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const cur = parseInt(completedRounds, 10) || 0;
                    setCompletedRounds(String(cur + 1));
                  }}
                >
                  <Ionicons name="add" size={18} color={THEME.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Quick Rounds Preset Chips */}
              <View style={styles.roundChipsRow}>
                {[16, 18, 20, 24, 32].map((r) => {
                  const isSelected = parseInt(completedRounds, 10) === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roundChip, isSelected && styles.roundChipActive]}
                      onPress={() => setCompletedRounds(String(r))}
                    >
                      <Text
                        style={[
                          styles.roundChipText,
                          isSelected && styles.roundChipTextActive,
                        ]}
                      >
                        {r} {r === numDeclared ? '★' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Completion Time Button */}
            <Text style={styles.inputLabel}>Completion Time</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setTimePickerTarget('japa')}
            >
              <Ionicons name="time" size={18} color={THEME.colors.primary} />
              <Text style={styles.timePickerButtonText}>
                {formatFriendlyTime(completionTime)} ({completionTime})
              </Text>
              <View style={styles.changeTimeBadge}>
                <Text style={styles.changeTimeBadgeText}>Select</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.hintText}>
              &lt;7 AM: 10 marks • 7-10 AM: 5 marks • 10 AM-1 PM: 3 marks • After 1 PM: 1 mark
            </Text>
          </View>

          {/* Section B: Reading */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="book-outline" size={18} color="#15803D" />
              </View>
              <Text style={styles.sectionTitle}>B. Reading Prabhupada's Books</Text>
              <View style={[styles.marksBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                <Text style={[styles.marksBadgeText, { color: '#15803D' }]}>{liveEvaluation.readingMarks}/10 M</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Reading Duration (Minutes)</Text>
            <View style={styles.minuteInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                keyboardType="numeric"
                value={readingMinutes}
                onChangeText={setReadingMinutes}
                placeholder="30"
              />
              {/* Quick duration chips */}
              <View style={styles.quickDurationRow}>
                {['15', '30', '45', '60'].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durChip, readingMinutes === mins && styles.durChipActive]}
                    onPress={() => setReadingMinutes(mins)}
                  >
                    <Text
                      style={[styles.durChipText, readingMinutes === mins && styles.durChipTextActive]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.hintText}>Target: 30 minutes for full 10 marks (proportional)</Text>
          </View>

          {/* Section C: Hearing */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="headset-outline" size={18} color="#0284C7" />
              </View>
              <Text style={styles.sectionTitle}>C. Spiritual Hearing / Lectures</Text>
              <View style={[styles.marksBadge, { backgroundColor: '#E0F2FE', borderColor: '#7DD3FC' }]}>
                <Text style={[styles.marksBadgeText, { color: '#0284C7' }]}>{liveEvaluation.hearingMarks}/10 M</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Hearing Duration (Minutes)</Text>
            <View style={styles.minuteInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                keyboardType="numeric"
                value={hearingMinutes}
                onChangeText={setHearingMinutes}
                placeholder="30"
              />
              <View style={styles.quickDurationRow}>
                {['15', '30', '45', '60'].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durChip, hearingMinutes === mins && styles.durChipActive]}
                    onPress={() => setHearingMinutes(mins)}
                  >
                    <Text
                      style={[styles.durChipText, hearingMinutes === mins && styles.durChipTextActive]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={styles.hintText}>Target: 30 minutes for full 10 marks (proportional)</Text>
          </View>

          {/* Section D: Sleep & Rest */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="moon-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.sectionTitle}>D. Sleep & Rest Routine</Text>
              <View style={[styles.marksBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                <Text style={[styles.marksBadgeText, { color: '#7C3AED' }]}>{liveEvaluation.sleepMarks}/10 M</Text>
              </View>
            </View>

            <View style={styles.inputRow}>
              {/* Bedtime Button */}
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Bedtime</Text>
                <TouchableOpacity
                  style={styles.timePickerButtonCompact}
                  onPress={() => setTimePickerTarget('sleep')}
                >
                  <Ionicons name="moon" size={14} color={THEME.colors.primary} />
                  <Text style={styles.timePickerButtonTextCompact}>
                    {formatFriendlyTime(sleepTime)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Wake Up Time Button */}
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Wake Up</Text>
                <TouchableOpacity
                  style={styles.timePickerButtonCompact}
                  onPress={() => setTimePickerTarget('wake')}
                >
                  <Ionicons name="sunny" size={14} color={THEME.colors.goldDark} />
                  <Text style={styles.timePickerButtonTextCompact}>
                    {formatFriendlyTime(wakeUpTime)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Daytime Rest */}
            <Text style={styles.inputLabel}>Daytime Rest (Minutes)</Text>
            <View style={styles.minuteInputRow}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                keyboardType="numeric"
                value={restMinutes}
                onChangeText={setRestMinutes}
                placeholder="0"
              />
              <View style={styles.quickDurationRow}>
                {['0', '15', '30', '45', '60'].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durChip, restMinutes === mins && styles.durChipActive]}
                    onPress={() => setRestMinutes(mins)}
                  >
                    <Text
                      style={[styles.durChipText, restMinutes === mins && styles.durChipTextActive]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rest Summary Banner */}
            <View style={styles.restSummaryBox}>
              <View style={styles.restSummaryHeader}>
                <Ionicons name="bed-outline" size={16} color={THEME.colors.primary} />
                <Text style={styles.restSummaryText}>
                  Total Rest: <Text style={{ fontWeight: 'bold' }}>{formatMinutesToHours(totalRestDurationMins)}</Text>
                  {'  '}(Night: {formatMinutesToHours(sleepDurationMins)} + Day: {numRest}m)
                </Text>
              </View>
              <Text style={styles.restMarksNote}>
                Marks Awarded: <Text style={{ fontWeight: 'bold', color: THEME.colors.primary }}>{liveEvaluation.sleepMarks}/10</Text>
                {'  '}(≤7h: 10M • 8h: 8M • &gt;8 to &lt;10h: 5M • ≥10h: 0M)
              </Text>
            </View>
          </View>

          {/* Audit Reason if Editing Existing */}
          {existingEntry && (
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pencil-outline" size={18} color={THEME.colors.warning} />
                <Text style={styles.sectionTitle}>Correction / Update Reason</Text>
              </View>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                value={correctionReason}
                onChangeText={setCorrectionReason}
                placeholder="Briefly state reason for updating this record..."
              />
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {existingEntry ? 'Update Sadhana Card' : 'Submit Daily Sadhana'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Date Picker Modal */}
      <PastDateSelectorModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Time Picker Modal */}
      <TimeSelectorModal
        visible={timePickerTarget !== null}
        title={
          timePickerTarget === 'japa'
            ? 'Select Japa Completion Time'
            : timePickerTarget === 'sleep'
            ? 'Select Bedtime (Night Sleep)'
            : 'Select Wake-up Time (Morning)'
        }
        initialTime={
          timePickerTarget === 'japa'
            ? completionTime
            : timePickerTarget === 'sleep'
            ? sleepTime
            : wakeUpTime
        }
        presets={
          timePickerTarget === 'japa'
            ? japaPresets
            : timePickerTarget === 'sleep'
            ? sleepPresets
            : wakePresets
        }
        onSelectTime={(newTime24) => {
          if (timePickerTarget === 'japa') setCompletionTime(newTime24);
          else if (timePickerTarget === 'sleep') setSleepTime(newTime24);
          else if (timePickerTarget === 'wake') setWakeUpTime(newTime24);
        }}
        onClose={() => setTimePickerTarget(null)}
      />

      {/* Edit Declared Commitment Target Modal */}
      <Modal
        visible={showEditDeclaredModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditDeclaredModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEditDeclaredModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="ribbon" size={20} color={THEME.colors.gold} />
                    <Text style={styles.modalTitle}>Daily Chanting Target</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowEditDeclaredModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalDescription}>
                  This is your daily commitment target set during registration. You can adjust your target commitment here:
                </Text>

                {/* Quick Target Chips */}
                <View style={styles.targetChipsGrid}>
                  {[16, 18, 20, 24, 32, 64].map((r) => {
                    const isSelected = parseInt(newDeclaredTarget, 10) === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.targetChip,
                          isSelected && styles.targetChipActive,
                        ]}
                        onPress={() => setNewDeclaredTarget(String(r))}
                      >
                        <Text
                          style={[
                            styles.targetChipText,
                            isSelected && styles.targetChipTextActive,
                          ]}
                        >
                          {r} Rounds
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Number Stepper */}
                <View style={styles.customTargetRow}>
                  <Text style={styles.customTargetLabel}>Target Commitment:</Text>
                  <View style={styles.modalStepperRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        const cur = parseInt(newDeclaredTarget, 10) || 16;
                        if (cur > 1) setNewDeclaredTarget(String(cur - 1));
                      }}
                    >
                      <Ionicons name="remove" size={18} color={THEME.colors.primary} />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.modalStepperInput}
                      keyboardType="numeric"
                      value={newDeclaredTarget}
                      onChangeText={setNewDeclaredTarget}
                      placeholder="16"
                      selectTextOnFocus
                    />

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        const cur = parseInt(newDeclaredTarget, 10) || 16;
                        setNewDeclaredTarget(String(cur + 1));
                      }}
                    >
                      <Ionicons name="add" size={18} color={THEME.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSaveDeclaredTarget}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.modalSaveButtonText}>Save New Target</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  dateBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    paddingVertical: 6,
  },
  dateBarScroll: {
    paddingHorizontal: 10,
    gap: 8,
    flexDirection: 'row',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  datePillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryDark,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  datePillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  calendarPill: {
    borderColor: THEME.colors.goldLight,
  },
  pastDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pastDateBannerText: {
    fontSize: 12,
    color: THEME.colors.primaryDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 30,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  scoreDenom: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: 'normal',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  gradeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  percentText: {
    color: THEME.colors.goldLight,
    fontSize: 11,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  breakdownChip: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipJapa: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },
  chipReading: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  chipHearing: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  chipSleep: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  breakdownChipLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  breakdownChipValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginTop: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  marksBadge: {
    backgroundColor: THEME.colors.primaryUltraLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(194, 65, 12, 0.2)',
  },
  marksBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    color: THEME.colors.text,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 4,
  },
  timePickerButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginLeft: 8,
  },
  timePickerButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 9,
    gap: 4,
  },
  timePickerButtonTextCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  changeTimeBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeTimeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  minuteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  quickDurationRow: {
    flexDirection: 'row',
    gap: 4,
  },
  durChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryDark,
  },
  durChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  durChipTextActive: {
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  restSummaryBox: {
    backgroundColor: THEME.colors.primaryUltraLight,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(194, 65, 12, 0.2)',
  },
  restSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  restSummaryText: {
    fontSize: 11.5,
    color: THEME.colors.primary,
  },
  restMarksNote: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  commitmentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  commitmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commitmentLabel: {
    fontSize: 12,
    color: THEME.colors.text,
  },
  commitmentValue: {
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  editCommitmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  editCommitmentBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.goldDark,
  },
  completedSection: {
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  roundChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  roundChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roundChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryDark,
  },
  roundChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  roundChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  targetChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  targetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  targetChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryDark,
  },
  targetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  targetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  customTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customTargetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  modalStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStepperInput: {
    width: 50,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  modalSaveButton: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  modalSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
