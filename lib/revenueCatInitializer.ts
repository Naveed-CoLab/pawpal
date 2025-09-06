import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

export interface RevenueCatInitResult {
  success: boolean;
  error?: string;
  isMockMode: boolean;
  apiKeyUsed: string;
}

class RevenueCatInitializer {
  private static instance: RevenueCatInitializer;
  private isInitialized = false;
  private initializationPromise: Promise<RevenueCatInitResult> | null = null;

  private constructor() {}

  public static getInstance(): RevenueCatInitializer {
    if (!RevenueCatInitializer.instance) {
      RevenueCatInitializer.instance = new RevenueCatInitializer();
    }
    return RevenueCatInitializer.instance;
  }

  /**
   * Unified RevenueCat initialization - prevents multiple initialization conflicts
   */
  async initialize(userId?: string): Promise<RevenueCatInitResult> {
    // If already initialized, return cached result
    if (this.isInitialized && this.initializationPromise) {
      return this.initializationPromise;
    }

    // If initialization is in progress, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = this.performInitialization(userId);
    const result = await this.initializationPromise;
    
    if (result.success) {
      this.isInitialized = true;
    }
    
    return result;
  }

  private async performInitialization(userId?: string): Promise<RevenueCatInitResult> {
    try {
      console.log('🔧 RevenueCat Initializer: Starting unified initialization...');

      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - skipping RevenueCat initialization');
        return {
          success: true,
          isMockMode: true,
          apiKeyUsed: 'web-platform'
        };
      }

      // Get API key
      const apiKey = Platform.OS === 'ios'
        ? 'appl_your_ios_api_key_here' // Replace with actual iOS key
        : 'goog_jnQKGTTAKjhBfTsMVOAIHosFbPH'; // Replace with actual Google key

      console.log(`🔑 RevenueCat Initializer: Using ${Platform.OS} API key: ${apiKey.substring(0, 15)}...`);

      // Validate API key
      const hasValidApiKey = apiKey && 
        !apiKey.includes('your_') && 
        !apiKey.includes('_api_key_here') &&
        (apiKey.startsWith('appl_') || apiKey.startsWith('goog_'));

      if (!hasValidApiKey) {
        console.warn('⚠️ RevenueCat Initializer: Invalid API key - using mock mode');
        return {
          success: true,
          error: 'Invalid API key - using mock mode',
          isMockMode: true,
          apiKeyUsed: apiKey
        };
      }

      // Configure RevenueCat with timeout
      console.log('🔄 RevenueCat Initializer: Configuring RevenueCat...');
      
      const configPromise = Purchases.configure({ apiKey });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RevenueCat configuration timeout')), 10000)
      );

      await Promise.race([configPromise, timeoutPromise]);
      
      // Set log level
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
      console.log('✅ RevenueCat Initializer: Configuration successful');

      // Login user if provided
      if (userId) {
        try {
          await Purchases.logIn(userId);
          console.log(`👤 RevenueCat Initializer: User logged in: ${userId}`);
        } catch (loginError) {
          console.warn('⚠️ RevenueCat Initializer: Login failed (non-critical):', loginError);
        }
      }

      // Test connectivity
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('✅ RevenueCat Initializer: Connectivity test passed');
      } catch (connectivityError) {
        console.warn('⚠️ RevenueCat Initializer: Connectivity test failed:', connectivityError);
        return {
          success: true,
          error: 'Connectivity issues - using mock mode',
          isMockMode: true,
          apiKeyUsed: apiKey
        };
      }

      console.log('✅ RevenueCat Initializer: Initialization completed successfully');
      return {
        success: true,
        isMockMode: false,
        apiKeyUsed: apiKey
      };

    } catch (error: any) {
      console.error('❌ RevenueCat Initializer: Initialization failed:', error);
      
      return {
        success: false,
        error: error.message || 'Initialization failed',
        isMockMode: true,
        apiKeyUsed: 'failed'
      };
    }
  }

  /**
   * Check if RevenueCat is properly initialized
   */
  async checkInitialization(): Promise<{
    isInitialized: boolean;
    isMockMode: boolean;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        return { isInitialized: false, isMockMode: true };
      }

      // Test if RevenueCat is actually working
      await Purchases.getCustomerInfo();
      return { isInitialized: true, isMockMode: false };
    } catch (error) {
      return { 
        isInitialized: false, 
        isMockMode: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset initialization state (useful for testing)
   */
  reset(): void {
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

export const revenueCatInitializer = RevenueCatInitializer.getInstance(); 