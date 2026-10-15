import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
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
        <View style={styles.logoCircle}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.splashTitle}>Bhakti Unnati</Text>
        <Text style={styles.splashSubtitle}>Advancement in Devotion</Text>
        <Text style={styles.institutionTag}>Bhaktivedanta Rajavidyalaya</Text>
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
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: THEME.colors.gold,
    marginBottom: 16,
    padding: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: THEME.colors.textInverse,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: 13,
    color: THEME.colors.goldLight,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  institutionTag: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  loader: {
    marginTop: 24,
  },
});
