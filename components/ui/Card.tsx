import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
}

// Memoize the Card component to prevent unnecessary re-renders
export const Card = memo(({ children, style, variant = 'default' }: CardProps) => {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    padding: 16,
  },
  default: {
    backgroundColor: Colors.white,
  },
  elevated: {
    backgroundColor: Colors.white,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
  },
});