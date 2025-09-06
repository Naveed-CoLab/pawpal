import { supabase } from './supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

export class SupabaseGoogleAuth {
  private static instance: SupabaseGoogleAuth;
  
  public static getInstance(): SupabaseGoogleAuth {
    if (!SupabaseGoogleAuth.instance) {
      SupabaseGoogleAuth.instance = new SupabaseGoogleAuth();
    }
    return SupabaseGoogleAuth.instance;
  }

  /**
   * Sign in with Google using Supabase's built-in OAuth
   */
  async signIn(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🚀 Starting Supabase Google Sign-In...');

      // Use Supabase's direct OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: this.getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase Google OAuth error:', error);
        throw error;
      }

      console.log('🔗 Google OAuth URL generated:', data.url ? 'YES' : 'NO');

      if (data.url) {
        // Open the OAuth URL in in-app browser (not external)
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          this.getRedirectUrl(),
          {
            showInRecents: false,
            enableBarCollapsing: false,
            ephemeralWebSession: true, // Don't persist cookies
          }
        );

        console.log('🔍 Auth session result:', result);

        if (result.type === 'success' && result.url) {
          // Handle the callback URL directly
          console.log('✅ Authentication successful, processing callback...');
          return await this.handleAuthCallback(result.url);
        } else if (result.type === 'cancel') {
          return { 
            success: false, 
            error: 'User cancelled sign-in' 
          };
        } else {
          return { 
            success: false, 
            error: 'Authentication failed' 
          };
        }
      } else {
        throw new Error('Failed to generate OAuth URL');
      }

    } catch (error: any) {
      console.error('❌ Supabase Google Sign-In error:', error);
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      };
    }
  }

  /**
   * Handle authentication callback directly from in-app browser
   */
  private async handleAuthCallback(callbackUrl: string): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🔄 Processing auth callback URL:', callbackUrl);

      // Extract the session from the callback URL
      const { data, error } = await supabase.auth.getSessionFromUrl({ url: callbackUrl });

      if (error) {
        console.error('❌ Error extracting session from callback:', error);
        throw error;
      }

      if (data.session && data.session.user) {
        console.log('✅ Session extracted successfully:', data.session.user.email);
        
        // The session is automatically set by Supabase
        return {
          success: true,
          user: data.session.user
        };
      } else {
        throw new Error('No session found in callback URL');
      }

    } catch (error: any) {
      console.error('❌ Callback handling error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process authentication callback'
      };
    }
  }

  /**
   * Get the redirect URL for the current platform
   */
  private getRedirectUrl(): string {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/auth/callback`;
    }
    
    // For mobile in-app browser, use the app scheme
    return 'vetpaw://auth/callback';
  }

  /**
   * Get debug information about the current configuration
   */
  getDebugInfo() {
    return {
      redirectUrl: this.getRedirectUrl(),
      platform: Platform.OS,
      isWeb: Platform.OS === 'web'
    };
  }
}

export const supabaseGoogleAuth = SupabaseGoogleAuth.getInstance(); 