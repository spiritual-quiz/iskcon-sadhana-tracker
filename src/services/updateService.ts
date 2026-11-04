import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppVersionInfo {
  version: string;
  versionCode: number;
  title: string;
  releaseNotes: string;
  apkDownloadUrl?: string;
  isMandatory?: boolean;
  publishedAt: string;
}

const LAST_APPLIED_UPDATE_KEY = 'bhakti_last_applied_update_version';

export const updateService = {
  /**
   * Get the current locally running version and versionCode
   */
  getCurrentVersion: () => {
    return {
      version: Constants.expoConfig?.version || '1.0.27',
      versionCode: Constants.expoConfig?.android?.versionCode || 28,
    };
  },

  /**
   * Check for updates from:
   * 1. Firestore 'app_settings/version_control' (published by admin / system)
   * 2. Expo Updates service (for native OTA updates)
   */
  checkForUpdate: async (): Promise<{
    isAvailable: boolean;
    versionInfo?: AppVersionInfo;
    updateSource: 'expo' | 'firestore' | 'none';
  }> => {
    const current = updateService.getCurrentVersion();

    // 1. Check Firestore remote version broadcast
    try {
      const docRef = doc(db, 'app_settings', 'version_control');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]);

      if (snap && snap.exists()) {
        const remoteInfo = snap.data() as AppVersionInfo;
        const lastApplied = await AsyncStorage.getItem(LAST_APPLIED_UPDATE_KEY);

        // Check if remote version is higher or has a newer timestamp than last applied
        const isHigherVersion = (remoteInfo.versionCode || 0) > current.versionCode;
        const isDifferentVersion = remoteInfo.version !== current.version && remoteInfo.version !== lastApplied;

        if (isHigherVersion || isDifferentVersion) {
          return {
            isAvailable: true,
            versionInfo: remoteInfo,
            updateSource: 'firestore',
          };
        }
      }
    } catch (e) {
      // Offline or permission fallback
    }

    // 2. Check native Expo Updates service (if on native device)
    try {
      if (Platform.OS !== 'web' && !__DEV__ && Updates?.checkForUpdateAsync) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          return {
            isAvailable: true,
            versionInfo: {
              version: `v${current.version}+ota`,
              versionCode: current.versionCode,
              title: 'Devotional Enhancements & Fixes',
              releaseNotes: 'Performance optimizations, notification accuracy, and battery life improvements.',
              publishedAt: new Date().toISOString(),
            },
            updateSource: 'expo',
          };
        }
      }
    } catch (e) {
      // Ignored
    }

    return {
      isAvailable: false,
      updateSource: 'none',
    };
  },

  /**
   * Download and install the update package with progress feedback
   */
  fetchAndApplyUpdate: async (
    versionInfo?: AppVersionInfo,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    // 1. If native Expo Updates is available, fetch the bundle
    if (Platform.OS !== 'web' && Updates?.fetchUpdateAsync) {
      try {
        await Updates.fetchUpdateAsync();
      } catch (e) {
        console.warn('Expo OTA fetch fallback:', e);
      }
    }

    // 2. Record this version as applied in persistent storage
    if (versionInfo?.version) {
      await AsyncStorage.setItem(LAST_APPLIED_UPDATE_KEY, versionInfo.version);
    }
  },

  /**
   * Reload / restart the application
   */
  reloadApp: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } else if (Updates?.reloadAsync) {
      await Updates.reloadAsync();
    }
  },

  /**
   * Admin function: Publish software update broadcast to all users
   */
  publishSoftwareUpgrade: async (info: {
    version: string;
    versionCode: number;
    title: string;
    releaseNotes: string;
    apkDownloadUrl?: string;
    isMandatory?: boolean;
  }): Promise<void> => {
    const docRef = doc(db, 'app_settings', 'version_control');
    const payload: AppVersionInfo = {
      ...info,
      publishedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload);
  },
};
