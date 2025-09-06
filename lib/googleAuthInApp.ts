import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com';

// Dynamic redirect URI based on environment - use consistent auth callback
const getRedirectUri = () => {
  if (process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI) {
    return process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI;
  }
  
  // Use consistent auth callback URL - matches AndroidManifest.xml and app.json
  const expoConfig = Constants.expoConfig || Constants.manifest;
  const scheme = (expoConfig as any)?.scheme || 'vetpaw';
  
  return `${scheme}://auth/callback`;
};

const GOOGLE_REDIRECT_URI = getRedirectUri();

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export class InAppGoogleAuth {
  private static instance: InAppGoogleAuth;
  
  public static getInstance(): InAppGoogleAuth {
    if (!InAppGoogleAuth.instance) {
      InAppGoogleAuth.instance = new InAppGoogleAuth();
    }
    return InAppGoogleAuth.instance;
  }

  /**
   * Sign in with Google using in-app browser modal with Supabase OAuth
   */
  async signIn(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🚀 Starting in-app Google Sign-In...');
      console.log('📋 Google OAuth Config:');
      console.log('- Redirect URI:', GOOGLE_REDIRECT_URI);

      // Use Supabase's built-in Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: GOOGLE_REDIRECT_URI,
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
      console.log('🌐 Full Auth URL:', data.url);
      console.log('🎯 Expected redirect:', GOOGLE_REDIRECT_URI);

      // Open Google OAuth in in-app browser modal
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        GOOGLE_REDIRECT_URI,
        {
          showInRecents: false, // Don't show in recent apps
          enableBarCollapsing: false, // Keep the browser bar visible
        }
      );

      console.log('🔍 OAuth Result:', JSON.stringify(result, null, 2));
      
      // Log the actual callback URL if available
      if (result.url) {
        console.log('📋 Callback URL received:', result.url);
      }

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
        
        // Wait for the session to be established after OAuth callback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to get session multiple times in case of timing issues
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`📋 Attempt ${attempt}/3: Checking for session...`);
          
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            console.error('❌ Session error details:', JSON.stringify(sessionError, null, 2));
            if (attempt === 3) throw sessionError;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          console.log('📊 Session data:', {
            hasSession: !!sessionData.session,
            hasUser: !!sessionData.session?.user,
            userEmail: sessionData.session?.user?.email,
            accessToken: sessionData.session?.access_token ? 'Present' : 'Missing',
            refreshToken: sessionData.session?.refresh_token ? 'Present' : 'Missing'
          });

          if (sessionData.session) {
            console.log('✅ Found session after dismiss:', sessionData.session.user?.email);
            console.log('🔑 Session details:', {
              userId: sessionData.session.user?.id,
              email: sessionData.session.user?.email,
              provider: sessionData.session.user?.app_metadata?.provider,
              expiresAt: new Date(sessionData.session.expires_at! * 1000).toISOString()
            });
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
      } else {
        console.error('❌ Unexpected result:', result);
        return { 
          success: false, 
          error: 'Authentication failed' 
        };
      }

    } catch (error: any) {
      console.error('❌ In-app Google Sign-In error:', error);
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
      console.log('📋 Processing URL:', url);
      
      // Try to extract session from the callback URL using Supabase's method
      console.log('🔑 Attempting to extract session from callback URL...');
      const { data: urlSessionData, error: urlError } = await supabase.auth.getSessionFromUrl({ url });
      
      if (urlError) {
        console.error('❌ Error extracting session from URL:', urlError);
        console.error('❌ URL Error details:', JSON.stringify(urlError, null, 2));
      } else if (urlSessionData.session) {
        console.log('✅ Successfully extracted session from URL!');
        console.log('🔑 User from URL:', urlSessionData.session.user?.email);
        return {
          success: true,
          user: urlSessionData.session.user
        };
      } else {
        console.log('⚠️ No session found in URL callback');
      }
      
      // Fallback: Check if there's a session already
      console.log('🔄 Fallback: Checking current session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        console.error('❌ Session error details:', JSON.stringify(sessionError, null, 2));
        throw sessionError;
      }

      if (sessionData.session) {
        console.log('✅ Successfully signed in:', sessionData.session.user?.email);
        return { 
          success: true, 
          user: sessionData.session.user 
        };
      } else {
        console.log('❌ No session found after success');
        return { 
          success: false, 
          error: 'No session received from OAuth callback' 
        };
      }
    } catch (error: any) {
      console.error('❌ Error handling OAuth success:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to process OAuth result' 
      };
    }
  }


}

export const inAppGoogleAuth = InAppGoogleAuth.getInstance(); 