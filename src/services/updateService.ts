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
      version: Constants.expoConfig?.version || '1.0.37',
      versionCode: Constants.expoConfig?.android?.versionCode || 38,
    };
  },

  /**
   * Fetch the current remote upgrade broadcast from Firestore 'app_settings/version_control'
   */
  getLatestBroadcast: async (): Promise<AppVersionInfo | null> => {
    try {
      const docRef = doc(db, 'app_settings', 'version_control');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]);
      if (snap && snap.exists()) {
        return snap.data() as AppVersionInfo;
      }
    } catch (e) {
      console.warn('Failed to fetch remote broadcast:', e);
    }
    return null;
  },

  /**
   * Check for updates from:
   * 1. Expo Updates service (for native OTA updates)
   * 2. Firestore 'app_settings/version_control' (published by admin / system)
   */
  checkForUpdate: async (): Promise<{
    isAvailable: boolean;
    versionInfo?: AppVersionInfo;
    updateSource: 'expo' | 'firestore' | 'none';
  }> => {
    // In PWA / Web, the browser automatically updates assets from GitHub Pages on reload.
    // Update pop-up is only required on native APK.
    if ((Platform.OS as string) === 'web') {
      return {
        isAvailable: false,
        updateSource: 'none',
      };
    }

    const current = updateService.getCurrentVersion();
    const lastDismissed = await AsyncStorage.getItem('bhakti_dismissed_update_version');
    const lastApplied = await AsyncStorage.getItem(LAST_APPLIED_UPDATE_KEY);

    // 1. Check native Expo Updates service (primary source for OTA bundles)
    try {
      if ((Platform.OS as string) !== 'web' && !__DEV__ && Updates?.checkForUpdateAsync) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          const otaVersion = `v${current.version}+ota`;
          if (lastDismissed !== otaVersion && lastApplied !== otaVersion) {
            return {
              isAvailable: true,
              versionInfo: {
                version: otaVersion,
                versionCode: current.versionCode,
                title: 'New Devotional Update Available',
                releaseNotes: 'Performance optimizations, notification accuracy, and enhancements.',
                publishedAt: new Date().toISOString(),
              },
              updateSource: 'expo',
            };
          }
        }
      }
    } catch (e) {
      // Ignored
    }

    // 2. Check Firestore remote version broadcast ONLY IF STRICTLY HIGHER than current versionCode
    try {
      const docRef = doc(db, 'app_settings', 'version_control');
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]);

      if (snap && snap.exists()) {
        const remoteInfo = snap.data() as AppVersionInfo;
        const remoteCode = remoteInfo.versionCode || 0;

        // An update is available ONLY IF:
        // 1. Remote versionCode is strictly higher than running app
        // 2. Remote version string is strictly different from running app
        // 3. User has NOT already dismissed or applied this version
        if (
          remoteCode > current.versionCode &&
          remoteInfo.version !== current.version &&
          remoteInfo.version !== lastDismissed &&
          remoteInfo.version !== lastApplied
        ) {
          return {
            isAvailable: true,
            versionInfo: remoteInfo,
            updateSource: 'firestore',
          };
        }
      }
    } catch (e) {
      // Offline fallback
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
    if ((Platform.OS as string) !== 'web' && Updates?.fetchUpdateAsync) {
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
    if ((Platform.OS as string) === 'web') {
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
