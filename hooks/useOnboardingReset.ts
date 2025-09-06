import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';

export function useOnboardingReset() {
  const { user } = useAuth();

  const resetOnboarding = useCallback(async () => {
    if (!user?.id) {
      console.warn('No user found for onboarding reset');
      return false;
    }

    try {
      const hasCompletedKey = `onboarding_completed_${user.id}`;
      const currentStepKey = `onboarding_step_${user.id}`;
      
      await Promise.all([
        AsyncStorage.removeItem(hasCompletedKey),
        AsyncStorage.removeItem(currentStepKey)
      ]);
      
      console.log('✅ Onboarding reset successfully');
      return true;
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
      return false;
    }
  }, [user?.id]);

  const forceShowOnboarding = useCallback(async () => {
    if (!user?.id) {
      console.warn('No user found for forcing onboarding');
      return false;
    }

    try {
      const hasCompletedKey = `onboarding_completed_${user.id}`;
      const currentStepKey = `onboarding_step_${user.id}`;
      
      // Set as incomplete and reset to step 0
      await Promise.all([
        AsyncStorage.setItem(hasCompletedKey, 'false'),
        AsyncStorage.setItem(currentStepKey, '0')
      ]);
      
      console.log('✅ Onboarding forced to show');
      return true;
    } catch (error) {
      console.error('❌ Error forcing onboarding to show:', error);
      return false;
    }
  }, [user?.id]);

  return {
    resetOnboarding,
    forceShowOnboarding,
  };
} 