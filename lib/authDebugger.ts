import { authService } from './auth';
import { supabase } from './supabase';

class AuthDebugger {
  private static instance: AuthDebugger;

  private constructor() {}

  public static getInstance(): AuthDebugger {
    if (!AuthDebugger.instance) {
      AuthDebugger.instance = new AuthDebugger();
    }
    return AuthDebugger.instance;
  }

  async debugAuthState() {
    console.log('=== AUTH DEBUG INFO ===');
    console.log('Auth Service State:');
    console.log('- Initialized:', authService.isInitialized);
    console.log('- Is Authenticated:', authService.isAuthenticated);
    console.log('- Current User:', authService.user?.email || 'None');
    console.log('- Current Session:', authService.session ? 'Active' : 'None');
    
    // Check Supabase session directly
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Direct Supabase Session:');
      console.log('- Session exists:', !!session);
      console.log('- Session user:', session?.user?.email || 'None');
      console.log('- Session error:', error?.message || 'None');
      
      if (session) {
        const isExpired = session.expires_at && session.expires_at < Math.floor(Date.now() / 1000);
        console.log('- Session expired:', isExpired);
        console.log('- Expires at:', new Date(session.expires_at * 1000).toLocaleString());
      }
    } catch (error) {
      console.error('Error checking Supabase session:', error);
    }
    
    console.log('=== END AUTH DEBUG ===');
  }

  async validateAndLog() {
    console.log('=== VALIDATING SESSION ===');
    const isValid = await authService.validateSession();
    console.log('Session validation result:', isValid);
    await this.debugAuthState();
  }

  async retryProfileLoad() {
    console.log('=== RETRYING PROFILE LOAD ===');
    await authService.retryLoadUserProfile();
    await this.debugAuthState();
  }
}

export const authDebugger = AuthDebugger.getInstance();

// Helper function to be called from console or debug screens
export const debugAuth = () => authDebugger.debugAuthState();
export const validateAuth = () => authDebugger.validateAndLog();
export const retryProfile = () => authDebugger.retryProfileLoad(); 