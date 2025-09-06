import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { onboardingService } from './onboardingService';

export const debugOnboarding = {
  /**
   * Reset onboarding completion status
   */
  async resetOnboarding(): Promise<void> {
    try {
      await onboardingService.resetOnboarding();
      console.log('🔄 Debug: Onboarding reset successfully');
    } catch (error) {
      console.error('❌ Debug: Error resetting onboarding:', error);
    }
  },

  /**
   * Check current onboarding status
   */
  async checkOnboardingStatus(): Promise<boolean> {
    try {
      const completed = await onboardingService.isOnboardingCompleted();
      console.log('🎯 Debug: Onboarding completed:', completed);
      return completed;
    } catch (error) {
      console.error('❌ Debug: Error checking onboarding status:', error);
      return false;
    }
  },

  /**
   * Check current Supabase session
   */
  async checkSessionStatus(): Promise<any> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 Debug: Session status:', { session: !!session, error });
      return { session, error };
    } catch (error) {
      console.error('❌ Debug: Error checking session:', error);
      return { session: null, error };
    }
  },

  /**
   * Clear all auth-related storage
   */
  async clearAllStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('onboarding') || 
        key.includes('supabase') || 
        key.includes('auth')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
        console.log('🗑️ Debug: Cleared auth storage keys:', authKeys);
      } else {
        console.log('ℹ️ Debug: No auth storage keys found');
      }
    } catch (error) {
      console.error('❌ Debug: Error clearing storage:', error);
    }
  },

  /**
   * Log all storage keys for debugging
   */
  async logAllStorageKeys(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('📋 Debug: All storage keys:', keys);
    } catch (error) {
      console.error('❌ Debug: Error getting storage keys:', error);
    }
  }
}; 