import { supabase } from './supabase';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

export interface SubscriptionStatus {
  isPremium: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  lastChecked: string;
  revenueCatActive: boolean;
  databaseStatus: 'active' | 'expired' | 'cancelled' | null;
}

export class SubscriptionSync {
  
  /**
   * Fix the subscription mismatch by syncing RevenueCat with database
   */
  static async fixSubscriptionMismatch(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🔧 Starting subscription mismatch fix...');

      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        return { success: false, message: 'No authenticated user found' };
      }

      const userId = session.user.id;
      console.log('👤 Fixing subscription for user:', session.user.email);

      // Step 1: Get RevenueCat status (if available)
      let revenueCatStatus = { isPremium: false, expiresAt: null };
      
      if (Platform.OS !== 'web') {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          const activeEntitlements = Object.keys(customerInfo.entitlements.active);
          revenueCatStatus.isPremium = activeEntitlements.length > 0;
          
          // Get expiration date from first active entitlement
          if (revenueCatStatus.isPremium) {
            const firstEntitlement = Object.values(customerInfo.entitlements.active)[0];
            revenueCatStatus.expiresAt = firstEntitlement.expirationDate;
          }
          
          console.log('📱 RevenueCat status:', revenueCatStatus);
        } catch (error) {
          console.log('⚠️ RevenueCat check failed, using database only:', error);
        }
      }

      // Step 2: Get current database status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, is_premium, premium_expires_at')
        .eq('auth_user_id', userId)
        .single();

      if (userError || !userData) {
        return { success: false, message: `User not found: ${userError?.message}` };
      }

      // Step 3: Get subscription record
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      console.log('💾 Current database status:', {
        userIsPremium: userData.is_premium,
        userExpiresAt: userData.premium_expires_at,
        subscriptionStatus: subData?.status,
        subscriptionEndDate: subData?.end_date
      });

      // Step 4: Determine correct status
      const now = new Date();
      let shouldBePremium = false;
      let correctExpirationDate = null;

      // Check if subscription is actually active
      if (subData && subData.status === 'active' && subData.end_date) {
        const expirationDate = new Date(subData.end_date);
        if (expirationDate > now) {
          shouldBePremium = true;
          correctExpirationDate = subData.end_date;
        }
      }

      // If RevenueCat shows active, trust that over database
      if (revenueCatStatus.isPremium && revenueCatStatus.expiresAt) {
        const rcExpirationDate = new Date(revenueCatStatus.expiresAt);
        if (rcExpirationDate > now) {
          shouldBePremium = true;
          correctExpirationDate = revenueCatStatus.expiresAt;
        }
      }

      console.log('✅ Determined correct status:', {
        shouldBePremium,
        correctExpirationDate
      });

      // Step 5: Update database to match correct status
      const updates: any = {
        is_premium: shouldBePremium,
        premium_expires_at: correctExpirationDate,
        updated_at: now.toISOString()
      };

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('auth_user_id', userId);

      if (updateError) {
        return { success: false, message: `Failed to update user: ${updateError.message}` };
      }

      // Step 6: Update subscription record if exists
      if (subData) {
        const subUpdates: any = {
          status: shouldBePremium ? 'active' : 'expired',
          end_date: correctExpirationDate,
          updated_at: now.toISOString()
        };

        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update(subUpdates)
          .eq('user_id', userData.id);

        if (subUpdateError) {
          console.warn('⚠️ Failed to update subscription record:', subUpdateError.message);
        }
      }

      const message = shouldBePremium 
        ? `✅ Subscription fixed! You have premium access until ${new Date(correctExpirationDate!).toLocaleDateString()}`
        : '❌ Subscription expired. Premium features have been disabled.';

      return {
        success: true,
        message,
        details: {
          wasPremium: userData.is_premium,
          nowPremium: shouldBePremium,
          expiresAt: correctExpirationDate,
          revenueCatActive: revenueCatStatus.isPremium
        }
      };

    } catch (error: any) {
      console.error('❌ Subscription fix error:', error);
      return { success: false, message: `Fix failed: ${error.message}` };
    }
  }

  /**
   * Check and auto-fix expired subscriptions
   */
  static async checkAndFixExpiredSubscriptions(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Get users with premium flag but expired subscriptions
      const { data: expiredUsers, error } = await supabase
        .from('users')
        .select('id, auth_user_id, is_premium, premium_expires_at')
        .eq('is_premium', true)
        .lt('premium_expires_at', new Date().toISOString());

      if (error || !expiredUsers?.length) return;

      console.log(`🔍 Found ${expiredUsers.length} users with expired premium but is_premium=true`);

      // Update each expired user
      for (const user of expiredUsers) {
        await supabase
          .from('users')
          .update({
            is_premium: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        console.log(`📝 Fixed expired subscription for user ${user.id}`);
      }

      // Also update subscription records
      await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .lt('end_date', new Date().toISOString());

    } catch (error) {
      console.error('❌ Auto-fix expired subscriptions error:', error);
    }
  }

  /**
   * Get comprehensive subscription status
   */
  static async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const defaultStatus: SubscriptionStatus = {
      isPremium: false,
      isExpired: true,
      expiresAt: null,
      lastChecked: new Date().toISOString(),
      revenueCatActive: false,
      databaseStatus: null
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return defaultStatus;

      // Get database status
      const { data: userData } = await supabase
        .from('users')
        .select('id, is_premium, premium_expires_at')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!userData) return defaultStatus;

      // Get subscription record
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status, end_date')
        .eq('user_id', userData.id)
        .single();

      // Check if expired
      const now = new Date();
      const expiresAt = userData.premium_expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) <= now : true;

      // Check RevenueCat if available
      let revenueCatActive = false;
      if (Platform.OS !== 'web') {
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          revenueCatActive = Object.keys(customerInfo.entitlements.active).length > 0;
        } catch (error) {
          console.warn('RevenueCat check failed:', error);
        }
      }

      return {
        isPremium: userData.is_premium && !isExpired,
        isExpired,
        expiresAt,
        lastChecked: new Date().toISOString(),
        revenueCatActive,
        databaseStatus: subData?.status || null
      };

    } catch (error) {
      console.error('❌ Get subscription status error:', error);
      return defaultStatus;
    }
  }

  /**
   * Force refresh subscription from RevenueCat
   */
  static async refreshFromRevenueCat(): Promise<{ success: boolean; message: string }> {
    try {
      if (Platform.OS === 'web') {
        return { success: false, message: 'RevenueCat not available on web' };
      }

      console.log('🔄 Refreshing subscription from RevenueCat...');
      
      // Force refresh customer info
      await Purchases.syncPurchases();
      const customerInfo = await Purchases.getCustomerInfo();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { success: false, message: 'No user session' };
      }

      // Sync with database
      const result = await this.syncRevenueCatToDatabase(customerInfo, session.user.id);
      
      return {
        success: result.success,
        message: result.success ? 'Subscription synced successfully' : result.message
      };

    } catch (error: any) {
      console.error('❌ RevenueCat refresh error:', error);
      return { success: false, message: `Refresh failed: ${error.message}` };
    }
  }

  /**
   * Sync RevenueCat data to database
   */
  private static async syncRevenueCatToDatabase(customerInfo: any, authUserId: string) {
    try {
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      const isPremium = activeEntitlements.length > 0;
      
      let expirationDate = null;
      if (isPremium) {
        const firstEntitlement = Object.values(customerInfo.entitlements.active)[0] as any;
        expirationDate = firstEntitlement.expirationDate;
      }

      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_premium: isPremium,
          premium_expires_at: expirationDate,
          revenuecat_user_id: customerInfo.originalAppUserId,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUserId);

      if (userError) {
        return { success: false, message: `User update failed: ${userError.message}` };
      }

      // Get user internal ID for subscription update
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();

      if (userData) {
        // Update subscription record
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userData.id,
            status: isPremium ? 'active' : 'expired',
            plan: isPremium ? 'premium' : 'free',
            end_date: expirationDate,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }

      return { success: true, message: 'Sync completed' };

    } catch (error: any) {
      return { success: false, message: `Sync failed: ${error.message}` };
    }
  }
} 