import { useState, useEffect } from 'react';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { ApiConfig } from '@/constants/apiConfig';
import { revenueCatService, VetPawOffering, VetPawSubscription } from '@/lib/revenuecat';
import { useAuth } from './useAuth';
import { useSubscriptionStatus } from './useSubscriptionStatus';

// New hook for initializing RevenueCat purchases
export function initializePurchases() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeRevenueCat = async () => {
      try {
        if (Platform.OS === 'web') {
          console.log('🌐 Web platform detected - skipping RevenueCat initialization');
          if (isMounted) {
            setIsInitialized(true);
          }
          return;
        }

        console.log('🔧 Initializing RevenueCat SDK...');
        
        const apiKey = Platform.OS === 'ios' 
          ? ApiConfig.REVENUECAT.APPLE_API_KEY 
          : ApiConfig.REVENUECAT.GOOGLE_API_KEY;
        
        // Validate API key
        const hasValidApiKey = apiKey && 
          !apiKey.includes('your_') && 
          !apiKey.includes('_api_key_here') &&
          (apiKey.startsWith('appl_') || apiKey.startsWith('goog_'));
        
        if (!hasValidApiKey) {
          console.warn('⚠️ RevenueCat API key not configured properly');
          if (isMounted) {
            setError('RevenueCat API key not configured');
            setIsInitialized(true); // Still mark as initialized to prevent infinite loops
          }
          return;
        }

        // Configure RevenueCat
        await Purchases.configure({ apiKey });
        console.log('✅ RevenueCat configured successfully');

        // Set user ID if available
        if (user?.id) {
          await Purchases.logIn(user.id);
          console.log(`👤 RevenueCat user logged in: ${user.id}`);
        }

        if (isMounted) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err) {
        console.error('❌ RevenueCat initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed');
          setIsInitialized(true); // Mark as initialized to prevent retries
        }
      }
    };

    initializeRevenueCat();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return { isInitialized, error };
}

export function useRevenueCat() {
  const { user } = useAuth();
  const { isSubscribed, isLoading: subscriptionLoading, customerInfo } = useSubscriptionStatus();
  const [offerings, setOfferings] = useState<VetPawOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    productIdentifier?: string;
    expirationDate?: string;
  } | null>(null);

  // Initialize RevenueCat when user changes
  useEffect(() => {
    if (user) {
      initializeRevenueCat();
    }
  }, [user]);

  // Update subscription info when customerInfo changes
  useEffect(() => {
    if (customerInfo && isSubscribed) {
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      if (activeEntitlements.length > 0) {
        const entitlement = customerInfo.entitlements.active[activeEntitlements[0]];
        setCurrentSubscription({
          productIdentifier: entitlement.productIdentifier,
          expirationDate: entitlement.expirationDate
        });
      }
    } else {
      setCurrentSubscription(null);
    }
  }, [customerInfo, isSubscribed]);

  const initializeRevenueCat = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize with user ID
      await revenueCatService.initialize(user?.id);
      
      // Fetch offerings
      await fetchOfferings();
    } catch (err) {
      console.error('RevenueCat initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize RevenueCat');
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferings = async () => {
    try {
      const fetchedOfferings = await revenueCatService.getOfferings();
      setOfferings(fetchedOfferings);
      console.log('✅ Offerings loaded:', fetchedOfferings.length);
    } catch (err) {
      console.error('Error fetching offerings:', err);
      throw err;
    }
  };

  const presentPaywall = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      console.log('🛒 Presenting RevenueCat dashboard paywall');
      
      const result = await revenueCatService.presentPaywall();
      
      if (result.success) {
        console.log('✅ Paywall purchase completed successfully');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Paywall presentation failed';
      setError(errorMessage);
      console.error('❌ Paywall error:', err);
      return { success: false, error: errorMessage };
    }
  };

  const presentPaywallIfNeeded = async (entitlement: string = 'premium'): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      console.log('🛒 Checking if paywall needed for:', entitlement);
      
      const result = await revenueCatService.presentPaywallIfNeeded(entitlement);
      
      if (result.success) {
        console.log('✅ Conditional paywall completed successfully');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Paywall presentation failed';
      setError(errorMessage);
      console.error('❌ Conditional paywall error:', err);
      return { success: false, error: errorMessage };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      console.log('🔄 Restoring purchases...');
      
      const result = await revenueCatService.restorePurchases();
      
      if (result.success) {
        console.log('✅ Purchases restored successfully');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      setError(errorMessage);
      console.error('❌ Restore error:', err);
      return { success: false, error: errorMessage };
    }
  };

  const getDefaultOffering = (): VetPawOffering | null => {
    return offerings.find(offering => offering.identifier === 'default') || offerings[0] || null;
  };

  const getMonthlyPackage = (): VetPawSubscription | null => {
    const defaultOffering = getDefaultOffering();
    return defaultOffering?.monthly || null;
  };

  const getYearlyPackage = (): VetPawSubscription | null => {
    const defaultOffering = getDefaultOffering();
    return defaultOffering?.annual || null;
  };

  return {
    offerings,
    loading: loading || subscriptionLoading,
    error,
    isSubscribed,
    currentSubscription,
    presentPaywall,
    presentPaywallIfNeeded,
    restorePurchases,
    getDefaultOffering,
    getMonthlyPackage,
    getYearlyPackage,
    refresh: initializeRevenueCat
  };
}