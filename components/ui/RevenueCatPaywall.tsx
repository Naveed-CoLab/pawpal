import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform, Alert, StyleSheet, Modal, Text, TouchableOpacity, StatusBar } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { X, Crown } from 'lucide-react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { ApiConfig } from '@/constants/apiConfig';
import { fixSubscriptionStatus } from '@/lib/fixSubscription';

// Simple availability check with debugging
const isRevenueCatUIAvailable = () => {
  if (Platform.OS === 'web') {
    console.log('🌐 Platform is web, RevenueCat UI not available');
    return false;
  }
  
  try {
    console.log('🔍 Checking RevenueCat UI availability...');
    console.log('📦 Paywall component:', !!RevenueCatUI.Paywall);
    console.log('📦 Paywall type:', typeof RevenueCatUI.Paywall);
    
    // Check if the Paywall component is available
    const isAvailable = !!RevenueCatUI.Paywall && typeof RevenueCatUI.Paywall === 'function';
    console.log('✅ RevenueCat UI availability result:', isAvailable);
    return isAvailable;
  } catch (e) {
    console.warn('⚠️ RevenueCat UI not available:', e);
    return false;
  }
};

interface RevenueCatPaywallProps {
  visible: boolean;
  onDismiss: () => void;
  onPurchaseCompleted?: (customerInfo: CustomerInfo) => void;
  onRestoreCompleted?: (customerInfo: CustomerInfo) => void;
  requiredEntitlementIdentifier?: string;
}

