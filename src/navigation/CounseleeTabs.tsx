import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

import { HomeScreen } from '../screens/counselee/HomeScreen';
import { DailySadhanaScreen } from '../screens/counselee/DailySadhanaScreen';
import { MyReportsScreen } from '../screens/counselee/MyReportsScreen';
import { CommunityReportsScreen } from '../screens/counselee/CommunityReportsScreen';
import { ProfileScreen } from '../screens/counselee/ProfileScreen';
import { NotificationsScreen } from '../screens/counselee/NotificationsScreen';
import { SettingsScreen } from '../screens/counselee/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CommunityReports" component={CommunityReportsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export const CounseleeTabs = () => {
  const insets = useSafeAreaInsets();
  const { theme, currentThemeId } = useTheme();
  const bottomInset = insets.bottom;
  const tabHeight = 56 + Math.max(bottomInset, 8);
  const paddingBottom = Math.max(bottomInset, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.thickColor,
        tabBarInactiveTintColor: currentThemeId === 'black' ? '#94A3B8' : '#6B7280',
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1.5,
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 5,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginTop: -2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'DailySadhana') {
            iconName = focused ? 'create' : 'create-outline';
          } else if (route.name === 'MyReports') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="DailySadhana" component={DailySadhanaScreen} options={{ tabBarLabel: 'Sadhana' }} />
      <Tab.Screen name="MyReports" component={MyReportsScreen} options={{ tabBarLabel: 'Reports' }} />
      <Tab.Screen name="Community" component={CommunityReportsScreen} options={{ tabBarLabel: 'Sanga' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};
