import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { X, ChevronRight, CheckCircle, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePets } from '@/hooks/useDatabase';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  message: string;
  screen: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to VetPaw AI! 🐾',
    message: 'Hi there! I\'m Luna, your AI-powered pet care companion. I\'m here to help you give your furry friend the best care possible with expert advice, health insights, and personalized guidance!',
    screen: 'home'
  },
  {
    id: 'add_pet',
    title: 'Let\'s Meet Your Pet! 🐕',
    message: 'First, let\'s add your beloved pet to get started. Tap the "+ Add Pet" button on your home screen to create their profile. This helps me provide personalized care advice just for them!',
    screen: 'home'
  },
  {
    id: 'chat_feature',
    title: 'Chat with Me Anytime! 💬',
    message: 'Got questions about your pet\'s health, behavior, or care? Tap the "Chat" icon at the bottom of your screen or find "Chat with Lumi" on your home screen. I\'m here 24/7 with expert advice!',
    screen: 'home'
  },
  {
    id: 'live_mentor',
    title: 'Meet Luna - Live Mentor! 🎥',
    message: 'For real-time video guidance, check out the "Live Mentor" section on your home screen and tap "Start Now" for a 4-5 minute personalized session with our expert dog mentor Luna!',
    screen: 'home'
  }
];

interface OnboardingAvatarProps {
  currentScreen: string;
}

