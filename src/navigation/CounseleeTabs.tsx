import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

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
    </Stack.Navigator>
  );
}

export const CounseleeTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#261200',
        tabBarInactiveTintColor: '#78350F',
        tabBarStyle: {
          backgroundColor: '#FFA600',
          borderTopColor: '#E08500',
          borderTopWidth: 1.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
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
