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
import { StatusBadge } from '../../components/StatusBadge';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile } from '../../types/auth';
import { reportService } from '../../services/reportService';
import { attendanceService } from '../../services/attendanceService';
import { authService } from '../../services/authService';
import { getTodayDateStringIST } from '../../utils/dateUtils';
import { MonthlyReport } from '../../types/report';
import { useAuth } from '../../context/AuthContext';

export const AdminMonthlyReportsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const todayStr = getTodayDateStringIST();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedYear, selectedMonth]);

  const loadMonthlyData = async () => {
    try {
      const allCounselees = await authService.getAllCounselees();
      const approvedUsers = allCounselees.filter((u) => u.status === 'approved');

      const reports = await Promise.all(
        approvedUsers.map((u) =>
          reportService.generateMonthlyReport({
            userId: u.uid,
            counseleeName: u.displayName,
            year: selectedYear,
            month: selectedMonth,
            publicConsent: u.publicAppreciationConsent,
          })
        )
      );
      setMonthlyReports(reports);
    } catch (e) {
      console.warn('Error loading monthly reports:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCycleSatsanga = async (userId: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === 'attended'
        ? 'absent'
        : currentStatus === 'absent'
        ? 'not_conducted'
        : 'attended';

    const monthId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    setUpdatingId(userId);
    try {
      await attendanceService.recordMonthlySatsanga({
        userId,
        monthId,
        scheduledDate: todayStr,
        status: nextStatus as any,
        updatedBy: user?.uid || 'admin',
      });
      await loadMonthlyData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update satsanga attendance.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Monthly Reports"
        subtitle={`Period: ${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Compiling monthly devotional reports...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadMonthlyData(); }} />}
        >
          {monthlyReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No monthly records found.</Text>
            </View>
          ) : (
            monthlyReports.map((rep) => (
              <View key={rep.userId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.name}>{rep.counseleeName}</Text>
                    <Text style={styles.ratingText}>Consistency: {rep.consistencyRating}</Text>
                  </View>
                  <StatusBadge type="grade" value={rep.grade} />
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreText}>
                    Total Score: {rep.totalScore} / {rep.maxAvailableMarks} ({rep.percentage}%)
                  </Text>
                  <Text style={styles.roundsText}>{rep.totalRounds} Rounds</Text>
                </View>

                {/* Monthly Satsanga Attendance Toggle (50 marks, dynamic attendance) */}
                <TouchableOpacity
                  style={[
                    styles.satsangaBtn,
                    rep.satsangaStatus === 'attended'
                      ? styles.satsangaBtnActive
                      : rep.satsangaStatus === 'not_conducted'
                      ? styles.satsangaBtnNotHeld
                      : styles.satsangaBtnAbsent,
                  ]}
                  onPress={() => handleCycleSatsanga(rep.userId, rep.satsangaStatus)}
                  disabled={updatingId === rep.userId}
                >
                  <Ionicons
                    name={
                      rep.satsangaStatus === 'attended'
                        ? 'checkmark-circle'
                        : rep.satsangaStatus === 'not_conducted'
                        ? 'pause-circle'
                        : 'close-circle'
                    }
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.satsangaBtnTextActive}>
                    {rep.satsangaStatus === 'attended'
                      ? 'Monthly Satsang: Attended (50/50 M)'
                      : rep.satsangaStatus === 'not_conducted'
                      ? 'Monthly Satsang: No Class Held (Dynamic / 0 Penalty)'
                      : 'Monthly Satsang: Absent (0/50 M)'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
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
    marginBottom: 6,
  },
  name: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
  },
  ratingText: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceVariant,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginVertical: 6,
  },
  scoreText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  roundsText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  satsangaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    marginTop: 6,
    borderWidth: 1,
  },
  satsangaBtnActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  satsangaBtnNotHeld: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  satsangaBtnAbsent: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  satsangaBtnInactive: {
    backgroundColor: THEME.colors.surfaceVariant,
    borderColor: THEME.colors.border,
  },
  satsangaBtnText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primary,
    marginLeft: 6,
  },
  satsangaBtnTextActive: {
    color: THEME.colors.textInverse,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: THEME.typography.sizes.sm,
  },
});
