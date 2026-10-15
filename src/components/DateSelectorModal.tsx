import React, { useState, useEffect, useRef } from 'react';
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
import {
  MONTH_NAMES_SHORT,
  parseDateComponents,
  calculateAge,
  calculateConnectionDuration,
} from '../utils/dateUtils';

interface DateSelectorModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  initialDate?: string; // either '1988-05-10' or '10-May-1988'
  minYear?: number;
  maxYear?: number;
  mode?: 'birth' | 'association' | 'general';
  onSelectDate: (displayDate: string, isoDate: string) => void;
  onClose: () => void;
}

export const DateSelectorModal: React.FC<DateSelectorModalProps> = ({
  visible,
  title,
  subtitle,
  initialDate,
  minYear = 1940,
  maxYear = new Date().getFullYear(),
  mode = 'general',
  onSelectDate,
  onClose,
}) => {
  // Current selections
  const [selectedDay, setSelectedDay] = useState<number>(10);
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // 1-indexed: 5 = May
  const [selectedYear, setSelectedYear] = useState<number>(1988);

  const yearScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);

  // Parse initialDate when opened
  useEffect(() => {
    if (visible) {
      if (initialDate) {
        const parsed = parseDateComponents(initialDate);
        if (parsed) {
          setSelectedDay(parsed.day);
          setSelectedMonth(parsed.month);
          setSelectedYear(parsed.year);
          return;
        }
      }
      // Defaults if no initial date
      if (mode === 'birth') {
        setSelectedDay(10);
        setSelectedMonth(5); // May
        setSelectedYear(1990);
      } else if (mode === 'association') {
        setSelectedDay(15);
        setSelectedMonth(1); // Jan
        setSelectedYear(2018);
      } else {
        const now = new Date();
        setSelectedDay(now.getDate());
        setSelectedMonth(now.getMonth() + 1);
        setSelectedYear(now.getFullYear());
      }
    }
  }, [visible, initialDate, mode]);

  // Days in selected month & year (accounting for leap years)
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  // Clamp day if month change causes overflow (e.g. Feb 31 -> Feb 28)
  useEffect(() => {
    if (selectedDay > daysInCurrentMonth) {
      setSelectedDay(daysInCurrentMonth);
    }
  }, [daysInCurrentMonth, selectedDay]);

  // Array of years from minYear to maxYear
  const yearsArray: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearsArray.push(y);
  }

  // Quick decade options
  const decades: number[] = [];
  for (let dec = Math.floor(minYear / 10) * 10; dec <= maxYear; dec += 10) {
    decades.push(dec);
  }

  const handleJumpToDecade = (decade: number) => {
    const targetYear = Math.min(maxYear, Math.max(minYear, decade + 5));
    setSelectedYear(targetYear);
    // Find index in yearsArray
    const index = yearsArray.indexOf(targetYear);
    if (index >= 0 && yearScrollRef.current) {
      yearScrollRef.current.scrollTo({ y: index * 36, animated: true });
    }
  };

  // Formatted strings
  const formattedDay = String(selectedDay).padStart(2, '0');
  const formattedMonth = MONTH_NAMES_SHORT[selectedMonth - 1];
  const displayDateStr = `${formattedDay}-${formattedMonth}-${selectedYear}`;
  const isoDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${formattedDay}`;

  // Live contextual calculation
  const calculatedAge = mode === 'birth' ? calculateAge(isoDateStr) : null;
  const calculatedAssociation =
    mode === 'association' ? calculateConnectionDuration(isoDateStr) : null;

  const handleConfirm = () => {
    onSelectDate(displayDateStr, isoDateStr);
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
                  <Ionicons name="calendar" size={20} color={THEME.colors.gold} />
                  <View>
                    <Text style={styles.sheetTitle}>{title}</Text>
                    {subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Selected Date Live Display Box */}
              <View style={styles.displayCard}>
                <Text style={styles.displaySub}>Selected Date</Text>
                <Text style={styles.displayDate}>{displayDateStr}</Text>
                {calculatedAge !== null && (
                  <View style={styles.liveMetaBadge}>
                    <Ionicons name="gift-outline" size={13} color={THEME.colors.primaryDark} />
                    <Text style={styles.liveMetaText}>Current Age: {calculatedAge} years</Text>
                  </View>
                )}
                {calculatedAssociation && (
                  <View style={styles.liveMetaBadge}>
                    <Ionicons name="heart-outline" size={13} color={THEME.colors.primaryDark} />
                    <Text style={styles.liveMetaText}>
                      Devotional Association: {calculatedAssociation.text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Quick Decade Jump Bar */}
              <View style={styles.decadeBar}>
                <Text style={styles.decadeLabel}>Jump Decade:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.decadeList}
                >
                  {decades.map((dec) => {
                    const isCurrentDecade =
                      selectedYear >= dec && selectedYear < dec + 10;
                    return (
                      <TouchableOpacity
                        key={dec}
                        style={[
                          styles.decadeChip,
                          isCurrentDecade && styles.decadeChipActive,
                        ]}
                        onPress={() => handleJumpToDecade(dec)}
                      >
                        <Text
                          style={[
                            styles.decadeChipText,
                            isCurrentDecade && styles.decadeChipTextActive,
                          ]}
                        >
                          {dec}s
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 3 Scrolling Columns (Date, Month, Year) */}
              <View style={styles.columnsContainer}>
                {/* Column 1: Date (Day) */}
                <View style={styles.column}>
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnHeaderText}>Date</Text>
                  </View>
                  <ScrollView
                    ref={dayScrollRef}
                    style={styles.scrollColumn}
                    showsVerticalScrollIndicator={false}
                  >
                    {daysArray.map((day) => {
                      const isSelected = selectedDay === day;
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[styles.pill, isSelected && styles.pillActive]}
                          onPress={() => setSelectedDay(day)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              isSelected && styles.pillTextActive,
                            ]}
                          >
                            {String(day).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Column 2: Month */}
                <View style={styles.column}>
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnHeaderText}>Month</Text>
                  </View>
                  <ScrollView
                    ref={monthScrollRef}
                    style={styles.scrollColumn}
                    showsVerticalScrollIndicator={false}
                  >
                    {MONTH_NAMES_SHORT.map((monthName, idx) => {
                      const monthNum = idx + 1;
                      const isSelected = selectedMonth === monthNum;
                      return (
                        <TouchableOpacity
                          key={monthName}
                          style={[styles.pill, isSelected && styles.pillActive]}
                          onPress={() => setSelectedMonth(monthNum)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              isSelected && styles.pillTextActive,
                            ]}
                          >
                            {monthName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Column 3: Year */}
                <View style={styles.column}>
                  <View style={styles.columnHeader}>
                    <Text style={styles.columnHeaderText}>Year</Text>
                  </View>
                  <ScrollView
                    ref={yearScrollRef}
                    style={styles.scrollColumn}
                    showsVerticalScrollIndicator={false}
                  >
                    {yearsArray.map((year) => {
                      const isSelected = selectedYear === year;
                      return (
                        <TouchableOpacity
                          key={year}
                          style={[styles.pill, isSelected && styles.pillActive]}
                          onPress={() => setSelectedYear(year)}
                        >
                          <Text
                            style={[
                              styles.pillText,
                              isSelected && styles.pillTextActive,
                            ]}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              {/* Confirm / Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    Confirm {displayDateStr}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
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
  sheetSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  displayCard: {
    backgroundColor: THEME.colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  displaySub: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  displayDate: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  liveMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  liveMetaText: {
    fontSize: 11,
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  decadeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  decadeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginRight: 6,
  },
  decadeList: {
    flexDirection: 'row',
    gap: 5,
  },
  decadeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  decadeChipActive: {
    backgroundColor: THEME.colors.goldDark,
  },
  decadeChipText: {
    fontSize: 11,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  decadeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: 8,
    height: 190,
    marginBottom: 14,
  },
  column: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  columnHeader: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 5,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  columnHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    textTransform: 'uppercase',
  },
  scrollColumn: {
    padding: 4,
  },
  pill: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
