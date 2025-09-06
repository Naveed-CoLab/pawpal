import Purchases, { PurchasesError, PURCHASES_ERROR_CODE } from 'react-native-purchases';
import { Alert, Platform } from 'react-native';
import { fixSubscriptionStatus } from './fixSubscription';
import { subscriptionSyncService } from './subscriptionSync';
import { supabase } from './supabase';

export interface ErrorHandlerResult {
  success: boolean;
  message: string;
  shouldRetry: boolean;
  action?: 'refresh' | 'restore' | 'sync' | 'contact_support';
}

export class RevenueCatErrorHandler {
  private static instance: RevenueCatErrorHandler;
  
  public static getInstance(): RevenueCatErrorHandler {
    if (!RevenueCatErrorHandler.instance) {
      RevenueCatErrorHandler.instance = new RevenueCatErrorHandler();
    }
    return RevenueCatErrorHandler.instance;
  }

  /**
   * Main error handling method - analyzes RevenueCat errors and provides solutions
   */
  async handlePurchaseError(error: any): Promise<ErrorHandlerResult> {
    console.log('🔍 Analyzing RevenueCat error:', error);

    // Extract error details with better error object parsing
    const errorCode = error?.code || error?.error?.code || error?.errorCode;
    const readableCode = error?.readableErrorCode || error?.error?.readableErrorCode || error?.readable_error_code || error?.error?.readable_error_code;
    const message = error?.message || error?.error?.message || 'Unknown error';
    const underlyingMessage = error?.underlyingErrorMessage || error?.error?.underlyingErrorMessage || error?.underlying_error_message || error?.error?.underlying_error_message;

    console.log('📊 Error Details:', {
      errorCode,
      readableCode,
      message,
      underlyingMessage,
      fullError: JSON.stringify(error, null, 2)
    });

    // Handle specific error types
    switch (readableCode) {
      case 'NetworkError':
        return await this.handleNetworkError(error);
      
      case 'ProductAlreadyPurchasedError':
        return await this.handleAlreadyOwnedError(error);
      
      case 'PaymentPendingError':
        return this.handlePaymentPendingError(error);
      
      case 'PurchaseCancelledError':
        return this.handleUserCancelledError(error);
      
      case 'StoreProblemError':
        return await this.handleStoreProblemError(error);
      
      case 'PurchaseNotAllowedError':
        return this.handlePurchaseNotAllowedError(error);
      
      case 'PurchaseInvalidError':
        return this.handlePurchaseInvalidError(error);
      
      case 'ProductNotAvailableForPurchaseError':
        return await this.handleProductNotAvailableError(error);
      
      default:
        return await this.handleGenericError(error);
    }
  }

