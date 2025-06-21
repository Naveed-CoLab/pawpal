import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

const { width } = Dimensions.get('window');

interface SnackbarProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'network' | 'database' | 'permission';
  isVisible: boolean;
  onHide: () => void;
  duration?: number;
  actionText?: string;
  onActionPress?: () => void;
}

export function Snackbar({
  message,
  type,
  isVisible,
  onHide,
  duration = 4000,
  actionText,
  onActionPress,
}: SnackbarProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });

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

  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress();
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

  const getTitle = () => {
    switch (type) {
      case 'success':
        return 'Success! 🎉';
      case 'error':
        return 'Oops! 🐕';
      case 'warning':
        return 'Warning! ⚠️';
      case 'network':
        return 'Connection Issue 📡';
      case 'database':
        return 'Data Sync Issue 💾';
      case 'permission':
        return 'Permission Needed 🔐';
      case 'info':
        return 'Info 🐾';
      default:
        return 'VetPaw 🐕';
    }
  };

  const getBackgroundColor = () => {
    // Primary VetPaw yellow background for all types
    const baseYellow = '#FFF9E6'; // Light yellow background
    
    switch (type) {
      case 'success':
        return '#F0F8E6'; // Very light green-yellow
      case 'error':
        return '#FFF0E6'; // Very light orange-yellow  
      case 'warning':
        return '#FFFAE6'; // Slightly more yellow
      case 'network':
      case 'database':
      case 'permission':
        return '#FFF6E6'; // Light warm yellow
      case 'info':
      default:
        return baseYellow; // Default VetPaw yellow
    }
  };

  const getTitleColor = () => {
    return '#8B4513'; // VetPaw brown for all titles
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#FF6B6B';
      case 'warning':
        return '#FF9800';
      case 'network':
        return '#2196F3';
      case 'database':
        return '#9C27B0';
      case 'permission':
        return '#FF5722';
      case 'info':
      default:
        return '#FFA726'; // VetPaw orange border
    }
  };

  const getDogImage = () => {
    // Always use dog-related icons for VetPaw theme
    switch (type) {
      case 'success':
        return require('@/assets/images/success.png');
      case 'error':
        return require('@/assets/images/error_image.png');
      case 'warning':
        return require('@/assets/images/dog_avatar.png');
      case 'network':
      case 'database':
      case 'permission':
        return require('@/assets/images/info_image.png');
      case 'info':
      default:
        return require('@/assets/images/dog_avatar.png'); // Default dog icon
    }
  };

  const getMessageColor = () => {
    return '#6B4423'; // Darker brown for message text
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[
        styles.snackbar, 
        { 
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor()
        }
      ]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={[styles.iconContainer, { borderColor: getBorderColor() }]}>
              <Image
                source={getDogImage()}
                style={styles.iconImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: getTitleColor() }]}>
                {getTitle()}
              </Text>
              <Text style={[styles.message, { color: getMessageColor() }]} numberOfLines={3}>
                {message}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: getBorderColor() }]}
            onPress={handleActionPress}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              {actionText || 'OK'}
            </Text>
          </TouchableOpacity>
        </View>
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  iconImage: {
    width: 28,
    height: 28,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts.body.bold,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    fontFamily: Fonts.body.regular,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
});
