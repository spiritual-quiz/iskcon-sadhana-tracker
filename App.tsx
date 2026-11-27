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
    // Battery-safe: Throttled to avoid network spam, asks at most once per day per new version
    const checkAppUpdates = async () => {
      // Automatic update checking is only for native mobile APK/OTA updates, never for website
      if ((Platform.OS as string) === 'web') return;
      if (isCheckingRef.current || isUpdatingRef.current || isUpdatePendingRef.current) return;
      isCheckingRef.current = true;
      try {
        const now = Date.now();
        // Cooldown: at most once every 3 minutes between network checks when app is open
        if (now - lastCheckTimeRef.current < 3 * 60 * 1000 && lastCheckTimeRef.current !== 0) {
          return;
        }
        lastCheckTimeRef.current = now;

        const result = await updateService.checkForUpdate(true);
        if (result.isAvailable && result.versionInfo?.version) {
          const v = result.versionInfo.version;
          const todayDateStr = new Date().toISOString().split('T')[0];
          const lastPromptDate = await AsyncStorage.getItem('bhakti_update_last_prompt_date');
          const lastPromptVer = await AsyncStorage.getItem('bhakti_update_last_prompt_version');

          // Daily one time it can ask: if already asked today for this version, skip
          if (lastPromptDate === todayDateStr && lastPromptVer === v) {
            return;
          }

          // Mark prompted for today so it does not ask again today
          await AsyncStorage.setItem('bhakti_update_last_prompt_date', todayDateStr);
          await AsyncStorage.setItem('bhakti_update_last_prompt_version', v);

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

    // Initial check on cold mount
    checkAppUpdates();

    // Check on app resume from background (opening the app)
    const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAppUpdates();
      }
    });

    return () => {
      appStateSub.remove();
    };
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
    const todayDateStr = new Date().toISOString().split('T')[0];
    if (pendingUpdateInfo?.version) {
      await AsyncStorage.setItem('bhakti_update_last_prompt_date', todayDateStr);
      await AsyncStorage.setItem('bhakti_update_last_prompt_version', pendingUpdateInfo.version);
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