  /**
   * Handle NETWORK_ERROR: "Error updating purchases"
   */
  private async handleNetworkError(error: any): Promise<ErrorHandlerResult> {
    console.log('🌐 Handling network error...');

    try {
      // Step 1: Try to refresh customer info to see if purchase actually went through
      console.log('🔄 Refreshing customer info to check purchase status...');
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check if user actually has active entitlements despite the network error
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlements) {
        console.log('✅ Found active entitlements despite network error - syncing database...');
        
        // Sync with database to ensure consistency
        const syncResult = await fixSubscriptionStatus();
        
        if (syncResult.success) {
          return {
            success: true,
            message: 'Purchase successful! Your subscription is now active.',
            shouldRetry: false,
            action: 'refresh'
          };
        }
      }

      // Step 2: Check if this is a temporary network issue
      console.log('📡 Testing RevenueCat connectivity...');
      const isConnected = await this.testRevenueCatConnectivity();
      
      if (!isConnected) {
        return {
          success: false,
          message: 'Network connection issue. Please check your internet connection and try again.',
          shouldRetry: true,
          action: 'refresh'
        };
      }

      // Step 3: Try to restore purchases which often fixes sync issues
      console.log('🔄 Attempting to restore purchases...');
      const restoreResult = await this.attemptPurchaseRestore();
      
      if (restoreResult.success) {
        return restoreResult;
      }

      return {
        success: false,
        message: 'Network error occurred during purchase. Your payment may still be processing. Please wait a few minutes and restore purchases if needed.',
        shouldRetry: true,
        action: 'restore'
      };

    } catch (handlingError) {
      console.error('❌ Error while handling network error:', handlingError);
      return {
        success: false,
        message: 'Unable to complete purchase due to network issues. Please try again later.',
        shouldRetry: true,
        action: 'refresh'
      };
    }
  }

  /**
   * Handle ITEM_ALREADY_OWNED: "This product is already active for the user"
   */
  private async handleAlreadyOwnedError(error: any): Promise<ErrorHandlerResult> {
    console.log('🔄 Handling already owned error...');

    try {
      // Step 1: Get current RevenueCat status
      console.log('📊 Checking current RevenueCat status...');
      const customerInfo = await Purchases.getCustomerInfo();
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;

      // Step 2: Check database status
      console.log('💾 Checking database subscription status...');
      const { data: dbUser } = await supabase.auth.getUser();
      if (!dbUser.user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_premium, subscription_expires_at')
        .eq('id', dbUser.user.id)
        .single();

      console.log('📊 Status comparison:', {
        revenueCat: hasActiveEntitlements ? 'ACTIVE' : 'INACTIVE',
        database: profile?.is_premium ? 'PREMIUM' : 'FREE',
        expiresAt: profile?.subscription_expires_at
      });

      // Step 3: Handle different scenarios
      if (hasActiveEntitlements && !profile?.is_premium) {
        // RevenueCat says active, database says not premium - sync needed
        console.log('🔄 RevenueCat active but database not premium - syncing...');
        const syncResult = await fixSubscriptionStatus();
        
        if (syncResult.success) {
          return {
            success: true,
            message: 'Your subscription is already active! Access has been restored.',
            shouldRetry: false,
            action: 'refresh'
          };
        }
      } else if (!hasActiveEntitlements && profile?.is_premium) {
        // Database says premium but RevenueCat says not active - likely expired
        console.log('💾 Database says premium but RevenueCat inactive - likely expired subscription');
        
        // Try to restore purchases first
        const restoreResult = await this.attemptPurchaseRestore();
        if (restoreResult.success) {
          return restoreResult;
        }

        // If restore doesn't work, fix the database
        const syncResult = await subscriptionSyncService.fixExpiredSubscription();
        
        return {
          success: false,
          message: 'Your previous subscription has expired. You can purchase a new subscription to continue using premium features.',
          shouldRetry: true,
          action: 'refresh'
        };
      } else if (hasActiveEntitlements && profile?.is_premium) {
        // Both say active - user genuinely already has subscription
        return {
          success: true,
          message: 'You already have an active subscription! Enjoy your premium features.',
          shouldRetry: false,
          action: 'refresh'
        };
      } else {
        // Both say inactive - try restore
        console.log('🔄 Both systems show inactive - attempting restore...');
        const restoreResult = await this.attemptPurchaseRestore();
        
        if (restoreResult.success) {
          return restoreResult;
        }

        return {
          success: false,
          message: 'Unable to verify existing subscription. Please contact support if you believe this is an error.',
          shouldRetry: true,
          action: 'contact_support'
        };
      }

    } catch (handlingError) {
      console.error('❌ Error while handling already owned error:', handlingError);
      
      // Fallback - try restore
      const restoreResult = await this.attemptPurchaseRestore();
      if (restoreResult.success) {
        return restoreResult;
      }

      return {
        success: false,
        message: 'There seems to be an issue with your subscription status. Please try restoring your purchases.',
        shouldRetry: true,
        action: 'restore'
      };
    }
  }

  /**
   * Handle payment pending (user needs to complete payment in App Store)
   */
  private handlePaymentPendingError(error: any): ErrorHandlerResult {
    return {
      success: false,
      message: 'Your payment is pending approval. Please complete the purchase in your device settings and then restore purchases.',
      shouldRetry: true,
      action: 'restore'
    };
  }

  /**
   * Handle user cancelled purchase
   */
  private handleUserCancelledError(error: any): ErrorHandlerResult {
    return {
      success: false,
      message: 'Purchase was cancelled.',
      shouldRetry: false
    };
  }

  /**
   * Handle App Store/Play Store problems
   */
  private async handleStoreProblemError(error: any): Promise<ErrorHandlerResult> {
    // Try restore first as store problems are often temporary
    const restoreResult = await this.attemptPurchaseRestore();
    if (restoreResult.success) {
      return restoreResult;
    }

    return {
      success: false,
      message: 'There is a temporary problem with the App Store. Please try again in a few minutes.',
      shouldRetry: true,
      action: 'refresh'
    };
  }

  /**
   * Handle purchase not allowed (parental controls, etc.)
   */
  private handlePurchaseNotAllowedError(error: any): ErrorHandlerResult {
    return {
      success: false,
      message: 'Purchases are not allowed on this device. Please check your device settings.',
      shouldRetry: false,
      action: 'contact_support'
    };
  }

  /**
   * Handle PURCHASE_INVALID_ERROR: "The purchase is invalid"
   */
  private handlePurchaseInvalidError(error: any): ErrorHandlerResult {
    console.log('❌ Handling purchase invalid error...');
    
    return {
      success: false,
      message: 'The purchase is invalid. Please try again or contact support.',
      shouldRetry: true,
      action: 'refresh'
    };
  }

  /**
   * Handle PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: "The product is not available for purchase"
   */
  private async handleProductNotAvailableError(error: any): Promise<ErrorHandlerResult> {
    console.log('🚫 Handling product not available error...');
    
    try {
      // Check if this is a development/testing environment issue
      const isDevelopment = __DEV__;
      const platform = Platform.OS;
      
      console.log('🔍 Environment check:', { isDevelopment, platform });
      
      // Log detailed error information for debugging with better parsing
      const errorCode = error?.code || error?.error?.code || error?.errorCode;
      const readableCode = error?.readableErrorCode || error?.error?.readableErrorCode || error?.readable_error_code || error?.error?.readable_error_code;
      const message = error?.message || error?.error?.message;
      const underlyingMessage = error?.underlyingErrorMessage || error?.error?.underlyingErrorMessage || error?.underlying_error_message || error?.error?.underlying_error_message;
      
      console.log('📊 Detailed error analysis:', {
        errorCode,
        readableCode,
        message,
        underlyingMessage,
        target: error?.target,
        isDevelopment,
        platform,
        fullErrorStructure: JSON.stringify(error, null, 2)
      });
      
      // Try to refresh offerings to see if products become available
      console.log('🔄 Attempting to refresh offerings...');
      const offerings = await Purchases.getOfferings();
      
      console.log('📦 Offerings analysis:', {
        hasCurrentOffering: !!offerings.current,
        currentOfferingId: offerings.current?.identifier,
        availablePackages: offerings.current?.availablePackages?.length || 0,
        allOfferings: Object.keys(offerings.all || {}),
        currentOfferingPackages: offerings.current?.availablePackages?.map(pkg => ({
          identifier: pkg.identifier,
          product: pkg.product.identifier,
          price: pkg.product.priceString
        }))
      });
      
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('✅ Offerings refreshed successfully, products are available');
        return {
          success: false,
          message: 'Products are now available. Please try your purchase again.',
          shouldRetry: true,
          action: 'refresh'
        };
      }
      
      // Check if user is in a region where products are not available
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('🌍 Customer info for region check:', {
        originalAppUserId: customerInfo.originalAppUserId,
        firstSeen: customerInfo.firstSeen,
        originalApplicationVersion: customerInfo.originalApplicationVersion,
        managementURL: customerInfo.managementURL,
        nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions?.length || 0
      });
      
      // Check if this is a configuration issue
      if (isDevelopment) {
        console.log('🔧 Development mode detected - checking configuration...');
        
        // Common development issues
        const commonIssues = [
          'Test products not configured in RevenueCat dashboard',
          'App Store Connect / Google Play Console products not set up',
          'RevenueCat API key not configured correctly',
          'Products not available in current region',
          'Sandbox/Test environment not properly configured'
        ];
        
        console.log('🔍 Potential development issues:', commonIssues);
      }
      
      // Provide specific guidance based on the error and platform
      let errorMessage = 'This subscription is not available in your region or store. ';
      
      if (platform === 'android') {
        errorMessage += 'Please check your Google Play Store region settings and ensure you\'re signed in with a valid payment method.';
      } else if (platform === 'ios') {
        errorMessage += 'Please check your App Store region settings and ensure you\'re signed in with a valid payment method.';
      } else {
        errorMessage += 'Please check your store settings.';
      }
      
      if (isDevelopment) {
        errorMessage += '\n\nDevelopment mode detected - ensure test products are configured correctly in RevenueCat dashboard.';
      }
      
      return {
        success: false,
        message: errorMessage,
        shouldRetry: false,
        action: 'contact_support'
      };
      
    } catch (refreshError) {
      console.error('❌ Error refreshing offerings:', refreshError);
      
      return {
        success: false,
        message: 'Unable to verify product availability. Please try again later.',
        shouldRetry: true,
        action: 'refresh'
      };
    }
  }

  /**
   * Handle generic/unknown errors
   */
  private async handleGenericError(error: any): Promise<ErrorHandlerResult> {
    console.log('🔧 Handling generic error...');
    
    // Try restore as a general fix
    const restoreResult = await this.attemptPurchaseRestore();
    if (restoreResult.success) {
      return restoreResult;
    }

    const message = error?.message || error?.error?.message || 'An unexpected error occurred';
    
    return {
      success: false,
      message: `Purchase failed: ${message}. Please try again.`,
      shouldRetry: true,
      action: 'refresh'
    };
  }

  /**
   * Attempt to restore purchases and sync with database
   */
  private async attemptPurchaseRestore(): Promise<ErrorHandlerResult> {
    try {
      console.log('🔄 Attempting purchase restore...');
      
      const customerInfo = await Purchases.restorePurchases();
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;
      
      if (hasActiveEntitlements) {
        console.log('✅ Restore successful - syncing with database...');
        
        // Sync with database
        const syncResult = await fixSubscriptionStatus();
        
        return {
          success: true,
          message: 'Your subscription has been restored successfully!',
          shouldRetry: false,
          action: 'refresh'
        };
      } else {
        console.log('ℹ️ No active subscriptions found during restore');
        return {
          success: false,
          message: 'No active subscriptions found to restore.',
          shouldRetry: false
        };
      }
    } catch (restoreError) {
      console.error('❌ Restore failed:', restoreError);
      return {
        success: false,
        message: 'Failed to restore purchases. Please try again.',
        shouldRetry: true,
        action: 'restore'
      };
    }
  }

  /**
   * Test RevenueCat connectivity
   */
  private async testRevenueCatConnectivity(): Promise<boolean> {
    try {
      // Try a simple RevenueCat operation with timeout
      const testPromise = Purchases.getCustomerInfo();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connectivity test timeout')), 5000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      return true;
    } catch (error) {
      console.log('📡 RevenueCat connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Show user-friendly error alert with action buttons
   */
  showErrorAlert(result: ErrorHandlerResult, onRetry?: () => void, onRestore?: () => void): void {
    if (result.success) {
      Alert.alert('Success!', result.message, [{ text: 'OK' }]);
      return;
    }

    const buttons: any[] = [];
    
    // Add action button based on suggested action
    switch (result.action) {
      case 'refresh':
        if (onRetry) {
          buttons.push({ text: 'Try Again', onPress: onRetry });
        }
        break;
      
      case 'restore':
        if (onRestore) {
          buttons.push({ text: 'Restore Purchases', onPress: onRestore });
        }
        if (onRetry) {
          buttons.push({ text: 'Try Again', onPress: onRetry });
        }
        break;
      
      case 'sync':
        buttons.push({ 
          text: 'Sync Status', 
          onPress: async () => {
            try {
              const syncResult = await fixSubscriptionStatus();
              Alert.alert(
                syncResult.success ? 'Success' : 'Error',
                syncResult.message,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to sync subscription status.', [{ text: 'OK' }]);
            }
          }
        });
        break;
      
      case 'contact_support':
        buttons.push({ 
          text: 'Contact Support', 
          onPress: () => {
            Alert.alert(
              'Contact Support',
              'Please contact support at support@vetpaw.com with your order details.',
              [{ text: 'OK' }]
            );
          }
        });
        break;
    }
    
    // Always add a close button
    buttons.push({ text: 'Close', style: 'cancel' });

    Alert.alert('Purchase Error', result.message, buttons);
  }
}

export const revenueCatErrorHandler = RevenueCatErrorHandler.getInstance(); 