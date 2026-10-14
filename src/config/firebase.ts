import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - React Native specific persistence export
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production Firebase Configuration
// Values can be supplied via environment variables in .env (EXPO_PUBLIC_*)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoPlaceholderKeyForISKCONTracker',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'iskcon-sadhana-tracker.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'iskcon-sadhana-tracker',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'iskcon-sadhana-tracker.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '102938475610',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:102938475610:android:a1b2c3d4e5f6',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// In React Native / Expo, Auth should ideally use persistence
let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
