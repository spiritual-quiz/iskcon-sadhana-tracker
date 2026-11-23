import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/Header';
import { authService } from '../../services/authService';
import { UserProfile } from '../../types/auth';

export const ChantingRoundsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [devotees, setDevotees] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadDevotees();
  }, []);

  const loadDevotees = async (force: boolean = false) => {
    try {
      if (devotees.length === 0) {
        setIsLoading(true);
      }
      const allUsers = await authService.getAllUsers(force);
      const approved = allUsers.filter(
        (u) => u.role !== 'counsellor' && u.status === 'approved'
      );
      // Sort in descending order: highest chanting rounds first
      const sorted = [...approved].sort((a, b) => {
        const roundsA = a.declaredRounds || 16;
        const roundsB = b.declaredRounds || 16;
        if (roundsB !== roundsA) {
          return roundsB - roundsA;
        }
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      setDevotees(sorted);
    } catch (err) {
      console.warn('Failed to load chanting devotees:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredDevotees = devotees.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.displayName && d.displayName.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q)) ||
      (d.phoneNumber && d.phoneNumber.includes(q)) ||
      String(d.declaredRounds || 16).includes(q)
    );
  });

  const maxRounds = devotees.length > 0 ? Math.max(...devotees.map((d) => d.declaredRounds || 16)) : 16;
  const totalRounds = devotees.reduce((sum, d) => sum + (d.declaredRounds || 16), 0);
  const avgRounds = devotees.length > 0 ? Math.round(totalRounds / devotees.length) : 16;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Chanting Rounds"
        subtitle="Counselees' Daily Chanting Target"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {/* Summary KPI Strip */}
      <View style={[styles.kpiContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiNum, { color: theme.thickColor }]}>{devotees.length}</Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Devotees</Text>
        </View>
        <View style={[styles.kpiDivider, { backgroundColor: theme.colors.borderLight }]} />
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiNum, { color: '#059669' }]}>{maxRounds}</Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Max Rounds</Text>
        </View>
        <View style={[styles.kpiDivider, { backgroundColor: theme.colors.borderLight }]} />
        <View style={styles.kpiBox}>
          <Text style={[styles.kpiNum, { color: '#D97706' }]}>{avgRounds}</Text>
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>Average</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by devotee name or rounds..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading counselees' chanting targets...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadDevotees(true);
              }}
            />
          }
        >
          {filteredDevotees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="disc-outline" size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Devotees Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
                {searchQuery ? 'Try matching a different devotee name' : 'No approved counselees registered yet'}
              </Text>
            </View>
          ) : (
            filteredDevotees.map((devotee, index) => {
              const rounds = devotee.declaredRounds || 16;
              const isTop1 = index === 0;
              const isTop2 = index === 1;
              const isTop3 = index === 2;

              return (
                <View
                  key={devotee.uid}
                  style={[
                    styles.devoteeCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                    isTop1 && { borderColor: '#D97706', borderWidth: 1.5, backgroundColor: theme.liteColor + '20' },
                  ]}
                >
                  <View style={styles.rankBadgeContainer}>
                    <Text style={[styles.rankBadgeText, { color: theme.thickColor }]}>
                      {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${index + 1}`}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={[styles.devoteeName, { color: theme.colors.text }]}>
                      {devotee.displayName || 'Devotee'}
                    </Text>
                    {devotee.phoneNumber ? (
                      <Text style={[styles.devoteePhone, { color: theme.colors.textMuted }]}>
                        📞 {devotee.phoneNumber}
                      </Text>
                    ) : null}
                    {devotee.targetRoundsRequested && devotee.targetRoundsRequested > 0 ? (
                      <View style={styles.requestedBadge}>
                        <Text style={styles.requestedBadgeText}>
                          Requested: {devotee.targetRoundsRequested} rounds (Pending)
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.roundsBadge,
                      {
                        backgroundColor: theme.liteColor,
                        borderColor: theme.thickColor,
                      },
                    ]}
                  >
                    <Ionicons name="disc" size={14} color={theme.thickColor} />
                    <Text style={[styles.roundsBadgeText, { color: theme.thickColor }]}>
                      {rounds} {rounds === 1 ? 'Round' : 'Rounds'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  kpiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  devoteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  rankBadgeContainer: {
    width: 38,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  devoteeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  devoteePhone: {
    fontSize: 12,
    marginTop: 2,
  },
  requestedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  requestedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  roundsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  roundsBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
