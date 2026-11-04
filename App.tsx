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
import { updateService, AppVersionInfo } from './src/services/updateService';
import { AppUpdateModal } from './src/components/AppUpdateModal';

const AppContent: React.FC = () => {
  const { theme, currentThemeId } = useTheme();
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [pendingUpdateInfo, setPendingUpdateInfo] = useState<AppVersionInfo | undefined>(undefined);
  const isUpdatePendingRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const lastCheckTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    notificationService.setupNotifications();

    // Check for updates via updateService (handles both Firestore broadcast & native OTA)
    const checkAppUpdates = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;
      lastCheckTimeRef.current = Date.now();
      try {
        const result = await updateService.checkForUpdate();
        if (result.isAvailable) {
          isUpdatePendingRef.current = true;
          setPendingUpdateInfo(result.versionInfo);
          setShowUpdateModal(true);
          await notificationService.triggerAppUpdateNotification();
        }
      } catch (e) {
        // Offline fallback
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 1. Initial check on cold mount
    checkAppUpdates();

    // 2. AppState listener: whenever user returns to the app, re-prompt if update pending,
    // or re-check if at least 30 minutes have elapsed (zero background battery drain).
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (isUpdatePendingRef.current) {
          setShowUpdateModal(true);
        } else if (Date.now() - lastCheckTimeRef.current > 30 * 60 * 1000) {
          checkAppUpdates();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleApplyUpdate = async () => {
    await updateService.fetchAndApplyUpdate(pendingUpdateInfo);
    isUpdatePendingRef.current = false;
  };

  const handleRestartApp = async () => {
    await updateService.reloadApp();
  };

  const handleDismissModal = () => {
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
          updateMessage={pendingUpdateInfo?.releaseNotes}
          isMandatory={pendingUpdateInfo?.isMandatory}
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
