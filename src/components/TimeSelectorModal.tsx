import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface PresetOption {
  label: string;
  time: string; // HH:mm (24-hour)
}

interface TimeSelectorModalProps {
  visible: boolean;
  title: string;
  initialTime?: string; // HH:mm in 24-hr
  presets?: PresetOption[];
  onSelectTime: (time24: string) => void;
  onClose: () => void;
}

const HOURS_12 = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const TimeSelectorModal: React.FC<TimeSelectorModalProps> = ({
  visible,
  title,
  initialTime = '06:30',
  presets = [],
  onSelectTime,
  onClose,
}) => {
  const [selectedHour, setSelectedHour] = useState<string>('06');
  const [selectedMinute, setSelectedMinute] = useState<string>('30');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Parse 24-hour initialTime on open
  useEffect(() => {
    if (initialTime && initialTime.includes(':')) {
      const [hStr, mStr] = initialTime.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);

      const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;

      setSelectedHour(String(h12).padStart(2, '0'));
      // Match closest 5-minute interval
      const roundedM = Math.round(m / 5) * 5;
      const finalM = roundedM >= 60 ? 55 : roundedM;
      setSelectedMinute(String(finalM).padStart(2, '0'));
      setSelectedPeriod(period);
    }
  }, [initialTime, visible]);

  const handleApplyPreset = (presetTime: string) => {
    onSelectTime(presetTime);
    onClose();
  };

  const handleConfirm = () => {
    let h = parseInt(selectedHour, 10);
    if (selectedPeriod === 'PM' && h < 12) h += 12;
    if (selectedPeriod === 'AM' && h === 12) h = 0;

    const formatted24 = `${String(h).padStart(2, '0')}:${selectedMinute}`;
    onSelectTime(formatted24);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.titleRow}>
                  <Ionicons name="time-outline" size={20} color={THEME.colors.gold} />
                  <Text style={styles.sheetTitle}>{title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Selected Time Display Pill */}
              <View style={styles.displayCard}>
                <Text style={styles.displaySub}>Selected Time</Text>
                <Text style={styles.displayTime}>
                  {selectedHour}:{selectedMinute} {selectedPeriod}
                </Text>
              </View>

              {/* Quick Preset Chips */}
              {presets.length > 0 && (
                <View style={styles.presetSection}>
                  <Text style={styles.sectionLabel}>Quick Presets</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetsList}
                  >
                    {presets.map((p, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.presetChip}
                        onPress={() => handleApplyPreset(p.time)}
                      >
                        <Text style={styles.presetChipText}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Scrolling / Clickable Selectors */}
              <View style={styles.selectorsRow}>
                {/* Hours Column */}
                <View style={styles.columnWrapper}>
                  <Text style={styles.columnLabel}>Hour</Text>
                  <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                    {HOURS_12.map((h) => {
                      const isSelected = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[styles.itemPill, isSelected && styles.itemPillActive]}
                          onPress={() => setSelectedHour(h)}
                        >
                          <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Minute Column */}
                <View style={styles.columnWrapper}>
                  <Text style={styles.columnLabel}>Minute</Text>
                  <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                    {MINUTES.map((m) => {
                      const isSelected = selectedMinute === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.itemPill, isSelected && styles.itemPillActive]}
                          onPress={() => setSelectedMinute(m)}
                        >
                          <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>
                            {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* AM / PM Toggle */}
                <View style={styles.periodWrapper}>
                  <Text style={styles.columnLabel}>Period</Text>
                  <View style={styles.periodCol}>
                    <TouchableOpacity
                      style={[styles.periodBtn, selectedPeriod === 'AM' && styles.periodBtnActive]}
                      onPress={() => setSelectedPeriod('AM')}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          selectedPeriod === 'AM' && styles.periodTextActive,
                        ]}
                      >
                        AM
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.periodBtn, selectedPeriod === 'PM' && styles.periodBtnActive]}
                      onPress={() => setSelectedPeriod('PM')}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          selectedPeriod === 'PM' && styles.periodTextActive,
                        ]}
                      >
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  displayCard: {
    backgroundColor: THEME.colors.primaryUltraLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(27, 77, 62, 0.15)',
  },
  displaySub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  displayTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginTop: 2,
  },
  presetSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  presetsList: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: THEME.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  selectorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 160,
    marginBottom: 16,
  },
  columnWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  periodWrapper: {
    width: 70,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  scrollList: {
    width: '90%',
  },
  itemPill: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    backgroundColor: '#F8F9FA',
  },
  itemPillActive: {
    backgroundColor: THEME.colors.primary,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  itemTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  periodCol: {
    gap: 8,
    width: '100%',
    paddingTop: 8,
  },
  periodBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  periodBtnActive: {
    backgroundColor: THEME.colors.goldDark,
    borderColor: THEME.colors.gold,
  },
  periodText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  confirmBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