export default function RevenueCatPaywall({
  visible,
  onDismiss,
  onPurchaseCompleted,
  onRestoreCompleted,
  requiredEntitlementIdentifier = 'premium'
}: RevenueCatPaywallProps) {
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [hasEntitlement, setHasEntitlement] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [uiLoaded, setUiLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Load RevenueCat UI and check entitlement when component becomes visible
  useEffect(() => {
    if (visible) {
      const initializePaywall = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Check if we're in Preview API mode
          try {
            const customerInfo = await Purchases.getCustomerInfo();
            // If we get a preview-user-id, we're in Preview API mode
            if (customerInfo.originalAppUserId === 'preview-user-id') {
              console.log('⚠️ RevenueCat running in Preview API mode (Expo Go)');
              setIsPreviewMode(true);
              setLoading(false);
              return;
            }
          } catch (previewCheckError: any) {
            // If this fails with a specific error about Preview API mode, we're in Preview API mode
            if (previewCheckError.toString().includes('Preview API mode')) {
              console.log('⚠️ RevenueCat running in Preview API mode (Expo Go)');
              setIsPreviewMode(true);
              setLoading(false);
              return;
            }
          }
          
          // Check RevenueCat UI availability
          const uiAvailable = isRevenueCatUIAvailable();
          console.log('🎯 Setting uiLoaded to:', uiAvailable);
          setUiLoaded(uiAvailable);
          
          if (!uiAvailable) {
            console.log('❌ RevenueCat UI not available, will show fallback');
            setError('RevenueCat UI not available');
            setLoading(false);
            return;
          }
          
          // Check if user already has the entitlement
          await checkEntitlementAndFetchOffering();
        } catch (err) {
          console.error('❌ Paywall initialization error:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize paywall');
          setLoading(false);
        }
      };
      
      initializePaywall();
    }
  }, [visible, requiredEntitlementIdentifier]);

  // Handle navbar visibility when paywall appears/disappears
  useEffect(() => {
    if (visible) {
      // Hide navbar when paywall appears
      console.log('🚫 Hiding navbar for paywall');
      StatusBar.setHidden(true, 'slide');
    } else {
      // Show navbar when paywall is dismissed
      console.log('✅ Showing navbar after paywall');
      StatusBar.setHidden(false, 'slide');
    }

    // Cleanup: Always restore navbar when component unmounts
    return () => {
      StatusBar.setHidden(false, 'slide');
    };
  }, [visible]);

  // Check entitlement and fetch offering on the main thread
  const checkEntitlementAndFetchOffering = async () => {
    try {
      // Check if user already has the entitlement
      const customerInfo = await Purchases.getCustomerInfo();
      const userHasEntitlement = customerInfo.entitlements.active[requiredEntitlementIdentifier] !== undefined;
      
      console.log(`📊 Entitlement check for "${requiredEntitlementIdentifier}":`, userHasEntitlement);
      
      if (userHasEntitlement) {
        setHasEntitlement(true);
        setLoading(false);
        onDismiss(); // Close paywall since user already has access
        return;
      }
      
      // Fetch current offering
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        console.log('✅ Current offering found:', offerings.current.identifier);
        setCurrentOffering(offerings.current);
        setHasEntitlement(false);
      } else {
        console.log('⚠️ No current offering available');
        setError('No subscription options available');
      }
    } catch (err) {
      console.error('❌ Error checking entitlement:', err);
      setError('Failed to check subscription status');
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase completion - RevenueCat UI provides { customerInfo, storeTransaction }
  const handlePurchaseCompleted = async ({ customerInfo }: { customerInfo: CustomerInfo; storeTransaction: any }) => {
    console.log('✅ Purchase completed successfully');
    
    // Sync RevenueCat subscription status with Supabase database using proven fix logic
    try {
      const syncResult = await fixSubscriptionStatus();
      if (syncResult.success) {
        console.log('✅ Automatic subscription sync successful');
      } else {
        console.error('❌ Automatic subscription sync failed:', syncResult.error);
      }
    } catch (error) {
      console.error('❌ Exception during automatic subscription sync:', error);
    }
    
    // Force refresh subscription status by re-checking entitlement
    try {
      const updatedInfo = await Purchases.getCustomerInfo();
      const hasNewEntitlement = updatedInfo.entitlements.active[requiredEntitlementIdentifier] !== undefined;
      
      if (hasNewEntitlement) {
        setHasEntitlement(true);
      } else {
        // Check if any entitlement is active (in case the identifier is different)
        const anyActiveEntitlement = Object.keys(updatedInfo.entitlements.active).length > 0;
        if (anyActiveEntitlement) {
          setHasEntitlement(true);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing customer info:', error);
    }
    
    // Call the success callback to close the paywall
    onPurchaseCompleted?.(customerInfo);
  };

  // Handle restore completion - RevenueCat UI provides { customerInfo }
  const handleRestoreCompleted = async ({ customerInfo }: { customerInfo: CustomerInfo }) => {
    console.log('✅ Restore completed successfully');
    
    // Sync RevenueCat subscription status with Supabase database using proven fix logic
    try {
      const syncResult = await fixSubscriptionStatus();
      if (syncResult.success) {
        console.log('✅ Automatic subscription sync successful');
      } else {
        console.error('❌ Automatic subscription sync failed:', syncResult.error);
      }
    } catch (error) {
      console.error('❌ Exception during automatic subscription sync:', error);
    }
    
    // Force refresh subscription status
    try {
      const updatedInfo = await Purchases.getCustomerInfo();
      const hasEntitlement = updatedInfo.entitlements.active[requiredEntitlementIdentifier] !== undefined;
      
      if (hasEntitlement || Object.keys(updatedInfo.entitlements.active).length > 0) {
        setHasEntitlement(true);
      }
    } catch (error) {
      console.error('❌ Error refreshing subscription status after restore:', error);
    }
    
    onRestoreCompleted?.(customerInfo);
    
    // Add small delay to ensure UI updates properly
    setTimeout(() => {
      onDismiss();
    }, 500);
  };

  // Handle purchase error with comprehensive error analysis
  const handlePurchaseError = async (error: any) => {
    console.error('❌ Purchase error:', error);
    
    // Import the error handler
    const { revenueCatErrorHandler } = await import('@/lib/revenueCatErrorHandler');
    
    // Analyze the error and get appropriate solution
    const result = await revenueCatErrorHandler.handlePurchaseError(error);
    
    // Don't show alert for user cancellation
    if (error.code !== 'PURCHASE_CANCELLED' && 
        error.code !== 1 && 
        !error.userCancelled && 
        error?.readableErrorCode !== 'PurchaseCancelledError') {
      
      // Show intelligent error handling with action buttons
      revenueCatErrorHandler.showErrorAlert(
        result,
        () => {
          // Retry callback - refresh the paywall
          console.log('🔄 User requested retry after error');
          checkEntitlementAndFetchOffering();
        },
        async () => {
          // Restore callback - attempt to restore purchases
          console.log('🔄 User requested restore after error');
          try {
            setLoading(true);
            const customerInfo = await Purchases.restorePurchases();
            await handleRestoreCompleted({ customerInfo });
            setLoading(false);
          } catch (restoreError) {
            console.error('❌ Manual restore failed:', restoreError);
            setLoading(false);
            Alert.alert('Restore Error', 'Failed to restore purchases. Please try again.');
          }
        }
      );
    }
  };

  // Handle restore error with comprehensive error analysis
  const handleRestoreError = async (error: any) => {
    console.error('❌ Restore error:', error);
    
    // Import the error handler
    const { revenueCatErrorHandler } = await import('@/lib/revenueCatErrorHandler');
    
    // Analyze the restore error
    const result = await revenueCatErrorHandler.handlePurchaseError(error);
    
    // Show intelligent error handling
    revenueCatErrorHandler.showErrorAlert(
      result,
      () => {
        // Retry callback
        console.log('🔄 User requested retry after restore error');
        checkEntitlementAndFetchOffering();
      },
      async () => {
        // Restore callback - try restore again
        console.log('🔄 User requested another restore attempt');
        try {
          setLoading(true);
          const customerInfo = await Purchases.restorePurchases();
          await handleRestoreCompleted({ customerInfo });
          setLoading(false);
        } catch (restoreError) {
          console.error('❌ Second restore attempt failed:', restoreError);
          setLoading(false);
          Alert.alert('Restore Error', 'Failed to restore purchases. Please contact support.');
        }
      }
    );
  };

  // Render fallback UI for web or when RevenueCat UI is not available
  const renderFallbackPaywall = () => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerContainer}>
            <Crown size={40} color="#ff9d00" />
            <Text style={styles.title}>PawPal Premium</Text>
            <Text style={styles.subtitle}>
              Upgrade to unlock all premium features and get unlimited access to AI coaching
            </Text>
          </View>
          
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Premium Features:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Unlimited AI coaching sessions</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Advanced health analysis</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Priority support</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Ad-free experience</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.purchaseButton}
            onPress={() => {
              Alert.alert(
                'Demo Mode',
                'This is a demo of the premium purchase flow. In a real app, this would complete a purchase.',
                [{ text: 'OK', onPress: onDismiss }]
              );
            }}
          >
            <Text style={styles.purchaseButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.restoreButton}
            onPress={() => {
              Alert.alert(
                'Demo Mode',
                'This would restore your previous purchases.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
          
          <Text style={styles.termsText}>
            Payment will be charged to your Apple ID account at the confirmation of purchase.
            Subscription automatically renews unless it is canceled at least 24 hours before the end of the current period.
          </Text>
        </View>
      </View>
    </Modal>
  );

  // Render Expo Go preview mode message
  const renderPreviewMode = () => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerContainer}>
            <Crown size={40} color="#ff9d00" />
            <Text style={styles.title}>RevenueCat Preview Mode</Text>
            <Text style={styles.subtitle}>
              You're running in Expo Go, which only supports RevenueCat in preview mode
            </Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>To test real purchases:</Text>
            <Text style={styles.infoText}>
              1. Create a development build using EAS Build{'\n'}
              2. Install the development build on your device{'\n'}
              3. Test purchases in the development build
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.purchaseButton}
            onPress={() => {
              Alert.alert(
                'Preview Mode',
                'This simulates a successful purchase in preview mode.',
                [{ text: 'OK', onPress: () => {
                  // Simulate successful purchase
                  onPurchaseCompleted?.({
                    entitlements: { 
                      active: { 
                        premium: { 
                          productIdentifier: 'premium_monthly',
                          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                        } 
                      },
                      all: {}
                    },
                    activeSubscriptions: ['premium_monthly'],
                    allPurchasedProductIdentifiers: ['premium_monthly'],
                    nonSubscriptionTransactions: [],
                    originalAppUserId: 'preview-user-id',
                    requestDate: new Date().toISOString(),
                    firstSeen: new Date().toISOString(),
                    originalApplicationVersion: '1.0',
                    managementURL: null,
                    latestExpirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                  } as any);
                  onDismiss();
                }}]
              );
            }}
          >
            <Text style={styles.purchaseButtonText}>Simulate Purchase</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.restoreButton}
            onPress={onDismiss}
          >
            <Text style={styles.restoreButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Debug current states
  console.log('🎯 PaywallStates:', {
    visible,
    hasEntitlement,
    isPreviewMode,
    loading,
    error,
    uiLoaded,
    currentOffering: !!currentOffering,
    platform: Platform.OS
  });

  // Don't render if not visible or user already has entitlement
  if (!visible || hasEntitlement) {
    console.log('⏹️ Not rendering: visible=' + visible + ', hasEntitlement=' + hasEntitlement);
    return null;
  }

  // Show preview mode UI when in Expo Go
  if (isPreviewMode) {
    console.log('🎭 Showing preview mode paywall');
    return renderPreviewMode();
  }

  // Use fallback for web platform
  if (Platform.OS === 'web') {
    console.log('🌐 Showing web fallback paywall');
    return renderFallbackPaywall();
  }

  // Show loading state
  if (loading) {
    console.log('⏳ Showing loading state');
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onDismiss}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#ff9d00" />
            <Text style={styles.loadingText}>Loading premium options...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Show error state
  if (error || !uiLoaded) {
    console.log('❌ Showing error/fallback paywall:', { error, uiLoaded });
    return renderFallbackPaywall();
  }

  // No offering available
  if (!currentOffering) {
    console.log('💰 No offering available, showing fallback');
    return renderFallbackPaywall();
  }

  // ✅ FULL-SCREEN SOLUTION FOR BOTH PLATFORMS
  // Android: Use absolute positioned full-screen View to avoid Modal issues
  // iOS: Use Modal with different configuration
  console.log('🚀 Rendering real RevenueCat paywall!');
  
  const paywallComponent = (
    <RevenueCatUI.Paywall
      options={{
        offering: currentOffering,
      }}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handleRestoreCompleted}
      onPurchaseError={handlePurchaseError}
      onRestoreError={handleRestoreError}
      onDismiss={onDismiss}
    />
  );
  
  if (Platform.OS === 'android') {
    // For Android: Use absolute positioned full-screen View to avoid Modal view hierarchy issues
    return visible ? (
      <View style={styles.androidFullScreen}>
        {paywallComponent}
      </View>
    ) : null;
  }
  
  // For iOS: Use Modal with transparent background and fullScreen
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      {paywallComponent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
  },
  purchaseButton: {
    backgroundColor: '#ff9d00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  restoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#ff9d00',
  },
  termsText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginTop: 16,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    lineHeight: 20,
  },
  androidFullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white,
    zIndex: 99999,
  },
});
