import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { notificationService } from './src/services/notificationService';
import { AppUpdateModal } from './src/components/AppUpdateModal';

const AppContent: React.FC = () => {
  const { theme, currentThemeId } = useTheme();
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  useEffect(() => {
    notificationService.setupNotifications();

    // Over-The-Air updates: Check for update and prompt user with professional bank-style modal
    const checkAppUpdates = async () => {
      try {
        if (!__DEV__ && Updates?.checkForUpdateAsync) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            setShowUpdateModal(true);
          }
        }
      } catch (e) {
        // Offline / dev fallback
      }
    };
    checkAppUpdates();
  }, []);

  const handleApplyUpdate = async () => {
    if (Updates?.fetchUpdateAsync && Updates?.reloadAsync) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  };

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
        <AppUpdateModal
          visible={showUpdateModal}
          onUpdate={handleApplyUpdate}
          onDismiss={() => setShowUpdateModal(false)}
        />
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
