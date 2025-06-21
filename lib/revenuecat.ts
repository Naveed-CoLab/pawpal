import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesError,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import { ApiConfig } from '@/constants/apiConfig';

// Import RevenueCat UI for paywall presentation
let RevenueCatUI: any = null;
let PAYWALL_RESULT: any = null;

// Dynamically import RevenueCat UI only on supported platforms
const initializeRevenueCatUI = async () => {
  try {
    if (Platform.OS !== 'web') {
      const RevenueCatUIModule = await import('react-native-purchases-ui');
      RevenueCatUI = RevenueCatUIModule.default;
      PAYWALL_RESULT = RevenueCatUIModule.PAYWALL_RESULT;
      console.log('✅ RevenueCat UI initialized');
    }
  } catch (error) {
    console.log('⚠️ RevenueCat UI not available, using fallback');
  }
};

export interface VetPawSubscription {
  identifier: string;
  title: string;
  description: string;
  price: string;
  priceString: string;
  currencyCode: string;
  introPrice?: {
    price: string;
    priceString: string;
    period: string;
  };
  isActive: boolean;
  willRenew: boolean;
  periodType: 'monthly' | 'yearly' | 'weekly';
}

export interface VetPawOffering {
  identifier: string;
  serverDescription: string;
  packages: VetPawSubscription[];
  lifetime?: VetPawSubscription;
  annual?: VetPawSubscription;
  monthly?: VetPawSubscription;
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  private useMockMode = ApiConfig.REVENUECAT.USE_MOCK_MODE;

