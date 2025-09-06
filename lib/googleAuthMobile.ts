import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Enhanced Google OAuth configuration for mobile
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com';

export class MobileGoogleAuth {
  private static instance: MobileGoogleAuth;
  
  public static getInstance(): MobileGoogleAuth {
    if (!MobileGoogleAuth.instance) {
      MobileGoogleAuth.instance = new MobileGoogleAuth();
    }
    return MobileGoogleAuth.instance;
  }

  /**
   * Enhanced Google Sign-In optimized for mobile experience
   */
  async signIn(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🚀 Starting enhanced mobile Google Sign-In...');
      
      // Pre-flight checks
      const preflightResult = await this.performPreflightChecks();
      if (!preflightResult.success) {
        return preflightResult;
      }

      // Get optimized redirect URI
      const redirectUri = this.getOptimizedRedirectUri();
      console.log('📋 Using redirect URI:', redirectUri);

      // Configure Supabase OAuth with mobile-optimized settings
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
            // Mobile-specific parameters
            include_granted_scopes: 'true',
            // Remove custom state - let Supabase handle it
          },
        },
      });

      if (error) {
        console.error('❌ Supabase OAuth setup error:', error);
        return this.handleOAuthError(error);
      }

      if (!data.url) {
        throw new Error('No OAuth URL received from Supabase');
      }

      console.log('🔗 Opening optimized in-app browser...');
      
      // Open with mobile-optimized browser settings
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
        {
          // Mobile UX optimizations
          showInRecents: false,
          enableBarCollapsing: false,
          enableDefaultShareMenuItem: false,
          ephemeralWebSession: false, // Allow remember account choice
          
          // iOS specific optimizations
          preferEphemeralWebSession: false,
          
          // Android specific optimizations
          showTitle: false,
          toolbarColor: '#FFFFFF',
          secondaryToolbarColor: '#F5F5F5',
          
          // Enhanced browser options
          dismissButtonStyle: 'close',
          readerMode: false,
          controlsColor: '#1976D2',
        }
      );

      console.log('🔍 OAuth Result Type:', result.type);

      return await this.handleAuthResult(result);

    } catch (error: any) {
      console.error('❌ Mobile Google Sign-In error:', error);
      return this.handleSignInError(error);
    }
  }

  /**
   * Perform pre-flight checks before starting OAuth
   */
  private async performPreflightChecks(): Promise<{ success: boolean; error?: string }> {
    // Check internet connectivity
    if (!await this.isNetworkAvailable()) {
      return {
        success: false,
        error: 'Please check your internet connection and try again.'
      };
    }

    // Validate configuration
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-client-id')) {
      console.error('❌ Google Client ID not configured');
      return {
        success: false,
        error: 'Google authentication is not properly configured.'
      };
    }

    return { success: true };
  }

  /**
   * Get optimized redirect URI for mobile platforms
   */
  private getOptimizedRedirectUri(): string {
    if (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI) {
      return process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI;
    }

    // Use the same callback as your working implementation
    const expoConfig = Constants.expoConfig || Constants.manifest;
    const scheme = (expoConfig as any)?.scheme || 'vetpaw';
    
    return `${scheme}://auth/callback`;
  }

  // Remove generateSecureState method - let Supabase handle state management

  /**
   * Handle different auth result types with proper error messages
   */
  private async handleAuthResult(result: any): Promise<{ success: boolean; error?: string; user?: any }> {
    switch (result.type) {
      case 'success':
        if (result.url) {
          console.log('✅ OAuth success, processing callback...');
          return await this.processSuccessCallback(result.url);
        }
        return { success: false, error: 'Authentication completed but no callback received.' };

      case 'cancel':
        console.log('👋 User cancelled Google Sign-In');
        return { success: false, error: 'Sign-in was cancelled.' };

      case 'dismiss':
        console.log('📱 Browser was dismissed');
        return { success: false, error: 'Sign-in was cancelled.' };

      case 'locked':
        console.log('🔒 Browser session locked');
        return { success: false, error: 'Please try again.' };

      default:
        console.error('❌ Unexpected result type:', result.type);
        return { success: false, error: 'An unexpected error occurred during sign-in.' };
    }
  }

  /**
   * Process successful OAuth callback
   */
  private async processSuccessCallback(callbackUrl: string): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🔄 Processing OAuth callback...');
      console.log('📋 Callback URL:', callbackUrl);
      
      // Extract session from callback URL using Supabase's method
      const { data, error } = await supabase.auth.getSessionFromUrl({ url: callbackUrl });
      
      if (error) {
        console.error('❌ Error extracting session from callback:', error);
        throw error;
      }

      if (!data.session) {
        // Fallback: wait and get current session
        console.log('📋 No session in callback, trying to get current session...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('No session found after OAuth callback');
        }
        
        console.log('✅ Google Sign-In successful (fallback):', session.user.email);
        return {
          success: true,
          user: session.user
        };
      }

      console.log('✅ Google Sign-In successful:', data.session.user.email);
      
      return {
        success: true,
        user: data.session.user
      };

    } catch (error: any) {
      console.error('❌ Callback processing error:', error);
      return {
        success: false,
        error: 'Failed to complete sign-in. Please try again.'
      };
    }
  }

  /**
   * Handle OAuth setup errors with user-friendly messages
   */
  private handleOAuthError(error: any): { success: boolean; error: string } {
    console.error('OAuth setup error:', error);
    
    if (error.message?.includes('redirect_uri')) {
      return {
        success: false,
        error: 'Authentication configuration error. Please contact support.'
      };
    }

    return {
      success: false,
      error: 'Failed to start sign-in process. Please try again.'
    };
  }

  /**
   * Handle general sign-in errors
   */
  private handleSignInError(error: any): { success: boolean; error: string } {
    if (error.message?.includes('network')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      };
    }

    if (error.message?.includes('timeout')) {
      return {
        success: false,
        error: 'Sign-in timed out. Please try again.'
      };
    }

    return {
      success: false,
      error: 'Sign-in failed. Please try again.'
    };
  }

  /**
   * Check network availability
   */
  private async isNetworkAvailable(): Promise<boolean> {
    try {
      // Simple network check
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo() {
    return {
      platform: Platform.OS,
      redirectUri: this.getOptimizedRedirectUri(),
      hasClientId: !!GOOGLE_CLIENT_ID,
      appScheme: Constants.expoConfig?.scheme || 'vetpaw'
    };
  }
}

export const mobileGoogleAuth = MobileGoogleAuth.getInstance();