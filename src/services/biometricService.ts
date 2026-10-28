import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_CREDENTIALS_KEY = 'bhakti_biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'bhakti_biometric_enabled';

export interface StoredCredentials {
  email: string;
  password: string;
}

export const biometricService = {
  /**
   * Check if device supports fingerprint / touch sensor hardware
   */
  isHardwareAvailable: async (): Promise<boolean> => {
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch {
      return false;
    }
  },

  /**
   * Check if fingerprint / biometric is enrolled on the device
   */
  isEnrolled: async (): Promise<boolean> => {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch {
      return false;
    }
  },

  /**
   * Check if fingerprint login is enabled and credentials exist
   */
  isBiometricLoginConfigured: async (): Promise<boolean> => {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      const creds = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      return enabled === 'true' && !!creds;
    } catch {
      return false;
    }
  },

  /**
   * Get saved devotee email for fingerprint login
   */
  getSavedDevoteeEmail: async (): Promise<string | null> => {
    try {
      const raw = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredCredentials;
      return parsed.email;
    } catch {
      return null;
    }
  },

  /**
   * Save devotee credentials for touch sensor / fingerprint login
   */
  saveCredentials: async (email: string, password: string): Promise<boolean> => {
    try {
      const payload: StoredCredentials = {
        email: email.trim().toLowerCase(),
        password,
      };
      await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(payload));
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      return true;
    } catch (e) {
      console.warn('Failed to save biometric credentials:', e);
      return false;
    }
  },

  /**
   * Prompt user with native Touch Sensor / Fingerprint scanner dialog
   * If authenticated, returns stored email and password for automatic login
   */
  authenticateWithFingerprint: async (): Promise<StoredCredentials | null> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        throw new Error('Touch sensor / fingerprint hardware is not available on this device.');
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        throw new Error('No fingerprint enrolled on this device. Please set up fingerprint in phone Settings.');
      }

      const credsRaw = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!credsRaw) {
        throw new Error('No saved fingerprint login found. Please sign in with password first to save your fingerprint.');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Touch Sensor / Fingerprint Sign In',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return JSON.parse(credsRaw) as StoredCredentials;
      }

      return null;
    } catch (e: any) {
      throw e;
    }
  },

  /**
   * Clear stored credentials / disable fingerprint login
   */
  clearCredentials: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    } catch (e) {
      console.warn('Failed to clear biometric credentials:', e);
    }
  },
};
