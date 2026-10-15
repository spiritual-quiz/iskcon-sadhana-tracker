import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService, RegisterParams } from '../services/authService';
import { UserProfile, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, pass: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
  updateDeclaredRounds: (newRounds: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthState((profile, fbUser) => {
      setUser(profile);
      setFirebaseUser(fbUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const profile = await authService.signIn(email, pass);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: RegisterParams) => {
    setIsLoading(true);
    try {
      const profile = await authService.registerCounselee(params);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const reloadUser = async () => {
    if (firebaseUser?.uid) {
      const refreshed = await authService.getUserProfile(firebaseUser.uid);
      if (refreshed) {
        setUser(refreshed);
      }
    }
  };

  const updateDeclaredRounds = async (newRounds: number) => {
    if (!user?.uid) return;
    try {
      await authService.updatePermittedProfile(user.uid, { declaredRounds: newRounds });
    } catch (e) {
      console.warn('Error updating declared rounds:', e);
    }
    setUser((prev) => (prev ? { ...prev, declaredRounds: newRounds } : prev));
  };

  const isAdmin = user?.role === 'counsellor';
  const isApproved = user?.status === 'approved';
  const isPending = user?.status === 'pending';
  const isRejectedOrDisabled = user?.status === 'rejected' || user?.status === 'disabled';

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAdmin,
        isApproved,
        isPending,
        isRejectedOrDisabled,
        signIn,
        register,
        signOut,
        reloadUser,
        updateDeclaredRounds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
