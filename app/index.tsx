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
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { isAuthenticated, isLoading, validateSession } = useAuth();
  const [showText, setShowText] = useState(false);
  const [navigationHandled, setNavigationHandled] = useState(false);
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

  // Handle navigation after auth state is determined
  useEffect(() => {
    if (!isLoading && !navigationHandled) {
      const timer = setTimeout(async () => {
        console.log('Splash: Handling navigation', { isAuthenticated, isLoading });
        
        if (isAuthenticated) {
          // Validate session before proceeding
          const isValid = await validateSession();
          if (isValid) {
            console.log('Splash: Valid session, navigating to tabs');
            setNavigationHandled(true);
            router.replace('/(tabs)');
          } else {
            console.log('Splash: Invalid session, navigating to onboarding');
            setNavigationHandled(true);
            router.replace('/onboarding');
          }
        } else {
          console.log('Splash: Not authenticated, navigating to onboarding');
          setNavigationHandled(true);
          router.replace('/onboarding');
        }
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, navigationHandled, validateSession]);

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
 colors={[Colors.background, Colors.background]}   // ← fix here
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('@/assets/images/splash screen.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {showText && (
          <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
            <Text style={styles.title}>VetPaw</Text>
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