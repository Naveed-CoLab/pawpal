import { supabase } from './supabase';
import Constants from 'expo-constants';

export class GoogleAuthDebugger {
  /**
   * Debug Google OAuth configuration and test connectivity
   */
  static async runFullDiagnostics() {
    console.log('🔍 === GOOGLE AUTH FULL DIAGNOSTICS ===');
    
    // 1. Check environment configuration
    this.checkEnvironmentConfig();
    
    // 2. Check Supabase connection
    await this.checkSupabaseConnection();
    
    // 3. Test Google OAuth provider
    await this.testGoogleProvider();
    
    // 4. Check redirect URI configuration
    this.checkRedirectConfig();
    
    console.log('🔍 === END DIAGNOSTICS ===');
  }
  
  private static checkEnvironmentConfig() {
    console.log('📋 1. ENVIRONMENT CONFIGURATION:');
    console.log('- Google Client ID:', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ? 'SET' : '❌ MISSING');
    console.log('- Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : '❌ MISSING');
    console.log('- Supabase Anon Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : '❌ MISSING');
    console.log('- App Scheme:', Constants.expoConfig?.scheme || '❌ MISSING');
    console.log('- Package Name:', Constants.expoConfig?.android?.package || '❌ MISSING');
  }
  
  private static async checkSupabaseConnection() {
    console.log('📋 2. SUPABASE CONNECTION:');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Supabase connection error:', error.message);
      } else {
        console.log('✅ Supabase connection: OK');
        console.log('- Current session:', data.session ? 'EXISTS' : 'NONE');
      }
    } catch (error) {
      console.error('❌ Supabase connection failed:', error);
    }
  }
  
  private static async testGoogleProvider() {
    console.log('📋 3. GOOGLE OAUTH PROVIDER TEST:');
    try {
      // Test if we can generate OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'vetpaw://test',
          skipBrowserRedirect: true // Don't actually redirect
        }
      });
      
      if (error) {
        console.error('❌ Google OAuth provider error:', error.message);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        if (error.message.includes('Provider not found')) {
          console.log('🔧 FIX: Enable Google provider in Supabase Dashboard → Authentication → Providers');
        }
        if (error.message.includes('redirect_uri')) {
          console.log('🔧 FIX: Check redirect URIs in Supabase Dashboard → Authentication → URL Configuration');
        }
      } else if (data.url) {
        console.log('✅ Google OAuth provider: OK');
        console.log('- OAuth URL generated successfully');
        console.log('- URL contains:', data.url.includes('accounts.google.com') ? 'Google OAuth endpoint ✅' : 'Unknown endpoint ❌');
      } else {
        console.log('⚠️ Google OAuth provider: No URL generated');
      }
    } catch (error: any) {
      console.error('❌ Google OAuth test failed:', error.message);
    }
  }
  
  private static checkRedirectConfig() {
    console.log('📋 4. REDIRECT URI CONFIGURATION:');
    const scheme = Constants.expoConfig?.scheme || 'vetpaw';
    const redirectUri = `${scheme}://auth/callback`;
    
    console.log('- Expected redirect URI:', redirectUri);
    console.log('🔧 REQUIRED CONFIGURATION:');
    console.log('');
    console.log('Supabase Dashboard → Authentication → URL Configuration:');
    console.log(`- Site URL: ${scheme}://`);
    console.log(`- Redirect URLs: ${redirectUri}`);
    console.log('');
    console.log('Google Cloud Console → Credentials → OAuth Client:');
    console.log(`- Authorized redirect URIs: ${redirectUri}`);
    console.log('- Also add your Supabase callback URL from the dashboard');
  }
  
  /**
   * Test if Google sign-in would work with current configuration
   */
  static async testGoogleSignInConfig(): Promise<boolean> {
    console.log('🧪 Testing Google Sign-In Configuration...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'vetpaw://auth/callback',
          skipBrowserRedirect: true
        }
      });
      
      if (error) {
        console.error('❌ Configuration test failed:', error.message);
        return false;
      }
      
      if (data.url && data.url.includes('accounts.google.com')) {
        console.log('✅ Configuration test passed!');
        return true;
      }
      
      console.log('⚠️ Configuration test unclear - no valid OAuth URL');
      return false;
      
    } catch (error: any) {
      console.error('❌ Configuration test error:', error.message);
      return false;
    }
  }
}

// Export for easy access
export const debugGoogleAuth = () => GoogleAuthDebugger.runFullDiagnostics();
export const testGoogleConfig = () => GoogleAuthDebugger.testGoogleSignInConfig();