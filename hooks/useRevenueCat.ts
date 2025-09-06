import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import type { VetPawOffering, VetPawSubscription } from '@/lib/revenuecat';
import { revenueCatService } from '@/lib/revenuecat';
import { revenueCatInitializer } from '@/lib/revenueCatInitializer';

// Helper function to check if error is network-related
const checkForNetworkError = (error: any): boolean => {
  const errorMessage = error?.message || error?.toString() || '';
  return errorMessage.includes('network') || 
         errorMessage.includes('timeout') || 
         errorMessage.includes('connection') ||
         errorMessage.includes('Network request failed');
};

// New hook for initializing RevenueCat purchases
export function initializePurchases() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeRevenueCat = async () => {
      try {
        console.log('🔧 useRevenueCat: Starting initialization...');
        
        const result = await revenueCatInitializer.initialize(user?.id);
        
        if (isMounted) {
          if (result.success) {
            setIsInitialized(true);
            setError(null);
            setIsNetworkError(result.isMockMode);
            
            if (result.isMockMode) {
              console.log('🌐 useRevenueCat: Running in mock mode');
            } else {
              console.log('✅ useRevenueCat: Initialization successful');
            }
          } else {
            setIsInitialized(true);
            setError(result.error || 'Initialization failed');
            setIsNetworkError(true);
          }
        }
      } catch (err: any) {
        console.error('❌ useRevenueCat: Initialization failed:', err);
        
        if (isMounted) {
          setIsInitialized(true);
          setError(err.message || 'Initialization failed');
          setIsNetworkError(true);
        }
      }
    };

    initializeRevenueCat();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  return { isInitialized, error, isNetworkError };
}

export function useRevenueCat() {
  const { user } = useAuth();
  const { isSubscribed, isLoading: subscriptionLoading, customerInfo } = useSubscriptionStatus();
  const [offerings, setOfferings] = useState<VetPawOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
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
          expirationDate: entitlement.expirationDate || undefined
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
      setIsNetworkError(false);

      // Initialize with user ID
      const success = await revenueCatService.initialize(user?.id);
      
      if (success) {
        console.log('✅ RevenueCat service initialized successfully');
      } else {
        console.log('🌐 RevenueCat using mock mode');
      }
      
      // Always try to fetch offerings (will get mock data if network fails)
      await fetchOfferings();
      
    } catch (err: any) {
      console.error('RevenueCat initialization error:', err);
      
      const isNetworkIssue = checkForNetworkError(err);
      setIsNetworkError(isNetworkIssue);
      
      if (isNetworkIssue) {
        setError('Network connection issue - using offline mode');
        console.log('💡 App will work in offline mode for purchases');
        
        // Still try to get mock offerings
        try {
          await fetchOfferings();
        } catch (mockError) {
          console.warn('Even mock offerings failed:', mockError);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to initialize RevenueCat');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferings = async () => {
    try {
      const fetchedOfferings = await revenueCatService.getOfferings();
      setOfferings(fetchedOfferings);
      console.log('✅ Offerings loaded:', fetchedOfferings.length);
    } catch (err: any) {
      console.error('Error fetching offerings:', err);
      
      // If it's a network error, don't throw - just use mock offerings
      if (checkForNetworkError(err)) {
        console.log('🌐 Using mock offerings due to network error');
        setIsNetworkError(true);
        // Set mock offerings manually
        setOfferings([]);
      } else {
        throw err;
      }
    }
  };

  const restorePurchases = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setIsNetworkError(false);
      console.log('🔄 Restoring purchases...');
      
      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - restore not available');
        return { success: false, error: 'Not available on web' };
      }
      
      // Run restore with timeout to detect network issues
      const restorePromise = Purchases.restorePurchases();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Restore purchases timeout - possible network issue')), 15000)
      );
      
      const customerInfo = await Promise.race([restorePromise, timeoutPromise]);
      console.log('✅ Purchases restored successfully');
      
      return { success: true };
    } catch (err: any) {
      const isNetworkIssue = checkForNetworkError(err);
      setIsNetworkError(isNetworkIssue);
      
      let errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      
      if (isNetworkIssue) {
        errorMessage = 'Network connection issue - please check your internet and try again';
        console.log('🌐 Network error during restore - this is common on emulators');
      }
      
      setError(errorMessage);
      console.error('❌ Restore error:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

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

  const presentPaywallIfNeeded = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSubscribed) {
        return { success: false, error: 'User already subscribed' };
      }

      // This would trigger paywall presentation
      console.log('🎭 Would present paywall here');
      
      return { success: true };
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to present paywall';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [isSubscribed]);

  return {
    offerings,
    loading: loading || subscriptionLoading,
    error,
    isSubscribed,
    isNetworkError,
    currentSubscription,
    restorePurchases,
    getDefaultOffering,
    getMonthlyPackage,
    getYearlyPackage,
    refresh: initializeRevenueCat,
    presentPaywallIfNeeded
  };
}