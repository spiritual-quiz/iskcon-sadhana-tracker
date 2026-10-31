import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
  const isUpdatePendingRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    notificationService.setupNotifications();

    // Check for updates via Expo Updates service
    const checkAppUpdates = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      try {
        if (!__DEV__ && Updates?.checkForUpdateAsync) {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            isUpdatePendingRef.current = true;
            setShowUpdateModal(true);
            await notificationService.triggerAppUpdateNotification();
          }
        }
      } catch (e) {
        // Offline or dev mode fallback
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 1. Initial check on cold mount
    checkAppUpdates();

    // 2. Periodic background check every 90 seconds while app is kept open
    const intervalId = setInterval(() => {
      checkAppUpdates();
    }, 90000);

    // 3. AppState listener: whenever user switches back into the app, re-prompt if update pending or re-check
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (isUpdatePendingRef.current) {
          // If user previously tapped "Later", ask them again upon returning to the app!
          setShowUpdateModal(true);
        } else {
          checkAppUpdates();
        }
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (Updates?.fetchUpdateAsync) {
      await Updates.fetchUpdateAsync();
      isUpdatePendingRef.current = false;
    }
  };

  const handleRestartApp = async () => {
    if (Updates?.reloadAsync) {
      await Updates.reloadAsync();
    }
  };

  const handleDismissModal = () => {
    // Dismiss modal for current session; will re-prompt when user returns to app
    setShowUpdateModal(false);
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
          onRestart={handleRestartApp}
          onDismiss={handleDismissModal}
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
