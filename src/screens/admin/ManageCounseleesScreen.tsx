import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { FollowUpModal } from '../../components/FollowUpModal';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile, UserStatus } from '../../types/auth';
import { calculateAge, calculateConnectionDuration } from '../../utils/dateUtils';
import { authService } from '../../services/authService';

export const ManageCounseleesScreen = ({ navigation }: any) => {
  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'disabled'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Follow-up modal
  const [contactDevotee, setContactDevotee] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadCounselees();
  }, []);

  const loadCounselees = async () => {
    try {
      const data = await authService.getAllCounselees();
      setCounselees(data);
    } catch (e) {
      console.warn('Error loading counselees:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDisabled = async (user: UserProfile) => {
    const newStatus: UserStatus = user.status === 'disabled' ? 'approved' : 'disabled';
    Alert.alert(
      newStatus === 'disabled' ? 'Disable Counselee?' : 'Enable Counselee?',
      `Are you sure you want to mark ${user.displayName} as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await authService.updateCounseleeStatus(user.uid, newStatus);
              loadCounselees();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCounselee = async (user: UserProfile) => {
    Alert.alert(
      'Delete Counselee Permanently?',
      `Are you sure you want to permanently delete devotee "${user.displayName}"?\n\nThis will completely purge all their daily sadhana logs, attendance records, and devotee profile from the system. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.deleteCounselee(user.uid);
              Alert.alert('Devotee Deleted', `${user.displayName} has been permanently deleted.`);
              loadCounselees();
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Could not delete devotee.');
            }
          },
        },
      ]
    );
  };

  const handleToggleReminders = async (user: UserProfile) => {
    const currentEnabled = user.sadhanaRemindersEnabled !== false;
    const newEnabled = !currentEnabled;
    Alert.alert(
      newEnabled ? 'Activate Reminders?' : 'Switch Off Reminders?',
      newEnabled
        ? `Re-activate daily 6 PM & 9 PM sadhana reminders for ${user.displayName}?`
        : `Switch off daily 6 PM & 9 PM sadhana reminders for ${user.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await authService.setCounseleeReminders(user.uid, newEnabled);
              loadCounselees();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const filtered = counselees.filter((c) => {
    const matchesSearch =
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Manage Counselees"
        subtitle="Devotee Profiles & Spiritual Records"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by devotee name, phone, or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          {(['all', 'approved', 'disabled'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading counselees...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No counselees found matching your search.</Text>
            </View>
          ) : (
            filtered.map((devotee) => {
              const age = calculateAge(devotee.dateOfBirth);
              const connection = calculateConnectionDuration(devotee.iskconConnectDate);

              return (
                <View key={devotee.uid} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.name}>{devotee.displayName}</Text>
                      <Text style={styles.email}>{devotee.email}</Text>
                    </View>
                    <StatusBadge type="status" value={devotee.status} />
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Mobile</Text>
                      <Text style={styles.detailValue}>{devotee.phoneNumber || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Chanting Rounds</Text>
                      <Text style={styles.detailValueBold}>{devotee.declaredRounds || 16} Rounds</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Age</Text>
                      <Text style={styles.detailValue}>{age > 0 ? `${age} yrs` : 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>ISKCON Duration</Text>
                      <Text style={styles.detailValue}>{connection.text}</Text>
                    </View>
                  </View>

                  {/* Daily Reminders Status & Turn-Off Request Indicator */}
                  <View style={styles.remindersCardRow}>
                    <View style={styles.remindersInfoBlock}>
                      <Ionicons
                        name={devotee.sadhanaRemindersEnabled !== false ? 'alarm' : 'alarm-outline'}
                        size={15}
                        color={devotee.sadhanaRemindersEnabled !== false ? '#15803D' : '#6B7280'}
                      />
                      <Text style={styles.remindersLabel}>
                        Daily Reminders (6PM & 9PM):{' '}
                        <Text
                          style={{
                            fontWeight: 'bold',
                            color: devotee.sadhanaRemindersEnabled !== false ? '#15803D' : '#6B7280',
                          }}
                        >
                          {devotee.sadhanaRemindersEnabled !== false ? 'Active' : 'Off'}
                        </Text>
                      </Text>
                    </View>
                    {devotee.reminderOptOutRequested && (
                      <View style={styles.optOutReqBadge}>
                        <Ionicons name="warning-outline" size={14} color="#B45309" />
                        <Text style={styles.optOutReqText}>
                          Student Requested to Switch Off Reminders
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={
                        devotee.sadhanaRemindersEnabled !== false
                          ? styles.actionBtnReminderOff
                          : styles.actionBtnReminderOn
                      }
                      onPress={() => handleToggleReminders(devotee)}
                    >
                      <Ionicons
                        name={devotee.sadhanaRemindersEnabled !== false ? 'notifications-off-outline' : 'notifications-outline'}
                        size={14}
                        color={devotee.sadhanaRemindersEnabled !== false ? '#B91C1C' : '#15803D'}
                      />
                      <Text
                        style={
                          devotee.sadhanaRemindersEnabled !== false
                            ? styles.actionBtnReminderOffText
                            : styles.actionBtnReminderOnText
                        }
                      >
                        {devotee.sadhanaRemindersEnabled !== false ? 'Switch Off Reminders' : 'Activate Reminders'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() => handleToggleDisabled(devotee)}
                    >
                      <Text style={styles.actionBtnSecondaryText}>
                        {devotee.status === 'disabled' ? 'Enable' : 'Disable'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnDelete}
                      onPress={() => handleDeleteCounselee(devotee)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#DC2626" />
                      <Text style={styles.actionBtnDeleteText}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() => setContactDevotee(devotee)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={THEME.colors.textInverse} />
                      <Text style={styles.actionBtnPrimaryText}>Contact</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {contactDevotee && (
        <FollowUpModal
          visible={!!contactDevotee}
          onClose={() => setContactDevotee(null)}
          counselee={contactDevotee}
          initialTemplate="encouragement"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  searchSection: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceVariant,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    height: 44,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: THEME.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surfaceVariant,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
  },
  filterChipTextActive: {
    color: THEME.colors.textInverse,
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
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  email: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginVertical: 6,
  },
  detailItem: {
    width: '48%',
    marginVertical: 3,
  },
  detailLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  detailValue: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
    fontWeight: '500',
    marginTop: 1,
  },
  detailValueBold: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  remindersCardRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  remindersInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remindersLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    flexShrink: 1,
  },
  optOutReqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  optOutReqText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B45309',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  actionBtnReminderOff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionBtnReminderOffText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B91C1C',
  },
  actionBtnReminderOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  actionBtnReminderOnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803D',
  },
  actionBtnSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceVariant,
    marginRight: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginRight: 8,
  },
  actionBtnDeleteText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primary,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.textInverse,
    marginLeft: 4,
  },
  emptyContainer: {
    padding: THEME.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
  },
});
