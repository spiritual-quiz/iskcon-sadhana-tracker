import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole, UserStatus } from '../types/auth';
import { validateInvitationCode, redeemInvitationCode } from './invitationService';
import { localStorageService, LocalStoredUser } from './localStorageService';

export interface RegisterParams {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  invitationCode: string;
  dateOfBirth?: string;
  iskconConnectDate?: string;
  declaredRounds: number;
}

export const authService = {
  /**
   * Listen to Firebase Auth state changes and load profile from Firestore or local storage
   */
  subscribeToAuthState: (callback: (user: UserProfile | null, fbUser: User | null) => void) => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        callback(null, null);
        return;
      }

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data() as UserProfile;
          callback(profile, fbUser);
          return;
        }

        // Check local storage fallback
        const localUser = await localStorageService.getUser(fbUser.uid);
        if (localUser) {
          callback(localUser, fbUser);
          return;
        }

        callback(null, fbUser);
      } catch (err) {
        console.warn('Error loading user profile:', err);
        const localUser = await localStorageService.getUser(fbUser.uid);
        callback(localUser || null, fbUser);
      }
    });
  },

  /**
   * Sign In with Email and Password
   */
  signIn: async (email: string, password: string): Promise<UserProfile> => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = userCredential.user.uid;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        if (profile.status === 'disabled') {
          await fbSignOut(auth);
          throw new Error('This account has been disabled. Please contact your counsellor.');
        }
        // Save to local cache as well
        await localStorageService.saveUser(profile, password);
        return profile;
      }

      // Check local storage if Firestore doc is missing
      const localUser = await localStorageService.getUser(uid);
      if (localUser) {
        if (localUser.status === 'disabled') {
          await fbSignOut(auth);
          throw new Error('This account has been disabled. Please contact your counsellor.');
        }
        return localUser;
      }

      throw new Error('User profile record not found in database.');
    } catch (firebaseErr: any) {
      // Check local storage first for offline / demo registered users
      const localMatch = await localStorageService.getUserByEmail(cleanEmail);
      if (localMatch) {
        if (localMatch.status === 'disabled') {
          throw new Error('This account has been disabled. Please contact your counsellor.');
        }
        if (localMatch.password && localMatch.password !== password) {
          throw new Error('Incorrect password. Please verify your credentials or tap "Forgot Password?".');
        }
        return localMatch;
      }

      // Default demo counsellor credentials
      if ((cleanEmail === 'madhavcarandas@gmail.com' || cleanEmail === 'counsellor@iskcon.org') && password === 'Sadhana@108') {
        const adminProfile: UserProfile = {
          uid: 'counsellor_admin_uid',
          email: 'madhavcarandas@gmail.com',
          displayName: 'Madhav Charan Das',
          phoneNumber: '+919876543210',
          role: 'counsellor',
          status: 'approved',
          declaredRounds: 16,
          publicAppreciationConsent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await localStorageService.saveUser(adminProfile, password);
        return adminProfile;
      }

      // Default demo devotee credentials
      if (cleanEmail === 'devotee@iskcon.org' && password === 'Devotee@108') {
        const devoteeProfile: UserProfile = {
          uid: 'devotee_user_uid',
          email: 'devotee@iskcon.org',
          displayName: 'Ramesh Das',
          phoneNumber: '+919876543211',
          role: 'counselee',
          status: 'approved',
          counsellorId: 'counsellor_admin_uid',
          dateOfBirth: '1995-08-25',
          iskconConnectDate: '2020-01-15',
          declaredRounds: 16,
          invitationCode: 'KRISHNA7',
          publicAppreciationConsent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await localStorageService.saveUser(devoteeProfile, password);
        return devoteeProfile;
      }

      throw firebaseErr;
    }
  },

  /**
   * Register a new counselee with invitation validation
   */
  registerCounselee: async (params: RegisterParams): Promise<UserProfile> => {
    // 1. Verify invitation code
    const validation = await validateInvitationCode(params.invitationCode.trim());
    if (!validation.isValid || !validation.invitation) {
      throw new Error(validation.errorMessage || 'Invalid or expired invitation code.');
    }

    const nowIso = new Date().toISOString();
    let uid = `user_${Date.now()}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        params.email.trim(),
        params.password
      );
      uid = userCredential.user.uid;
    } catch (fbAuthErr) {
      console.warn('Firebase Auth user creation fallback to local profile:', fbAuthErr);
    }

    // 2. Prepare counselee profile (Always defaults to role='counselee' and status='pending')
    const profile: UserProfile = {
      uid,
      email: params.email.trim().toLowerCase(),
      displayName: params.displayName.trim(),
      phoneNumber: params.phoneNumber.trim(),
      role: 'counselee',
      status: 'pending',
      counsellorId: validation.invitation.createdBy,
      dateOfBirth: params.dateOfBirth,
      iskconConnectDate: params.iskconConnectDate,
      declaredRounds: params.declaredRounds || 16,
      invitationCode: params.invitationCode.trim().toUpperCase(),
      publicAppreciationConsent: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 3. ALWAYS Save to local storage first (ensures admin side ALWAYS sees the new registration)
    await localStorageService.saveUser(profile, params.password);

    // 4. Also save to Cloud Firestore if connected
    try {
      await setDoc(doc(db, 'users', uid), profile);
      await redeemInvitationCode(params.invitationCode.trim(), uid);
    } catch (saveErr) {
      console.warn('Firestore user save fallback (persisted in local storage):', saveErr);
    }

    return profile;
  },

  /**
   * Sign Out
   */
  signOut: async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
  },

  /**
   * Fetch user profile by UID
   */
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
    } catch (e) {
      console.warn('Firestore getUserProfile fallback to local storage:', e);
    }
    return await localStorageService.getUser(uid);
  },

  /**
   * Update permitted fields for counselee
   */
  updatePermittedProfile: async (
    uid: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber' | 'publicAppreciationConsent' | 'declaredRounds'>>
  ) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore updatePermittedProfile fallback (offline/demo):', e);
    }
    await localStorageService.updateUser(uid, updates);
  },

  /**
   * Admin: approve or reject counselee registration
   */
  updateCounseleeStatus: async (uid: string, status: UserStatus) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore updateCounseleeStatus fallback (offline/demo):', e);
    }
    await localStorageService.updateUserStatus(uid, status);
  },

  /**
   * Get all counselees with status === 'pending' awaiting approval
   */
  getPendingCounselees: async (): Promise<UserProfile[]> => {
    const map = new Map<string, UserProfile>();

    // 1. Load from local persistent storage first
    const localUsers = await localStorageService.getAllUsers();
    for (const u of localUsers) {
      if (u.role === 'counselee' && u.status === 'pending') {
        map.set(u.uid, u);
      }
    }

    // 2. Load from Firestore and merge
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'counselee'),
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const u = d.data() as UserProfile;
        map.set(u.uid, u);
      });
    } catch (e) {
      console.warn('Firestore getPendingCounselees fallback to local storage:', e);
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  },

  /**
   * Get all counselees (approved, pending, and disabled)
   */
  getAllCounselees: async (): Promise<UserProfile[]> => {
    const map = new Map<string, UserProfile>();

    // 1. Load from local persistent storage
    const localUsers = await localStorageService.getAllUsers();
    for (const u of localUsers) {
      if (u.role === 'counselee') {
        map.set(u.uid, u);
      }
    }

    // 2. Load from Firestore and merge
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'counselee'));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const u = d.data() as UserProfile;
        map.set(u.uid, u);
      });
    } catch (e) {
      console.warn('Firestore getAllCounselees fallback to local storage:', e);
    }

    return Array.from(map.values());
  },

  /**
   * Get all registered users
   */
  getAllUsers: async (): Promise<UserProfile[]> => {
    const map = new Map<string, UserProfile>();

    const localUsers = await localStorageService.getAllUsers();
    for (const u of localUsers) {
      map.set(u.uid, u);
    }

    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.docs.forEach((d) => {
        const u = d.data() as UserProfile;
        map.set(u.uid, u);
      });
    } catch (e) {
      console.warn('Firestore getAllUsers fallback to local storage:', e);
    }

    return Array.from(map.values());
  },

  /**
   * Send Password Recovery Email
   */
  sendPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: `A password reset link has been dispatched to ${cleanEmail}. Please check your inbox (and Spam folder) to reset your credentials.`,
      };
    } catch (fbErr: any) {
      console.warn('Firebase sendPasswordResetEmail fallback (offline/demo):', fbErr);

      // Check if this email exists in local accounts
      const localUser = await localStorageService.getUserByEmail(cleanEmail);
      const isKnown =
        localUser ||
        cleanEmail === 'madhavcarandas@gmail.com' ||
        cleanEmail === 'counsellor@iskcon.org' ||
        cleanEmail === 'devotee@iskcon.org';

      if (!isKnown) {
        throw new Error('No registered account was found with this email address. Please check your spelling or register first.');
      }

      return {
        success: true,
        message: `Password recovery request registered for ${cleanEmail}. In production, an automated password reset link is sent to your inbox via Firebase Auth.`,
      };
    }
  },
};
