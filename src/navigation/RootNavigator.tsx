import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { AwaitingApprovalScreen } from '../screens/auth/AwaitingApprovalScreen';
import { CounseleeTabs } from './CounseleeTabs';
import { AdminStack } from './AdminStack';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { user, isLoading, isAdmin, isApproved, isPending, isRejectedOrDisabled } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="flower-outline" size={54} color={THEME.colors.gold} />
        </View>
        <Text style={styles.splashTitle}>ISKCON Sadhana Tracker</Text>
        <Text style={styles.splashSubtitle}>Connecting Devotees to Sincere Sadhana</Text>
        <ActivityIndicator size="large" color={THEME.colors.gold} style={styles.loader} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Unauthenticated Flow
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : isPending ? (
        // Awaiting Counsellor Approval
        <Stack.Screen name="AwaitingApproval" component={AwaitingApprovalScreen} />
      ) : isRejectedOrDisabled ? (
        // Disabled / Rejected Account
        <Stack.Screen name="AwaitingApproval" component={AwaitingApprovalScreen} />
      ) : isAdmin ? (
        // Counsellor / Admin Flow
        <Stack.Screen name="AdminApp" component={AdminStack} />
      ) : (
        // Approved Counselee Flow
        <Stack.Screen name="CounseleeApp" component={CounseleeTabs} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: THEME.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.gold,
    marginBottom: THEME.spacing.base,
  },
  splashTitle: {
    fontSize: THEME.typography.sizes.xxl,
    fontWeight: 'bold',
    color: THEME.colors.textInverse,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.goldLight,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  loader: {
    marginTop: THEME.spacing.xl,
  },
});
