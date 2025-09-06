import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

// Fun pet care tips and facts
const petTips = [
  "🐾 Did you know? Dogs can learn over 1000 words!",
  "💡 Tip: Regular walks keep your pup happy and healthy",
  "🎾 Fun fact: A dog's nose print is as unique as a fingerprint",
  "💧 Tip: Always keep fresh water available for your pet",
  "🦴 Did you know? Dogs have 18 muscles in their ears",
  "❤️ Tip: Daily belly rubs strengthen your bond",
  "🏃 Fun fact: Dogs can run up to 45 mph",
  "🌿 Tip: Some plants are toxic to pets - research before buying",
  "🎵 Did you know? Dogs can hear frequencies up to 65,000 Hz",
  "🛁 Tip: Regular grooming keeps your pet healthy and happy",
  "🦮 Fun fact: Dogs have a third eyelid called a nictitating membrane",
  "🍎 Tip: Apples (without seeds) make a great treat for dogs",
  "🌙 Did you know? Dogs dream just like humans do",
  "🏠 Tip: Create a safe space for your pet to retreat to",
  "🎯 Fun fact: Dogs can smell 10,000-100,000 times better than humans",
  "💪 Tip: Mental stimulation is as important as physical exercise",
];

// Loading messages for different actions
const loadingMessages = {
  login: [
    "Signing you in...",
    "Loading your profile...",
    "Almost there...",
    "Welcome back!",
  ],
  signup: [
    "Creating your account...",
    "Setting up your profile...",
    "Almost ready...",
    "Welcome to PawPal!",
  ],
  profile: [
    "Saving your changes...",
    "Updating your profile...",
    "Almost done...",
    "Changes saved!",
  ],
  general: [
    "Loading...",
    "Please wait...",
    "Processing...",
    "Working on it...",
  ],
};

interface EngagingLoaderProps {
  type?: 'login' | 'signup' | 'profile' | 'general';
  message?: string;
  showTip?: boolean;
  showAnimation?: boolean;
}

export function EngagingLoader({ 
  type = 'general', 
  message, 
  showTip = true, 
  showAnimation = true 
}: EngagingLoaderProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentTip, setCurrentTip] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Animation values
  const pawBounce = useSharedValue(0);
  const pawRotation = useSharedValue(0);
  const messageOpacity = useSharedValue(1);
  const tipOpacity = useSharedValue(1);

  // Get messages for the current type
  const messages = loadingMessages[type] || loadingMessages.general;

  useEffect(() => {
    // Set initial message and tip
    setCurrentMessage(message || messages[0]);
    setCurrentTip(petTips[0]);

    // Start animations
    if (showAnimation) {
      // Paw bounce animation
      pawBounce.value = withRepeat(
        withSequence(
          withSpring(10, { damping: 8, stiffness: 100 }),
          withSpring(0, { damping: 8, stiffness: 100 })
        ),
        -1,
        false
      );

      // Paw rotation animation
      pawRotation.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1000 }),
          withTiming(-5, { duration: 1000 }),
          withTiming(0, { duration: 1000 })
        ),
        2,
        false
      );
    }

    // Rotate through messages
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => {
        const next = (prev + 1) % messages.length;
        setCurrentMessage(messages[next]);
        return next;
      });
    }, 2000);

    // Rotate through tips
    const tipInterval = setInterval(() => {
      setTipIndex(prev => {
        const next = (prev + 1) % petTips.length;
        setCurrentTip(petTips[next]);
        return next;
      });
    }, 4000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(tipInterval);
    };
  }, [type, message, messages, showAnimation]);

  // Animated styles
  const pawAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: pawBounce.value },
      { rotate: `${pawRotation.value}deg` },
    ],
  }));

  const messageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Animated Paw Icon */}
        {showAnimation && (
          <Animated.View style={[styles.pawContainer, pawAnimatedStyle]}>
            <Image
              source={require('@/assets/images/paw.png')}
              style={styles.pawIcon}
              resizeMode="contain"
            />
          </Animated.View>
        )}

        {/* Loading Spinner */}
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>

        {/* Loading Message */}
        <Animated.View style={[styles.messageContainer, messageAnimatedStyle]}>
          <Text style={styles.message}>{currentMessage}</Text>
        </Animated.View>

        {/* Fun Tip */}
        {showTip && (
          <Animated.View style={[styles.tipContainer, tipAnimatedStyle]}>
            <Text style={styles.tip}>{currentTip}</Text>
          </Animated.View>
        )}

        {/* Progress Dots */}
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === messageIndex % 3 && styles.progressDotActive
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 248, 225, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    maxWidth: width * 0.8,
  },
  pawContainer: {
    marginBottom: 24,
  },
  pawIcon: {
    width: 60,
    height: 60,
    tintColor: Colors.primary,
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  messageContainer: {
    marginBottom: 32,
  },
  message: {
    fontSize: 20,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  tipContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tip: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.disabled,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.2 }],
  },
}); 