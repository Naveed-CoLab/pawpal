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
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<{ session: any; error: string | null }>;
  verifyPasswordResetToken: (token: string) => Promise<{ session: any; error: string | null }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ data: any; error: string | null }>;
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<{ session: Session | null; error: string | null }>;
  retryLoadUserProfile: () => Promise<void>;
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
        hasSession: !!newSession,
        isInitialized: authService.isInitialized
      });
      
      // Update state immediately to prevent race conditions
      setUser(newUser);
      setSession(newSession);
      
      // Always set loading to false when auth service is initialized
      // This prevents components from showing "sign in" before auth completes
      if (authService.isInitialized) {
        console.log('✅ useAuth: Auth service initialized, setting isLoading=false');
        setIsLoading(false);
      }
      
      // Force immediate re-render for OAuth flows
      if (newSession && newUser) {
        console.log('✅ useAuth: Session and user available, forcing immediate update');
        setIsLoading(false); // Ensure loading is false when we have both session and user
      }
    });

    // If auth service is already initialized, get current state immediately
    if (authService.isInitialized) {
      console.log('useAuth: Auth service already initialized, getting current state');
      setUser(authService.user);
      setSession(authService.session);
      setIsLoading(false);
    } else {
      console.log('useAuth: Auth service not yet initialized, waiting...');
      // Set a timeout to prevent infinite loading if auth service fails to initialize
      const initTimeout = setTimeout(() => {
        if (!authService.isInitialized) {
          console.warn('⚠️ Auth service initialization timeout, setting loading to false');
          setIsLoading(false);
        }
      }, 5000); // 5 second timeout
      
      return () => {
        clearTimeout(initTimeout);
        removeListener();
      };
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

  const updatePassword = async (newPassword: string) => {
    return await authService.updatePassword(newPassword);
  };

  const setSessionFromTokens = async (accessToken: string, refreshToken: string) => {
    setIsLoading(true);
    try {
      const result = await authService.setSessionFromTokens(accessToken, refreshToken);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPasswordResetToken = async (token: string) => {
    setIsLoading(true);
    try {
      const result = await authService.verifyPasswordResetToken(token);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    setIsLoading(true);
    try {
      const result = await authService.updateProfile(updates);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const validateSession = async () => {
    const isValid = await authService.validateSession();
    return isValid;
  };

  const refreshSession = async () => {
    const result = await authService.refreshSession();
    return result;
  };

  const retryLoadUserProfile = async () => {
    await authService.retryLoadUserProfile();
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
    updatePassword,
    setSessionFromTokens,
    verifyPasswordResetToken,
    updateProfile,
    validateSession,
    refreshSession,
    retryLoadUserProfile,
  };
}