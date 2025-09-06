import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

export interface QuickDiagnosticResult {
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  solution: string;
  nextSteps: string[];
}

export class RevenueCatQuickDiagnostic {
  /**
   * Quick diagnostic to identify the exact issue
   */
  static async runDiagnostic(): Promise<QuickDiagnosticResult[]> {
    const results: QuickDiagnosticResult[] = [];
    
    try {
      console.log('🔍 RevenueCat Quick Diagnostic: Starting...');
      
      // Check 1: API Key Configuration
      const currentApiKey = Platform.OS === 'ios'
        ? 'appl_your_ios_api_key_here'
        : 'goog_jnQKGTTAKjhBfTsMVOAIHosFbPH';
      
      if (currentApiKey.includes('your_') || currentApiKey.includes('_api_key_here')) {
        results.push({
          issue: 'Using placeholder API key',
          severity: 'critical',
          solution: 'Replace the hardcoded API key with your actual RevenueCat API key',
          nextSteps: [
            '1. Go to RevenueCat Dashboard → Project Settings → API Keys',
            '2. Copy your actual API key (starts with goog_ for Android)',
            '3. Replace the hardcoded key in revenueCatInitializer.ts'
          ]
        });
      }
      
      // Check 2: Test RevenueCat Configuration
      try {
        await Purchases.configure({ apiKey: currentApiKey });
        console.log('✅ API key configuration test passed');
      } catch (configError: any) {
        results.push({
          issue: 'API key configuration failed',
          severity: 'critical',
          solution: 'The API key is invalid or not properly configured',
          nextSteps: [
            '1. Verify the API key in RevenueCat Dashboard',
            '2. Check if the key is for the correct environment (sandbox/production)',
            '3. Ensure the key is for the correct platform (Android/iOS)'
          ]
        });
      }
      
      // Check 3: Test Offerings
      try {
        const offerings = await Purchases.getOfferings();
        if (!offerings.current) {
          results.push({
            issue: 'No current offering configured',
            severity: 'critical',
            solution: 'Configure a current offering in RevenueCat Dashboard',
            nextSteps: [
              '1. Go to RevenueCat Dashboard → Offerings',
              '2. Create or select an offering',
              '3. Set it as the current offering'
            ]
          });
        } else if (offerings.current.availablePackages.length === 0) {
          results.push({
            issue: 'Current offering has no available packages',
            severity: 'critical',
            solution: 'Add products to the current offering',
            nextSteps: [
              '1. Go to RevenueCat Dashboard → Products',
              '2. Add your products (pawpal_monthly, pawpal_annual)',
              '3. Add products to the current offering'
            ]
          });
        } else {
          console.log('✅ Offerings configuration is correct');
        }
      } catch (offeringsError: any) {
        results.push({
          issue: 'Cannot fetch offerings',
          severity: 'critical',
          solution: 'Network or configuration issue preventing offerings fetch',
          nextSteps: [
            '1. Check network connectivity',
            '2. Verify API key is correct',
            '3. Check RevenueCat dashboard for product configuration'
          ]
        });
      }
      
      // Check 4: Platform-specific issues
      if (Platform.OS === 'android') {
        results.push({
          issue: 'Android-specific configuration needed',
          severity: 'warning',
          solution: 'Ensure Google Play Console products are properly configured',
          nextSteps: [
            '1. Verify products are "Active" in Google Play Console',
            '2. Add test account to license testing',
            '3. Check regional availability of products',
            '4. Ensure products are linked in RevenueCat dashboard'
          ]
        });
      }
      
      // Check 5: Development environment
      if (__DEV__) {
        results.push({
          issue: 'Development environment detected',
          severity: 'info',
          solution: 'Use sandbox/test environment for development',
          nextSteps: [
            '1. Use sandbox API key for development',
            '2. Configure test products in RevenueCat',
            '3. Add test account to Google Play Console license testing'
          ]
        });
      }
      
    } catch (error: any) {
      results.push({
        issue: 'Diagnostic failed',
        severity: 'critical',
        solution: 'Unable to run diagnostic - check network and configuration',
        nextSteps: [
          '1. Check network connectivity',
          '2. Verify RevenueCat SDK is properly installed',
          '3. Check console for specific error messages'
        ]
      });
    }
    
    return results;
  }
  
