import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { ManageCounseleesScreen } from '../screens/admin/ManageCounseleesScreen';
import { PendingRegistrationsScreen } from '../screens/admin/PendingRegistrationsScreen';
import { InvitationsScreen } from '../screens/admin/InvitationsScreen';
import { SadhanaMonitoringScreen } from '../screens/admin/SadhanaMonitoringScreen';
import { AdminDailyReportsScreen } from '../screens/admin/AdminDailyReportsScreen';
import { AdminWeeklyReportsScreen } from '../screens/admin/AdminWeeklyReportsScreen';
import { AdminMonthlyReportsScreen } from '../screens/admin/AdminMonthlyReportsScreen';
import { BirthdayRemindersScreen } from '../screens/admin/BirthdayRemindersScreen';
import { FollowUpHistoryScreen } from '../screens/admin/FollowUpHistoryScreen';
import { SadhanaAppreciationScreen } from '../screens/admin/SadhanaAppreciationScreen';
import { SettingsExportScreen } from '../screens/admin/SettingsExportScreen';

const Stack = createNativeStackNavigator();

export const AdminStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="ManageCounselees" component={ManageCounseleesScreen} />
      <Stack.Screen name="PendingRegistrations" component={PendingRegistrationsScreen} />
      <Stack.Screen name="Invitations" component={InvitationsScreen} />
      <Stack.Screen name="SadhanaMonitoring" component={SadhanaMonitoringScreen} />
      <Stack.Screen name="AdminDailyReports" component={AdminDailyReportsScreen} />
      <Stack.Screen name="AdminWeeklyReports" component={AdminWeeklyReportsScreen} />
      <Stack.Screen name="AdminMonthlyReports" component={AdminMonthlyReportsScreen} />
      <Stack.Screen name="BirthdayReminders" component={BirthdayRemindersScreen} />
      <Stack.Screen name="FollowUpHistory" component={FollowUpHistoryScreen} />
      <Stack.Screen name="SadhanaAppreciation" component={SadhanaAppreciationScreen} />
      <Stack.Screen name="SettingsExport" component={SettingsExportScreen} />
    </Stack.Navigator>
  );
};
