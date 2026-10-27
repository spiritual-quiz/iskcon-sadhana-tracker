export type UserRole = 'counsellor' | 'counselee';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'disabled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  counsellorId?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  iskconConnectDate?: string; // YYYY-MM-DD
  declaredRounds: number; // default daily round commitment, e.g. 16
  targetRoundsRequested?: number; // target round change requested by counselee, pending counsellor approval
  targetRoundsRequestedAt?: string; // ISO string when requested
  invitationCode?: string;
  publicAppreciationConsent: boolean;
  sadhanaRemindersEnabled?: boolean; // defaults to true (6 PM & 9 PM daily reminders)
  reminderOptOutRequested?: boolean; // student requested counsellor to turn off
  reminderOptOutRequestedAt?: string; // ISO string when requested
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface AuthState {
  user: UserProfile | null;
  firebaseUser: any | null;
  isLoading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejectedOrDisabled: boolean;
}
