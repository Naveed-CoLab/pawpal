import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import { apiKeysService } from './apiKeysService';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

export class DynamicGoogleAuth {
  private static instance: DynamicGoogleAuth;
  private googleConfig: { clientId: string; redirectUri: string } | null = null;
  private configFetchTime: number = 0;
  private readonly CONFIG_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  
  public static getInstance(): DynamicGoogleAuth {
    if (!DynamicGoogleAuth.instance) {
      DynamicGoogleAuth.instance = new DynamicGoogleAuth();
    }
    return DynamicGoogleAuth.instance;
  }

  /**
   * Get Google OAuth configuration from Supabase Edge function
   */
  private async getGoogleConfig(): Promise<{ clientId: string; redirectUri: string }> {
    // Return cached config if still valid
    if (this.googleConfig && (Date.now() - this.configFetchTime) < this.CONFIG_CACHE_DURATION) {
      console.log('📋 Using cached Google OAuth config');
      return this.googleConfig;
    }

    try {
      console.log('🔄 Fetching Google OAuth config from Supabase...');
      const config = await apiKeysService.getGoogleOAuthConfig();
      
      if (!config.clientId || config.clientId.includes('your-client-id')) {
        throw new Error('Google OAuth Client ID not configured properly');
      }
      
      this.googleConfig = config;
      this.configFetchTime = Date.now();
      
      console.log('✅ Google OAuth config loaded:', {
        clientId: config.clientId ? 'SET' : 'MISSING',
        redirectUri: config.redirectUri
      });
      
      return config;
    } catch (error) {
      console.error('❌ Failed to fetch Google OAuth config:', error);
      
      // Fallback to environment variables
      console.log('🔄 Using fallback Google OAuth config');
      const fallbackConfig = {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com',
        redirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || 'vetpaw://auth/callback'
      };
      
      this.googleConfig = fallbackConfig;
      this.configFetchTime = Date.now();
      
      return fallbackConfig;
    }
  }

  /**
   * Sign in with Google using dynamically fetched configuration
   */
  async signIn(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🚀 Starting dynamic Google Sign-In...');
      
      // Get Google OAuth configuration
      const config = await this.getGoogleConfig();
      console.log('📋 Using Google OAuth config:', {
        clientId: config.clientId.substring(0, 20) + '...',
        redirectUri: config.redirectUri
      });

      // Use Supabase's built-in Google OAuth with dynamic config
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

      console.log('🔗 Opening Google OAuth in in-app browser...');
      console.log('🌐 OAuth URL generated successfully');

      // Open Google OAuth in in-app browser modal
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        config.redirectUri,
        {
          showInRecents: false,
          enableBarCollapsing: false,
        }
      );

      console.log('🔍 OAuth Result Type:', result.type);

      // Handle different result types
      if (result.type === 'success' && result.url) {
        console.log('✅ Google OAuth completed with success, processing result...');
        return await this.handleOAuthSuccess(result.url);
      } else if (result.type === 'cancel') {
        console.log('👋 User cancelled Google Sign-In');
        return { 
          success: false, 
          error: 'User cancelled sign-in' 
        };
      } else if (result.type === 'dismiss') {
        console.log('🔄 OAuth was dismissed - checking for session...');
        return await this.handleOAuthDismiss();
      } else {
        console.error('❌ Unexpected result:', result);
        return { 
          success: false, 
          error: 'Authentication failed' 
        };
      }

    } catch (error: any) {
      console.error('❌ Dynamic Google Sign-In error:', error);
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      };
    }
  }

  /**
   * Handle successful OAuth result
   */
  private async handleOAuthSuccess(url: string): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🔄 Processing successful OAuth callback...');
      
      // Try to extract session from the callback URL
      const { data: urlSessionData, error: urlError } = await supabase.auth.getSessionFromUrl({ url });
      
      if (urlError) {
        console.error('❌ Error extracting session from URL:', urlError);
      } else if (urlSessionData.session) {
        console.log('✅ Successfully extracted session from URL!');
        console.log('🔑 User from URL:', urlSessionData.session.user?.email);
        return {
          success: true,
          user: urlSessionData.session.user
        };
      }
      
      // Fallback: wait and check current session
      console.log('🔄 Fallback: Checking current session...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw sessionError;
      }

      if (sessionData.session) {
        console.log('✅ Successfully signed in:', sessionData.session.user?.email);
        return { 
          success: true, 
          user: sessionData.session.user 
        };
      } else {
        throw new Error('No session found after OAuth callback');
      }

    } catch (error: any) {
      console.error('❌ OAuth callback processing error:', error);
      return { 
        success: false, 
        error: 'Failed to complete sign-in. Please try again.' 
      };
    }
  }

  /**
   * Handle OAuth dismiss (browser closed) - check for session
   */
  private async handleOAuthDismiss(): Promise<{ success: boolean; error?: string; user?: any }> {
    // Wait for session to be established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try multiple times to get session
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`📋 Attempt ${attempt}/3: Checking for session...`);
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        if (attempt === 3) throw sessionError;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (sessionData.session) {
        console.log('✅ Found session after dismiss:', sessionData.session.user?.email);
        return { 
          success: true, 
          user: sessionData.session.user 
        };
      }
      
      if (attempt < 3) {
        console.log('⏳ No session yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('❌ No session found after dismiss');
    return { 
      success: false, 
      error: 'Authentication was not completed' 
    };
  }

  /**
   * Get current Google OAuth configuration (for debugging)
   */
  async getConfigurationInfo() {
    const config = await this.getGoogleConfig();
    return {
      clientId: config.clientId ? 'SET' : 'MISSING',
      redirectUri: config.redirectUri,
      isCached: !!this.googleConfig,
      cacheAge: Date.now() - this.configFetchTime
    };
  }

  /**
   * Force refresh configuration from server
   */
  async refreshConfiguration() {
    this.googleConfig = null;
    this.configFetchTime = 0;
    await apiKeysService.refreshApiKeys();
    return this.getGoogleConfig();
  }
}

export const dynamicGoogleAuth = DynamicGoogleAuth.getInstance();