import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

interface GoogleSignInButtonProps {
  onPress: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  customText?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  variant = 'outlined',
  size = 'medium',
  showIcon = true,
  customText,
}: GoogleSignInButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animation styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Handle press animations
  const handlePressIn = () => {
    setIsPressed(true);
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(0.8, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Handle press with haptic feedback
  const handlePress = async () => {
    if (loading || disabled) return;

    // Success animation
    scale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );

    // Add haptic feedback for iOS
    if (Platform.OS === 'ios') {
      const { impactAsync, ImpactFeedbackStyle } = await import('expo-haptics');
      impactAsync(ImpactFeedbackStyle.Light);
    }

    await onPress();
  };

  // Dynamic styles based on props
  const getButtonStyles = () => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`${size}Button`];
    const variantStyle = variant === 'filled' ? styles.filledButton : styles.outlinedButton;
    
    return [baseStyle, sizeStyle, variantStyle, loading && styles.loadingButton];
  };

  const getTextStyles = () => {
    const baseStyle = styles.text;
    const sizeStyle = styles[`${size}Text`];
    const variantStyle = variant === 'filled' ? styles.filledText : styles.outlinedText;
    
    return [baseStyle, sizeStyle, variantStyle, disabled && styles.disabledText];
  };

  const renderContent = () => (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator 
          size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
          color={variant === 'filled' ? '#FFFFFF' : '#1976D2'} 
        />
      ) : (
        <>
          {showIcon && (
            <Image 
              source={require('@/assets/images/google logo.png')} 
              style={[
                styles.icon,
                styles[`${size}Icon`],
                variant === 'filled' && styles.filledIcon
              ]} 
            />
          )}
          <Text style={getTextStyles()}>
            {customText || (loading ? 'Signing in...' : 'Continue with Google')}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'filled') {
    return (
      <AnimatedTouchableOpacity
        style={[animatedStyle, { opacity: disabled ? 0.5 : 1 }]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={loading || disabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4285F4', '#34A853', '#FBBC05', '#EA4335']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={getButtonStyles()}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedTouchableOpacity>
    );
  }

  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, getButtonStyles(), { opacity: disabled ? 0.5 : 1 }]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {renderContent()}
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Size variants
  smallButton: {
    height: 40,
    paddingHorizontal: 16,
  },
  mediumButton: {
    height: 50,
    paddingHorizontal: 20,
  },
  largeButton: {
    height: 56,
    paddingHorizontal: 24,
  },
  
  // Style variants
  outlinedButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  filledButton: {
    // Gradient applied via LinearGradient
  },
  
  loadingButton: {
    opacity: 0.8,
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  icon: {
    marginRight: 8,
  },
  
  // Icon sizes
  smallIcon: {
    width: 16,
    height: 16,
  },
  mediumIcon: {
    width: 20,
    height: 20,
  },
  largeIcon: {
    width: 24,
    height: 24,
  },
  
  filledIcon: {
    tintColor: '#FFFFFF',
  },
  
  text: {
    fontFamily: Fonts.body.medium,
    textAlign: 'center',
  },
  
  // Text sizes
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Text variants
  outlinedText: {
    color: '#1976D2',
  },
  filledText: {
    color: '#FFFFFF',
    fontFamily: Fonts.body.semiBold,
  },
  
  disabledText: {
    opacity: 0.6,
  },
});