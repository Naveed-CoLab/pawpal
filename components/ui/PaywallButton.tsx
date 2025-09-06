import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Crown } from 'lucide-react-native';

interface PaywallButtonProps {
  title?: string;
  style?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  entitlement?: string;
  checkEntitlement?: boolean;
}

export function PaywallButton({
  title = 'Upgrade to Premium',
  style,
  onSuccess,
  onCancel,
  entitlement = 'premium',
  checkEntitlement = true
}: PaywallButtonProps) {
  const { isSubscribed, loading } = useRevenueCat();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handlePress = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Premium features are not available on web. Please use our mobile app.');
      return;
    }

    // If already subscribed, no need to show paywall
    if (isSubscribed && checkEntitlement) {
      onSuccess?.();
      return;
    }

    setIsLoading(true);
    
    try {
      // Instead of directly calling presentPaywall, we'll set state to show the JSX component
      setShowPaywall(true);
      
      // This will be handled by the RevenueCatPaywall component
      console.log('🛒 Opening RevenueCat paywall via JSX component');
    } catch (error) {
      console.error('Paywall error:', error);
      Alert.alert('Error', 'Failed to show premium options. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, checkEntitlement, onSuccess]);

  const handlePaywallDismiss = useCallback(() => {
    setShowPaywall(false);
    onCancel?.();
  }, [onCancel]);

  const handlePurchaseCompleted = useCallback((customerInfo: any) => {
    setShowPaywall(false);
    onSuccess?.();
  }, [onSuccess]);

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        disabled={isLoading || loading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <Crown size={16} color={Colors.white} style={styles.icon} />
            <Text style={styles.text}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* The actual paywall component will be rendered by the parent component */}
      {/* This is a pattern change - we're using state to signal when to show the paywall */}
      {/* See RevenueCatPaywall.tsx for implementation */}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff9d00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
  },
  icon: {
    marginRight: 8,
  },
});