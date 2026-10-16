import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/Header';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserProfile } from '../../types/auth';
import { authService } from '../../services/authService';

export const PendingRegistrationsScreen = ({ navigation }: any) => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const data = await authService.getPendingCounselees();
      setPendingUsers(data);
    } catch (e) {
      console.warn('Error fetching pending registrations:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAction = async (uid: string, name: string, approve: boolean) => {
    setProcessingUid(uid);
    try {
      await authService.updateCounseleeStatus(uid, approve ? 'approved' : 'rejected');
      Alert.alert(
        approve ? 'Devotee Approved' : 'Registration Rejected',
        `${name} has been ${approve ? 'approved. They can now access their sadhana dashboard.' : 'rejected.'}`
      );
      loadPending();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update status.');
    } finally {
      setProcessingUid(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Pending Registrations"
        subtitle="Review & Approve New Counselees"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Fetching pending registrations...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadPending(); }} />}
        >
          {pendingUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={54} color={THEME.colors.success} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>No pending devotee registrations awaiting approval.</Text>
            </View>
          ) : (
            pendingUsers.map((devotee) => (
              <View key={devotee.uid} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{devotee.displayName}</Text>
                  <Text style={styles.codeBadge}>Code: {devotee.invitationCode || 'N/A'}</Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{devotee.email}</Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{devotee.phoneNumber}</Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Chanting Commitment:</Text>
                  <Text style={styles.detailValueBold}>{devotee.declaredRounds || 16} Rounds</Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Registered On:</Text>
                  <Text style={styles.detailValue}>
                    {devotee.createdAt ? new Date(devotee.createdAt).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => handleAction(devotee.uid, devotee.displayName, false)}
                    disabled={processingUid === devotee.uid}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => handleAction(devotee.uid, devotee.displayName, true)}
                    disabled={processingUid === devotee.uid}
                  >
                    {processingUid === devotee.uid ? (
                      <ActivityIndicator size="small" color={THEME.colors.textInverse} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={16} color={THEME.colors.textInverse} />
                        <Text style={styles.approveBtnText}>Approve Devotee</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
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
  emptyContainer: {
    alignItems: 'center',
    padding: THEME.spacing.xxl,
    marginTop: THEME.spacing.xl,
  },
  emptyTitle: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginTop: THEME.spacing.md,
  },
  emptySubtitle: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
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
  codeBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.goldDark,
    backgroundColor: THEME.colors.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
  detailValue: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.text,
  },
  detailValueBold: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceVariant,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: THEME.borderRadius.md,
  },
  rejectBtn: {
    backgroundColor: THEME.colors.surfaceVariant,
    marginRight: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rejectBtnText: {
    color: THEME.colors.danger,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.xs,
  },
  approveBtn: {
    backgroundColor: THEME.colors.primary,
    marginLeft: 6,
  },
  approveBtnText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.xs,
    marginLeft: 4,
  },
});
