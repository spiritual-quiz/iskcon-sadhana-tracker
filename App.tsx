import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContent: React.FC = () => {
  const { theme, currentThemeId } = useTheme();
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [pendingUpdateInfo, setPendingUpdateInfo] = useState<AppVersionInfo | undefined>(undefined);
  const isUpdatePendingRef = useRef<boolean>(false);
  const isUpdatingRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const lastCheckTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    notificationService.setupNotifications();

    // PWA updates automatically in the browser cache upon reload.
    // Update prompts and OTA checks are strictly for the Android APK.
    if (Platform.OS === 'web') {
      return;
    }

    // Check for updates via updateService (handles both Firestore broadcast & native OTA)
    const checkAppUpdates = async () => {
      if (isCheckingRef.current || isUpdatingRef.current || isUpdatePendingRef.current) return;
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

    // 2. AppState listener: re-check when returning to active state (throttled to 20s)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        if (Date.now() - lastCheckTimeRef.current > 20 * 1000) {
          checkAppUpdates();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleApplyUpdate = async () => {
    isUpdatingRef.current = true;
    try {
      await updateService.fetchAndApplyUpdate(pendingUpdateInfo);
    } finally {
      isUpdatingRef.current = false;
      isUpdatePendingRef.current = false;
    }
  };

  const handleRestartApp = async () => {
    await updateService.reloadApp();
  };

  const handleDismissModal = async () => {
    setShowUpdateModal(false);
    isUpdatePendingRef.current = false;
    if (pendingUpdateInfo?.version) {
      await AsyncStorage.setItem('bhakti_dismissed_update_version', pendingUpdateInfo.version);
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
