import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

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
      console.log('Initializing auth service...');
      
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        this.notifyListeners(null, null);
        return;
      }

      if (session) {
        console.log('Found existing session for:', session.user.email);
        this.currentSession = session;
        
        // Try to load user profile with retries
        let profileLoaded = false;
        for (let attempt = 0; attempt < 3 && !profileLoaded; attempt++) {
          try {
            await this.loadUserProfile(session.user);
            if (this.currentUser) {
              profileLoaded = true;
              console.log(`User profile loaded successfully on attempt ${attempt + 1}`);
            } else {
              console.log(`User profile not loaded on attempt ${attempt + 1}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (profileError) {
            console.error(`Error loading profile on attempt ${attempt + 1}:`, profileError);
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!profileLoaded) {
          console.error('Failed to load user profile after multiple attempts');
        }
      } else {
        console.log('No existing session found');
        this.currentSession = null;
        this.currentUser = null;
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        this.currentSession = session;
        
        if (session?.user) {
          // Wait a bit for the trigger to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to load user profile with retries
          let profileLoaded = false;
          for (let attempt = 0; attempt < 3 && !profileLoaded; attempt++) {
            try {
              await this.loadUserProfile(session.user);
              if (this.currentUser) {
                profileLoaded = true;
                console.log(`User profile loaded successfully on auth change, attempt ${attempt + 1}`);
              } else {
                console.log(`User profile not loaded on auth change, attempt ${attempt + 1}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (profileError) {
              console.error(`Error loading profile on auth change, attempt ${attempt + 1}:`, profileError);
              if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          if (!profileLoaded) {
            console.error('Failed to load user profile after auth change');
          }
        } else {
          this.currentUser = null;
        }
        
        this.notifyListeners(this.currentUser, this.currentSession);
      });

      this.initialized = true;
      this.notifyListeners(this.currentUser, this.currentSession);
    } catch (error) {
      console.error('Error initializing auth:', error);
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
        if (error.code === '23505' && error.message.includes('users_email_key')) {
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
      console.log(`Starting Google sign-in on ${Platform.OS}...`);
      
      // Configure different options based on platform
      const options = {
        redirectTo: redirectUrl,
        queryParams: Platform.OS !== 'web' ? { platform: 'mobile' } : undefined
      };
      
      console.log('Google sign-in options:', options);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: options
      });

      if (error) throw error;
      
      // For mobile, we need to handle the redirect flow
      if (Platform.OS !== 'web' && data?.url) {
        console.log('Opening OAuth URL:', data.url);
        // The URL will be handled by the app's deep linking
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error("Google sign in error:", error);
      return { data: null, error: error.message };
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

  // Sign Out
  async signOut() {
    try {
      console.log('AuthService: Starting sign out process');
      
      // Clear local state first to ensure UI updates immediately
      this.currentSession = null;
      this.currentUser = null;
      
      // Notify listeners immediately of state change
      this.notifyListeners(null, null);
      
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

      // Ensure we clear any persisted session data
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.log('AuthService: Session already cleared');
      }

      console.log('AuthService: Sign out process completed');
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

  // Session validation
  async validateSession(): Promise<boolean> {
    try {
      // Only log once per second at most
      const now = Date.now();
      if (!this._lastValidationLog || now - this._lastValidationLog > 1000) {
        console.log('Validating session...');
        this._lastValidationLog = now;
      }
      
      // Try up to 3 times to validate the session
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error(`Session validation error (attempt ${attempt + 1}/3):`, error);
            // Wait before retrying
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          if (!session) {
            console.log('No active session found');
            this.currentSession = null;
            this.currentUser = null;
            this.notifyListeners(null, null);
            return false;
          }

          // Check if token is expired
          const nowTimestamp = Math.floor(Date.now() / 1000);
          if (session.expires_at && session.expires_at < nowTimestamp) {
            console.log('Session token expired, signing out');
            await this.signOut();
            return false;
          }

          this.currentSession = session;
          if (!this.currentUser && session.user) {
            await this.loadUserProfile(session.user);
          }

          this.notifyListeners(this.currentUser, this.currentSession);
          
          // Only log success once per minute at most
          if (!this._lastSuccessLog || now - this._lastSuccessLog > 60000) {
            console.log('Session validated successfully');
            this._lastSuccessLog = now;
          }
          
          return true;
        } catch (attemptError) {
          console.error(`Session validation attempt ${attempt + 1}/3 failed:`, attemptError);
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // If we get here, all attempts failed
      console.error('All session validation attempts failed');
      this.currentSession = null;
      this.currentUser = null;
      this.notifyListeners(null, null);
      return false;
    } catch (error) {
      console.error('Unexpected error validating session:', error);
      return false;
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
}

export const authService = AuthService.getInstance();