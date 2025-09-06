import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'onboardingCompleted';

export class OnboardingService {
  private static instance: OnboardingService;

  private constructor() {}

  public static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService();
    }
    return OnboardingService.instance;
  }

  /**
   * Check if onboarding has been completed
   */
  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      console.log('🎯 OnboardingService: Completion status:', completed);
      return completed === 'true';
    } catch (error) {
      console.error('❌ OnboardingService: Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  async markOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      console.log('✅ OnboardingService: Marked onboarding as completed');
    } catch (error) {
      console.error('❌ OnboardingService: Error marking onboarding as completed:', error);
    }
  }

  /**
   * Reset onboarding completion status (for testing or user preference)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      console.log('🔄 OnboardingService: Reset onboarding completion status');
    } catch (error) {
      console.error('❌ OnboardingService: Error resetting onboarding:', error);
    }
  }
}

export const onboardingService = OnboardingService.getInstance(); 