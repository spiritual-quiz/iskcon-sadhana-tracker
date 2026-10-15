import React from 'react';
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
import { getTodayDateStringIST } from '../utils/dateUtils';

interface PastDateSelectorModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

export const PastDateSelectorModal: React.FC<PastDateSelectorModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const todayStr = getTodayDateStringIST();

  // Generate the past 30 days
  const pastDays: { dateStr: string; label: string; subLabel: string; isToday: boolean }[] = [];
  const todayObj = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(todayObj);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    let label = '';
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Yesterday';
    else if (i === 2) label = '2 Days Ago';
    else {
      label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    const subLabel = d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    pastDays.push({
      dateStr,
      label,
      subLabel,
      isToday: i === 0,
    });
  }

  const handleSelect = (dStr: string) => {
    onSelectDate(dStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Ionicons name="calendar-outline" size={20} color={THEME.colors.gold} />
                  <Text style={styles.headerTitle}>Select Sadhana Date</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                You can submit today’s sadhana or backfill previous days:
              </Text>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {pastDays.map((item) => {
                  const isSelected = selectedDate === item.dateStr;
                  return (
                    <TouchableOpacity
                      key={item.dateStr}
                      style={[styles.dateItem, isSelected && styles.dateItemActive]}
                      onPress={() => handleSelect(item.dateStr)}
                    >
                      <View style={styles.dateInfo}>
                        <View style={styles.labelRow}>
                          <Text style={[styles.mainLabel, isSelected && styles.mainLabelActive]}>
                            {item.label}
                          </Text>
                          {item.isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>Current</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.subDate, isSelected && styles.subDateActive]}>
                          {item.subLabel} ({item.dateStr})
                        </Text>
                      </View>

                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                        size={20}
                        color={isSelected ? THEME.colors.gold : THEME.colors.textLight}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 12,
  },
  list: {
    maxHeight: 380,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  dateItemActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryDark,
  },
  dateInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  mainLabelActive: {
    color: '#FFFFFF',
  },
  todayBadge: {
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  subDate: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  subDateActive: {
    color: THEME.colors.goldLight,
  },
});
