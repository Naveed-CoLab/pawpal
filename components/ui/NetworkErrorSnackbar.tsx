import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { WifiOff, RefreshCw, Settings, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface NetworkErrorSnackbarProps {
  isVisible: boolean;
  onHide: () => void;
  onRetry?: () => void;
  onSettings?: () => void;
  title?: string;
  message?: string;
  context?: 'login' | 'signup' | 'data-sync' | 'general';
  duration?: number;
}

export function NetworkErrorSnackbar({
  isVisible,
  onHide,
  onRetry,
  onSettings,
  title,
  message,
  context = 'general',
  duration = 6000,
}: NetworkErrorSnackbarProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const iconRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isVisible) {
      // Entry animation
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });

      // Icon pulse animation
      pulseScale.value = withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 }),
        withDelay(1000, withTiming(1.1, { duration: 800 })),
        withTiming(1, { duration: 800 })
      );

      // Auto hide timer
      const timer = setTimeout(() => {
        hideSnackbar();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideSnackbar();
    }
  }, [isVisible]);

  const hideSnackbar = () => {
    translateY.value = withTiming(100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    scale.value = withTiming(0.8, { duration: 300 }, () => {
      runOnJS(onHide)();
    });
  };

  const handleRetry = () => {
    // Rotation animation for retry
    iconRotation.value = withTiming(iconRotation.value + 360, { duration: 600 });
    
    if (onRetry) {
      onRetry();
    }
    hideSnackbar();
  };

  const handleSettings = () => {
    if (onSettings) {
      onSettings();
    }
    hideSnackbar();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${iconRotation.value}deg` },
      { scale: pulseScale.value }
    ],
  }));

  const getContextualContent = () => {
    switch (context) {
      case 'login':
        return {
          title: title || 'Login Failed 🔐',
          message: message || 'Unable to connect to VetPaw servers. Please check your internet connection and try signing in again.',
          primaryAction: 'Try Again',
          secondaryAction: 'Network Settings',
        };
      case 'signup':
        return {
          title: title || 'Sign Up Failed 📝',
          message: message || 'Could not create your account due to network issues. Please check your connection and try again.',
          primaryAction: 'Retry Sign Up',
          secondaryAction: 'Network Settings',
        };
      case 'data-sync':
        return {
          title: title || 'Sync Failed 💾',
          message: message || 'Your pet data could not be synced. Check your connection to keep your information up to date.',
          primaryAction: 'Retry Sync',
          secondaryAction: 'Settings',
        };
      default:
        return {
          title: title || 'Connection Lost 📡',
          message: message || 'VetPaw needs an internet connection to work properly. Please check your network and try again.',
          primaryAction: 'Retry',
          secondaryAction: 'Settings',
        };
    }
  };

  const content = getContextualContent();

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.snackbar}>
        {/* Beautiful gradient background */}
        <LinearGradient
          colors={['#fff8e1', '#ffecb3', '#fff0b3']}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Border gradient */}
        <View style={styles.borderContainer}>
          <LinearGradient
            colors={['#2196F3', '#1976D2', '#0D47A1']}
            style={styles.borderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        <View style={styles.content}>
          {/* Icon Section */}
          <View style={styles.iconSection}>
            <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
              <WifiOff size={28} color="#2196F3" />
            </Animated.View>
            <View style={styles.iconBackground} />
          </View>

          {/* Text Section */}
          <View style={styles.textSection}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.message}>{content.message}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color="#fff8e1" />
              <Text style={styles.primaryButtonText}>{content.primaryAction}</Text>
            </TouchableOpacity>

            {onSettings && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleSettings}
                activeOpacity={0.8}
              >
                <Settings size={16} color="#47463e" />
                <Text style={styles.secondaryButtonText}>{content.secondaryAction}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  snackbar: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  borderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  borderGradient: {
    flex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff8e1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  iconBackground: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    opacity: 0.3,
    top: -12,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#47463e',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#47463e',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#ffecb3',
    borderWidth: 2,
    borderColor: '#ffe0b2',
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#fff8e1',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#47463e',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e3f2fd',
    opacity: 0.2,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff4bb',
    opacity: 0.3,
  },
}); 