  /**
   * Check what RevenueCat keys are being used
   */
  static async checkCurrentKeys(): Promise<{
    sdkKey: string;
    hasSecretKey: boolean;
    needsSecretKey: boolean;
    recommendations: string[];
  }> {
    const result = {
      sdkKey: '',
      hasSecretKey: false,
      needsSecretKey: false,
      recommendations: [] as string[]
    };

    try {
      // Check current SDK key
      const currentSdkKey = Platform.OS === 'ios'
        ? 'appl_your_ios_api_key_here'
        : 'goog_jnQKGTTAKjhBfTsMVOAIHosFbPH';
      
      result.sdkKey = currentSdkKey;
      
      // Check if SDK key is placeholder
      if (currentSdkKey.includes('your_') || currentSdkKey.includes('_api_key_here')) {
        result.recommendations.push('🚨 Replace placeholder SDK key with actual key from RevenueCat dashboard');
      }
      
      // Check if SDK key format is correct
      if (!currentSdkKey.startsWith('goog_') && !currentSdkKey.startsWith('appl_')) {
        result.recommendations.push('⚠️ SDK key format is incorrect - should start with goog_ (Android) or appl_ (iOS)');
      }
      
      // Check if you need a secret key
      // You typically need a secret key if you're doing server-side operations
      // For basic client-side purchases, SDK key is usually sufficient
      result.needsSecretKey = false; // For basic setup, SDK key is enough
      
      if (result.needsSecretKey && !result.hasSecretKey) {
        result.recommendations.push('ℹ️ Consider adding a secret key for server-side operations (optional for basic setup)');
      }
      
      // Additional recommendations
      result.recommendations.push('✅ SDK key is sufficient for basic client-side purchases');
      result.recommendations.push('💡 Secret key is only needed for server-side operations (webhooks, server validation)');
      
    } catch (error) {
      result.recommendations.push('❌ Error checking keys: ' + error);
    }
    
    return result;
  }

