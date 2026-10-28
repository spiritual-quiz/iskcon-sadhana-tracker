import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export const AwaitingApprovalScreen = () => {
  const { user, reloadUser, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reloadUser();
      Alert.alert('Status Checked', 'If your counsellor has approved your account, the app will update.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.brandTitle}>Bhakti Unnati</Text>
        <Text style={styles.brandSubtitle}>Advancement in Devotion</Text>

        <Text style={styles.title}>Awaiting Counsellor Approval</Text>
        <Text style={styles.devoteeName}>Hare Krishna, {user?.displayName || 'Devotee'}!</Text>

        <Text style={styles.message}>
          Your registration has been submitted successfully and is currently under review by your counsellor.
        </Text>

        <Text style={styles.subMessage}>
          Once your counsellor approves your account, your daily sadhana dashboard will become accessible.
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator color={THEME.colors.textInverse} />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color={THEME.colors.textInverse} />
              <Text style={styles.refreshButtonText}>Check Approval Status</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out" size={18} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.medium,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  brandSubtitle: {
    fontSize: 11,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginBottom: 16,
  },
  title: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: 'bold',
    color: THEME.colors.primaryDark,
    marginBottom: 4,
  },
  devoteeName: {
    fontSize: THEME.typography.sizes.base,
    color: THEME.colors.goldDark,
    fontWeight: '600',
    marginBottom: THEME.spacing.base,
  },
  message: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: THEME.spacing.md,
  },
  subMessage: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: THEME.spacing.xl,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.md,
    width: '100%',
    marginBottom: THEME.spacing.md,
  },
  refreshButtonText: {
    color: THEME.colors.textInverse,
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.base,
    marginLeft: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#EA580C',
    elevation: 3,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginTop: 8,
    width: '100%',
  },
  signOutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: THEME.typography.sizes.base,
    marginLeft: 6,
  },
});
