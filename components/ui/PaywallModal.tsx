import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { X } from 'lucide-react-native';

// Import RevenueCat UI components
let RevenueCatUI: any = null;
let Paywall: any = null;

// Initialize RevenueCat UI on native platforms
const initializeRevenueCatUI = async () => {
  try {
    if (Platform.OS !== 'web') {
      const RevenueCatUIModule = await import('react-native-purchases-ui');
      RevenueCatUI = RevenueCatUIModule.default;
      Paywall = RevenueCatUIModule.Paywall;
      console.log('✅ RevenueCat UI Paywall component loaded');
    }
  } catch (error) {
    console.log('⚠️ RevenueCat UI not available, using fallback');
  }
};

// Initialize on module load
initializeRevenueCatUI();

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  onPurchaseError?: (error: string) => void;
  onRestoreSuccess?: () => void;
  requiredEntitlement?: string;
}

export function PaywallModal({ 
  visible, 
  onClose, 
  onPurchaseSuccess,
  onPurchaseError,
  onRestoreSuccess,
  requiredEntitlement = 'premium'
}: PaywallModalProps) {
  const [loading, setLoading] = useState(true);

  const handlePurchaseStarted = () => {
    console.log('🛒 Purchase started');
  };

  const handlePurchaseCompleted = (result: any) => {
    console.log('✅ Purchase completed:', result);
    onPurchaseSuccess?.();
    onClose();
  };

  const handlePurchaseError = (error: any) => {
    console.error('❌ Purchase error:', error);
    onPurchaseError?.(error.message || 'Purchase failed');
  };

  const handlePurchaseCancelled = () => {
    console.log('🚫 Purchase cancelled');
    onClose();
  };

  const handleRestoreCompleted = () => {
    console.log('🔄 Restore completed');
    onRestoreSuccess?.();
    onClose();
  };

  const handlePaywallLoaded = () => {
    console.log('📱 Paywall loaded');
    setLoading(false);
  };

  // Fallback for web or when RevenueCat UI is not available
  const renderFallbackPaywall = () => (
    <View style={styles.fallbackContainer}>
      <View style={styles.fallbackContent}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.fallbackTitle}>VetPaw Premium</Text>
        <Text style={styles.fallbackDescription}>
          Upgrade to Premium for unlimited AI coaching, instant health analysis, and priority support!
        </Text>
        <Text style={styles.fallbackNote}>
          (RevenueCat UI not available on this platform)
        </Text>
        
        <TouchableOpacity 
          style={styles.fallbackButton} 
          onPress={() => {
            Alert.alert(
              'Demo Mode',
              'This would open the premium purchase flow.',
              [{ text: 'OK', onPress: onClose }]
            );
          }}
        >
          <Text style={styles.fallbackButtonText}>View Premium Options</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Use RevenueCat's Paywall component if available
  if (Platform.OS !== 'web' && Paywall) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading premium options...</Text>
          </View>
        )}
        
        <Paywall
          displayCloseButton={true}
          onPurchaseStarted={handlePurchaseStarted}
          onPurchaseCompleted={handlePurchaseCompleted}
          onPurchaseError={handlePurchaseError}
          onPurchaseCancelled={handlePurchaseCancelled}
          onRestoreCompleted={handleRestoreCompleted}
          onClose={onClose}
          onPaywallLoaded={handlePaywallLoaded}
          requiredEntitlement={requiredEntitlement}
        />
      </Modal>
    );
  }

  // Fallback for web or when RevenueCat UI is not available
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {renderFallbackPaywall()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginTop: 16,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fallbackContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fallbackTitle: {
    fontSize: 28,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackDescription: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  fallbackNote: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    marginBottom: 32,
  },
  fallbackButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  fallbackButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.white,
    textAlign: 'center',
  },
});