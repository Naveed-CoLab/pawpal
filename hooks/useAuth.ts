import { useState, useEffect } from 'react';
import { authService, AuthUser } from '@/lib/auth';
import { Session } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ data: any; error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: string | null }>;
  signInWithGoogle: () => Promise<{ data: any; error: string | null }>;
  signInWithFacebook: () => Promise<{ data: any; error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ data: any; error: string | null }>;
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<{ session: Session | null; error: string | null }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Setting up auth listener');
    
    // Add listener for auth state changes
    const removeListener = authService.addListener((newUser, newSession) => {
      console.log('useAuth: Auth state changed', { 
        user: newUser?.email, 
        hasSession: !!newSession 
      });
      
      setUser(newUser);
      setSession(newSession);
      setIsLoading(false);
    });

    // If auth service is already initialized, get current state
    if (authService.isInitialized) {
      setUser(authService.user);
      setSession(authService.session);
      setIsLoading(false);
    }

    return removeListener;
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      const result = await authService.signUp(email, password, fullName);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.signIn(email, password);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithFacebook = async () => {
    setIsLoading(true);
    try {
      const result = await authService.signInWithFacebook();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    
    try {
      const result = await authService.signOut();
      return result;
    } catch (error: any) {
      return { error: error.message || 'Failed to sign out' };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPassword(email);
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    const result = await authService.updateProfile(updates);
    return result;
  };

  const validateSession = async () => {
    const isValid = await authService.validateSession();
    return isValid;
  };

  const refreshSession = async () => {
    const result = await authService.refreshSession();
    return result;
  };

  return {
    user,
    session,
    isAuthenticated: !!session,
    isLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    resetPassword,
    updateProfile,
    validateSession,
    refreshSession,
  };
}