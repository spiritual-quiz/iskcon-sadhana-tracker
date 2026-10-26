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
    backgroundColor: '#FFA600',
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#261200',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    fontSize: 13,
    color: '#5C2D00',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  institutionTag: {
    fontSize: 11,
    color: 'rgba(38, 18, 0, 0.7)',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  loader: {
    marginTop: 24,
  },
});
