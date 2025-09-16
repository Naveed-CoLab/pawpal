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
        <View style={styles.content}>
          {/* Icon Section */}
          <View style={styles.iconSection}>
            <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
              <WifiOff size={28} color="#2196F3" />
            </Animated.View>
            {/* no decorative background for minimal UI */}
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

        {/* minimal UI: no decorative circles */}
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    minHeight: 0,
    backgroundColor: '#E9F4FF',
    borderWidth: 1,
    borderColor: '#9ED1FF',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E9F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9ED1FF',
    zIndex: 1,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.heading.bold,
    color: '#0A3D62',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#0A3D62',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#E9F4FF',
    borderWidth: 1,
    borderColor: '#9ED1FF',
  },
  primaryButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#fff8e1',
  },
  secondaryButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#0A3D62',
  },
}); 