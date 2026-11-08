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
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile, UserRole, UserStatus } from '../types/auth';
import { validateInvitationCode, redeemInvitationCode } from './invitationService';
import { localStorageService, LocalStoredUser } from './localStorageService';
import { fastCache } from './fastCacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        // Check if an active session UID exists in storage (prevents auto sign-out on web refresh)
        const storedUid = await AsyncStorage.getItem('bhakti_active_session_uid');
        if (storedUid) {
          let localUser = await localStorageService.getUser(storedUid);
          if (localUser && localUser.status === 'pending') {
            try {
              const fresh = await authService.getUserProfile(storedUid, true, localUser.email);
              if (fresh) localUser = fresh;
            } catch {}
          }
          if (localUser && localUser.status !== 'disabled') {
            callback(localUser, null);
            return;
          }
        }
        callback(null, null);
        return;
      }

      try {
        await AsyncStorage.setItem('bhakti_active_session_uid', fbUser.uid);
        const profile = await authService.getUserProfile(fbUser.uid, true, fbUser.email || undefined);
        if (profile) {
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

    // 1. Check Counsellor master credentials FIRST (handles counsellor in all environments)
    if (cleanEmail === 'madhavcarandas@gmail.com') {
      const localAdmin = await localStorageService.getUserByEmail(cleanEmail);
      const validCounsellorPassword = localAdmin?.password || 'Sadhana@108';

      // Accept their stored updated password OR the master default 'Sadhana@108'
      if (password === validCounsellorPassword || password === 'Sadhana@108') {
        const adminProfile: UserProfile = {
          uid: 'counsellor_admin_uid',
          email: 'madhavcarandas@gmail.com',
          displayName: 'Madhav Charan Das',
          phoneNumber: '+919876543210',
          role: 'counsellor',
          status: 'approved',
          declaredRounds: 16,
          publicAppreciationConsent: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        };
        await localStorageService.saveUser(adminProfile, password);
        await AsyncStorage.setItem('bhakti_active_session_uid', adminProfile.uid);
        return adminProfile;
      } else {
        throw new Error('Incorrect password. Please verify your credentials or tap "Forgot Password?".');
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = userCredential.user.uid;

      const profile = await authService.getUserProfile(uid, true, cleanEmail);

      if (profile) {
        if (profile.status === 'disabled') {
          await fbSignOut(auth);
          throw new Error('This account has been disabled. Please contact your counsellor.');
        }
        // Save to local cache as well with verified credentials
        await localStorageService.saveUser(profile, password);
        await AsyncStorage.setItem('bhakti_active_session_uid', uid);
        return profile;
      }

      // Check local storage if Firestore doc is missing
      const localUser = await localStorageService.getUser(uid);
      if (localUser) {
        if (localUser.status === 'disabled') {
          await fbSignOut(auth);
          throw new Error('This account has been disabled. Please contact your counsellor.');
        }
        await AsyncStorage.setItem('bhakti_active_session_uid', uid);
        return localUser;
      }

      throw new Error('User profile record not found in database.');
    } catch (firebaseErr: any) {
      // Check local storage for locally registered counselee
      const localMatch = await localStorageService.getUserByEmail(cleanEmail);
      if (localMatch && localMatch.password) {
        if (localMatch.status === 'disabled') {
          throw new Error('This account has been disabled. Please contact your counsellor.');
        }
        if (localMatch.password === password) {
          await AsyncStorage.setItem('bhakti_active_session_uid', localMatch.uid);
          return localMatch;
        } else {
          throw new Error('Incorrect password. Please verify your credentials or tap "Forgot Password?".');
        }
      }

      // STRICT PASSWORD VALIDATION:
      // If Firebase Auth rejected the credentials, throw 'Incorrect password' error immediately.
      // NEVER fall back to local storage or allow wrong password to log in.
      if (
        firebaseErr.code === 'auth/wrong-password' ||
        firebaseErr.code === 'auth/invalid-credential' ||
        firebaseErr.code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('Incorrect password. Please verify your credentials or tap "Forgot Password?".');
      }
      if (firebaseErr.code === 'auth/user-not-found') {
        throw new Error('No devotee account found with this email. Please verify your email or register as a new counselee.');
      }
      if (firebaseErr.code === 'auth/too-many-requests') {
        throw new Error('Access temporarily disabled due to multiple failed login attempts. Please try again later or reset password.');
      }

      throw firebaseErr;
    }
  },

  /**
   * Verify password credentials (used for fingerprint / touch sensor enrollment)
   */
  verifyCredentials: async (email: string, password: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'madhavcarandas@gmail.com') {
      const localAdmin = await localStorageService.getUserByEmail(cleanEmail);
      const validCounsellorPassword = localAdmin?.password || 'Sadhana@108';
      return password === validCounsellorPassword || password === 'Sadhana@108';
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      return true;
    } catch (e: any) {
      const local = await localStorageService.getUserByEmail(cleanEmail);
      return !!local?.password && local.password === password;
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
    } catch (fbAuthErr: any) {
      if (
        fbAuthErr.code === 'auth/email-already-in-use' ||
        fbAuthErr.message?.includes('email-already-in-use')
      ) {
        // Devotee was deleted from database and is now re-registering with the same email
        try {
          const existingCred = await signInWithEmailAndPassword(
            auth,
            params.email.trim(),
            params.password
          );
          uid = existingCred.user.uid;
        } catch (signInErr: any) {
          console.warn('Re-registration with same email using auth ID:', signInErr);
          if (
            signInErr.code === 'auth/wrong-password' ||
            signInErr.code === 'auth/invalid-credential'
          ) {
            throw new Error(
              'This email was previously registered. Please use your original password to re-register, or reset your password on the login screen.'
            );
          }
        }
      }
    }

    // 2. Check if user was already approved in Firestore (avoid reverting approved devotees to pending)
    let initialStatus: UserStatus = 'pending';
    try {
      const existingDoc = await getDoc(doc(db, 'users', uid));
      if (existingDoc.exists() && (existingDoc.data() as UserProfile).status === 'approved') {
        initialStatus = 'approved';
      } else {
        const qEmail = query(collection(db, 'users'), where('email', '==', params.email.trim().toLowerCase()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty && (snapEmail.docs[0].data() as UserProfile).status === 'approved') {
          initialStatus = 'approved';
        }
      }
    } catch {}

    // Prepare counselee profile
    const profile: UserProfile = {
      uid,
      email: params.email.trim().toLowerCase(),
      displayName: params.displayName.trim(),
      phoneNumber: params.phoneNumber.trim(),
      role: 'counselee',
      status: initialStatus,
      counsellorId: validation.invitation.createdBy,
      dateOfBirth: params.dateOfBirth,
      iskconConnectDate: params.iskconConnectDate,
      declaredRounds: params.declaredRounds || 16,
      invitationCode: params.invitationCode.trim().toUpperCase(),
      invitationName: validation.invitation.notes || validation.invitation.code,
      publicAppreciationConsent: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 3. Save to local storage (un-tombstones if previously deleted)
    await localStorageService.saveUser(profile, params.password);
    await AsyncStorage.setItem('bhakti_active_session_uid', uid);

    // 4. Also save to Cloud Firestore if connected
    try {
      await setDoc(doc(db, 'users', uid), profile);
      await redeemInvitationCode(params.invitationCode.trim(), uid);
    } catch (saveErr) {
      // Gracefully persisted in local storage
    }

    // 5. Invalidate caches so counsellor sees new registration immediately
    fastCache.invalidate('all_users');
    fastCache.invalidate('all_counselees');
    fastCache.invalidate('pending_counselees');

    return profile;
  },

  /**
   * Sign Out
   */
  signOut: async () => {
    try {
      await AsyncStorage.removeItem('bhakti_active_session_uid');
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase sign out error:', e);
    }
  },

  /**
   * Fetch user profile by UID
   */
  getUserProfile: async (uid: string, forceRemote = false, email?: string): Promise<UserProfile | null> => {
    // 1. Instant check from local persistent storage (0ms latency)
    const local = await localStorageService.getUser(uid);
    if (!forceRemote) {
      if (local && local.status !== 'pending') return local;
      if (email) {
        const localByEmail = await localStorageService.getUserByEmail(email);
        if (localByEmail && localByEmail.status !== 'pending') return localByEmail;
      }
    }

    try {
      const userRef = doc(db, 'users', uid);
      const snap = await Promise.race([
        getDoc(userRef),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]);
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        await localStorageService.saveUser(profile).catch(() => {});
        return profile;
      }

      // Fallback: check by email in Firestore
      const targetEmail = (email || local?.email || '').trim().toLowerCase();
      if (targetEmail) {
        const q = query(collection(db, 'users'), where('email', '==', targetEmail));
        const snapEmail = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        if (!snapEmail.empty) {
          const profile = snapEmail.docs[0].data() as UserProfile;
          await localStorageService.saveUser(profile).catch(() => {});
          return profile;
        }
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }
    return (await localStorageService.getUser(uid)) || (email ? await localStorageService.getUserByEmail(email) : null);
  },

  /**
   * Update permitted fields for counselee
   */
  updatePermittedProfile: async (
    uid: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber' | 'publicAppreciationConsent' | 'declaredRounds' | 'reminderOptOutRequested' | 'reminderOptOutRequestedAt' | 'sadhanaRemindersEnabled' | 'targetRoundsRequested' | 'targetRoundsRequestedAt' | 'photoURL' | 'invitationName'>>
  ) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      // Gracefully fall back to local storage in offline/hybrid mode
    }
    await localStorageService.updateUser(uid, updates);
  },

  /**
   * Counselee: Request counsellor approval to update daily chanting target rounds
   */
  requestTargetRoundsChange: async (uid: string, targetRounds: number) => {
    const nowIso = new Date().toISOString();
    await authService.updatePermittedProfile(uid, {
      targetRoundsRequested: targetRounds,
      targetRoundsRequestedAt: nowIso,
    });
    try {
      const user = await authService.getUserProfile(uid);
      const notifRef = doc(db, 'admin_notifications', `target_rounds_request_${uid}`);
      await setDoc(notifRef, {
        id: `target_rounds_request_${uid}`,
        type: 'target_rounds_request',
        userId: uid,
        userName: user?.displayName || 'Devotee',
        userEmail: user?.email || '',
        message: `${user?.displayName || 'Student'} requested to update daily chanting target from ${user?.declaredRounds || 16} to ${targetRounds} rounds.`,
        requestedRounds: targetRounds,
        currentRounds: user?.declaredRounds || 16,
        createdAt: nowIso,
        status: 'open',
      });
    } catch (e) {
      // Offline fallback
    }
  },

  /**
   * Counselee: Cancel pending target rounds change request
   */
  cancelTargetRoundsRequest: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        targetRoundsRequested: deleteField ? deleteField() : (null as any),
        targetRoundsRequestedAt: (null as any),
        updatedAt: new Date().toISOString(),
      });
      try {
        const notifRef = doc(db, 'admin_notifications', `target_rounds_request_${uid}`);
        await deleteDoc(notifRef);
      } catch (delErr) {
        // ignore
      }
    } catch (e) {
      // Offline fallback
    }
    await localStorageService.updateUser(uid, {
      targetRoundsRequested: undefined,
      targetRoundsRequestedAt: undefined,
    });
  },

  /**
   * Counsellor: Approve counselee's chanting target change request
   */
  approveTargetRoundsChange: async (uid: string, approvedRounds: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        declaredRounds: approvedRounds,
        targetRoundsRequested: (null as any),
        targetRoundsRequestedAt: (null as any),
        updatedAt: new Date().toISOString(),
      });
      try {
        const notifRef = doc(db, 'admin_notifications', `target_rounds_request_${uid}`);
        await deleteDoc(notifRef);
      } catch (delErr) {
        // ignore
      }
    } catch (e) {
      // Offline fallback
    }
    await localStorageService.updateUser(uid, {
      declaredRounds: approvedRounds,
      targetRoundsRequested: undefined,
      targetRoundsRequestedAt: undefined,
    });
  },

  /**
   * Counsellor: Reject counselee's chanting target change request
   */
  rejectTargetRoundsChange: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        targetRoundsRequested: (null as any),
        targetRoundsRequestedAt: (null as any),
        updatedAt: new Date().toISOString(),
      });
      try {
        const notifRef = doc(db, 'admin_notifications', `target_rounds_request_${uid}`);
        await deleteDoc(notifRef);
      } catch (delErr) {
        // ignore
      }
    } catch (e) {
      // Offline fallback
    }
    await localStorageService.updateUser(uid, {
      targetRoundsRequested: undefined,
      targetRoundsRequestedAt: undefined,
    });
  },

  /**
   * Counselee: Request counsellor to turn off daily reminders
   */
  requestReminderTurnOff: async (uid: string) => {
    const nowIso = new Date().toISOString();
    await authService.updatePermittedProfile(uid, {
      reminderOptOutRequested: true,
      reminderOptOutRequestedAt: nowIso,
    });
    try {
      const user = await authService.getUserProfile(uid);
      const notifRef = doc(db, 'admin_notifications', `reminder_opt_out_${uid}`);
      await setDoc(notifRef, {
        id: `reminder_opt_out_${uid}`,
        type: 'reminder_opt_out_request',
        userId: uid,
        userName: user?.displayName || 'Devotee',
        userEmail: user?.email || '',
        message: `${user?.displayName || 'Student'} requested to switch off daily sadhana reminders.`,
        createdAt: nowIso,
        status: 'open',
      });
    } catch (e) {
      // Offline fallback
    }
  },

  /**
   * Counsellor: Toggle daily reminders on/off for a counselee
   */
  setCounseleeReminders: async (uid: string, enabled: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        sadhanaRemindersEnabled: enabled,
        reminderOptOutRequested: false,
        updatedAt: new Date().toISOString(),
      });
      try {
        const notifRef = doc(db, 'admin_notifications', `reminder_opt_out_${uid}`);
        await deleteDoc(notifRef);
      } catch (delErr) {
        // ignore
      }
    } catch (e) {
      // Gracefully fall back to local storage in offline/hybrid mode
    }
    await localStorageService.updateUser(uid, {
      sadhanaRemindersEnabled: enabled,
      reminderOptOutRequested: false,
    });
  },

  /**
   * Admin: approve or reject counselee registration
   */
  updateCounseleeStatus: async (uid: string, status: UserStatus, email?: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      // If doc not found by uid ID, try querying by uid field or email
      try {
        const qUid = query(collection(db, 'users'), where('uid', '==', uid));
        const snapUid = await getDocs(qUid);
        if (!snapUid.empty) {
          await updateDoc(snapUid.docs[0].ref, {
            status,
            updatedAt: new Date().toISOString(),
          });
        } else if (email) {
          const qEmail = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            await updateDoc(snapEmail.docs[0].ref, {
              status,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch {}
    }
    await localStorageService.updateUserStatus(uid, status, email);
    fastCache.invalidate('all_users');
    fastCache.invalidate('all_counselees');
    fastCache.invalidate('pending_counselees');
  },

  /**
   * Admin: permanently delete a counselee and purge all related local & cloud records
   */
  deleteCounselee: async (uid: string, email?: string): Promise<void> => {
    // 1. Delete user document from Cloud Firestore
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);

      // Clean up by uid query in case doc id was different
      const qUid = query(collection(db, 'users'), where('uid', '==', uid));
      const snapUid = await getDocs(qUid);
      await Promise.all(snapUid.docs.map((d) => deleteDoc(d.ref)));

      // Clean up by email in case doc had alternate id
      if (email) {
        const qEmail = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
        const snapEmail = await getDocs(qEmail);
        await Promise.all(snapEmail.docs.map((d) => deleteDoc(d.ref)));
      }

      // 2. Cascade delete all sub-records for this user from Firestore
      const collectionsToClean = [
        { name: 'sadhana_entries', field: 'userId' },
        { name: 'monitoring_alerts', field: 'userId' },
        { name: 'weekly_attendance', field: 'userId' },
        { name: 'monthly_satsanga', field: 'userId' },
        { name: 'notifications', field: 'userId' },
        { name: 'shared_weekly_summaries', field: 'userId' },
        { name: 'shared_monthly_summaries', field: 'userId' },
        { name: 'follow_ups', field: 'userId' },
      ];

      for (const col of collectionsToClean) {
        try {
          const q = query(collection(db, col.name), where(col.field, '==', uid));
          const snap = await getDocs(q);
          const deletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
        } catch {
          // ignore individual sub-collection error
        }
      }
    } catch (e) {
      // Safe fallback in offline/hybrid mode
    }

    // 3. Permanently purge from local storage (including records & tombstones)
    await localStorageService.deleteUser(uid, email);
    fastCache.invalidate('all_users');
    fastCache.invalidate('all_counselees');
    fastCache.invalidate('pending_counselees');
  },

  /**
   * Get all counselees with status === 'pending' awaiting approval
   */
  getPendingCounselees: async (forceRefresh = false): Promise<UserProfile[]> => {
    // 0. Only check cache if not force refresh
    if (!forceRefresh) {
      const cached = await fastCache.get<UserProfile[]>('pending_counselees');
      if (cached && cached.length > 0) {
        return cached;
      }
    } else {
      await fastCache.invalidate('pending_counselees');
    }

    const deletedIds = await localStorageService.getDeletedUserIds();
    const deletedSet = new Set(deletedIds.map((id) => id.toLowerCase()));

    // 1. Query Firestore (source of truth) with 2500ms timeout
    try {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'pending')
      );
      const snap = await Promise.race([
        getDocs(q),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
      ]);

      const list: UserProfile[] = [];
      if (!snap.empty) {
        for (const d of snap.docs) {
          const u = d.data() as UserProfile;
          if (
            u.role !== 'counsellor' &&
            u.status === 'pending' &&
            !deletedSet.has(u.uid.toLowerCase()) &&
            (!u.email || !deletedSet.has(u.email.toLowerCase()))
          ) {
            list.push(u);
            await localStorageService.saveUser(u).catch(() => {});
          }
        }
      }

      list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      await fastCache.set('pending_counselees', list, 15);
      return list;
    } catch (e) {
      // Offline fallback: only use local storage if Firestore failed
      const localUsers = await localStorageService.getAllUsers();
      const localPending = localUsers.filter(
        (u) =>
          u.role !== 'counsellor' &&
          u.status === 'pending' &&
          !deletedSet.has(u.uid.toLowerCase()) &&
          (!u.email || !deletedSet.has(u.email.toLowerCase()))
      );
      return localPending;
    }
  },

  /**
   * Get all counselees (approved, pending, and disabled)
   */
  getAllCounselees: async (forceRefresh = false): Promise<UserProfile[]> => {
    // 0. Memory cache check
    if (!forceRefresh) {
      const cached = await fastCache.get<UserProfile[]>('all_counselees');
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    const deletedIds = await localStorageService.getDeletedUserIds();
    const deletedSet = new Set(deletedIds.map((id) => id.toLowerCase()));
    const map = new Map<string, UserProfile>();

    // 1. Load from Firestore first (source of truth) with 2000ms timeout
    try {
      const snap = await Promise.race([
        getDocs(collection(db, 'users')),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      if (!snap.empty) {
        for (const d of snap.docs) {
          const u = d.data() as UserProfile;
          if (
            u.role !== 'counsellor' &&
            !deletedSet.has(u.uid.toLowerCase()) &&
            (!u.email || !deletedSet.has(u.email.toLowerCase()))
          ) {
            map.set(u.uid, u);
            await localStorageService.saveUser(u).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }

    // 2. Fall back to local persistent storage only if Firestore returned 0 docs (offline)
    if (map.size === 0) {
      const localUsers = await localStorageService.getAllUsers();
      for (const u of localUsers) {
        if (
          u.role !== 'counsellor' &&
          !deletedSet.has(u.uid.toLowerCase()) &&
          (!u.email || !deletedSet.has(u.email.toLowerCase()))
        ) {
          map.set(u.uid, u);
        }
      }
    }

    const result = Array.from(map.values()).sort(
      (a, b) => (a.displayName || '').localeCompare(b.displayName || '')
    );
    await fastCache.set('all_counselees', result, 30);
    return result;
  },

  /**
   * Get all registered users
   */
  getAllUsers: async (forceRefresh = false): Promise<UserProfile[]> => {
    // 0. Memory cache check
    if (!forceRefresh) {
      const cached = await fastCache.get<UserProfile[]>('all_users');
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    const deletedIds = await localStorageService.getDeletedUserIds();
    const deletedSet = new Set(deletedIds.map((id) => id.toLowerCase()));
    const map = new Map<string, UserProfile>();

    try {
      const snap = await Promise.race([
        getDocs(collection(db, 'users')),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      if (!snap.empty) {
        for (const d of snap.docs) {
          const u = d.data() as UserProfile;
          if (
            !deletedSet.has(u.uid.toLowerCase()) &&
            (!u.email || !deletedSet.has(u.email.toLowerCase()))
          ) {
            map.set(u.uid, u);
            await localStorageService.saveUser(u).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Gracefully fall back to local storage
    }

    if (map.size === 0) {
      const localUsers = await localStorageService.getAllUsers();
      for (const u of localUsers) {
        if (
          !deletedSet.has(u.uid.toLowerCase()) &&
          (!u.email || !deletedSet.has(u.email.toLowerCase()))
        ) {
          map.set(u.uid, u);
        }
      }
    }

    const result = Array.from(map.values());
    if (result.length > 0) {
      await fastCache.set('all_users', result, 90);
    }
    return result;
  },

  /**
   * Send Password Recovery Email
   */
  sendPasswordReset: async (
    email: string
  ): Promise<{ success: boolean; message: string; isDemoMode?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    // Check if this email exists in system or local accounts
    const localUser = await localStorageService.getUserByEmail(cleanEmail);
    const isKnown =
      localUser ||
      cleanEmail === 'madhavcarandas@gmail.com' ||
      cleanEmail === 'devotee@iskcon.org';

    if (!isKnown) {
      throw new Error('No registered account was found with this email address. Please check your spelling or register first.');
    }

    // Counsellor master account reset: directly reset to default Sadhana@108
    if (cleanEmail === 'madhavcarandas@gmail.com') {
      await authService.resetPasswordDirectly(cleanEmail, 'Sadhana@108');
      return {
        success: true,
        message: 'Counsellor password has been reset to default "Sadhana@108". You can now sign in with email: madhavcarandas@gmail.com and password: Sadhana@108',
      };
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: `A password reset link has been dispatched to ${cleanEmail}. Please check your inbox (and Spam folder) to reset your credentials.`,
      };
    } catch (fbErr: any) {
      // Offline / fallback mode
      await authService.resetPasswordDirectly(cleanEmail, 'Sadhana@108');
      return {
        success: true,
        isDemoMode: true,
        message: `Password has been reset to default "Sadhana@108" for ${cleanEmail}. You can now sign in with your credentials.`,
      };
    }
  },

  /**
   * Reset user password directly on the device
   */
  resetPasswordDirectly: async (
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const updated = await localStorageService.updateUserPassword(cleanEmail, newPassword);
    if (!updated) {
      throw new Error('No registered account was found with this email address.');
    }

    // Also update biometric storage if enrolled so fingerprint stays in sync with new password
    try {
      const rawBio = await AsyncStorage.getItem('bhakti_biometric_accounts_map');
      if (rawBio) {
        const map = JSON.parse(rawBio);
        if (map[cleanEmail]) {
          map[cleanEmail].password = newPassword;
          await AsyncStorage.setItem('bhakti_biometric_accounts_map', JSON.stringify(map));
        }
      }
    } catch {}

    return {
      success: true,
      message: `Password has been successfully updated for ${cleanEmail}! You can now sign in with your new password.`,
    };
  },

  /**
   * Clear all app in-memory & persistent cache
   */
  clearAppCache: async (): Promise<void> => {
    await fastCache.clearAllCache();
  },
};
