import { supabaseGoogleAuth } from './supabaseGoogleAuth';
import { supabase } from './supabase';

class SupabaseGoogleAuthDebugger {
  private static instance: SupabaseGoogleAuthDebugger;

  private constructor() {}

  public static getInstance(): SupabaseGoogleAuthDebugger {
    if (!SupabaseGoogleAuthDebugger.instance) {
      SupabaseGoogleAuthDebugger.instance = new SupabaseGoogleAuthDebugger();
    }
    return SupabaseGoogleAuthDebugger.instance;
  }

  async debugConfiguration() {
    console.log('=== SUPABASE GOOGLE AUTH DEBUG ===');
    
    // Get auth configuration
    const debugInfo = supabaseGoogleAuth.getDebugInfo();
    console.log('Configuration:');
    console.log('- Platform:', debugInfo.platform);
    console.log('- Redirect URL:', debugInfo.redirectUrl);
    console.log('- Is Web:', debugInfo.isWeb);
    
    // Check Supabase configuration
    console.log('Supabase Configuration:');
    try {
      const { data: providers } = await supabase.auth.getProviders();
      console.log('- Google Provider Enabled:', providers?.google ? 'YES' : 'NO');
    } catch (error) {
      console.log('- Provider Check Error:', error);
    }
    
    // Check current session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current Session:');
      console.log('- Has Session:', !!session);
      console.log('- User:', session?.user?.email || 'None');
    } catch (error) {
      console.log('- Session Check Error:', error);
    }
    
    console.log('=== END SUPABASE GOOGLE AUTH DEBUG ===');
    
    return debugInfo;
  }

  getSetupInstructions() {
    const debugInfo = supabaseGoogleAuth.getDebugInfo();
    
    console.log('=== SUPABASE GOOGLE AUTH SETUP ===');
    console.log('🔧 In Supabase Dashboard:');
    console.log('1. Go to Authentication > Providers');
    console.log('2. Enable Google provider');
    console.log('3. Add your Google Client ID and Client Secret');
    console.log('4. Set redirect URL to:', debugInfo.redirectUrl);
    console.log('');
    console.log('🔧 In Google Console:');
    console.log('1. Go to APIs & Services > Credentials');
    console.log('2. Edit your OAuth client ID');
    console.log('3. Add authorized redirect URI:', debugInfo.redirectUrl);
    console.log('4. Also add your Supabase redirect URL from the dashboard');
    console.log('');
    console.log('✅ Benefits of In-App Browser:');
    console.log('- No external browser redirect');
    console.log('- Better user experience');
    console.log('- Seamless authentication flow');
    console.log('=== END SETUP INSTRUCTIONS ===');
  }

  async testAuthentication() {
    console.log('=== TESTING SUPABASE GOOGLE AUTH ===');
    
    try {
      const result = await supabaseGoogleAuth.signIn();
      console.log('Test Result:', result);
      return result;
    } catch (error) {
      console.error('Test Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const supabaseGoogleAuthDebugger = SupabaseGoogleAuthDebugger.getInstance();

// Helper functions
export const debugSupabaseGoogleAuth = () => supabaseGoogleAuthDebugger.debugConfiguration();
export const getSupabaseGoogleSetup = () => supabaseGoogleAuthDebugger.getSetupInstructions();
export const testSupabaseGoogleAuth = () => supabaseGoogleAuthDebugger.testAuthentication(); 