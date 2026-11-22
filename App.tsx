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

    // Check for updates via updateService (handles both Web & Native)
    // Throttled to at most once per 24 hours automatically on cold start to preserve battery
    const checkAppUpdates = async () => {
      // Automatic update checking is only for native mobile APK/OTA updates, never for website
      if ((Platform.OS as string) === 'web') return;
      if (isCheckingRef.current || isUpdatingRef.current || isUpdatePendingRef.current) return;
      isCheckingRef.current = true;
      try {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const lastAutoDate = await AsyncStorage.getItem('bhakti_last_update_check_date');
        if (lastAutoDate === todayDateStr) {
          return;
        }
        await AsyncStorage.setItem('bhakti_last_update_check_date', todayDateStr);

        const result = await updateService.checkForUpdate(false);
        if (result.isAvailable && result.versionInfo?.version) {
          const v = result.versionInfo.version;
          const dismissedVer = await AsyncStorage.getItem('bhakti_dismissed_update_version');
          const downloadedVer = await AsyncStorage.getItem('bhakti_last_downloaded_version');
          if (v === dismissedVer || v === downloadedVer) {
            return;
          }
          isUpdatePendingRef.current = true;
          setPendingUpdateInfo(result.versionInfo);
          setShowUpdateModal(true);
        }
      } catch (e) {
        // Offline fallback
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Initial check on cold mount only
    checkAppUpdates();
  }, []);

  const handleApplyUpdate = async () => {
    isUpdatingRef.current = true;
    try {
      if (pendingUpdateInfo?.version) {
        await AsyncStorage.setItem('bhakti_last_downloaded_version', pendingUpdateInfo.version);
      }
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
      await AsyncStorage.setItem('bhakti_last_downloaded_version', pendingUpdateInfo.version);
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
          versionInfo={pendingUpdateInfo}
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
