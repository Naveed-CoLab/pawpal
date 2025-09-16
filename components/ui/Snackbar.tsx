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

  const getStyleTone = () => {
    switch (type) {
      case 'success':
        return { bg: '#E7F6EC', text: '#134E1C', border: '#7ADDA1' };
      case 'error':
        return { bg: '#FDECEC', text: '#7A0C0C', border: '#F5A3A3' };
      case 'warning':
        return { bg: '#FFF6E5', text: '#7A5100', border: '#FFD694' };
      case 'network':
        return { bg: '#E9F4FF', text: '#0A3D62', border: '#9ED1FF' };
      case 'database':
        return { bg: '#F3E9FF', text: '#3D0A5E', border: '#CDB3F9' };
      case 'permission':
        return { bg: '#FFF4EA', text: '#7A2E00', border: '#FFC9A6' };
      case 'info':
      default:
        return { bg: '#FFF9E8', text: '#5A4A22', border: '#FFE2A7' };
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
      <View style={[styles.snackbar, { borderColor: getStyleTone().border, backgroundColor: getStyleTone().bg }]}>
        
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={[styles.iconContainer, { borderColor: getStyleTone().border, backgroundColor: getStyleTone().bg }]}>
              {getIcon()}
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: getStyleTone().text }]}>
                {getTitle()}
              </Text>
              <Text style={[styles.message, { color: getStyleTone().text }]} numberOfLines={3}>
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    position: 'relative',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.body.bold,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  actionIcon: {
    marginRight: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: '#fff8e1',
  },
});
