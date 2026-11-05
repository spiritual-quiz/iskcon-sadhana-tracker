import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
} from 'firebase/auth';
// @ts-ignore - React Native specific persistence export
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Silence non-critical backend connection warnings in offline / hybrid mode
try {
  setLogLevel('error');
} catch (e) {
  // Ignore in environments where setLogLevel is not available
}

// Production Firebase Configuration
// Values can be supplied via environment variables in .env (EXPO_PUBLIC_*)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAxUemheOgI2u4B1I08xNkRmcfLAg4jQUA',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'iskcon-sadhana-tracker-ecced.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'iskcon-sadhana-tracker-ecced',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'iskcon-sadhana-tracker-ecced.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '219813049186',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:219813049186:web:4a79984779c0ce5cd9f23b',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// In Web/PWA, use browser local persistence so page refreshes never sign the user out.
// In React Native (APK), use AsyncStorage persistence.
let auth: any;
try {
  if (Platform.OS === 'web') {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
