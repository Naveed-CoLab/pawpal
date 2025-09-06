import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export class SessionManager {
  private static instance: SessionManager;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Force clear all session data and storage
   */
  async forceClearAllSessions(): Promise<void> {
    try {
      console.log('🔄 SessionManager: Force clearing all session data...');
      
      // Clear all auth-related AsyncStorage keys
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('user') ||
        key.includes('onboarding')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log('✅ SessionManager: Cleared AsyncStorage keys:', authKeys);
      }

      // Force sign out from Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ SessionManager: Supabase sign out completed');
      } catch (error) {
        console.warn('⚠️ SessionManager: Supabase sign out error:', error);
      }

      // Additional cleanup
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.log('✅ SessionManager: Session already cleared');
      }

      console.log('✅ SessionManager: All session data cleared successfully');
    } catch (error) {
      console.error('❌ SessionManager: Error clearing session data:', error);
    }
  }

  /**
   * Check if there's any stored session data
   */
  async hasStoredSessionData(): Promise<boolean> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('user')
      );
      
      return authKeys.length > 0;
    } catch (error) {
      console.error('❌ SessionManager: Error checking stored session data:', error);
      return false;
    }
  }

  /**
   * Log all stored session keys for debugging
   */
  async logStoredSessionKeys(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('user')
      );
      
      console.log('📋 SessionManager: Stored session keys:', authKeys);
    } catch (error) {
      console.error('❌ SessionManager: Error logging session keys:', error);
    }
  }
}

export const sessionManager = SessionManager.getInstance(); 