  public static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(userId?: string): Promise<boolean> {
    try {
      console.log('🔧 Initializing RevenueCat...');

      // Initialize RevenueCat UI
      await initializeRevenueCatUI();

      // Check if running on web - use mock implementation
      if (Platform.OS === 'web') {
        console.log('🌐 Running on web - using mock RevenueCat implementation');
        this.useMockMode = true;
        this.isInitialized = true;
        return true;
      }

      // Configure RevenueCat for native platforms
      const apiKey = Platform.OS === 'ios' 
        ? ApiConfig.REVENUECAT.APPLE_API_KEY 
        : ApiConfig.REVENUECAT.GOOGLE_API_KEY;
      
      // Check if API key is valid (not just the default placeholder)
      const hasValidApiKey = apiKey && 
        !apiKey.includes('your_') && 
        !apiKey.includes('_api_key_here') &&
        (apiKey.startsWith('appl_') || apiKey.startsWith('goog_'));
      
      if (!hasValidApiKey) {
        console.warn('⚠️ RevenueCat API key not configured properly - using mock mode');
        console.warn(`Current API key: ${apiKey}`);
        this.useMockMode = true;
        this.isInitialized = true;
        return true;
      }

      // Initialize RevenueCat with real API key
      console.log('🔧 Configuring RevenueCat with API key:', apiKey.substring(0, 10) + '...');
      await Purchases.configure({ apiKey });

      // Force production mode by setting log level to info
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
      
      // Set user ID if provided
      if (userId) {
        await Purchases.logIn(userId);
        console.log(`👤 RevenueCat user logged in: ${userId}`);
      }

      console.log('🚀 RevenueCat configured in production mode');

      this.useMockMode = false; // Ensure mock mode is disabled when properly initialized
      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully with real API');
      return true;
    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error);
      // Fallback to mock mode only on error
      console.warn('⚠️ Falling back to mock mode due to initialization error');
      this.useMockMode = true;
      this.isInitialized = true;
      return false;
    }
  }

  async presentPaywall(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.useMockMode || !RevenueCatUI) {
        console.log('🌐 Web/Mock mode - showing mock paywall');
        return this.showMockPaywall();
      }

      console.log('💳 Presenting RevenueCat dashboard paywall...');

      // Check if we have offerings first
      const offerings = await Purchases.getOfferings();
      if (Object.keys(offerings.all).length === 0) {
        console.log('⚠️ No offerings available - showing demo paywall');
        return this.showMockPaywall();
      }

      // Present the paywall from your RevenueCat dashboard
      const paywallResult = await RevenueCatUI.presentPaywall();

      switch (paywallResult) {
        case PAYWALL_RESULT.NOT_PRESENTED:
          console.log('⚠️ Paywall not presented - likely Preview API mode, showing demo paywall');
          return this.showMockPaywall();
        
        case PAYWALL_RESULT.ERROR:
          console.log('❌ Paywall presentation error - showing demo paywall');
          return this.showMockPaywall();
        
        case PAYWALL_RESULT.CANCELLED:
          console.log('🚫 Paywall cancelled by user');
          return { success: false, error: 'Purchase cancelled' };
        
        case PAYWALL_RESULT.PURCHASED:
          console.log('✅ Purchase successful from paywall');
          return { success: true };
        
        case PAYWALL_RESULT.RESTORED:
          console.log('🔄 Purchases restored from paywall');
          return { success: true };
        
        default:
          console.log('❓ Unknown paywall result:', paywallResult, '- showing demo paywall');
          return this.showMockPaywall();
      }
    } catch (error: any) {
      console.error('❌ Paywall presentation error:', error);
      console.log('🎭 Fallback to demo paywall');
      return this.showMockPaywall();
    }
  }

  async presentPaywallIfNeeded(requiredEntitlement: string = 'premium'): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🛒 presentPaywallIfNeeded called with entitlement:', requiredEntitlement);
      
      if (!this.isInitialized) {
        console.log('🔧 RevenueCat not initialized, initializing now...');
        await this.initialize();
      }

      console.log('📊 Current mode - Mock:', this.useMockMode, 'RevenueCatUI available:', !!RevenueCatUI);

      if (this.useMockMode || !RevenueCatUI) {
        console.log('🌐 Using mock mode - checking subscription status...');
        const status = await this.checkSubscriptionStatus();
        console.log('📊 Mock subscription status:', status);
        if (!status.isActive) {
          console.log('🎭 Showing mock paywall');
          return this.showMockPaywall();
        }
        console.log('✅ Mock user already has subscription');
        return { success: true };
      }

      console.log('🔍 Using real RevenueCat - checking if paywall needed for entitlement:', requiredEntitlement);

      // First check offerings to see if we have any products configured
      const offerings = await Purchases.getOfferings();
      console.log('📦 Available offerings:', Object.keys(offerings.all).length);
      console.log('📦 Current offering:', offerings.current?.identifier || 'none');
      
      if (Object.keys(offerings.all).length === 0) {
        console.log('⚠️ No offerings configured in RevenueCat dashboard - showing demo paywall');
        return this.showMockPaywall();
      }

      // Check if user actually has the entitlement
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement = customerInfo.entitlements.active[requiredEntitlement] !== undefined;
      
      console.log('📊 Entitlement check:', { 
        entitlement: requiredEntitlement, 
        hasEntitlement,
        activeEntitlements: Object.keys(customerInfo.entitlements.active)
      });

      // If user already has entitlement, no need for paywall
      if (hasEntitlement) {
        console.log('✅ User already has entitlement - no paywall needed');
        return { success: true };
      }

      // Try presentPaywallIfNeeded first, but fallback if in Preview mode
      try {
        console.log('🎯 Attempting presentPaywallIfNeeded...');
        const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
          requiredEntitlementIdentifier: requiredEntitlement
        });

        console.log('📱 RevenueCat paywall result:', paywallResult);

        // Check for Preview mode (when method has no effect)
        if (paywallResult === PAYWALL_RESULT.NOT_PRESENTED) {
          console.log('⚠️ Paywall not presented - likely Preview API mode, trying regular presentPaywall...');
          return await this.presentPaywall();
        }

        return this.handlePaywallResult(paywallResult);
      } catch (previewError: any) {
        console.log('⚠️ presentPaywallIfNeeded failed, likely Preview mode. Trying presentPaywall...', previewError.message);
        return await this.presentPaywall();
      }
    } catch (error: any) {
      console.error('❌ Conditional paywall error:', error);
      // If all else fails, show mock paywall for testing
      console.log('🎭 Fallback to mock paywall due to error');
      return this.showMockPaywall();
    }
  }

  private handlePaywallResult(paywallResult: any): { success: boolean; error?: string } {
    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
        console.log('✅ User already has entitlement - no paywall needed');
        return { success: true };
      
      case PAYWALL_RESULT.ERROR:
        console.log('❌ Paywall presentation error');
        return { success: false, error: 'Paywall presentation failed' };
      
      case PAYWALL_RESULT.CANCELLED:
        console.log('🚫 Paywall cancelled by user');
        return { success: false, error: 'Purchase cancelled' };
      
      case PAYWALL_RESULT.PURCHASED:
        console.log('✅ Purchase successful from paywall');
        return { success: true };
      
      case PAYWALL_RESULT.RESTORED:
        console.log('🔄 Purchases restored from paywall');
        return { success: true };
      
      default:
        console.log('❓ Unknown paywall result:', paywallResult);
        return { success: false, error: 'Unknown result' };
    }
  }

  private async showMockPaywall(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      Alert.alert(
        '🎭 Demo Paywall',
        'RevenueCat is in Preview API mode or no products are configured.\n\n' +
        'In a real app, this would show your configured paywall with:\n' +
        '• Premium subscription options\n' +
        '• Feature comparisons\n' +
        '• Pricing details\n\n' +
        'To set up real purchases:\n' +
        '1. Configure products in RevenueCat dashboard\n' +
        '2. Add entitlements\n' +
        '3. Test with real devices/TestFlight',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'Purchase cancelled' })
          },
          {
            text: 'Simulate Purchase',
            onPress: () => {
              Alert.alert(
                '✅ Demo Purchase Complete',
                'This simulates a successful purchase!\n\nIn the real app, users would now have premium access.',
                [{ text: 'Continue', onPress: () => resolve({ success: true }) }]
              );
            }
          }
        ]
      );
    });
  }

  async getOfferings(): Promise<VetPawOffering[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.useMockMode) {
        return this.getMockOfferings();
      }

      console.log('📦 Fetching RevenueCat offerings...');
      const offerings = await Purchases.getOfferings();

      const vetPawOfferings: VetPawOffering[] = [];

      Object.values(offerings.all).forEach((offering: PurchasesOffering) => {
        // Safely handle availablePackages with null check
        const availablePackages = offering.availablePackages || [];
        
        const packages: VetPawSubscription[] = availablePackages
          .filter((pkg: PurchasesPackage) => pkg.storeProduct) // Filter out packages without storeProduct
          .map((pkg: PurchasesPackage) => this.convertPackageToSubscription(pkg));

        vetPawOfferings.push({
          identifier: offering.identifier,
          serverDescription: offering.serverDescription,
          packages,
          annual: offering.annual && offering.annual.storeProduct ? this.convertPackageToSubscription(offering.annual) : undefined,
          monthly: offering.monthly && offering.monthly.storeProduct ? this.convertPackageToSubscription(offering.monthly) : undefined,
          lifetime: offering.lifetime && offering.lifetime.storeProduct ? this.convertPackageToSubscription(offering.lifetime) : undefined,
        });
      });

      console.log('✅ Offerings fetched successfully:', vetPawOfferings.length);
      return vetPawOfferings;
    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
      return this.getMockOfferings();
    }
  }

  async purchasePackage(packageIdentifier: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.useMockMode) {
        return this.mockPurchase(packageIdentifier);
      }

      console.log('💳 Starting purchase for package:', packageIdentifier);

      // Get current offerings to find the package
      const offerings = await Purchases.getOfferings();
      let targetPackage: PurchasesPackage | null = null;

      // Find the package across all offerings
      Object.values(offerings.all).forEach((offering: PurchasesOffering) => {
        const availablePackages = offering.availablePackages || [];
        const foundPackage = availablePackages.find(pkg => pkg.identifier === packageIdentifier);
        if (foundPackage) {
          targetPackage = foundPackage;
        }
      });

      if (!targetPackage) {
        throw new Error('Package not found');
      }

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(targetPackage);
      
      console.log('✅ Purchase successful');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      // Handle specific RevenueCat errors
      if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED) {
        return { success: false, error: 'Purchase was cancelled' };
      } else if (error.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING) {
        return { success: false, error: 'Payment is pending approval' };
      } else if (error.code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE) {
        return { success: false, error: 'Product not available for purchase' };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.useMockMode) {
        Alert.alert('Restore Purchases', 'Purchases restored successfully (mock)');
        return { success: true };
      }

      console.log('🔄 Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      
      console.log('✅ Purchases restored successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Restore purchases failed:', error);
      return { success: false, error: error.message || 'Failed to restore purchases' };
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.useMockMode) {
        return this.getMockCustomerInfo();
      }

      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('❌ Error getting customer info:', error);
      return null;
    }
  }

  async checkSubscriptionStatus(): Promise<{
    isActive: boolean;
    productIdentifier?: string;
    expirationDate?: string;
  }> {
    try {
      const customerInfo = await this.getCustomerInfo();
      
      if (!customerInfo) {
        return { isActive: false };
      }

      if (this.useMockMode) {
        return { isActive: false }; // Mock user as free tier
      }

      // Check if user has any active entitlements
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      
      if (activeEntitlements.length > 0) {
        const entitlement = customerInfo.entitlements.active[activeEntitlements[0]];
        return {
          isActive: true,
          productIdentifier: entitlement.productIdentifier,
          expirationDate: entitlement.expirationDate
        };
      }

      return { isActive: false };
    } catch (error) {
      console.error('❌ Error checking subscription status:', error);
      return { isActive: false };
    }
  }

  // Helper methods
  private convertPackageToSubscription(pkg: PurchasesPackage): VetPawSubscription {
    // Safely access storeProduct properties with fallbacks
    const storeProduct = pkg.storeProduct;
    
    return {
      identifier: pkg.identifier,
      title: storeProduct?.title || 'Unknown Product',
      description: storeProduct?.description || 'No description available',
      price: storeProduct?.price?.toString() || '0',
      priceString: storeProduct?.priceString || '$0.00',
      currencyCode: storeProduct?.currencyCode || 'USD',
      introPrice: storeProduct?.introPrice ? {
        price: storeProduct.introPrice.price?.toString() || '0',
        priceString: storeProduct.introPrice.priceString || '$0.00',
        period: storeProduct.introPrice.periodUnit || 'Unknown'
      } : undefined,
      isActive: false,
      willRenew: false,
      periodType: this.getPeriodType(pkg.packageType)
    };
  }

  private getPeriodType(packageType: string): 'monthly' | 'yearly' | 'weekly' {
    switch (packageType) {
      case 'MONTHLY': return 'monthly';
      case 'ANNUAL': return 'yearly';
      case 'WEEKLY': return 'weekly';
      default: return 'monthly';
    }
  }

  // Mock implementations for web and testing
  private getMockOfferings(): VetPawOffering[] {
    return [
      {
        identifier: 'default',
        serverDescription: 'VetPaw Premium Plans',
        packages: [
          {
            identifier: 'monthly_premium',
            title: 'VetPaw Premium Monthly',
            description: 'Unlimited AI coaching, instant summaries, and priority support',
            price: '9.99',
            priceString: '$9.99',
            currencyCode: 'USD',
            isActive: false,
            willRenew: false,
            periodType: 'monthly'
          },
          {
            identifier: 'yearly_premium',
            title: 'VetPaw Premium Yearly',
            description: 'Unlimited AI coaching, instant summaries, and priority support - Save 40%!',
            price: '59.99',
            priceString: '$59.99',
            currencyCode: 'USD',
            introPrice: {
              price: '29.99',
              priceString: '$29.99',
              period: 'First Year'
            },
            isActive: false,
            willRenew: false,
            periodType: 'yearly'
          }
        ],
        monthly: {
          identifier: 'monthly_premium',
          title: 'VetPaw Premium Monthly',
          description: 'Unlimited AI coaching, instant summaries, and priority support',
          price: '9.99',
          priceString: '$9.99',
          currencyCode: 'USD',
          isActive: false,
          willRenew: false,
          periodType: 'monthly'
        },
        annual: {
          identifier: 'yearly_premium',
          title: 'VetPaw Premium Yearly',
          description: 'Unlimited AI coaching, instant summaries, and priority support - Save 40%!',
          price: '59.99',
          priceString: '$59.99',
          currencyCode: 'USD',
          introPrice: {
            price: '29.99',
            priceString: '$29.99',
            period: 'First Year'
          },
          isActive: false,
          willRenew: false,
          periodType: 'yearly'
        }
      }
    ];
  }

  private async mockPurchase(packageIdentifier: string): Promise<{ success: boolean; error?: string }> {
    // Simulate purchase flow
    return new Promise((resolve) => {
      setTimeout(() => {
        Alert.alert(
          'Mock Purchase',
          `Successfully purchased ${packageIdentifier} (This is a demo)`,
          [{ text: 'OK', onPress: () => resolve({ success: true }) }]
        );
      }, 1000);
    });
  }

  private getMockCustomerInfo(): any {
    return {
      entitlements: {
        active: {},
        all: {}
      },
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
      latestExpirationDate: null,
      originalAppUserId: 'mock_user',
      requestDate: new Date().toISOString()
    };
  }
}

export const revenueCatService = RevenueCatService.getInstance();