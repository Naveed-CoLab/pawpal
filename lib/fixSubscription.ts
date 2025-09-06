/**
 * One-time subscription fix script
 * This will update both subscription and user tables to reflect correct premium status
 */

import { supabase } from './supabase';
import Purchases from 'react-native-purchases';

export async function fixSubscriptionStatus(): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return { success: false, error: 'No authenticated user found' };
    }

    console.log('🔧 Starting subscription fix for user:', session.user.email);

    // Get RevenueCat customer info to confirm premium status
    const customerInfo = await Purchases.getCustomerInfo();
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    const isPremium = activeEntitlements.length > 0;
    
    console.log('📊 RevenueCat status:', {
      isPremium,
      activeEntitlements,
      originalAppUserId: customerInfo.originalAppUserId
    });

    if (!isPremium) {
      return { success: false, error: 'RevenueCat shows no active premium subscription' };
    }

    // Find expiration date
    let expirationDate: string | null = null;
    for (const entitlement of Object.values(customerInfo.entitlements.active)) {
      if (entitlement.expirationDate) {
        expirationDate = entitlement.expirationDate;
        break;
      }
    }

    // Ensure dates are valid for database constraints
    const now = new Date();
    const startDate = now.toISOString();
    
    // If expiration date is in the past or invalid, set to 1 year from now
    let endDate: string | null = null;
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate > now) {
        endDate = expDate.toISOString();
      } else {
        // If expired or invalid, set to 1 year from now for active subscription
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        endDate = oneYearFromNow.toISOString();
        console.log('⚠️ Expiration date was in past, setting to 1 year from now');
      }
    } else {
      // No expiration date found, set to 1 year from now
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      endDate = oneYearFromNow.toISOString();
      console.log('⚠️ No expiration date found, setting to 1 year from now');
    }

    // Step 1: Fix the subscription table
    console.log('🔄 Step 1: Updating subscription table...');
    
    // First, get the user's internal ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: `Could not find user record: ${userError?.message}` };
    }

    // Update subscription table
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userData.id,
        status: 'active',
        plan: 'premium',  // Fix: Change from 'free' to 'premium'
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (subError) {
      console.error('❌ Subscription update failed:', subError);
      return { success: false, error: `Subscription update failed: ${subError.message}` };
    }

    console.log('✅ Step 1 complete: Subscription table updated');

    // Step 2: Try to update user table (if columns exist)
    console.log('🔄 Step 2: Updating user table...');
    
    const { data: userUpdateData, error: userUpdateError } = await supabase
      .from('users')
      .update({
        is_premium: true,
        premium_expires_at: endDate,
        revenuecat_user_id: customerInfo.originalAppUserId,
        last_login: new Date().toISOString()
      })
      .eq('auth_user_id', session.user.id)
      .select();

    let userTableUpdated = true;
    if (userUpdateError) {
      console.log('⚠️ User table update failed (columns might not exist):', userUpdateError.message);
      userTableUpdated = false;
      
      // Fallback: Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          is_premium: true,
          premium_expires_at: endDate,
          revenuecat_user_id: customerInfo.originalAppUserId,
          subscription_fix_applied: new Date().toISOString()
        }
      });

      if (metadataError) {
        return { success: false, error: `Both user table and metadata update failed: ${metadataError.message}` };
      }
    }

    console.log('✅ Step 2 complete: User data updated');

    return {
      success: true,
      details: {
        subscriptionUpdated: true,
        userTableUpdated,
        isPremium,
        expiresAt: endDate,
        activeEntitlements
      }
    };

  } catch (error: any) {
    console.error('❌ Fix subscription error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick function to check current subscription status in database
 */
export async function checkDatabaseStatus(): Promise<any> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { error: 'No user found' };

    // Check user table
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, is_premium, premium_expires_at, revenuecat_user_id')
      .eq('auth_user_id', session.user.id)
      .single();

    // Check subscription table
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData?.id)
      .single();

    return {
      user: userData,
      subscription: subData,
      userEmail: session.user.email
    };
  } catch (error: any) {
    return { error: error.message };
  }
} 