import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { ApiConfig } from '@/constants/apiConfig';

export function useSubscriptionStatus() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      try {
        // Skip RevenueCat calls on web or if not properly configured
        if (Platform.OS === 'web') {
          setDebugInfo('Web platform - subscription checks skipped');
          setIsSubscribed(false);
          setIsLoading(false);
          return;
        }

        if (ApiConfig.REVENUECAT.USE_MOCK_MODE) {
          setDebugInfo('Mock mode enabled - no real subscription checks');
          setIsSubscribed(false);
          setIsLoading(false);
          return;
        }

        console.log('🔍 Checking subscription status...');
        const customerInfo = await Purchases.getCustomerInfo();
        setCustomerInfo(customerInfo);
        
        // Check for 'premium' entitlement - adjust this to match your RevenueCat entitlement identifier
        const isActive = customerInfo.entitlements.active['premium'] !== undefined;
        setIsSubscribed(isActive);
        
        // Enhanced debug information
        const debugMsg = `Status: ${isActive ? 'SUBSCRIBED' : 'FREE'}, ` +
          `Entitlements: [${Object.keys(customerInfo.entitlements.active).join(', ') || 'none'}], ` +
          `User ID: ${customerInfo.originalAppUserId || 'anonymous'}`;
        
        setDebugInfo(debugMsg);
        
        console.log('📊 Subscription status checked:', { 
          isActive, 
          entitlements: Object.keys(customerInfo.entitlements.active),
          originalAppUserId: customerInfo.originalAppUserId,
          requestDate: customerInfo.requestDate 
        });
      } catch (error) {
        console.error('❌ Failed to check subscription status:', error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscriptionStatus();

    // Set up listener for purchase updates
    let removeListener: (() => void) | undefined;
    
    if (Platform.OS !== 'web' && !ApiConfig.REVENUECAT.USE_MOCK_MODE) {
      try {
        removeListener = Purchases.addCustomerInfoUpdateListener((info) => {
          console.log('📡 Customer info updated via listener');
          checkSubscriptionStatus();
        });
        console.log('👂 RevenueCat customer info listener added');
      } catch (error) {
        console.error('❌ Failed to add customer info listener:', error);
      }
    }

    return () => {
      if (removeListener) {
        try {
          removeListener();
          console.log('🔇 RevenueCat listener removed');
        } catch (error) {
          console.error('❌ Failed to remove customer info listener:', error);
        }
      }
    };
  }, []);

  return { 
    isSubscribed, 
    isLoading, 
    customerInfo,
    debugInfo, // Added for debugging
    // Helper to check specific entitlements
    hasEntitlement: (entitlementId: string) => {
      return customerInfo?.entitlements.active[entitlementId] !== undefined;
    }
  };
}