import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { FollowUpModal } from '../../components/FollowUpModal';
import { UserProfile } from '../../types/auth';
import { birthdayService } from '../../services/birthdayService';
import { BirthdayReminder } from '../../types/monitoring';
import { authService } from '../../services/authService';
import {
  calculateAge,
  getNowInIST,
  getTodayDateStringIST,
  getBirthdayInYear,
  getDaysDifference,
} from '../../utils/dateUtils';

export const BirthdayRemindersScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming'>('all');
  const [counselees, setCounselees] = useState<UserProfile[]>([]);
  const [reminders, setReminders] = useState<BirthdayReminder[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMissingDob, setFilterMissingDob] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Follow-up / Greeting modal
  const [greetingDevotee, setGreetingDevotee] = useState<{
    uid: string;
    displayName: string;
    phoneNumber?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const all = await authService.getAllCounselees();
      const approved = all.filter((u) => u.status === 'approved');
      setCounselees(approved);

      const upcoming = birthdayService.getUpcomingBirthdays(approved, 30);
      setReminders(upcoming);
    } catch (e) {
      console.warn('Error fetching birthday data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSendGreeting = (rem: BirthdayReminder) => {
    setGreetingDevotee({
      uid: rem.userId,
      displayName: rem.counseleeName,
      phoneNumber: rem.counseleePhone,
      email: rem.counseleeEmail,
    });
  };

  const handleDevoteeGreeting = (devotee: UserProfile) => {
    setGreetingDevotee({
      uid: devotee.uid,
      displayName: devotee.displayName,
      phoneNumber: devotee.phoneNumber,
      email: devotee.email,
    });
  };

  // Helper to format Date of Birth nicely (e.g. 1995-10-15 -> 15 Oct 1995)
  const formatDob = (dobStr?: string): string => {
    if (!dobStr) return 'Not Provided';
    const parts = dobStr.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${monthNames[mIdx] || parts[1]} ${parts[0]}`;
    }
    return dobStr;
  };

  // Helper to get next birthday date & remaining days
  const getNextBirthdayInfo = (dobStr?: string) => {
    if (!dobStr) return null;
    const today = getNowInIST();
    const curYear = today.getFullYear();
    const todayStr = getTodayDateStringIST();

    let bday = getBirthdayInYear(dobStr, curYear);
    let diff = getDaysDifference(todayStr, bday.dateString);

    if (diff < 0) {
      bday = getBirthdayInYear(dobStr, curYear + 1);
      diff = getDaysDifference(todayStr, bday.dateString);
    }

    return {
      nextDate: bday.dateString,
      daysAway: diff,
      isToday: diff === 0,
      turningAge: calculateAge(dobStr) + (diff === 0 ? 0 : 1),
    };
  };

  // Filtered list of all counselees
  const filteredCounselees = counselees
    .filter((c) => {
      if (filterMissingDob && c.dateOfBirth) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        c.displayName.toLowerCase().includes(q) ||
        (c.phoneNumber && c.phoneNumber.includes(q)) ||
        (c.dateOfBirth && c.dateOfBirth.includes(q))
      );
    })
    .sort((a, b) => {
      // Sort those with birthdays first by upcoming days, then those without
      const bdayA = getNextBirthdayInfo(a.dateOfBirth);
      const bdayB = getNextBirthdayInfo(b.dateOfBirth);
      if (bdayA && bdayB) return bdayA.daysAway - bdayB.daysAway;
      if (bdayA && !bdayB) return -1;
      if (!bdayA && bdayB) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  const registeredDobCount = counselees.filter((c) => !!c.dateOfBirth).length;
  const missingDobCount = counselees.length - registeredDobCount;

  return (
    <View style={styles.container}>
      <Header
        title="Birthday Reminders"
        subtitle={
          activeTab === 'all'
            ? `Counselees Birthday Records (${registeredDobCount}/${counselees.length} registered)`
            : `Upcoming Birthdays (${reminders.length} in next 30 days)`
        }
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* 2-Tab Segmented Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === 'all' ? '#FFFFFF' : THEME.colors.primaryDark}
          />
          <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
            All Counselees ({counselees.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.tabButtonActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Ionicons
            name="gift"
            size={16}
            color={activeTab === 'upcoming' ? '#FFFFFF' : THEME.colors.primaryDark}
          />
          <Text style={[styles.tabButtonText, activeTab === 'upcoming' && styles.tabButtonTextActive]}>
            Upcoming ({reminders.length})
          </Text>
          {reminders.length > 0 && (
            <View style={[styles.badgeCircle, activeTab === 'upcoming' && styles.badgeCircleActive]}>
              <Text style={[styles.badgeText, activeTab === 'upcoming' && styles.badgeTextActive]}>
                {reminders.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading devotee birthday records...</Text>
        </View>
      ) : activeTab === 'all' ? (
        /* Tab 1: All Counselees Birthday Details */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadData();
              }}
            />
          }
        >
          {/* Search & Missing DOB Filter Bar */}
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={17} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search counselee by name or mobile..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterPillsRow}>
              <TouchableOpacity
                style={[styles.filterChip, !filterMissingDob && styles.filterChipActive]}
                onPress={() => setFilterMissingDob(false)}
              >
                <Text style={[styles.filterChipText, !filterMissingDob && styles.filterChipTextActive]}>
                  All ({counselees.length})
                </Text>
              </TouchableOpacity>

              {missingDobCount > 0 && (
                <TouchableOpacity
                  style={[styles.filterChipMissing, filterMissingDob && styles.filterChipMissingActive]}
                  onPress={() => setFilterMissingDob(!filterMissingDob)}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={13}
                    color={filterMissingDob ? '#FFFFFF' : '#D97706'}
                  />
                  <Text
                    style={[
                      styles.filterChipMissingText,
                      filterMissingDob && styles.filterChipMissingTextActive,
                    ]}
                  >
                    Missing DOB ({missingDobCount})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Counselees List */}
          {filteredCounselees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={THEME.colors.gold} />
              <Text style={styles.emptyTitle}>No Devotees Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search criteria.</Text>
            </View>
          ) : (
            filteredCounselees.map((devotee) => {
              const bdayInfo = getNextBirthdayInfo(devotee.dateOfBirth);
              const age = calculateAge(devotee.dateOfBirth);

              return (
                <View key={devotee.uid} style={styles.devoteeCard}>
                  <View style={styles.devoteeCardHeader}>
                    <View style={styles.avatarCircle}>
                      <Ionicons
                        name={devotee.dateOfBirth ? 'balloon' : 'person'}
                        size={18}
                        color={THEME.colors.gold}
                      />
                    </View>
                    <View style={styles.devoteeInfoBlock}>
                      <Text style={styles.devoteeName}>{devotee.displayName}</Text>
                      <Text style={styles.devoteePhone}>
                        {devotee.phoneNumber ? `📞 ${devotee.phoneNumber}` : 'No phone registered'}
                      </Text>
                    </View>

                    {bdayInfo && (
                      <View style={[styles.nextBdayBadge, bdayInfo.isToday && styles.nextBdayBadgeToday]}>
                        <Text style={[styles.nextBdayText, bdayInfo.isToday && styles.nextBdayTextToday]}>
                          {bdayInfo.isToday ? '🎉 Today!' : `In ${bdayInfo.daysAway}d`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Birthday Details Grid */}
                  <View style={styles.bdayDetailsGrid}>
                    <View style={styles.bdayDetailItem}>
                      <Text style={styles.bdayDetailLabel}>Date of Birth</Text>
                      <Text style={styles.bdayDetailValue}>{formatDob(devotee.dateOfBirth)}</Text>
                    </View>

                    <View style={styles.bdayDetailItem}>
                      <Text style={styles.bdayDetailLabel}>Current Age</Text>
                      <Text style={styles.bdayDetailValue}>{age > 0 ? `${age} years` : 'N/A'}</Text>
                    </View>

                    <View style={styles.bdayDetailItem}>
                      <Text style={styles.bdayDetailLabel}>Next Birthday</Text>
                      <Text style={styles.bdayDetailValue}>
                        {bdayInfo ? bdayInfo.nextDate : 'Not Set'}
                      </Text>
                    </View>

                    <View style={styles.bdayDetailItem}>
                      <Text style={styles.bdayDetailLabel}>Turning Age</Text>
                      <Text style={styles.bdayDetailValue}>
                        {bdayInfo ? `${bdayInfo.turningAge} yrs` : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Shortcuts */}
                  <View style={styles.devoteeActionRow}>
                    {devotee.phoneNumber && (
                      <TouchableOpacity
                        style={styles.actionBtnCall}
                        onPress={() => Linking.openURL(`tel:${devotee.phoneNumber}`)}
                      >
                        <Ionicons name="call" size={13} color="#15803D" />
                        <Text style={styles.actionBtnCallText}>Call</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionBtnGreet}
                      onPress={() => handleDevoteeGreeting(devotee)}
                    >
                      <Ionicons name="gift-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.actionBtnGreetText}>Send Devotional Wish</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* Tab 2: Upcoming Birthdays (Next 30 Days) */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadData();
              }}
            />
          }
        >
          <View style={styles.banner}>
            <Ionicons name="sparkles" size={18} color={THEME.colors.goldDark} />
            <Text style={styles.bannerText}>
              Leap-year protection active: Feb 29 birthdays automatically observed on Feb 28 in non-leap years.
            </Text>
          </View>

          {reminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={54} color={THEME.colors.gold} />
              <Text style={styles.emptyTitle}>No Birthdays in the Next 30 Days</Text>
              <Text style={styles.emptySubtitle}>All devotee birthday milestones are up to date.</Text>
            </View>
          ) : (
            reminders.map((rem) => (
              <View key={rem.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="gift" size={22} color={THEME.colors.gold} />
                  </View>
                  <View style={styles.nameBlock}>
                    <Text style={styles.name}>{rem.counseleeName}</Text>
                    <Text style={styles.ageText}>Turning {rem.turningAge} years old</Text>
                    {rem.counseleePhone ? (
                      <Text style={styles.phoneSubText}>📞 {rem.counseleePhone}</Text>
                    ) : null}
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>{rem.reminderDate}</Text>
                  </View>
                </View>

                {rem.isLeapYearSpecial && (
                  <Text style={styles.leapNotice}>* Feb 29 birthday observed on Feb 28 this year.</Text>
                )}

                <View style={styles.actionRow}>
                  {rem.counseleePhone && (
                    <TouchableOpacity
                      style={styles.actionBtnCall}
                      onPress={() => Linking.openURL(`tel:${rem.counseleePhone}`)}
                    >
                      <Ionicons name="call" size={13} color="#15803D" />
                      <Text style={styles.actionBtnCallText}>Call</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.greetBtn}
                    onPress={() => handleSendGreeting(rem)}
                  >
                    <Ionicons name="send" size={15} color={THEME.colors.textInverse} />
                    <Text style={styles.greetBtnText}>Send Devotional Greeting</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {greetingDevotee && (
        <FollowUpModal
          visible={!!greetingDevotee}
          onClose={() => setGreetingDevotee(null)}
          counselee={greetingDevotee}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  badgeCircle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeCircleActive: {
    backgroundColor: THEME.colors.gold,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  badgeTextActive: {
    color: '#FFFFFF',
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
  searchSection: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: THEME.colors.text,
  },
  filterPillsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  filterChipMissing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  filterChipMissingActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterChipMissingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  filterChipMissingTextActive: {
    color: '#FFFFFF',
  },
  devoteeCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  devoteeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devoteeInfoBlock: {
    flex: 1,
    marginLeft: 10,
  },
  devoteeName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  devoteePhone: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  nextBdayBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextBdayBadgeToday: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  nextBdayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#B45309',
  },
  nextBdayTextToday: {
    color: '#15803D',
  },
  bdayDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  bdayDetailItem: {
    width: '47%',
  },
  bdayDetailLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  bdayDetailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 1,
  },
  devoteeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnCallText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803D',
  },
  actionBtnGreet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnGreetText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.gold,
    marginBottom: THEME.spacing.base,
  },
  bannerText: {
    fontSize: 11,
    color: THEME.colors.primaryDark,
    marginLeft: 6,
    flex: 1,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  name: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  ageText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 2,
  },
  phoneSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  dateBadge: {
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  leapNotice: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  greetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    gap: 5,
  },
  greetBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
    marginTop: THEME.spacing.lg,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: THEME.spacing.sm,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
