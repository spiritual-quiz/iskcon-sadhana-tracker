import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { notificationService } from './src/services/notificationService';

const AppContent: React.FC = () => {
  const { theme, currentThemeId } = useTheme();

  useEffect(() => {
    notificationService.setupNotifications();
  }, []);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <AuthProvider>
        <StatusBar style={currentThemeId === 'black' ? 'light' : 'dark'} />
        <RootNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
