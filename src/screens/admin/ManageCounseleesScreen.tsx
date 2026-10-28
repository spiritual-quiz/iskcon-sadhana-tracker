import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { StatusBadge } from '../../components/StatusBadge';
import { FollowUpModal } from '../../components/FollowUpModal';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile, UserStatus } from '../../types/auth';
import { calculateAge, calculateConnectionDuration } from '../../utils/dateUtils';
import { authService } from '../../services/authService';
import { getAllInvitations } from '../../services/invitationService';
import { InvitationCode } from '../../types/monitoring';

export const ManageCounseleesScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'all' | 'byInvitation'>('all');
  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'disabled'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Follow-up modal
  const [contactDevotee, setContactDevotee] = useState<UserProfile | null>(null);

  // Direct edit target rounds modal
  const [directEditDevotee, setDirectEditDevotee] = useState<UserProfile | null>(null);
  const [directEditRounds, setDirectEditRounds] = useState<string>('16');

  useEffect(() => {
    loadCounselees();
  }, []);

  const loadCounselees = async () => {
    try {
      const [data, invs] = await Promise.all([
        authService.getAllCounselees(),
        getAllInvitations().catch(() => []),
      ]);
      setCounselees(data);
      setInvitations(invs);
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

  const handleApproveTargetChange = async (user: UserProfile) => {
    if (!user.targetRoundsRequested) return;
    const requested = user.targetRoundsRequested;
    Alert.alert(
      'Approve Target Change?',
      `Approve ${user.displayName}'s request to update daily chanting target to ${requested} rounds?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await authService.approveTargetRoundsChange(user.uid, requested);
              Alert.alert('Target Approved', `Chanting target for ${user.displayName} is now updated to ${requested} rounds.`);
              loadCounselees();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleRejectTargetChange = async (user: UserProfile) => {
    Alert.alert(
      'Decline Target Change Request?',
      `Decline ${user.displayName}'s request to change daily chanting target to ${user.targetRoundsRequested} rounds?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.rejectTargetRoundsChange(user.uid);
              Alert.alert('Declined', `Target change request for ${user.displayName} has been declined.`);
              loadCounselees();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleSaveDirectEditTarget = async () => {
    if (!directEditDevotee) return;
    const rounds = parseInt(directEditRounds, 10);
    if (isNaN(rounds) || rounds <= 0) {
      Alert.alert('Invalid Rounds', 'Please enter a valid round commitment (e.g. 16).');
      return;
    }
    try {
      await authService.approveTargetRoundsChange(directEditDevotee.uid, rounds);
      setDirectEditDevotee(null);
      Alert.alert('Target Updated', `Chanting target for ${directEditDevotee.displayName} set to ${rounds} rounds.`);
      loadCounselees();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
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

  const groupedByInvitation = useMemo(() => {
    const groups: { [name: string]: { code?: string; devotees: UserProfile[] } } = {};

    counselees.forEach((devotee) => {
      const code = (devotee.invitationCode || '').trim().toUpperCase();
      const matchedInv = invitations.find((i) => i.code.trim().toUpperCase() === code);
      let invName = devotee.invitationName || matchedInv?.notes;

      if (!invName) {
        if (code === 'KRISHNA7') invName = 'General Devotee Registration';
        else if (code === 'SADHANA16') invName = '16 Rounds Devotee Group';
        else if (code) invName = `${code} Group`;
        else invName = 'General Devotee Registration';
      }

      if (!groups[invName]) {
        groups[invName] = { code, devotees: [] };
      }
      groups[invName].devotees.push(devotee);
    });

    return groups;
  }, [counselees, invitations]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Manage Counselees"
        subtitle="Devotee Profiles & Spiritual Records"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Top 2 Tabs: All Devotees | By Invitation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === 'all' ? '#FFFFFF' : THEME.colors.primary}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}
          >
            All Devotees ({counselees.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'byInvitation' && styles.tabButtonActive]}
          onPress={() => setActiveTab('byInvitation')}
        >
          <Ionicons
            name="pricetags"
            size={16}
            color={activeTab === 'byInvitation' ? '#FFFFFF' : THEME.colors.primary}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'byInvitation' && styles.tabButtonTextActive,
            ]}
          >
            By Invitation ({Object.keys(groupedByInvitation).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Bar (Shown in All Devotees tab) */}
      {activeTab === 'all' && (
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
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading counselees...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'all' ? (
            filtered.length === 0 ? (
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.detailLabel}>Chanting Rounds</Text>
                        <TouchableOpacity
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          onPress={() => {
                            setDirectEditDevotee(devotee);
                            setDirectEditRounds(String(devotee.declaredRounds || 16));
                          }}
                        >
                          <Ionicons name="pencil" size={12} color={THEME.colors.goldDark} />
                        </TouchableOpacity>
                      </View>
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

                  {/* Target Rounds Change Request Card */}
                  {devotee.targetRoundsRequested && (
                    <View style={styles.targetChangeReqCard}>
                      <View style={styles.targetChangeReqHeader}>
                        <Ionicons name="ribbon-outline" size={16} color="#B45309" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.targetChangeReqTitle}>
                            Target Change Request: <Text style={{ fontWeight: 'bold' }}>{devotee.targetRoundsRequested} Rounds</Text>
                          </Text>
                          <Text style={styles.targetChangeReqSub}>
                            Current: {devotee.declaredRounds || 16} rounds • Awaiting your approval
                          </Text>
                        </View>
                      </View>
                      <View style={styles.targetReqActionsRow}>
                        <TouchableOpacity
                          style={styles.approveTargetBtn}
                          onPress={() => handleApproveTargetChange(devotee)}
                        >
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                          <Text style={styles.approveTargetBtnText}>Approve {devotee.targetRoundsRequested}R</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectTargetBtn}
                          onPress={() => handleRejectTargetChange(devotee)}
                        >
                          <Ionicons name="close-circle-outline" size={14} color="#B91C1C" />
                          <Text style={styles.rejectTargetBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

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
          )
        ) : (
          // By Invitation Tab View
            Object.keys(groupedByInvitation).length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No counselees registered under any invitation yet.</Text>
              </View>
            ) : (
              Object.entries(groupedByInvitation).map(([groupName, groupData]) => (
                <View key={groupName} style={styles.invitationGroupCard}>
                  {/* Invitation Group Header */}
                  <View style={styles.invitationGroupHeader}>
                    <View style={styles.invitationGroupIcon}>
                      <Ionicons name="folder" size={20} color="#EA580C" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invitationGroupTitle}>{groupName}</Text>
                      {groupData.code ? (
                        <Text style={styles.invitationGroupCode}>Invitation Code: {groupData.code}</Text>
                      ) : null}
                    </View>
                    <View style={styles.invitationGroupBadge}>
                      <Ionicons name="people" size={13} color="#EA580C" />
                      <Text style={styles.invitationGroupCount}>
                        {groupData.devotees.length} {groupData.devotees.length === 1 ? 'Devotee' : 'Devotees'}
                      </Text>
                    </View>
                  </View>

                  {/* Devotees List Under This Invitation */}
                  <View style={styles.invitationDevoteesList}>
                    {groupData.devotees.map((devotee, idx) => (
                      <View
                        key={devotee.uid}
                        style={[styles.invDevoteeItem, idx > 0 && styles.invDevoteeDivider]}
                      >
                        <View style={styles.invDevoteeAvatar}>
                          {devotee.photoURL ? (
                            <Image source={{ uri: devotee.photoURL }} style={styles.invDevoteeImg} />
                          ) : (
                            <Ionicons name="person" size={18} color={THEME.colors.gold} />
                          )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={styles.invDevoteeName}>{devotee.displayName}</Text>
                            <StatusBadge type="status" value={devotee.status} />
                          </View>
                          <Text style={styles.invDevoteePhone}>
                            {devotee.phoneNumber || devotee.email}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginTop: 4,
                              gap: 8,
                              flexWrap: 'wrap',
                            }}
                          >
                            <View style={styles.roundsBadgePill}>
                              <Ionicons name="radio-button-on" size={11} color="#B45309" />
                              <Text style={styles.roundsBadgeText}>
                                {devotee.declaredRounds || 16} Rounds
                              </Text>
                            </View>
                            {devotee.dateOfBirth && (
                              <Text style={styles.invMetaText}>
                                Age: {calculateAge(devotee.dateOfBirth)}y
                              </Text>
                            )}
                            <Text style={styles.invMetaText}>
                              Joined: {devotee.createdAt ? devotee.createdAt.split('T')[0] : 'Recent'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )
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

      {/* Counsellor Direct Edit Chanting Target Modal */}
      <Modal
        visible={!!directEditDevotee}
        transparent
        animationType="fade"
        onRequestClose={() => setDirectEditDevotee(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDirectEditDevotee(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.editTargetModalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitleText}>Set Chanting Target</Text>
                  <TouchableOpacity onPress={() => setDirectEditDevotee(null)}>
                    <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitleText}>
                  Update daily round target for {directEditDevotee?.displayName}:
                </Text>

                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.modalStepperBtn}
                    onPress={() => {
                      const cur = parseInt(directEditRounds, 10) || 16;
                      if (cur > 1) setDirectEditRounds(String(cur - 1));
                    }}
                  >
                    <Ionicons name="remove" size={18} color={THEME.colors.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.modalStepperInput}
                    keyboardType="numeric"
                    value={directEditRounds}
                    onChangeText={setDirectEditRounds}
                  />
                  <TouchableOpacity
                    style={styles.modalStepperBtn}
                    onPress={() => {
                      const cur = parseInt(directEditRounds, 10) || 16;
                      setDirectEditRounds(String(cur + 1));
                    }}
                  >
                    <Ionicons name="add" size={18} color={THEME.colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setDirectEditDevotee(null)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSaveDirectEditTarget}
                  >
                    <Text style={styles.modalSubmitBtnText}>Save Target</Text>
                  </TouchableOpacity>
                </View>
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
  targetChangeReqCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  targetChangeReqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  targetChangeReqTitle: {
    fontSize: 12,
    color: '#92400E',
  },
  targetChangeReqSub: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 1,
  },
  targetReqActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  approveTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  approveTargetBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rejectTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rejectTargetBtnText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editTargetModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    ...THEME.shadows.medium,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  modalSubtitleText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalStepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalStepperInput: {
    width: 70,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: THEME.colors.primaryDark,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Tab selector styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  // By Invitation Grouping Styles
  invitationGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    overflow: 'hidden',
  },
  invitationGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    gap: 10,
  },
  invitationGroupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitationGroupTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9A3412',
  },
  invitationGroupCode: {
    fontSize: 11,
    color: '#C2410C',
    marginTop: 2,
    fontWeight: '500',
  },
  invitationGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    gap: 4,
  },
  invitationGroupCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EA580C',
  },
  invitationDevoteesList: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  invDevoteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  invDevoteeDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  invDevoteeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  invDevoteeImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  invDevoteeName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  invDevoteePhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  roundsBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  roundsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#B45309',
  },
  invMetaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
