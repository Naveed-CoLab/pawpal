import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';

export interface RevenueCatDebugInfo {
  isInitialized: boolean;
  platform: string;
  isDevelopment: boolean;
  hasCurrentOffering: boolean;
  currentOfferingId?: string;
  availablePackages: number;
  customerInfo?: CustomerInfo;
  allOfferings: string[];
  configurationIssues: string[];
  recommendations: string[];
}

export class RevenueCatDebugger {
  private static instance: RevenueCatDebugger;

  private constructor() {}

  public static getInstance(): RevenueCatDebugger {
    if (!RevenueCatDebugger.instance) {
      RevenueCatDebugger.instance = new RevenueCatDebugger();
    }
    return RevenueCatDebugger.instance;
  }

  /**
   * Comprehensive RevenueCat configuration debug
   */
  async debugConfiguration(): Promise<RevenueCatDebugInfo> {
    console.log('🔍 RevenueCat Debugger: Starting configuration analysis...');
    
    const debugInfo: RevenueCatDebugInfo = {
      isInitialized: false,
      platform: Platform.OS,
      isDevelopment: __DEV__,
      hasCurrentOffering: false,
      availablePackages: 0,
      allOfferings: [],
      configurationIssues: [],
      recommendations: []
    };

    try {
      // Check if RevenueCat is initialized
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        debugInfo.isInitialized = true;
        debugInfo.customerInfo = customerInfo;
        console.log('✅ RevenueCat is initialized');
      } catch (error) {
        console.log('❌ RevenueCat not initialized:', error);
        debugInfo.configurationIssues.push('RevenueCat not initialized');
        debugInfo.recommendations.push('Ensure RevenueCat is properly initialized before use');
        return debugInfo;
      }

      // Check offerings
      try {
        const offerings = await Purchases.getOfferings();
        debugInfo.hasCurrentOffering = !!offerings.current;
        debugInfo.currentOfferingId = offerings.current?.identifier;
        debugInfo.availablePackages = offerings.current?.availablePackages?.length || 0;
        debugInfo.allOfferings = Object.keys(offerings.all || {});

        console.log('📦 Offerings analysis:', {
          hasCurrent: debugInfo.hasCurrentOffering,
          currentId: debugInfo.currentOfferingId,
          availablePackages: debugInfo.availablePackages,
          allOfferings: debugInfo.allOfferings
        });

        if (!offerings.current) {
          debugInfo.configurationIssues.push('No current offering available');
          debugInfo.recommendations.push('Check RevenueCat dashboard for offering configuration');
        }

        if (offerings.current && offerings.current.availablePackages.length === 0) {
          debugInfo.configurationIssues.push('Current offering has no available packages');
          debugInfo.recommendations.push('Check product configuration in App Store Connect/Google Play Console');
        }

      } catch (error) {
        console.log('❌ Error fetching offerings:', error);
        debugInfo.configurationIssues.push('Failed to fetch offerings');
        debugInfo.recommendations.push('Check RevenueCat API key and network connectivity');
      }

      // Platform-specific checks
      if (Platform.OS === 'android') {
        debugInfo.recommendations.push('Ensure Google Play Console products are configured and published');
        debugInfo.recommendations.push('Check that test account is added to Google Play Console');
      } else if (Platform.OS === 'ios') {
        debugInfo.recommendations.push('Ensure App Store Connect products are configured and ready for review');
        debugInfo.recommendations.push('Check that sandbox test account is properly configured');
      }

      // Development-specific checks
      if (__DEV__) {
        debugInfo.recommendations.push('Ensure test products are configured in RevenueCat dashboard');
        debugInfo.recommendations.push('Check that sandbox/test environment is properly set up');
        debugInfo.recommendations.push('Verify RevenueCat API key is for the correct environment (sandbox/production)');
      }

      console.log('✅ RevenueCat debug analysis completed');
      return debugInfo;

    } catch (error) {
      console.error('❌ RevenueCat debug error:', error);
      debugInfo.configurationIssues.push('Debug analysis failed');
      return debugInfo;
    }
  }

  /**
   * Log detailed debug information
   */
  async logDebugInfo(): Promise<void> {
    const debugInfo = await this.debugConfiguration();
    
    console.log('🔍 RevenueCat Debug Report:');
    console.log('📊 Configuration Status:', {
      isInitialized: debugInfo.isInitialized,
      platform: debugInfo.platform,
      isDevelopment: debugInfo.isDevelopment,
      hasCurrentOffering: debugInfo.hasCurrentOffering,
      currentOfferingId: debugInfo.currentOfferingId,
      availablePackages: debugInfo.availablePackages,
      allOfferings: debugInfo.allOfferings
    });

    if (debugInfo.configurationIssues.length > 0) {
      console.log('❌ Configuration Issues:', debugInfo.configurationIssues);
    }

    if (debugInfo.recommendations.length > 0) {
      console.log('💡 Recommendations:', debugInfo.recommendations);
    }

    if (debugInfo.customerInfo) {
      console.log('👤 Customer Info:', {
        originalAppUserId: debugInfo.customerInfo.originalAppUserId,
        firstSeen: debugInfo.customerInfo.firstSeen,
        originalApplicationVersion: debugInfo.customerInfo.originalApplicationVersion,
        managementURL: debugInfo.customerInfo.managementURL,
        activeEntitlements: Object.keys(debugInfo.customerInfo.entitlements.active),
        allEntitlements: Object.keys(debugInfo.customerInfo.entitlements.all)
      });
    }
  }

  /**
   * Test RevenueCat connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      console.log('🌐 Testing RevenueCat connectivity...');
      
      const startTime = Date.now();
      const customerInfo = await Purchases.getCustomerInfo();
      const endTime = Date.now();
      
      console.log('✅ RevenueCat connectivity test passed:', {
        responseTime: `${endTime - startTime}ms`,
        hasCustomerInfo: !!customerInfo
      });
      
      return true;
    } catch (error) {
      console.error('❌ RevenueCat connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Check if current API key is properly configured
   */
  async checkApiKeyConfiguration(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    currentKey: string;
  }> {
    console.log('🔑 Checking RevenueCat API key configuration...');
    
    const result = {
      isValid: false,
      issues: [] as string[],
      recommendations: [] as string[],
      currentKey: ''
    };

    try {
      // Get current API key being used
      const currentKey = Platform.OS === 'ios' 
        ? 'appl_your_ios_api_key_here' // This is the hardcoded key
        : 'goog_jnQKGTTAKjhBfTsMVOAIHosFbPH'; // This is the hardcoded key
      
      result.currentKey = currentKey;
      console.log(`🔑 Current API key: ${currentKey.substring(0, 15)}...`);

      // Check if key format is correct
      if (!currentKey.startsWith('goog_') && !currentKey.startsWith('appl_')) {
        result.issues.push('API key format is incorrect');
        result.recommendations.push('API key should start with "goog_" for Android or "appl_" for iOS');
      }

      // Check if key is placeholder
      if (currentKey.includes('your_') || currentKey.includes('_api_key_here')) {
        result.issues.push('Using placeholder API key');
        result.recommendations.push('Replace placeholder with actual RevenueCat API key from dashboard');
      }

      // Test if key works with RevenueCat
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          result.isValid = true;
          console.log('✅ API key is working correctly');
        } else {
          result.issues.push('API key works but no offerings available');
          result.recommendations.push('Check RevenueCat dashboard for product configuration');
        }
      } catch (error: any) {
        result.issues.push(`API key test failed: ${error.message}`);
        result.recommendations.push('Verify API key in RevenueCat dashboard');
        result.recommendations.push('Check if products are properly configured');
      }

      // Platform-specific checks
      if (Platform.OS === 'android') {
        result.recommendations.push('Ensure Google Play Console products are published and active');
        result.recommendations.push('Verify test account is added to license testing');
        result.recommendations.push('Check that products are available in your region');
      } else if (Platform.OS === 'ios') {
        result.recommendations.push('Ensure App Store Connect products are configured');
        result.recommendations.push('Verify sandbox test account is properly set up');
      }

      // Development-specific checks
      if (__DEV__) {
        result.recommendations.push('For development: Use sandbox/test environment API key');
        result.recommendations.push('Ensure test products are configured in RevenueCat dashboard');
      } else {
        result.recommendations.push('For production: Use production environment API key');
        result.recommendations.push('Ensure products are approved and active in stores');
      }

    } catch (error) {
      console.error('❌ API key configuration check failed:', error);
      result.issues.push('Configuration check failed');
    }

    return result;
  }

  /**
   * Comprehensive ITEM_UNAVAILABLE error diagnosis
   */
  async diagnoseItemUnavailableError(): Promise<{
    possibleCauses: string[];
    solutions: string[];
    nextSteps: string[];
  }> {
    console.log('🔍 Diagnosing ITEM_UNAVAILABLE error...');
    
    const diagnosis = {
      possibleCauses: [] as string[],
      solutions: [] as string[],
      nextSteps: [] as string[]
    };

    // Check API key configuration
    const apiKeyCheck = await this.checkApiKeyConfiguration();
    if (!apiKeyCheck.isValid) {
      diagnosis.possibleCauses.push('Invalid or misconfigured API key');
      diagnosis.solutions.push('Replace hardcoded API key with correct one from RevenueCat dashboard');
    }

    // Check offerings
    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) {
        diagnosis.possibleCauses.push('No current offering configured');
        diagnosis.solutions.push('Configure current offering in RevenueCat dashboard');
      } else if (offerings.current.availablePackages.length === 0) {
        diagnosis.possibleCauses.push('Current offering has no available packages');
        diagnosis.solutions.push('Add products to current offering in RevenueCat dashboard');
      }
    } catch (error) {
      diagnosis.possibleCauses.push('Cannot fetch offerings - API key or network issue');
      diagnosis.solutions.push('Check API key and network connectivity');
    }

    // Platform-specific causes
    if (Platform.OS === 'android') {
      diagnosis.possibleCauses.push('Google Play Console products not published');
      diagnosis.possibleCauses.push('Test account not added to license testing');
      diagnosis.possibleCauses.push('Products not available in current region');
      diagnosis.solutions.push('Publish products in Google Play Console');
      diagnosis.solutions.push('Add test account to license testing');
      diagnosis.solutions.push('Check regional availability of products');
    } else if (Platform.OS === 'ios') {
      diagnosis.possibleCauses.push('App Store Connect products not configured');
      diagnosis.possibleCauses.push('Sandbox test account not set up');
      diagnosis.solutions.push('Configure products in App Store Connect');
      diagnosis.solutions.push('Set up sandbox test account');
    }

    // Environment-specific causes
    if (__DEV__) {
      diagnosis.possibleCauses.push('Using production API key in development');
      diagnosis.possibleCauses.push('Test products not configured in RevenueCat');
      diagnosis.solutions.push('Use sandbox API key for development');
      diagnosis.solutions.push('Configure test products in RevenueCat dashboard');
    } else {
      diagnosis.possibleCauses.push('Products not approved for production');
      diagnosis.possibleCauses.push('Using development API key in production');
      diagnosis.solutions.push('Ensure products are approved and active');
      diagnosis.solutions.push('Use production API key');
    }

    // Next steps
    diagnosis.nextSteps.push('1. Check RevenueCat dashboard for correct API key');
    diagnosis.nextSteps.push('2. Verify products are configured in RevenueCat');
    diagnosis.nextSteps.push('3. Check store console (Google Play/App Store) for product status');
    diagnosis.nextSteps.push('4. Test with a different device/account');
    diagnosis.nextSteps.push('5. Contact RevenueCat support if issue persists');

    return diagnosis;
  }
}

export const revenueCatDebugger = RevenueCatDebugger.getInstance(); 