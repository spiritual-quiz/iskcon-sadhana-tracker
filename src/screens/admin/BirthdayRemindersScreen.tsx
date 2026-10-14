import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { FollowUpModal } from '../../components/FollowUpModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile } from '../../types/auth';
import { birthdayService } from '../../services/birthdayService';
import { BirthdayReminder } from '../../types/monitoring';

export const BirthdayRemindersScreen = ({ navigation }: any) => {
  const [reminders, setReminders] = useState<BirthdayReminder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Follow up modal
  const [greetingDevotee, setGreetingDevotee] = useState<{
    uid: string;
    displayName: string;
    phoneNumber?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'counselee'), where('status', '==', 'approved'))
      );
      const counselees = snap.docs.map((d) => d.data() as UserProfile);
      const upcoming = birthdayService.getUpcomingBirthdays(counselees, 30);
      setReminders(upcoming);
    } catch (e) {
      console.warn('Error fetching birthdays:', e);
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

  return (
    <View style={styles.container}>
      <Header
        title="Birthday Reminders"
        subtitle="Upcoming Devotee Birthdays (Next 30 Days)"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Checking devotee birthday records...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadBirthdays(); }} />}
        >
          <View style={styles.banner}>
            <Ionicons name="sparkles" size={18} color={THEME.colors.goldDark} />
            <Text style={styles.bannerText}>
              Leap-year protection enabled: Feb 29 birthdays automatically observed on Feb 28 in non-leap years.
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
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>{rem.reminderDate}</Text>
                  </View>
                </View>

                {rem.isLeapYearSpecial && (
                  <Text style={styles.leapNotice}>* Feb 29 birthday observed on Feb 28 this year.</Text>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.greetBtn}
                    onPress={() => handleSendGreeting(rem)}
                  >
                    <Ionicons name="send" size={16} color={THEME.colors.textInverse} />
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
  },
  greetBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.xs,
    marginLeft: 6,
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