export function OnboardingAvatar({ currentScreen }: OnboardingAvatarProps) {
  const { user } = useAuth();
  const { pets } = usePets();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const bounceValue = new Animated.Value(1);
  const fadeValue = new Animated.Value(0);

  useEffect(() => {
    checkFirstTimeUser();
  }, [user]);

  // Additional check when user ID changes (for new signups)
  useEffect(() => {
    if (user?.id && !isFirstTime) {
      console.log('🎯 Onboarding: User ID changed, re-checking onboarding status');
      // Small delay to ensure everything is loaded
      setTimeout(() => {
        checkFirstTimeUser();
      }, 1000);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isFirstTime) {
      setIsVisible(true);
      startBounceAnimation();
    }
  }, [isFirstTime]);

  // Show onboarding when user is on home screen and is first time
  useEffect(() => {
    if (currentScreen === 'home' && isFirstTime && !showTooltip) {
      console.log('🏠 Onboarding: User on home screen, checking step:', currentStep);
      console.log('🏠 Onboarding: User has', pets?.length || 0, 'pets');
      
      // Small delay to let screen settle
      const timer = setTimeout(() => {
        // Show current step
        if (currentStep >= 0 && currentStep < ONBOARDING_STEPS.length) {
          console.log('🎯 Onboarding: Showing step', currentStep);
          setIsVisible(true);
          setShowTooltip(true);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isFirstTime, showTooltip, currentStep, pets]);

  const checkFirstTimeUser = async () => {
    if (!user?.id) {
      console.log('🎯 Onboarding: No user ID available yet, waiting...');
      return;
    }
    
    try {
      console.log('🎯 Onboarding: Checking first-time user status for user:', user.id);
      
      const hasCompletedKey = `onboarding_completed_${user.id}`;
      const currentStepKey = `onboarding_step_${user.id}`;
      
      const completed = await AsyncStorage.getItem(hasCompletedKey);
      const savedStep = await AsyncStorage.getItem(currentStepKey);
      
      console.log('🎯 Onboarding: Completion status:', completed);
      console.log('🎯 Onboarding: Saved step:', savedStep);
      
      if (completed !== 'true') {
        console.log('🎯 Onboarding: User needs onboarding - setting isFirstTime to true');
        setIsFirstTime(true);
        // Set current step from saved state or default to 0
        const stepNumber = savedStep ? parseInt(savedStep, 10) : 0;
        setCurrentStep(stepNumber);
        console.log('🎯 Onboarding: Loading step', stepNumber);
      } else {
        console.log('🎯 Onboarding: User has already completed onboarding');
        setIsFirstTime(false);
      }
    } catch (error) {
      console.error('❌ Onboarding: Error checking first-time user status:', error);
      // If there's an error, assume it's a first-time user
      console.log('🎯 Onboarding: Error occurred, assuming first-time user');
      setIsFirstTime(true);
      setCurrentStep(0);
    }
  };

  const startBounceAnimation = () => {
    Animated.sequence([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      ),
    ]).start();
  };

  const handleGotIt = async () => {
    console.log('🎯 Onboarding: User clicked Got It, completing onboarding');
    await completeOnboarding();
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    
    if (nextStep >= ONBOARDING_STEPS.length) {
      // Completed all steps
      await completeOnboarding();
      return;
    }
    
    // Move to next step
    setCurrentStep(nextStep);
    await saveCurrentStep(nextStep);
    setShowTooltip(false);
    
    // Show next step after a short delay
    setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };

  // Helper method to save current step
  const saveCurrentStep = async (step: number) => {
    if (!user?.id) return;
    
    try {
      const currentStepKey = `onboarding_step_${user.id}`;
      await AsyncStorage.setItem(currentStepKey, step.toString());
      console.log('🎯 Onboarding: Saved current step:', step);
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    }
  };

  const completeOnboarding = async () => {
    if (!user?.id) return;
    
    try {
      const hasCompletedKey = `onboarding_completed_${user.id}`;
      const currentStepKey = `onboarding_step_${user.id}`;
      
      await AsyncStorage.setItem(hasCompletedKey, 'true');
      await AsyncStorage.removeItem(currentStepKey); // Clean up step tracking
      
      setIsVisible(false);
      setShowTooltip(false);
      setIsFirstTime(false);
      
      console.log('🎯 Onboarding: Completed successfully!');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Method to manually trigger onboarding (for debugging or new users)
  const triggerOnboarding = async () => {
    if (!user?.id) {
      console.log('❌ Onboarding: Cannot trigger - no user ID');
      return;
    }
    
    try {
      console.log('🎯 Onboarding: Manually triggering onboarding for user:', user.id);
      
      // Clear any existing onboarding data
      const hasCompletedKey = `onboarding_completed_${user.id}`;
      const currentStepKey = `onboarding_step_${user.id}`;
      await AsyncStorage.removeItem(hasCompletedKey);
      await AsyncStorage.removeItem(currentStepKey);
      
      // Reset to first step
      setCurrentStep(0);
      setIsFirstTime(true);
      setIsVisible(true);
      
      // Show welcome step after a short delay
      setTimeout(() => {
        setShowTooltip(true);
      }, 500);
      
      console.log('✅ Onboarding: Successfully triggered!');
    } catch (error) {
      console.error('❌ Onboarding: Error triggering onboarding:', error);
    }
  };

  // Expose methods for debugging (you can call these from console)
  if (__DEV__) {
    (global as any).debugOnboarding = {
      trigger: triggerOnboarding,
      reset: triggerOnboarding,
      complete: completeOnboarding,
      next: handleNext,
      status: () => ({
        isVisible,
        isFirstTime,
        currentStep,
        showTooltip,
        userId: user?.id,
        petCount: pets?.length || 0,
        totalSteps: ONBOARDING_STEPS.length
      })
    };
  }

  if (!isVisible || !isFirstTime) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <>
      <Animated.View 
        style={[
          styles.avatarContainer,
          {
            opacity: fadeValue,
            transform: [{ scale: bounceValue }]
          }
        ]}
      >
        <TouchableOpacity onPress={() => setShowTooltip(true)} style={styles.avatar}>
          <Image
            source={require('@/assets/images/lumi.png')}
            style={styles.avatarImage}
            resizeMode="contain"
          />
          <View style={styles.notificationDot}>
            <MessageCircle size={12} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tooltipContainer}>
            <View style={styles.tooltipAvatar}>
              <Image
                source={require('@/assets/images/lumi.png')}
                style={styles.tooltipAvatarImage}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.tooltipContent}>
              <Text style={styles.tooltipTitle}>{step.title}</Text>
              <Text style={styles.tooltipMessage}>{step.message}</Text>
              
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                </Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.skipButton} 
                  onPress={completeOnboarding}
                >
                  <Text style={styles.skipButtonText}>Skip Tour</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.nextButton} 
                  onPress={isLastStep ? completeOnboarding : handleNext}
                >
                  <Text style={styles.nextButtonText}>
                    {isLastStep ? 'Get Started!' : 'Next'}
                  </Text>
                  {isLastStep ? (
                    <CheckCircle size={16} color="#fff" />
                  ) : (
                    <ChevronRight size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowTooltip(false)}
            >
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff9d00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tooltipContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    maxWidth: width - 40,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  tooltipAvatar: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  tooltipAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 8,
  },
  tooltipMessage: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff9d00',
    borderRadius: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ff9d00',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#ff9d00',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ff9d00',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 