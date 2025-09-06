import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import Constants from 'expo-constants';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com';

export class GoogleAuthSession {
  private static instance: GoogleAuthSession;
  
  public static getInstance(): GoogleAuthSession {
    if (!GoogleAuthSession.instance) {
      GoogleAuthSession.instance = new GoogleAuthSession();
    }
    return GoogleAuthSession.instance;
  }

  /**
   * Sign in with Google using expo-auth-session (more reliable)
   */
  async signIn(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🚀 Starting Google Sign-In with expo-auth-session...');
      
      // Validate configuration
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-client-id')) {
        throw new Error('Google Client ID is not properly configured. Please check your environment variables.');
      }

      // Create auth request - explicitly use Expo auth proxy
      const expoConfig = Constants.expoConfig || Constants.manifest;
      const slug = expoConfig?.slug || 'vetpaw-ai-dog-care';
      const owner = expoConfig?.owner || 'naveedahmedswe';
      const redirectUri = `https://auth.expo.io/@${owner}/${slug}`;

      console.log('📋 Auth Configuration:');
      console.log('- Client ID:', GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
      console.log('- Redirect URI:', redirectUri);
      console.log('- Expo Config Slug:', slug);
      console.log('- Expo Config Owner:', owner);

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri: redirectUri,
        usePKCE: true,
        additionalParameters: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      });

      console.log('🔗 Opening Google OAuth...');
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      console.log('🔍 OAuth Result:', JSON.stringify(result, null, 2));

      if (result.type === 'success') {
        console.log('✅ Google OAuth completed, exchanging code for tokens...');
        
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: GOOGLE_CLIENT_ID,
            code: result.params.code,
            redirectUri: redirectUri,
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          {
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
          }
        );

        console.log('🎫 Token exchange successful');

        if (!tokenResult.idToken) {
          throw new Error('No ID token received from Google');
        }

        // Sign in to Supabase with ID token
        console.log('🔑 Signing in to Supabase...');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokenResult.idToken,
          access_token: tokenResult.accessToken,
        });

        if (error) {
          console.error('❌ Supabase sign-in error:', error);
          throw error;
        }

        console.log('✅ Successfully signed in:', data.user?.email);
        return { 
          success: true, 
          user: data.user 
        };

      } else if (result.type === 'cancel') {
        console.log('👋 User cancelled Google Sign-In');
        return { 
          success: false, 
          error: 'User cancelled sign-in' 
        };
      } else {
        console.error('❌ Unexpected result:', result);
        return { 
          success: false, 
          error: result.error?.message || 'Authentication failed' 
        };
      }

    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      };
    }
  }

  /**
   * Get the redirect URI being used
   */
  getRedirectUri(): string {
    const expoConfig = Constants.expoConfig || Constants.manifest;
    const slug = expoConfig?.slug || 'vetpaw-ai-dog-care';
    const owner = expoConfig?.owner || 'naveedahmedswe';
    return `https://auth.expo.io/@${owner}/${slug}`;
  }
}

export const googleAuthSession = GoogleAuthSession.getInstance(); 