import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { onboardingService } from '@/lib/onboardingService';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { isAuthenticated, isLoading, validateSession } = useAuth();
  const [showText, setShowText] = useState(false);
  const [navigationHandled, setNavigationHandled] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [initialScreen, setInitialScreen] = useState<'onboarding' | 'login' | 'home' | null>(null);
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const pawOpacity = useSharedValue(0);
  const pawBounce = useSharedValue(0);

  useEffect(() => {
    // Logo animation sequence
    logoScale.value = withSequence(
      withTiming(1.2, { duration: 800 }),
      withTiming(1, { duration: 400 })
    );

    // Paw bounce animation
    pawOpacity.value = withTiming(1, { duration: 600 });
    
    // Interactive paw bounce effect
    pawBounce.value = withRepeat(
      withSequence(
        withSpring(-10, { damping: 8, stiffness: 100 }),
        withSpring(0, { damping: 8, stiffness: 100 })
      ),
      -1,
      false
    );

    logoRotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 1000 }),
        withTiming(-5, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      2,
      false
    );

    // Show text after logo animation
    setTimeout(() => {
      setShowText(true);
      textOpacity.value = withTiming(1, { duration: 800 });
    }, 1200);
  }, []);

  // Determine initial screen based on onboarding and auth status
  useEffect(() => {
    const determineInitialScreen = async () => {
      if (isLoading || navigationHandled) return;

      console.log('🚀 Splash: Determining initial screen...');
      
      try {
        // Check onboarding completion status
        const onboardingCompleted = await onboardingService.isOnboardingCompleted();
        console.log('🎯 Splash: Onboarding completed:', onboardingCompleted);

        if (!onboardingCompleted) {
          console.log('📱 Splash: Onboarding not completed, showing onboarding');
          setInitialScreen('onboarding');
          return;
        }

        // If onboarding is completed, check authentication
        if (isAuthenticated) {
          console.log('✅ Splash: User authenticated, navigating to home');
          setInitialScreen('home');
          return;
        }

        // Validate session if not immediately authenticated - with faster timeout
        setIsValidatingSession(true);
        console.log('🔍 Splash: Validating session...');
        
        // Use Promise.race to add timeout to session validation
        const validationPromise = validateSession();
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Session validation timeout')), 3000)
        );
        
        const isSessionValid = await Promise.race([validationPromise, timeoutPromise]);
        
        if (isSessionValid) {
          console.log('✅ Splash: Session validated, navigating to home');
          setInitialScreen('home');
        } else {
          console.log('❌ Splash: Session invalid, navigating to login');
          setInitialScreen('login');
        }
      } catch (error) {
        console.error('💥 Splash: Error determining initial screen:', error);
        // If session validation times out, assume user needs to login
        setInitialScreen('login');
      } finally {
        setIsValidatingSession(false);
      }
    };

    determineInitialScreen();
  }, [isLoading, isAuthenticated, navigationHandled, validateSession]);

  // Handle navigation once initial screen is determined
  useEffect(() => {
    if (initialScreen && !navigationHandled) {
      console.log('🚀 Splash: Navigating to initial screen:', initialScreen);
      setNavigationHandled(true);
      
      switch (initialScreen) {
        case 'onboarding':
          router.replace('/onboarding');
          break;
        case 'login':
          router.replace('/auth');
          break;
        case 'home':
          router.replace('/(tabs)');
          break;
      }
    }
  }, [initialScreen, navigationHandled]);

  // Handle immediate navigation if auth state changes while splash is shown
  useEffect(() => {
    if (!isLoading && !navigationHandled && isAuthenticated && initialScreen === 'home') {
      console.log('🚀 Splash: Auth state changed to authenticated, navigating immediately');
      setNavigationHandled(true);
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, navigationHandled, initialScreen]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const pawAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pawOpacity.value,
    transform: [{ translateY: pawBounce.value }],
  }));

  return (
    <LinearGradient
      colors={[Colors.background, Colors.background]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/splash-screen.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {showText && (
          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={styles.title}>PawPal</Text>
            <Text style={styles.subtitle}>AI Dog Care Assistant</Text>
            <Text style={styles.description}>
              Your companion for happy, healthy pets
            </Text>
          </Animated.View>
        )}

        <Animated.View style={[styles.pawContainer, pawAnimatedStyle]}>
          <Image
            source={require('@/assets/images/paw.png')}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    textAlign: 'center',
    opacity: 0.8,
  },
  pawContainer: {
    position: 'absolute',
    bottom: 60,
  },
});