  /**
   * Comprehensive test for ITEM_UNAVAILABLE error
   */
  static async testItemUnavailableError(): Promise<{
    testResults: string[];
    issues: string[];
    solutions: string[];
  }> {
    const results = {
      testResults: [] as string[],
      issues: [] as string[],
      solutions: [] as string[]
    };

    try {
      console.log('🔍 Testing ITEM_UNAVAILABLE error causes...');
      
      // Test 1: Check if RevenueCat is properly configured
      results.testResults.push('1. Testing RevenueCat configuration...');
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        results.testResults.push('✅ RevenueCat is properly configured');
      } catch (error: any) {
        results.issues.push('RevenueCat configuration failed');
        results.solutions.push('Check API key and network connectivity');
        results.testResults.push('❌ RevenueCat configuration failed: ' + error.message);
      }

      // Test 2: Check offerings
      results.testResults.push('2. Testing offerings...');
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          results.testResults.push(`✅ Current offering found: ${offerings.current.identifier}`);
          results.testResults.push(`📦 Available packages: ${offerings.current.availablePackages.length}`);
          
          if (offerings.current.availablePackages.length === 0) {
            results.issues.push('Current offering has no available packages');
            results.solutions.push('Add products to the current offering in RevenueCat dashboard');
          }
        } else {
          results.issues.push('No current offering configured');
          results.solutions.push('Set a current offering in RevenueCat dashboard');
        }
      } catch (error: any) {
        results.issues.push('Cannot fetch offerings');
        results.solutions.push('Check API key and network connectivity');
        results.testResults.push('❌ Offerings test failed: ' + error.message);
      }

      // Test 3: Check customer info
      results.testResults.push('3. Testing customer info...');
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        results.testResults.push('✅ Customer info retrieved successfully');
        results.testResults.push(`👤 Customer ID: ${customerInfo.originalAppUserId}`);
        results.testResults.push(`📅 First seen: ${customerInfo.firstSeen}`);
      } catch (error: any) {
        results.testResults.push('❌ Customer info test failed: ' + error.message);
      }

      // Test 4: Platform-specific checks
      if (Platform.OS === 'android') {
        results.testResults.push('4. Android-specific checks...');
        results.testResults.push('⚠️ Check Google Play Console:');
        results.testResults.push('   - Products must be "Active" and "Published"');
        results.testResults.push('   - Add test account to license testing');
        results.testResults.push('   - Check regional availability');
        
        results.issues.push('Android-specific configuration needed');
        results.solutions.push('Verify Google Play Console product status');
        results.solutions.push('Add test account to license testing');
        results.solutions.push('Check regional availability of products');
      }

      // Test 5: Development environment checks
      if (__DEV__) {
        results.testResults.push('5. Development environment checks...');
        results.testResults.push('⚠️ Development mode detected:');
        results.testResults.push('   - Use sandbox API key');
        results.testResults.push('   - Configure test products');
        results.testResults.push('   - Add test account to Google Play Console license testing');
        
        results.issues.push('Development environment detected');
        results.solutions.push('Use sandbox API key for development');
        results.solutions.push('Configure test products in RevenueCat');
        results.solutions.push('Add test account to Google Play Console license testing');
      }

      // Test 6: Try to get specific product info
      results.testResults.push('6. Testing product availability...');
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          const packages = offerings.current.availablePackages;
          results.testResults.push(`📦 Found ${packages.length} available packages:`);
          
          packages.forEach((pkg, index) => {
            results.testResults.push(`   ${index + 1}. ${pkg.identifier} - ${pkg.product.priceString}`);
            results.testResults.push(`      Product ID: ${pkg.product.identifier}`);
          });
          
          // Try to get detailed product info
          try {
            const productIds = packages.map(pkg => pkg.product.identifier);
            results.testResults.push(`🔍 Product IDs: ${productIds.join(', ')}`);
          } catch (productError: any) {
            results.testResults.push('⚠️ Could not get detailed product info: ' + productError.message);
          }
        } else {
          results.issues.push('No available packages found');
          results.solutions.push('Add products to the current offering');
        }
      } catch (error: any) {
        results.testResults.push('❌ Product availability test failed: ' + error.message);
      }

    } catch (error: any) {
      results.testResults.push('❌ Comprehensive test failed: ' + error.message);
      results.issues.push('Test execution failed');
      results.solutions.push('Check network connectivity and API key');
    }

    return results;
  }

  /**
   * Test specifically for Google Play Console license testing issues
   */
  static async testGooglePlayLicenseTesting(): Promise<{
    testResults: string[];
    issues: string[];
    solutions: string[];
  }> {
    const results = {
      testResults: [] as string[],
      issues: [] as string[],
      solutions: [] as string[]
    };

    try {
      console.log('🔍 Testing Google Play Console License Testing...');
      
      // Test 1: Check if we can get customer info (indicates proper setup)
      results.testResults.push('1. Testing customer info access...');
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        results.testResults.push('✅ Customer info accessible');
        results.testResults.push(`👤 Customer ID: ${customerInfo.originalAppUserId}`);
      } catch (error: any) {
        results.issues.push('Cannot access customer info');
        results.solutions.push('Check RevenueCat configuration and network');
        results.testResults.push('❌ Customer info failed: ' + error.message);
      }

      // Test 2: Check offerings (this should work even with license testing issues)
      results.testResults.push('2. Testing offerings...');
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          results.testResults.push('✅ Offerings are available');
          results.testResults.push(`📦 Found ${offerings.current.availablePackages.length} packages`);
          
          // Show package details
          offerings.current.availablePackages.forEach((pkg, index) => {
            results.testResults.push(`   ${index + 1}. ${pkg.identifier} - ${pkg.product.priceString}`);
            results.testResults.push(`      Product: ${pkg.product.identifier}`);
          });
        } else {
          results.issues.push('No offerings available');
          results.solutions.push('Check RevenueCat dashboard configuration');
        }
      } catch (error: any) {
        results.issues.push('Cannot fetch offerings');
        results.solutions.push('Check RevenueCat API key and network');
        results.testResults.push('❌ Offerings failed: ' + error.message);
      }

      // Test 3: Platform-specific license testing checks
      if (Platform.OS === 'android') {
        results.testResults.push('3. Android License Testing Checks...');
        results.testResults.push('⚠️ Common ITEM_UNAVAILABLE causes:');
        results.testResults.push('   - Test account not in license testing');
        results.testResults.push('   - Wrong Google account signed in');
        results.testResults.push('   - Products not properly linked');
        results.testResults.push('   - Regional availability issues');
        
        results.issues.push('Android license testing configuration needed');
        results.solutions.push('Add your test account email to Google Play Console license testing');
        results.solutions.push('Ensure you\'re signed in with the test account on device');
        results.solutions.push('Check that products are properly linked in RevenueCat dashboard');
        results.solutions.push('Verify regional availability of products');
      }

      // Test 4: Development environment specific checks
      if (__DEV__) {
        results.testResults.push('4. Development Environment Checks...');
        results.testResults.push('⚠️ Development-specific issues:');
        results.testResults.push('   - Using production API key in development');
        results.testResults.push('   - Test products not configured');
        results.testResults.push('   - Sandbox environment not set up');
        
        results.issues.push('Development environment detected');
        results.solutions.push('Use sandbox API key for development testing');
        results.solutions.push('Configure test products in RevenueCat dashboard');
        results.solutions.push('Add test account to Google Play Console license testing');
      }

      // Test 5: Try to get detailed error information
      results.testResults.push('5. Error Analysis...');
      results.testResults.push('🔍 ITEM_UNAVAILABLE typically means:');
      results.testResults.push('   - Product not available in current region');
      results.testResults.push('   - Test account not properly configured');
      results.testResults.push('   - Product not properly linked between RevenueCat and Google Play');
      results.testResults.push('   - Using production key in development environment');

    } catch (error: any) {
      results.testResults.push('❌ License testing test failed: ' + error.message);
      results.issues.push('Test execution failed');
      results.solutions.push('Check network connectivity and configuration');
    }

    return results;
  }

  /**
   * Test specifically for RevenueCat dashboard product registration issues
   */
  static async testRevenueCatProductRegistration(): Promise<{
    testResults: string[];
    issues: string[];
    solutions: string[];
  }> {
    const results = {
      testResults: [] as string[],
      issues: [] as string[],
      solutions: [] as string[]
    };

    try {
      console.log('🔍 Testing RevenueCat Dashboard Product Registration...');
      
      // Test 1: Check if we can get offerings (this will fail with the current error)
      results.testResults.push('1. Testing offerings fetch...');
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          results.testResults.push('✅ Offerings are properly configured');
          results.testResults.push(`📦 Found ${offerings.current.availablePackages.length} packages`);
        } else {
          results.issues.push('No offerings available');
          results.solutions.push('Configure offerings in RevenueCat dashboard');
        }
      } catch (error: any) {
        results.testResults.push('❌ Offerings fetch failed: ' + error.message);
        
        // Check for the specific error we're seeing
        if (error.message.includes('no products registered in the RevenueCat dashboard')) {
          results.issues.push('Products not registered in RevenueCat dashboard');
          results.solutions.push('Add products to RevenueCat dashboard');
          results.solutions.push('Link products to Google Play Console products');
          results.solutions.push('Add products to offerings');
        }
      }

      // Test 2: Check customer info (this should still work)
      results.testResults.push('2. Testing customer info...');
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        results.testResults.push('✅ Customer info accessible');
        results.testResults.push(`👤 Customer ID: ${customerInfo.originalAppUserId}`);
      } catch (error: any) {
        results.testResults.push('❌ Customer info failed: ' + error.message);
      }

      // Test 3: Platform-specific product registration checks
      if (Platform.OS === 'android') {
        results.testResults.push('3. Android Product Registration Checks...');
        results.testResults.push('⚠️ RevenueCat Dashboard Setup Required:');
        results.testResults.push('   - Add products to RevenueCat dashboard');
        results.testResults.push('   - Link products to Google Play Console');
        results.testResults.push('   - Add products to offerings');
        results.testResults.push('   - Set current offering');
        
        results.issues.push('RevenueCat dashboard not properly configured');
        results.solutions.push('Go to RevenueCat Dashboard → Products');
        results.solutions.push('Add your products (pawpal_monthly, pawpal_annual)');
        results.solutions.push('Link products to Google Play Console product IDs');
        results.solutions.push('Go to RevenueCat Dashboard → Offerings');
        results.solutions.push('Add products to the "default" offering');
        results.solutions.push('Set "default" as the current offering');
      }

      // Test 4: Development environment checks
      if (__DEV__) {
        results.testResults.push('4. Development Environment Checks...');
        results.testResults.push('⚠️ Development-specific setup:');
        results.testResults.push('   - Use sandbox API key');
        results.testResults.push('   - Configure test products in RevenueCat');
        results.testResults.push('   - Link to Google Play Console test products');
        
        results.issues.push('Development environment detected');
        results.solutions.push('Use sandbox API key for development');
        results.solutions.push('Configure test products in RevenueCat dashboard');
        results.solutions.push('Link to Google Play Console test products');
      }

      // Test 5: Provide specific setup instructions
      results.testResults.push('5. Setup Instructions...');
      results.testResults.push('🎯 To fix this issue:');
      results.testResults.push('   1. Go to RevenueCat Dashboard → Products');
      results.testResults.push('   2. Click "Add Product"');
      results.testResults.push('   3. Add "pawpal_monthly" and "pawpal_annual"');
      results.testResults.push('   4. Link to Google Play Console product IDs');
      results.testResults.push('   5. Go to RevenueCat Dashboard → Offerings');
      results.testResults.push('   6. Edit "default" offering');
      results.testResults.push('   7. Add your products to the offering');
      results.testResults.push('   8. Set "default" as current offering');

    } catch (error: any) {
      results.testResults.push('❌ Product registration test failed: ' + error.message);
      results.issues.push('Test execution failed');
      results.solutions.push('Check network connectivity and configuration');
    }

    return results;
  }

  /**
   * Get specific fix instructions based on the error
   */
  static getFixInstructions(error: any): QuickDiagnosticResult {
    const errorMessage = error?.message || error?.toString() || '';
    
    if (errorMessage.includes('ITEM_UNAVAILABLE')) {
      return {
        issue: 'ITEM_UNAVAILABLE Error',
        severity: 'critical',
        solution: 'Products are not available for purchase in your region/environment',
        nextSteps: [
          '1. Check Google Play Console - products must be "Active" and "Published"',
          '2. Add your test account to Google Play Console license testing',
          '3. Verify products are available in your current region',
          '4. Check RevenueCat dashboard - products must be properly configured',
          '5. For development: Use sandbox API key and test products'
        ]
      };
    }
    
    if (errorMessage.includes('no products registered in the RevenueCat dashboard')) {
      return {
        issue: 'Products Not Registered in RevenueCat Dashboard',
        severity: 'critical',
        solution: 'Add products to RevenueCat dashboard and link to Google Play Console',
        nextSteps: [
          '1. Go to RevenueCat Dashboard → Products',
          '2. Click "Add Product"',
          '3. Add "pawpal_monthly" and "pawpal_annual"',
          '4. Link to Google Play Console product IDs',
          '5. Go to RevenueCat Dashboard → Offerings',
          '6. Edit "default" offering',
          '7. Add your products to the offering',
          '8. Set "default" as current offering'
        ]
      };
    }
    
    return {
      issue: 'Unknown Error',
      severity: 'warning',
      solution: 'Check the specific error message for guidance',
      nextSteps: [
        '1. Review the error message details',
        '2. Check RevenueCat documentation',
        '3. Contact RevenueCat support if needed'
      ]
    };
  }
} 