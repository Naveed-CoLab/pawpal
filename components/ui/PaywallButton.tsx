import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
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
  const { presentPaywall, presentPaywallIfNeeded, isSubscribed, loading } = useRevenueCat();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    try {
      // Always use presentPaywallIfNeeded - it handles subscription check internally
      const result = await presentPaywallIfNeeded(entitlement);

      if (result?.success) {
        onSuccess?.();
      } else if (result?.error?.includes('cancelled')) {
        // Paywall was dismissed/cancelled - call onCancel callback
        onCancel?.();
      } else if (result?.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Paywall error:', error);
      Alert.alert('Error', 'Failed to show premium options. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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