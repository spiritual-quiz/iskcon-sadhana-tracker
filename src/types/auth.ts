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
  invitationCode?: string;
  publicAppreciationConsent: boolean;
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
