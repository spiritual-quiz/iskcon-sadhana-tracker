import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole, UserStatus } from '../types/auth';
import { validateInvitationCode, redeemInvitationCode } from './invitationService';

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
   * Listen to Firebase Auth state changes and load profile from Firestore
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
        } else {
          // If profile document does not exist yet
          callback(null, fbUser);
        }
      } catch (err) {
        console.warn('Error loading user profile:', err);
        callback(null, fbUser);
      }
    });
  },

  /**
   * Sign In with Email and Password
   */
  signIn: async (email: string, password: string): Promise<UserProfile> => {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = userCredential.user.uid;

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User profile record not found in database.');
    }

    const profile = userSnap.data() as UserProfile;
    if (profile.status === 'disabled') {
      await fbSignOut(auth);
      throw new Error('This account has been disabled. Please contact your counsellor.');
    }

    return profile;
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

    // 2. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    const uid = userCredential.user.uid;
    const nowIso = new Date().toISOString();

    // 3. Prepare initial counselee profile (Always defaults to role='counselee' and status='pending')
    const profile: UserProfile = {
      uid,
      email: params.email.trim().toLowerCase(),
      displayName: params.displayName.trim(),
      phoneNumber: params.phoneNumber.trim(),
      role: 'counselee', // Untrusted mobile registration can NEVER set admin
      status: 'pending', // Requires admin approval
      counsellorId: validation.invitation.createdBy,
      dateOfBirth: params.dateOfBirth,
      iskconConnectDate: params.iskconConnectDate,
      declaredRounds: params.declaredRounds || 16,
      invitationCode: params.invitationCode.trim().toUpperCase(),
      publicAppreciationConsent: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 4. Save to Firestore
    await setDoc(doc(db, 'users', uid), profile);

    // 5. Mark invitation as used
    await redeemInvitationCode(params.invitationCode.trim(), uid);

    return profile;
  },

  /**
   * Sign Out
   */
  signOut: async () => {
    await fbSignOut(auth);
  },

  /**
   * Fetch user profile by UID
   */
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  },

  /**
   * Update permitted fields for counselee
   */
  updatePermittedProfile: async (
    uid: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber' | 'publicAppreciationConsent'>>
  ) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Admin: approve or reject counselee registration
   */
  updateCounseleeStatus: async (uid: string, status: UserStatus) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  },
};
