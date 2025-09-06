import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Platform } from 'react-native';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

export class OptimizedGoogleAuth {
  private static instance: OptimizedGoogleAuth;
  private googleConfig: { clientId: string; redirectUri: string } | null = null;
  private configFetchTime: number = 0;
  private readonly CONFIG_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (increased cache)
  
  public static getInstance(): OptimizedGoogleAuth {
    if (!OptimizedGoogleAuth.instance) {
      OptimizedGoogleAuth.instance = new OptimizedGoogleAuth();
    }
    return OptimizedGoogleAuth.instance;
  }

  /**
   * Get Google OAuth configuration with optimized caching
   */
  private async getGoogleConfig(): Promise<{ clientId: string; redirectUri: string }> {
    // Return cached config if still valid
    if (this.googleConfig && (Date.now() - this.configFetchTime) < this.CONFIG_CACHE_DURATION) {
      console.log('📋 Using cached Google OAuth config');
      return this.googleConfig;
    }

    // Use fallback config immediately for faster response
    console.log('🔄 Using optimized Google OAuth config');
    const fallbackConfig = {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com',
      redirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'vetpaw://auth/callback'
    };
    
    this.googleConfig = fallbackConfig;
    this.configFetchTime = Date.now();
    
    // Try to fetch updated config in background (don't block)
    setTimeout(() => {
      this.fetchConfigInBackground().catch(err => 
        console.warn('Background config fetch failed:', err)
      );
    }, 100);
    
    return fallbackConfig;
  }

  /**
   * Fetch config in background without blocking
   */
  private async fetchConfigInBackground() {
    try {
      const { apiKeysService } = await import('./apiKeysService');
      const config = await apiKeysService.getGoogleOAuthConfig();
      
      if (config.clientId && !config.clientId.includes('your-client-id')) {
        this.googleConfig = config;
        this.configFetchTime = Date.now();
        console.log('✅ Background config update successful');
      }
    } catch (error) {
      console.warn('Background config fetch failed:', error);
    }
  }

  /**
   * Optimized Google Sign-In with faster timeouts
   */
  async signIn(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🚀 Starting optimized Google Sign-In...');
      
      // Get Google OAuth configuration
      const config = await this.getGoogleConfig();
      console.log('📋 Using Google OAuth config:', {
        clientId: config.clientId.substring(0, 20) + '...',
        redirectUri: config.redirectUri
      });

      // Use Supabase's built-in Google OAuth with optimized config
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: config.redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase OAuth error:', error);
        throw error;
      }

      if (!data.url) {
        throw new Error('No OAuth URL received from Supabase');
      }

      console.log('🌐 Opening OAuth URL in browser...');
      
      // Open browser with faster timeout
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        config.redirectUri,
        {
          showInRecents: true,
          createTask: false,
        }
      );

      if (result.type === 'success' && result.url) {
        console.log('✅ OAuth success, handling callback...');
        return await this.handleOAuthSuccess(result.url);
      } else if (result.type === 'cancel') {
        console.log('❌ OAuth cancelled by user');
        return await this.handleOAuthDismiss();
      } else {
        console.error('❌ OAuth failed:', result.type);
        return { success: false, error: 'OAuth failed' };
      }
    } catch (error: any) {
      console.error('❌ Optimized Google Sign-In error:', error);
      return { success: false, error: error.message || 'Google sign-in failed' };
    }
  }

  /**
   * Handle successful OAuth callback with faster processing
   */
  private async handleOAuthSuccess(url: string): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🔄 Processing OAuth success...');
      
      // Parse the URL to extract session data
      const urlObj = new URL(url);
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');
      
      if (!accessToken || !refreshToken) {
        console.error('❌ Missing tokens in OAuth callback');
        return { success: false, error: 'Missing authentication tokens' };
      }

      // Set session with tokens for immediate access
      const { data: { session }, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('❌ Error setting session:', error);
        return { success: false, error: error.message };
      }

      if (!session) {
        console.error('❌ No session created from tokens');
        return { success: false, error: 'Failed to create session' };
      }

      console.log('✅ OAuth session created successfully');
      return { success: true, user: session.user };
    } catch (error: any) {
      console.error('❌ Error handling OAuth success:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle OAuth dismissal
   */
  private async handleOAuthDismiss(): Promise<{ success: boolean; error?: string; user?: any }> {
    console.log('❌ OAuth dismissed by user');
    return { success: false, error: 'Sign-in cancelled by user' };
  }
}

export const optimizedGoogleAuth = OptimizedGoogleAuth.getInstance(); 