import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { performerService, HonoursData } from '../../services/performerService';
import { HonoursCard } from '../../components/HonoursCard';

export const HonoursScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState<HonoursData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const loadData = useCallback(async (force = false) => {
    try {
      const honours = await performerService.getHonoursAndPerformers(undefined, force);
      setData(honours);
    } catch (e) {
      console.warn('Error loading honours:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    loadData(true);
  };

  // Check if current user is recognized as any champion
  const myMonthlyChampionBadges: string[] = [];
  if (user && data?.monthlyChampions?.championsList) {
    data.monthlyChampions.championsList.forEach((c) => {
      if (c.userId === user.uid || (user.email && c.devoteeName === user.displayName)) {
        myMonthlyChampionBadges.push(c.badge);
      }
    });
  }

  const isMyYesterdayBest =
    user &&
    (data?.yesterday.dailyBest?.userId === user.uid ||
      data?.yesterday.firstToFill?.userId === user.uid);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Devotional Honours"
        subtitle="Weekly & Monthly Champions"
        showBack={navigation?.canGoBack ? navigation.canGoBack() : false}
        onBackPress={() => navigation.goBack()}
        rightAction={{
          iconName: 'refresh-outline',
          onPress: handleRefresh,
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.thickColor} />
          <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
            Loading devotional honours...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.thickColor]}
            />
          }
        >
          {/* Personal Congratulations Banner if current user won any category */}
          {(myMonthlyChampionBadges.length > 0 || isMyYesterdayBest) && (
            <View style={[styles.personalBanner, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
              <View style={styles.personalBannerRow}>
                <Ionicons name="sparkles" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.personalBannerTitle}>
                    Haribol, {user?.displayName || 'Devotee'}! 🎉
                  </Text>
                  <Text style={styles.personalBannerDesc}>
                    You are recognized on the Honours Board:
                  </Text>
                  <View style={styles.personalBadgesRow}>
                    {myMonthlyChampionBadges.map((b, i) => (
                      <View key={i} style={[styles.personalBadgePill, { backgroundColor: '#059669' }]}>
                        <Ionicons name="medal" size={11} color="#FFFFFF" />
                        <Text style={styles.personalBadgeText}>{b}</Text>
                      </View>
                    ))}
                    {isMyYesterdayBest && (
                      <View style={[styles.personalBadgePill, { backgroundColor: '#B45309' }]}>
                        <Ionicons name="ribbon" size={11} color="#FFFFFF" />
                        <Text style={styles.personalBadgeText}>Yesterday's Performer</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Full Devotional Honours Card */}
          <HonoursCard refreshTrigger={refreshTrigger} initialTab="all" />

          {/* Motivational Footer Note */}
          <View style={[styles.footerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderLight }]}>
            <Ionicons name="heart" size={18} color={theme.thickColor} />
            <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
              "By chanting the holy name of the Lord without offense and engaging in devotional service, one is elevated to the highest spiritual stage."
            </Text>
            <Text style={[styles.footerAuthor, { color: theme.thickColor }]}>
              — His Divine Grace A.C. Bhaktivedanta Swami Prabhupada
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 14,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  personalBanner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  personalBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  personalBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#065F46',
  },
  personalBannerDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    marginBottom: 6,
  },
  personalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  personalBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  personalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footerCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  footerText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  footerAuthor: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginTop: 6,
  },
});
