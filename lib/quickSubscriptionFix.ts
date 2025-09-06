import { supabase } from './supabase';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

/**
 * Quick fix for subscription mismatch issue
 * Specifically handles the case where subscription is expired but is_premium is still true
 */
export async function fixExpiredSubscriptionFlag(): Promise<{ 
  success: boolean; 
  message: string; 
  wasFixed: boolean;
  details?: any;
}> {
  try {
    console.log('🔧 Quick fix: Checking for expired subscription flag mismatch...');

    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return { 
        success: false, 
        message: 'No authenticated user found',
        wasFixed: false
      };
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    console.log('👤 Checking subscription for:', userEmail);

    // Step 1: Get current user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_premium, premium_expires_at, email')
      .eq('auth_user_id', userId)
      .single();

    if (userError || !userData) {
      return { 
        success: false, 
        message: `User not found: ${userError?.message}`,
        wasFixed: false
      };
    }

    console.log('📊 Current user status:', {
      isPremium: userData.is_premium,
      expiresAt: userData.premium_expires_at,
      userEmail: userData.email
    });

    // Step 2: Check if subscription is actually expired
    const now = new Date();
    let subscriptionExpired = false;
    let shouldBePremium = userData.is_premium;

    if (userData.premium_expires_at) {
      const expirationDate = new Date(userData.premium_expires_at);
      subscriptionExpired = expirationDate <= now;
      
      console.log('⏰ Expiration check:', {
        expirationDate: expirationDate.toISOString(),
        now: now.toISOString(),
        isExpired: subscriptionExpired
      });
    }

    // Step 3: Check subscription table
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('status, end_date, plan')
      .eq('user_id', userData.id)
      .single();

    console.log('💾 Subscription record:', subData);

    // Step 4: Check RevenueCat status (if available)
    let revenueCatActive = false;
    let rcExpirationDate = null;

    if (Platform.OS !== 'web') {
      try {
        console.log('📱 Checking RevenueCat status...');
        const customerInfo = await Purchases.getCustomerInfo();
        const activeEntitlements = Object.keys(customerInfo.entitlements.active);
        revenueCatActive = activeEntitlements.length > 0;
        
        if (revenueCatActive) {
          const firstEntitlement = Object.values(customerInfo.entitlements.active)[0] as any;
          rcExpirationDate = firstEntitlement.expirationDate;
          
          if (rcExpirationDate) {
            const rcExpDate = new Date(rcExpirationDate);
            revenueCatActive = rcExpDate > now;
          }
        }
        
        console.log('📱 RevenueCat result:', {
          hasActiveEntitlements: revenueCatActive,
          expirationDate: rcExpirationDate
        });
      } catch (error) {
        console.log('⚠️ RevenueCat check failed:', error);
      }
    }

    // Step 5: Determine correct premium status
    // Priority: RevenueCat > Database subscription record > User table
    if (revenueCatActive) {
      shouldBePremium = true;
      console.log('✅ RevenueCat shows active subscription');
    } else if (subData && subData.status === 'active' && subData.end_date) {
      const subExpDate = new Date(subData.end_date);
      shouldBePremium = subExpDate > now;
      console.log('📝 Using database subscription status:', shouldBePremium);
    } else if (subscriptionExpired) {
      shouldBePremium = false;
      console.log('❌ Subscription expired, should not be premium');
    }

    // Step 6: Check if fix is needed
    const needsFix = userData.is_premium !== shouldBePremium;
    
    if (!needsFix) {
      return {
        success: true,
        message: `Subscription status is correct. Premium: ${shouldBePremium}`,
        wasFixed: false,
        details: {
          currentStatus: userData.is_premium,
          correctStatus: shouldBePremium,
          expiresAt: userData.premium_expires_at,
          revenueCatActive
        }
      };
    }

    console.log('🔧 Mismatch detected! Applying fix...');
    console.log(`   Current is_premium: ${userData.is_premium}`);
    console.log(`   Should be premium: ${shouldBePremium}`);

    // Step 7: Apply the fix
    const updateData: any = {
      is_premium: shouldBePremium,
      updated_at: new Date().toISOString()
    };

    // Update expiration date if we have better info from RevenueCat
    if (revenueCatActive && rcExpirationDate) {
      updateData.premium_expires_at = rcExpirationDate;
    } else if (!shouldBePremium) {
      // If subscription is expired, keep the expiration date for record
      updateData.premium_expires_at = userData.premium_expires_at;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_user_id', userId);

    if (updateError) {
      return {
        success: false,
        message: `Failed to update user: ${updateError.message}`,
        wasFixed: false
      };
    }

    // Step 8: Update subscription record if needed
    if (subData) {
      const subUpdateData: any = {
        status: shouldBePremium ? 'active' : 'expired',
        updated_at: new Date().toISOString()
      };

      if (revenueCatActive && rcExpirationDate) {
        subUpdateData.end_date = rcExpirationDate;
      }

      await supabase
        .from('subscriptions')
        .update(subUpdateData)
        .eq('user_id', userData.id);
    }

    const fixMessage = shouldBePremium 
      ? '✅ Fixed! Premium access restored based on active subscription.'
      : '❌ Fixed! Premium access removed due to expired subscription.';

    console.log('🎉 Fix completed successfully!');

    return {
      success: true,
      message: fixMessage,
      wasFixed: true,
      details: {
        previousStatus: userData.is_premium,
        newStatus: shouldBePremium,
        expiresAt: updateData.premium_expires_at,
        revenueCatActive,
        subscriptionStatus: subData?.status
      }
    };

  } catch (error: any) {
    console.error('❌ Quick fix error:', error);
    return {
      success: false,
      message: `Fix failed: ${error.message}`,
      wasFixed: false
    };
  }
}

/**
 * Check current subscription status without making changes
 */
export async function checkSubscriptionStatus(): Promise<{
  success: boolean;
  details: any;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, details: { error: 'No user session' } };
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, is_premium, premium_expires_at, email')
      .eq('auth_user_id', session.user.id)
      .single();

    if (!userData) {
      return { success: false, details: { error: 'User not found' } };
    }

    // Get subscription data
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.id)
      .single();

    // Check if expired
    const now = new Date();
    const isExpired = userData.premium_expires_at 
      ? new Date(userData.premium_expires_at) <= now 
      : false;

    // Check RevenueCat
    let revenueCatStatus = null;
    if (Platform.OS !== 'web') {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const activeEntitlements = Object.keys(customerInfo.entitlements.active);
        revenueCatStatus = {
          hasActiveEntitlements: activeEntitlements.length > 0,
          entitlements: activeEntitlements,
          originalAppUserId: customerInfo.originalAppUserId
        };
      } catch (error) {
        revenueCatStatus = { error: 'RevenueCat check failed' };
      }
    }

    return {
      success: true,
      details: {
        user: {
          email: userData.email,
          isPremium: userData.is_premium,
          expiresAt: userData.premium_expires_at,
          isExpired
        },
        subscription: subData,
        revenueCat: revenueCatStatus,
        hasMismatch: userData.is_premium && isExpired
      }
    };

  } catch (error: any) {
    return {
      success: false,
      details: { error: error.message }
    };
  }
} 