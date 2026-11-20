import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showCrossPlatformAlert } from '../utils/alertUtils';

export interface AppVersionInfo {
  version: string;
  versionCode: number;
  title: string;
  releaseNotes: string;
  apkDownloadUrl?: string;
  isMandatory?: boolean;
  publishedAt: string;
}

const GITHUB_REPO = 'spiritual-quiz/iskcon-sadhana-tracker';
const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const parseSemver = (v: string): number[] => {
  return v
    .replace(/^v/i, '')
    .trim()
    .split('.')
    .map((p) => parseInt(p, 10) || 0);
};

export const isNewerVersion = (remoteVer: string, currentVer: string): boolean => {
  const r = parseSemver(remoteVer);
  const c = parseSemver(currentVer);
  const len = Math.max(r.length, c.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0;
    const cv = c[i] ?? 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
};

export const updateService = {
  /**
   * Get the current locally running version and versionCode
   */
  getCurrentVersion: () => {
    return {
      version: Constants.expoConfig?.version || '1.0.51',
      versionCode: Constants.expoConfig?.android?.versionCode || 51,
    };
  },

  /**
   * Fetch the latest release published on GitHub repository
   */
  getLatestGitHubRelease: async (): Promise<AppVersionInfo | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(GITHUB_LATEST_RELEASE_URL, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Bhakti-Unnati-App',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();

      const tagName: string = data.tag_name || '';
      const versionStr = tagName.replace(/^v/i, '').trim();

      // Find APK download asset if present
      let apkDownloadUrl = '';
      if (Array.isArray(data.assets) && data.assets.length > 0) {
        const apkAsset = data.assets.find(
          (a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
        );
        if (apkAsset && apkAsset.browser_download_url) {
          apkDownloadUrl = apkAsset.browser_download_url;
        }
      }
      if (!apkDownloadUrl && versionStr) {
        apkDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/${tagName}/Bhakti-Unnati.apk`;
      }

      return {
        version: versionStr,
        versionCode: parseInt(versionStr.replace(/\./g, ''), 10) || 0,
        title: data.name || `Bhakti Unnati Update v${versionStr}`,
        releaseNotes: data.body || 'New features, honours modules, and devotional enhancements are ready.',
        apkDownloadUrl,
        publishedAt: data.published_at || new Date().toISOString(),
      };
    } catch (e) {
      // Offline or network error
      return null;
    }
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
   * Comprehensive check for updates across:
   * 1. GitHub Releases API (latest tags and APK builds)
   * 2. Expo Updates service (for native OTA bundles)
   * 3. Firestore 'app_settings/version_control'
   * Works on both Web and Native mobile.
   */
  checkForUpdate: async (isManual: boolean = false): Promise<{
    isAvailable: boolean;
    versionInfo?: AppVersionInfo;
    updateSource: 'github' | 'expo' | 'firestore' | 'none';
  }> => {
    const current = updateService.getCurrentVersion();
    const lastDismissed = await AsyncStorage.getItem('bhakti_dismissed_update_version');
    const lastDownloaded = await AsyncStorage.getItem('bhakti_last_downloaded_version');

    // 1. Check GitHub latest release first (automatic detection when new release is created on GitHub)
    try {
      const githubRelease = await updateService.getLatestGitHubRelease();
      if (githubRelease && isNewerVersion(githubRelease.version, current.version)) {
        if (!isManual && (githubRelease.version === lastDismissed || githubRelease.version === lastDownloaded)) {
          // Already handled this version - do not pop up automatically
        } else {
          return {
            isAvailable: true,
            versionInfo: githubRelease,
            updateSource: 'github',
          };
        }
      }
    } catch (e) {
      console.warn('GitHub release check error:', e);
    }

    // 2. Check native Expo Updates service (if OTA bundle is available)
    try {
      if ((Platform.OS as string) !== 'web' && Updates.isEnabled && Updates.checkForUpdateAsync) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          return {
            isAvailable: true,
            versionInfo: {
              version: (update.manifest as any)?.extra?.expoClient?.version || '1.0.51',
              versionCode: (update.manifest as any)?.extra?.expoClient?.android?.versionCode || 51,
              title: 'New Devotional Update Available',
              releaseNotes: 'Devotional honours, performance optimizations and new features are ready to install.',
              publishedAt: new Date().toISOString(),
            },
            updateSource: 'expo',
          };
        }
      }
    } catch (e) {
      console.warn('Updates.checkForUpdateAsync error:', e);
    }

    // 3. Check Firestore remote version broadcast
    try {
      const remoteInfo = await updateService.getLatestBroadcast();
      if (remoteInfo && remoteInfo.version) {
        if (
          isNewerVersion(remoteInfo.version, current.version) ||
          (remoteInfo.versionCode && remoteInfo.versionCode > current.versionCode)
        ) {
          if (!isManual && (remoteInfo.version === lastDismissed || remoteInfo.version === lastDownloaded)) {
            // Already handled
          } else {
            return {
              isAvailable: true,
              versionInfo: remoteInfo,
              updateSource: 'firestore',
            };
          }
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
   * Download and apply the update package:
   * - On Web: clears cache and reloads from GitHub Pages
   * - On Mobile: initiates complete download of the APK from GitHub release or downloads OTA bundle
   */
  fetchAndApplyUpdate: async (
    versionInfo?: AppVersionInfo,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    const isWeb = (Platform.OS as string) === 'web';

    if (versionInfo?.version) {
      await AsyncStorage.setItem('bhakti_last_downloaded_version', versionInfo.version);
    }

    if (isWeb) {
      // On Web: clear cache storage if supported and reload the page
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((k) => window.caches.delete(k)));
        } catch {}
      }
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    // On Native Android:
    // If an APK download URL is available from GitHub or Firestore, open it to trigger complete system download
    const apkUrl = versionInfo?.apkDownloadUrl;
    if (apkUrl) {
      try {
        const supported = await Linking.canOpenURL(apkUrl);
        if (supported) {
          await Linking.openURL(apkUrl);
          showCrossPlatformAlert(
            'Downloading Update',
            `Hare Krishna! Bhakti-Unnati.apk (v${versionInfo?.version || 'Latest'}) is downloading in your notification bar.\n\nOnce the download completes, tap the completed notification to install the update.`
          );
          return;
        }
      } catch (err) {
        console.warn('Failed to open APK URL:', err);
      }
    }

    // If native Expo OTA update bundle is available:
    if (Updates.isEnabled && Updates.fetchUpdateAsync) {
      try {
        await Updates.fetchUpdateAsync();
        showCrossPlatformAlert(
          'Update Ready',
          'New update downloaded successfully. Restarting application to apply updates.',
          [
            {
              text: 'Restart Now',
              onPress: async () => {
                await updateService.reloadApp();
              },
            },
          ]
        );
      } catch (e: any) {
        throw new Error(e?.message || 'Could not download update bundle. Please check your internet connection.');
      }
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
   * Prompt user with an update modal / alert
   */
  promptUserForUpdate: (versionInfo: AppVersionInfo) => {
    const isWeb = (Platform.OS as string) === 'web';
    showCrossPlatformAlert(
      'New Software Update Available',
      `Hare Krishna! A new software update (v${versionInfo.version}) is now available.\n\n${
        versionInfo.releaseNotes || 'Includes devotional honours, performance updates, and new features.'
      }\n\nWould you like to ${isWeb ? 'refresh and update' : 'download and install'} now?`,
      [
        { text: 'Later', style: 'cancel' },
        {
          text: isWeb ? 'Update Now' : 'Download & Install',
          onPress: async () => {
            try {
              await updateService.fetchAndApplyUpdate(versionInfo);
            } catch (err: any) {
              showCrossPlatformAlert('Update Error', err?.message || 'Could not start update download.');
            }
          },
        },
      ]
    );
  },

  /**
   * Automatically check on app startup for counsellors and counselees.
   * Prompts user once per day when a new GitHub release is available.
   */
  checkAndPromptAutoUpdate: async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastCheckKey = 'bhakti_last_update_prompt_date';
      const lastPrompted = await AsyncStorage.getItem(lastCheckKey);

      // Check for updates
      const res = await updateService.checkForUpdate();
      if (res.isAvailable && res.versionInfo) {
        // If not already prompted today, show the notification
        if (lastPrompted !== todayStr) {
          await AsyncStorage.setItem(lastCheckKey, todayStr);
          updateService.promptUserForUpdate(res.versionInfo);
        }
      }
    } catch {
      // Silent background fail
    }
  },

  /**
   * Admin function: Publish software update broadcast to all users in Firestore
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
