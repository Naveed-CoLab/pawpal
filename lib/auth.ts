import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Removed conflicting supabaseGoogleAuth import - using inAppGoogleAuth instead

// Configure auth redirect URL based on platform
const redirectUrl = Platform.OS === 'web' 
  ? `${window.location.origin}/auth/callback` 
  : 'vetpaw://auth-callback';

export interface AuthUser {
  id: string;
  auth_user_id: string;
  email: string;
  name?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  provider: 'email' | 'google' | 'facebook';
  provider_id?: string;
  created_at: string;
  last_login: string;
}

type AuthStateListener = (user: AuthUser | null, session: Session | null) => void;

class AuthService {
  private static instance: AuthService;
  private currentSession: Session | null = null;
  private currentUser: AuthUser | null = null;
  private listeners: AuthStateListener[] = [];
  private initialized = false;
  private _lastValidationLog: number = 0;
  private _lastSuccessLog: number = 0;

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth() {
    try {
      console.log('🚀 Initializing auth service...');
      
      // Get initial session and validate it
      console.log('📋 Getting initial session from Supabase...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        this.currentSession = null;
        this.currentUser = null;
        this.initialized = true;
        this.notifyListeners(null, null);
        return;
      }

      if (session) {
        console.log('✅ Found existing session for:', session.user.email);
        
        // Validate that the session is still valid
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.warn('⚠️ Session found but user validation failed, clearing session');
            this.currentSession = null;
            this.currentUser = null;
          } else {
            console.log('✅ Session validated successfully');
            this.currentSession = session;
            
            // Try to load user profile, but don't fail initialization if it doesn't work
            try {
              await this.loadUserProfile(session.user);
              console.log('✅ User profile loaded successfully during initialization');
            } catch (profileError) {
              console.warn('⚠️ Failed to load user profile during initialization, creating minimal user object:', profileError);
              // Create a minimal user object from session data if profile loading fails
              this.currentUser = {
                id: session.user.id,
                auth_user_id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
                provider: (session.user.app_metadata?.provider === 'google' ? 'google' : 
                          session.user.app_metadata?.provider === 'facebook' ? 'facebook' : 'email') as 'email' | 'google' | 'facebook',
                created_at: session.user.created_at,
                last_login: new Date().toISOString(),
              };
              console.log('✅ Created minimal user object from session data during initialization');
            }
          }
        } catch (validationError) {
          console.error('❌ Session validation failed during initialization:', validationError);
          this.currentSession = null;
          this.currentUser = null;
        }
      } else {
        console.log('ℹ️ No existing session found');
        this.currentSession = null;
        this.currentUser = null;
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        this.currentSession = session;
        
        if (session?.user) {
          console.log('👤 Processing user session...');
          // Try to load user profile, but don't fail if it doesn't work
          try {
            await this.loadUserProfile(session.user);
            console.log('✅ User profile loaded successfully on auth change');
          } catch (profileError) {
            console.warn('⚠️ Failed to load user profile on auth change, creating minimal user object:', profileError);
            // Create a minimal user object from session data if profile loading fails
            this.currentUser = {
              id: session.user.id,
              auth_user_id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || '',
              provider: (session.user.app_metadata?.provider === 'google' ? 'google' : 
                        session.user.app_metadata?.provider === 'facebook' ? 'facebook' : 'email') as 'email' | 'google' | 'facebook',
              created_at: session.user.created_at,
              last_login: new Date().toISOString(),
            };
            console.log('✅ Created minimal user object from session data on auth change');
          }
        } else {
          console.log('🚫 No user in session');
          this.currentUser = null;
        }
        
        console.log('📢 Notifying listeners:', {
          hasUser: !!this.currentUser,
          userEmail: this.currentUser?.email,
          hasSession: !!this.currentSession
        });
        
        this.notifyListeners(this.currentUser, this.currentSession);
      });

      console.log('🎯 Auth initialization complete:', {
        hasUser: !!this.currentUser,
        hasSession: !!this.currentSession,
        userEmail: this.currentUser?.email
      });
      
      this.initialized = true;
      this.notifyListeners(this.currentUser, this.currentSession);
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      this.currentSession = null;
      this.currentUser = null;
      this.initialized = true;
      this.notifyListeners(null, null);
    }
  }

  private async loadUserProfile(user: User) {
    try {
      console.log('Loading user profile for:', user.email);
      
      // First, try to find existing user by auth_user_id
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .limit(1);

      if (selectError) {
        console.error('Error querying user profile:', selectError);
        throw selectError;
      }

      if (existingUser && existingUser.length > 0) {
        console.log('User profile found:', existingUser[0].email);
        this.currentUser = existingUser[0];
        return;
      }

      // If no user found by auth_user_id, try to find by email
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email!)
        .limit(1);

      if (emailError) {
        console.error('Error querying user by email:', emailError);
        throw emailError;
      }

      if (emailUser && emailUser.length > 0) {
        console.log('User found by email, updating auth_user_id:', emailUser[0].email);
        // Update the existing user record with the new auth_user_id
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ auth_user_id: user.id })
          .eq('id', emailUser[0].id)
          .select()
          .limit(1);

        if (updateError) {
          console.error('Error updating user auth_user_id:', updateError);
          throw updateError;
        }

        if (updatedUser && updatedUser.length > 0) {
          console.log('User profile updated with auth_user_id:', updatedUser[0].email);
          this.currentUser = updatedUser[0];
          return;
        }
      }

      // If no user found at all, create a new one
      console.log('No user profile found, creating one...');
      await this.createUserProfile(user);
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw error;
    }
  }

  private async createUserProfile(user: User) {
    try {
      const userData = {
        auth_user_id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        provider: (user.app_metadata?.provider === 'google' ? 'google' : 
                  user.app_metadata?.provider === 'facebook' ? 'facebook' : 'email'),
        provider_id: user.user_metadata?.provider_id,
      };

      // Use upsert to handle potential conflicts
      const { data, error } = await supabase
        .from('users')
        .upsert(userData, { 
          onConflict: 'auth_user_id',
          ignoreDuplicates: false 
        })
        .select()
        .limit(1);

      if (error) {
        // If upsert fails due to email conflict, try to update existing record
        if (error.code === '23505' && error.message && error.message.includes('users_email_key')) {
          console.log('Email conflict detected, attempting to update existing user...');
          
          // Find the existing user by email and update their auth_user_id
          const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', userData.email)
            .limit(1);

          if (findError) {
            console.error('Error finding existing user by email:', findError);
            throw findError;
          }

          if (existingUser && existingUser.length > 0) {
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ 
                auth_user_id: user.id,
                full_name: userData.full_name,
                avatar_url: userData.avatar_url,
                provider: userData.provider,
                provider_id: userData.provider_id
              })
              .eq('id', existingUser[0].id)
              .select()
              .limit(1);

            if (updateError) {
              console.error('Error updating existing user:', updateError);
              throw updateError;
            }

            if (updatedUser && updatedUser.length > 0) {
              console.log('Existing user profile updated:', updatedUser[0].email);
              this.currentUser = updatedUser[0];
              return;
            }
          }
        }
        
        console.error('Error creating user profile:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('User profile created:', data[0].email);
        this.currentUser = data[0];
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  private notifyListeners(user: AuthUser | null, session: Session | null) {
    this.listeners.forEach(listener => {
      try {
        listener(user, session);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  public addListener(listener: AuthStateListener) {
    this.listeners.push(listener);
    
    // Immediately notify with current state if initialized
    if (this.initialized) {
      listener(this.currentUser, this.currentSession);
    }
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Email/Password Authentication
  async signUp(email: string, password: string, fullName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Social Authentication
  async signInWithGoogle() {
    try {
      console.log('🚀 Starting optimized Google sign-in...');
      
      // Use the optimized Google auth service
      const { optimizedGoogleAuth } = await import('./googleAuthServiceOptimized');
      const result = await optimizedGoogleAuth.signIn();
      
      if (result.success) {
        console.log('✅ Optimized Google sign-in successful');
        return { data: result.user, error: null };
      } else {
        console.error('❌ Optimized Google sign-in failed:', result.error);
        return { data: null, error: result.error || 'Google sign-in failed' };
      }
    } catch (error: any) {
      console.error('❌ Optimized Google sign-in error:', error);
      return { data: null, error: error.message || 'Google sign-in failed' };
    }
  }

  async signInWithFacebook() {
    try {
      // For mobile platforms, we don't have Facebook auth implemented yet
      if (Platform.OS !== 'web') {
        throw new Error("Facebook login is not yet available on mobile");
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // Password Reset
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web' 
          ? `${window.location.origin}/auth/reset-password` 
          : 'vetpaw://auth/reset-password',
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Alternative password reset for debugging
  async resetPasswordAlternative(email: string) {
    try {
      console.log('🔄 Trying alternative password reset approach...');
      
      // Try with different redirect formats
      const redirectOptions = [
        'vetpaw://auth/reset-password',
        'vetpaw://auth-callback',
        'com.vetpaw.vetpawaiapp://auth/reset-password',
      ];

      for (const redirectUrl of redirectOptions) {
        console.log(`📧 Attempting reset with redirect: ${redirectUrl}`);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });

        if (!error) {
          console.log(`✅ Password reset sent successfully with redirect: ${redirectUrl}`);
          return { error: null, redirectUsed: redirectUrl };
        } else {
          console.log(`❌ Failed with redirect ${redirectUrl}:`, error.message);
        }
      }

      throw new Error('All redirect URL attempts failed');
    } catch (error: any) {
      console.error('❌ Alternative password reset failed:', error);
      return { error: error.message };
    }
  }

  // Update Password
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Set session from password reset tokens
  async setSessionFromTokens(accessToken: string, refreshToken: string) {
    try {
      console.log('=== SET SESSION FROM TOKENS DEBUG ===');
      console.log('Access token received:', accessToken ? 'YES' : 'NO');
      console.log('Refresh token received:', refreshToken ? 'YES' : 'NO');
      console.log('Access token length:', accessToken?.length);
      console.log('Refresh token length:', refreshToken?.length);
      console.log('Access token preview:', accessToken?.substring(0, 50) + '...');
      console.log('Refresh token preview:', refreshToken?.substring(0, 50) + '...');
      
      const { data: { session }, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      console.log('Supabase setSession result:');
      console.log('- Session:', session ? 'CREATED' : 'NULL');
      console.log('- Error:', error ? error.message : 'NONE');
      
      if (error) {
        console.error('❌ Supabase setSession error details:', {
          message: error.message,
          status: error.status,
        });
        throw error;
      }

      if (!session) {
        console.error('❌ No session returned from setSession');
        throw new Error('No session returned from tokens');
      }

      console.log('✅ Session created successfully:');
      console.log('- User ID:', session.user.id);
      console.log('- User email:', session.user.email);
      console.log('- Expires at:', new Date(session.expires_at! * 1000).toISOString());
      
      this.currentSession = session;
      
      // Load user profile
      if (session.user) {
        console.log('📝 Loading user profile...');
        await this.loadUserProfile(session.user);
        console.log('✅ User profile loaded');
      }
      
      this.notifyListeners(this.currentUser, this.currentSession);
      return { session, error: null };
    } catch (error: any) {
      console.error('❌ Failed to set session from tokens:', {
        message: error.message,
        stack: error.stack,
        errorObject: error,
      });
      return { session: null, error: error.message };
    }
  }

  // Profile Management
  async updateProfile(updates: Partial<AuthUser>) {
    try {
      if (!this.currentUser || !this.currentSession) {
        throw new Error('No authenticated user');
      }

      console.log('Updating profile for user ID:', this.currentSession.user.id);
      console.log('Updates to apply:', updates);

      // Update auth metadata if needed
      const authUpdates: any = {};
      if (updates.full_name || updates.name) {
        authUpdates.data = { 
          full_name: updates.full_name || updates.name,
          name: updates.name || updates.full_name 
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        console.log('Updating auth metadata:', authUpdates);
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) {
          console.error('Auth metadata update error:', authError);
          throw authError;
        }
      }

      // Update user profile in database using the auth user ID
      console.log('Updating database record for user ID:', this.currentSession.user.id);
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('auth_user_id', this.currentSession.user.id)
        .select()
        .limit(1);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('Profile updated successfully in database:', data[0]);
        this.currentUser = data[0];
        this.notifyListeners(this.currentUser, this.currentSession);
        return { data: data[0], error: null };
      }

      console.error('No data returned from update');
      return { data: null, error: 'Failed to update profile - no data returned' };
    } catch (error: any) {
      console.error('Profile update error:', error);
      return { data: null, error: error.message };
    }
  }

  // Sign Out - Enhanced to clear all session data
  async signOut() {
    try {
      console.log('AuthService: Starting enhanced sign out process');
      
      // Clear local state first to ensure UI updates immediately
      this.currentSession = null;
      this.currentUser = null;
      
      // Notify listeners immediately of state change
      this.notifyListeners(null, null);
      
      // Clear all auth-related AsyncStorage data
      try {
        const keys = await AsyncStorage.getAllKeys();
        const authKeys = keys.filter(key => 
          key.includes('supabase') || 
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('token') ||
          key.includes('user')
        );
        
        if (authKeys.length > 0) {
          await AsyncStorage.multiRemove(authKeys);
          console.log('AuthService: Cleared AsyncStorage keys:', authKeys);
        }
      } catch (storageError) {
        console.warn('AuthService: Error clearing AsyncStorage:', storageError);
      }
      
      // Sign out from Supabase with timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sign out timeout after 5 seconds')), 5000);
      });
      
      const signOutPromise = supabase.auth.signOut({ scope: 'global' });
      
      try {
        const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('AuthService: Supabase signOut error:', error);
        } else {
          console.log('AuthService: Supabase sign out completed successfully');
        }
      } catch (timeoutError) {
        console.warn('AuthService: Supabase signOut timed out, but local state is cleared');
      }

      // Force clear any remaining session data
      try {
        // This will force Supabase to clear any cached session
        await supabase.auth.getSession();
      } catch (error) {
        console.log('AuthService: Session already cleared');
      }

      // Additional cleanup: Clear any remaining auth state
      try {
        // Force refresh the auth state to ensure it's cleared
        await supabase.auth.refreshSession();
      } catch (error) {
        console.log('AuthService: Session refresh failed (expected after logout)');
      }

      console.log('AuthService: Enhanced sign out process completed');
      return { error: null };
    } catch (error: any) {
      console.error('AuthService: Sign out error:', error);
      
      // Ensure local state is cleared even if everything fails
      this.currentSession = null;
      this.currentUser = null;
      this.notifyListeners(null, null);
      
      return { error: null };
    }
  }

  // Getters
  get session(): Session | null {
    return this.currentSession;
  }

  get user(): AuthUser | null {
    return this.currentUser;
  }

  get isAuthenticated(): boolean {
    return !!this.currentSession;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  // Session validation - optimized for speed and strict logout handling
  async validateSession(): Promise<boolean> {
    try {
      // Only log once per second at most
      const now = Date.now();
      if (!this._lastValidationLog || now - this._lastValidationLog > 1000) {
        console.log('Validating session...');
        this._lastValidationLog = now;
      }
      
      // Quick session check with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 2000)
      );
      
      const { data: { session: currentSession }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      if (error) {
        console.error('Session validation error:', error);
        this.currentSession = null;
        this.currentUser = null;
        this.notifyListeners(null, null);
        return false;
      }
      
      if (!currentSession) {
        console.log('No active session found');
        this.currentSession = null;
        this.currentUser = null;
        this.notifyListeners(null, null);
        return false;
      }

      // Additional check: Verify the session is not expired
      const nowTimestamp = Math.floor(Date.now() / 1000);
      if (currentSession.expires_at && currentSession.expires_at < nowTimestamp) {
        console.log('Session has expired, clearing session data');
        this.currentSession = null;
        this.currentUser = null;
        this.notifyListeners(null, null);
        
        // Clear expired session from storage
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutError) {
          console.warn('Error clearing expired session:', signOutError);
        }
        
        return false;
      }

      let validSession = currentSession;

      // Quick token expiration check
      if (validSession.expires_at && validSession.expires_at < nowTimestamp) {
        console.log('Session token expired, attempting refresh...');
        try {
          const refreshPromise = supabase.auth.refreshSession();
          const refreshTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Refresh timeout')), 3000)
          );
          
          const { data: refreshData, error: refreshError } = await Promise.race([
            refreshPromise,
            refreshTimeoutPromise
          ]);
          
          if (refreshError || !refreshData.session) {
            console.log('Session refresh failed, signing out');
            await this.signOut();
            return false;
          }
          validSession = refreshData.session;
          console.log('Session refreshed successfully');
        } catch (refreshError) {
          console.error('Session refresh error:', refreshError);
          await this.signOut();
          return false;
        }
      }

      this.currentSession = validSession;
      
      // Fast user profile loading with immediate fallback
      if (!this.currentUser && validSession.user) {
        try {
          // Create minimal user object immediately for fast response
          this.currentUser = {
            id: validSession.user.id,
            auth_user_id: validSession.user.id,
            email: validSession.user.email || '',
            name: validSession.user.user_metadata?.full_name || validSession.user.user_metadata?.name || '',
            full_name: validSession.user.user_metadata?.full_name || validSession.user.user_metadata?.name || validSession.user.email?.split('@')[0] || '',
            provider: (validSession.user.app_metadata?.provider === 'google' ? 'google' : 
                      validSession.user.app_metadata?.provider === 'facebook' ? 'facebook' : 'email') as 'email' | 'google' | 'facebook',
            created_at: validSession.user.created_at,
            last_login: new Date().toISOString(),
          };
          
          console.log('✅ Created minimal user object for immediate use');
          
          // Notify listeners immediately with minimal user data
          this.notifyListeners(this.currentUser, this.currentSession);
          
          // Load full profile in background (don't block validation)
          setTimeout(() => {
            this.loadUserProfileInBackground(validSession.user).catch(err => 
              console.warn('Background profile load failed:', err)
            );
          }, 100);
          
          return true; // Return immediately with minimal user data
        } catch (profileError) {
          console.warn('Error creating minimal user object:', profileError);
          // Still return true if we have a valid session
          return true;
        }
      }

      this.notifyListeners(this.currentUser, this.currentSession);
      
      // Only log success once per minute at most
      if (!this._lastSuccessLog || now - this._lastSuccessLog > 60000) {
        console.log('Session validated successfully');
        this._lastSuccessLog = now;
      }
      
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      this.currentSession = null;
      this.currentUser = null;
      this.notifyListeners(null, null);
      return false;
    }
  }

  // Background profile loading - doesn't block session validation
  private async loadUserProfileInBackground(user: User) {
    try {
      console.log('Loading user profile in background for:', user.email);
      
      // Quick profile check with timeout
      const profilePromise = this.loadUserProfile(user);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout')), 5000)
      );
      
      await Promise.race([profilePromise, timeoutPromise]);
      console.log('Background profile load completed');
      
      // Update listeners with full profile data
      this.notifyListeners(this.currentUser, this.currentSession);
    } catch (error) {
      console.warn('Background profile load failed:', error);
      // Don't fail the session validation if profile loading fails
    }
  }

  // Refresh session
  async refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      this.currentSession = session;
      this.notifyListeners(this.currentUser, this.currentSession);
      return { session, error: null };
    } catch (error: any) {
      return { session: null, error: error.message };
    }
  }

  // Verify password reset token directly
  async verifyPasswordResetToken(token: string) {
    try {
      console.log('=== VERIFY PASSWORD RESET TOKEN ===');
      console.log('Token received:', token ? 'YES' : 'NO');
      console.log('Token length:', token?.length);
      console.log('Token preview:', token?.substring(0, 20) + '...');
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      console.log('Supabase verifyOtp result:');
      console.log('- Session:', data.session ? 'CREATED' : 'NULL');
      console.log('- User:', data.user ? 'FOUND' : 'NULL');
      console.log('- Error:', error ? error.message : 'NONE');
      
      if (error) {
        console.error('❌ Token verification error:', error);
        throw error;
      }

      if (!data.session) {
        console.error('❌ No session returned from token verification');
        throw new Error('No session returned from token verification');
      }

      console.log('✅ Token verified successfully:');
      console.log('- User ID:', data.session.user.id);
      console.log('- User email:', data.session.user.email);
      
      this.currentSession = data.session;
      
      // Load user profile
      if (data.session.user) {
        console.log('📝 Loading user profile...');
        await this.loadUserProfile(data.session.user);
        console.log('✅ User profile loaded');
      }
      
      this.notifyListeners(this.currentUser, this.currentSession);
      return { session: data.session, error: null };
    } catch (error: any) {
      console.error('❌ Failed to verify password reset token:', {
        message: error.message,
        errorObject: error,
      });
      return { session: null, error: error.message };
    }
  }
}

export const authService = AuthService.getInstance();

// useGoogleLogin hook removed - using inAppGoogleAuth service instead
// See /lib/googleAuthInApp.ts for the new implementation