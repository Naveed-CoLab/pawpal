import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { ApiConfig } from '@/constants/apiConfig';
import { supabase } from '@/lib/supabase';
import { fixExpiredSubscriptionFlag, checkSubscriptionStatus } from '@/lib/quickSubscriptionFix';

export function useSubscriptionStatus() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkDatabaseSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data: userData } = await supabase
        .from('users')
        .select('is_premium, premium_expires_at')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!userData) return false;

      // Check if subscription is expired
      const now = new Date();
      const isExpired = userData.premium_expires_at 
        ? new Date(userData.premium_expires_at) <= now 
        : false;

      const isActive = userData.is_premium && !isExpired;
      
      console.log('💾 Database subscription check:', {
        isPremium: userData.is_premium,
        expiresAt: userData.premium_expires_at,
        isExpired,
        isActive
      });

      return isActive;
    } catch (error) {
      console.error('❌ Database subscription check failed:', error);
      return false;
    }
  };

  const checkSubscriptionStatusComplete = async () => {
    try {
      setIsLoading(true);
      
      // Skip RevenueCat calls on web or if not properly configured
      if (Platform.OS === 'web') {
        setDebugInfo('Web platform - using database only');
        const dbStatus = await checkDatabaseSubscription();
        setIsSubscribed(dbStatus);
        setLastChecked(new Date());
        return;
      }

      if (ApiConfig.REVENUECAT.USE_MOCK_MODE) {
        setDebugInfo('Mock mode enabled - using database only');
        const dbStatus = await checkDatabaseSubscription();
        setIsSubscribed(dbStatus);
        setLastChecked(new Date());
        return;
      }

      console.log('🔍 Checking subscription status (full check)...');

      // Step 1: Check RevenueCat
      let revenueCatActive = false;
      let rcDebugInfo = '';
      
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        setCustomerInfo(customerInfo);
        
        const possibleEntitlements = ['premium', 'pro', 'Premium', 'Pro'];
        let foundEntitlement = '';
        
        for (const entitlementId of possibleEntitlements) {
          if (customerInfo.entitlements.active[entitlementId] !== undefined) {
            revenueCatActive = true;
            foundEntitlement = entitlementId;
            break;
          }
        }
        
        // If no specific entitlement found, check if ANY entitlement is active
        if (!revenueCatActive && Object.keys(customerInfo.entitlements.active).length > 0) {
          revenueCatActive = true;
          foundEntitlement = Object.keys(customerInfo.entitlements.active)[0];
        }
        
        rcDebugInfo = `RC: ${revenueCatActive ? 'ACTIVE' : 'INACTIVE'}, Found: ${foundEntitlement || 'none'}`;
        console.log('📱 RevenueCat status:', rcDebugInfo);
        
      } catch (error) {
        console.error('❌ RevenueCat check failed:', error);
        rcDebugInfo = `RC Error: ${error instanceof Error ? error.message : 'Unknown'}`;
      }

      // Step 2: Check database
      const dbStatus = await checkDatabaseSubscription();
      const dbDebugInfo = `DB: ${dbStatus ? 'PREMIUM' : 'FREE'}`;
      
      // Step 3: Determine final status - prioritize RevenueCat if it shows active
      let finalStatus = dbStatus;
      let fixInfo = '';
      
      if (revenueCatActive !== dbStatus) {
        console.log('⚠️ Subscription mismatch detected', { revenueCatActive, dbStatus });
        
        // If RevenueCat shows active but database shows inactive, trust RevenueCat
        if (revenueCatActive && !dbStatus) {
          console.log('🔄 RevenueCat shows active subscription, updating database...');
          finalStatus = true; // Use RevenueCat status
          fixInfo = ' (Using RevenueCat)';
          
          // Try to sync database with RevenueCat
          try {
            const fixResult = await fixExpiredSubscriptionFlag();
            if (fixResult.success) {
              fixInfo = ' (DB Synced)';
              console.log('✅ Database synced with RevenueCat');
            }
          } catch (error) {
            console.error('❌ Database sync failed:', error);
            fixInfo = ' (DB sync failed)';
          }
        }
        // If database shows active but RevenueCat shows inactive, trust RevenueCat (expired)
        else if (!revenueCatActive && dbStatus) {
          console.log('📱 RevenueCat shows expired subscription, using RevenueCat status');
          finalStatus = false; // Use RevenueCat status
          fixInfo = ' (RevenueCat expired)';
        }
      }

      setIsSubscribed(finalStatus);
      setDebugInfo(`${rcDebugInfo}, ${dbDebugInfo}${fixInfo}`);
      setLastChecked(new Date());
      
      console.log('📊 Final subscription status:', finalStatus ? 'PREMIUM' : 'FREE');
      
    } catch (error) {
      console.error('❌ Complete subscription check failed:', error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSubscriptionStatusComplete();

    // Set up listener for purchase updates
    let removeListener: (() => void) | undefined;
    
    if (Platform.OS !== 'web' && !ApiConfig.REVENUECAT.USE_MOCK_MODE) {
      try {
        removeListener = Purchases.addCustomerInfoUpdateListener((info) => {
          console.log('📡 Customer info updated via listener - rechecking...');
          // Force re-check when customer info updates
          checkSubscriptionStatusComplete();
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

  // Manual refresh function
  const refresh = () => {
    console.log('🔄 Manual subscription refresh requested');
    checkSubscriptionStatusComplete();
  };

  // Manual fix function
  const fixSubscription = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 Manual subscription fix requested');
      const result = await fixExpiredSubscriptionFlag();
      
      if (result.success) {
        // Refresh status after fix
        await checkSubscriptionStatusComplete();
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('❌ Manual fix failed:', error);
      return {
        success: false,
        message: `Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        wasFixed: false
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Get detailed status for debugging
  const getDetailedStatus = async () => {
    return await checkSubscriptionStatus();
  };

  return { 
    isSubscribed, 
    isLoading, 
    customerInfo,
    debugInfo,
    lastChecked,
    // Helper to check specific entitlements
    hasEntitlement: (entitlementId: string) => {
      return customerInfo?.entitlements.active[entitlementId] !== undefined;
    },
    refresh,
    fixSubscription,
    getDetailedStatus
  };
}