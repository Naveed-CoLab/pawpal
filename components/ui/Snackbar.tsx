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
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';

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
        return 'Hold on! ⚠️';
      case 'network':
        return 'Connection Lost 📡';
      case 'database':
        return 'Sync Issue 💾';
      case 'permission':
        return 'Permission Needed 🔐';
      case 'info':
        return 'Hey there! 🐾';
      default:
        return 'VetPaw 🐕';
    }
  };

  const getBackgroundColors = () => {
    switch (type) {
      case 'success':
        return ['#fff8e1', '#f4f7f0']; // Cream to light green
      case 'error':
        return ['#fff8e1', '#fff0f0']; // Cream to light red
      case 'warning':
        return ['#fff8e1', '#fffaf0']; // Cream to light orange
      case 'network':
        return ['#fff8e1', '#f0f8ff']; // Cream to light blue
      case 'database':
        return ['#fff8e1', '#f8f0ff']; // Cream to light purple
      case 'permission':
        return ['#fff8e1', '#fff8f0']; // Cream to light pink
      case 'info':
      default:
        return ['#fff8e1', '#ffecb3']; // Default VetPaw cream gradient
    }
  };

  const getIcon = () => {
    const iconSize = 24;
    const iconColor = '#47463e';
    
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color="#4CAF50" />;
      case 'error':
        return <AlertTriangle size={iconSize} color="#ff6b6b" />;
      case 'warning':
        return <AlertTriangle size={iconSize} color="#ff9800" />;
      case 'network':
        return <WifiOff size={iconSize} color="#2196F3" />;
      case 'database':
        return <RefreshCw size={iconSize} color="#9C27B0" />;
      case 'permission':
        return <AlertTriangle size={iconSize} color="#FF5722" />;
      case 'info':
      default:
        return <Info size={iconSize} color="#ff9d00" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#ff6b6b';
      case 'warning':
        return '#ff9800';
      case 'network':
        return '#2196F3';
      case 'database':
        return '#9C27B0';
      case 'permission':
        return '#FF5722';
      case 'info':
      default:
        return '#ff9d00'; // VetPaw orange border
    }
  };

  const getActionButtonColor = () => {
    switch (type) {
      case 'network':
        return '#2196F3';
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#ff6b6b';
      case 'warning':
        return '#ff9800';
      case 'database':
        return '#9C27B0';
      case 'permission':
        return '#FF5722';
      default:
        return '#ff9d00';
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[
        styles.snackbar, 
        { 
          borderColor: getBorderColor()
        }
      ]}>
        {/* Gradient Background */}
        <View style={styles.gradientContainer}>
          <View style={[styles.gradientLayer, { backgroundColor: getBackgroundColors()[0] }]} />
          <View style={[styles.gradientLayer, styles.gradientOverlay, { backgroundColor: getBackgroundColors()[1] }]} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={[styles.iconContainer, { borderColor: getBorderColor() }]}>
              {getIcon()}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {getTitle()}
              </Text>
              <Text style={styles.message} numberOfLines={3}>
                {message}
              </Text>
            </View>
          </View>
          
          {(actionText || type === 'network') && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getActionButtonColor() }]}
              onPress={handleActionPress}
              activeOpacity={0.8}
            >
              {type === 'network' && (
                <RefreshCw size={16} color="#fff8e1" style={styles.actionIcon} />
              )}
              <Text style={styles.actionButtonText}>
                {actionText || (type === 'network' ? 'Retry' : 'OK')}
              </Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientOverlay: {
    opacity: 0.3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#fff8e1',
    borderWidth: 2,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    marginBottom: 4,
    color: '#47463e',
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    lineHeight: 20,
    color: '#47463e',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#47463e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  actionIcon: {
    marginRight: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#fff8e1',
  },
});
