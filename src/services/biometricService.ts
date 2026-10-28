import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageService } from './localStorageService';

const BIOMETRIC_ACCOUNTS_KEY = 'bhakti_biometric_accounts_map';
const ACTIVE_BIOMETRIC_USER_KEY = 'bhakti_active_biometric_user_email';

export interface BiometricAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  password: string;
  enrolledAt: string;
}

export const biometricService = {
  /**
   * Check if device has fingerprint / touch sensor hardware
   */
  isHardwareAvailable: async (): Promise<boolean> => {
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch {
      return false;
    }
  },

  /**
   * Check if fingerprints are enrolled in the device OS settings
   */
  isEnrolled: async (): Promise<boolean> => {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch {
      return false;
    }
  },

  /**
   * Get all devotee accounts configured for fingerprint login on this device
   */
  getEnrolledAccounts: async (): Promise<BiometricAccount[]> => {
    try {
      const raw = await AsyncStorage.getItem(BIOMETRIC_ACCOUNTS_KEY);
      if (!raw) return [];
      const map = JSON.parse(raw) as Record<string, BiometricAccount>;
      return Object.values(map);
    } catch {
      return [];
    }
  },

  /**
   * Get the primary active devotee account for instant fingerprint login
   */
  getActiveAccount: async (): Promise<BiometricAccount | null> => {
    try {
      const activeEmail = await AsyncStorage.getItem(ACTIVE_BIOMETRIC_USER_KEY);
      const accounts = await biometricService.getEnrolledAccounts();
      if (!accounts.length) return null;

      if (activeEmail) {
        const found = accounts.find((a) => a.email.toLowerCase() === activeEmail.toLowerCase());
        if (found) return found;
      }

      // Default to the most recently enrolled account
      accounts.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
      return accounts[0] || null;
    } catch {
      return null;
    }
  },

  /**
   * Set a specific devotee as the active fingerprint account
   */
  setActiveAccount: async (email: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(ACTIVE_BIOMETRIC_USER_KEY, email.trim().toLowerCase());
    } catch (e) {
      console.warn('Failed to set active biometric user:', e);
    }
  },

  /**
   * Check if a specific devotee has fingerprint enabled on this device
   */
  isUserEnrolled: async (email: string): Promise<boolean> => {
    try {
      const accounts = await biometricService.getEnrolledAccounts();
      return accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    } catch {
      return false;
    }
  },

  /**
   * Save devotee credentials directly (e.g. from registration toggle)
   */
  saveCredentials: async (email: string, password: string, displayName?: string): Promise<boolean> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const raw = await AsyncStorage.getItem(BIOMETRIC_ACCOUNTS_KEY);
      const map: Record<string, BiometricAccount> = raw ? JSON.parse(raw) : {};
      map[cleanEmail] = {
        uid: cleanEmail,
        email: cleanEmail,
        displayName: displayName || cleanEmail,
        password,
        enrolledAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(BIOMETRIC_ACCOUNTS_KEY, JSON.stringify(map));
      await AsyncStorage.setItem(ACTIVE_BIOMETRIC_USER_KEY, cleanEmail);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Prompt biometric sensor to verify and enroll a devotee account.
   * Banking-grade: binds the fingerprint strictly to this specific devotee's account.
   */
  enrollDevoteeWithFingerprint: async (
    user: { uid: string; email: string; displayName: string; photoURL?: string },
    password: string
  ): Promise<boolean> => {
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      if (!hasHw) {
        throw new Error('Touch sensor / fingerprint hardware is not available on this device.');
      }
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        throw new Error('No fingerprint registered on this phone. Please register your fingerprint in phone Settings first.');
      }

      // Prompt native touch sensor dialog to confirm enrollment
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Touch Sensor to link fingerprint for ${user.displayName || user.email}`,
        fallbackLabel: 'Cancel',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        return false;
      }

      // Load existing account map
      const raw = await AsyncStorage.getItem(BIOMETRIC_ACCOUNTS_KEY);
      const map: Record<string, BiometricAccount> = raw ? JSON.parse(raw) : {};

      const cleanEmail = user.email.trim().toLowerCase();
      map[cleanEmail] = {
        uid: user.uid,
        email: cleanEmail,
        displayName: user.displayName || cleanEmail,
        photoURL: user.photoURL || '',
        password,
        enrolledAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(BIOMETRIC_ACCOUNTS_KEY, JSON.stringify(map));
      await AsyncStorage.setItem(ACTIVE_BIOMETRIC_USER_KEY, cleanEmail);
      return true;
    } catch (e: any) {
      throw e;
    }
  },

  /**
   * Enroll currently logged-in devotee using stored password from local cache if available,
   * or explicit password. Prompts OS touch sensor.
   */
  enrollWithStoredPassword: async (
    user: { uid: string; email: string; displayName: string; photoURL?: string },
    explicitPassword?: string
  ): Promise<{ success: boolean; requiresPasswordPrompt?: boolean; message?: string }> => {
    try {
      let pwd = explicitPassword;
      if (!pwd) {
        const local = await localStorageService.getUser(user.uid);
        pwd = local?.password;
      }

      if (!pwd) {
        return { success: false, requiresPasswordPrompt: true, message: 'Password required' };
      }

      const enrolled = await biometricService.enrollDevoteeWithFingerprint(user, pwd);
      if (enrolled) {
        return { success: true, message: 'Fingerprint enabled successfully!' };
      }
      return { success: false, message: 'Fingerprint enrollment cancelled.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Could not verify touch sensor.' };
    }
  },

  /**
   * Prompt native touch sensor to authenticate and unlock a specific devotee account.
   * If email is omitted, authenticates the active account.
   */
  authenticateWithFingerprint: async (targetEmail?: string): Promise<BiometricAccount | null> => {
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      if (!hasHw) {
        throw new Error('Touch sensor hardware not detected.');
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        throw new Error('No fingerprint registered in phone Settings.');
      }

      let account: BiometricAccount | null = null;
      if (targetEmail) {
        const accounts = await biometricService.getEnrolledAccounts();
        account = accounts.find((a) => a.email.toLowerCase() === targetEmail.trim().toLowerCase()) || null;
      } else {
        account = await biometricService.getActiveAccount();
      }

      if (!account) {
        throw new Error('No fingerprint login configured for this devotee. Please sign in with password first.');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in as ${account.displayName}`,
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return account;
      }
      return null;
    } catch (e: any) {
      throw e;
    }
  },

  /**
   * Remove fingerprint binding for a specific devotee
   */
  removeUserBiometric: async (email: string): Promise<void> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const raw = await AsyncStorage.getItem(BIOMETRIC_ACCOUNTS_KEY);
      if (!raw) return;

      const map: Record<string, BiometricAccount> = JSON.parse(raw);
      delete map[cleanEmail];
      await AsyncStorage.setItem(BIOMETRIC_ACCOUNTS_KEY, JSON.stringify(map));

      const activeEmail = await AsyncStorage.getItem(ACTIVE_BIOMETRIC_USER_KEY);
      if (activeEmail && activeEmail.toLowerCase() === cleanEmail) {
        const remaining = Object.values(map);
        if (remaining.length > 0) {
          await AsyncStorage.setItem(ACTIVE_BIOMETRIC_USER_KEY, remaining[0].email);
        } else {
          await AsyncStorage.removeItem(ACTIVE_BIOMETRIC_USER_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to remove biometric account:', e);
    }
  },

  /**
   * Clear all biometric accounts from this device
   */
  clearAllBiometrics: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ACCOUNTS_KEY);
      await AsyncStorage.removeItem(ACTIVE_BIOMETRIC_USER_KEY);
    } catch (e) {
      console.warn('Failed to clear biometric data:', e);
    }
  },
};
