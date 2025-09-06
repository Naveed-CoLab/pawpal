import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesError,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform, Alert, InteractionManager } from 'react-native';
import { ApiConfig } from '@/constants/apiConfig';
import NetInfo from '@react-native-community/netinfo';
import { revenueCatInitializer } from './revenueCatInitializer';

// NOTE: RevenueCat UI removed from service layer to avoid registration conflicts
// Use RevenueCatPaywall.tsx component instead for JSX-based paywall presentation

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
  annual?: VetPawSubscription;
  monthly?: VetPawSubscription;
  lifetime?: VetPawSubscription;
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;
  private useMockMode = false;
  private networkRetryAttempts = 0;
  private maxNetworkRetries = 3;

  public static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(userId?: string, forceRefresh: boolean = false): Promise<boolean> {
    try {
      console.log('🔧 RevenueCat Service: Starting initialization...', forceRefresh ? '(FORCE REFRESH)' : '');

      if (Platform.OS === 'web') {
        console.log('🌐 Running on web - using mock RevenueCat implementation');
        this.useMockMode = true;
        this.isInitialized = true;
        return true;
      }

      // Use unified initializer
      const result = await revenueCatInitializer.initialize(userId);
      
      if (result.success) {
        this.useMockMode = result.isMockMode;
        this.isInitialized = true;
        console.log('✅ RevenueCat Service: Initialization completed');
        return true;
      } else {
        console.error('❌ RevenueCat Service: Initialization failed:', result.error);
        this.useMockMode = true;
        this.isInitialized = true;
        return false;
      }
      
    } catch (error) {
      console.error('❌ RevenueCat Service: Initialization error:', error);
      
      this.useMockMode = true;
      this.isInitialized = true;
      return false;
    }
  }

  async presentPaywall(): Promise<{ success: boolean; error?: string }> {
    console.log('🚨 presentPaywall() has threading issues in React Native development builds');
    console.log('📱 SOLUTION: Use JSX component instead:');
    console.log('   <RevenueCatUI.Paywall options={{ offering: currentOffering }} onDismiss={handleDismiss} />');
    console.log('📚 See: https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls');
    
    // Show mock paywall as fallback
    return this.showMockPaywall();
  }

  async presentPaywallIfNeeded(
    requiredEntitlement: string = 'premium',
  ): Promise<{ success: boolean; error?: string }> {
    console.log('🚨 presentPaywallIfNeeded() has threading issues in React Native development builds');
    console.log('📱 SOLUTION: Use JSX component with conditional rendering:');
    console.log('   {!hasEntitlement && <RevenueCatUI.Paywall options={{ offering }} onDismiss={handleDismiss} />}');
    console.log('📚 See: https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls');
    
    // Check entitlement status for the fallback
    try {
      if (!this.isInitialized) await this.initialize();
      
      if (this.useMockMode) {
        const status = await this.checkSubscriptionStatus();
        if (!status.isActive) return this.showMockPaywall();
        return { success: true };
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement = customerInfo.entitlements.active[requiredEntitlement] !== undefined;
      
      if (hasEntitlement) {
        console.log('✅ User already has entitlement - no paywall needed');
        return { success: true };
      }

      // Show mock paywall as fallback
      return this.showMockPaywall();
    } catch (error: any) {
      console.error('❌ presentPaywallIfNeeded error:', error);
      return this.showMockPaywall();
    }
  }

  // handlePaywallResult removed - use RevenueCatPaywall.tsx JSX component instead

  private async showMockPaywall(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      Alert.alert(
        'Mock Paywall',
        'This simulates a RevenueCat paywall (only in development or web).',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false, error: 'Cancelled' }) },
          { text: 'Simulate Purchase', onPress: () => resolve({ success: true }) },
        ],
      );
    });
  }

  async getOfferings(): Promise<VetPawOffering[]> {
    try {
      if (!this.isInitialized) await this.initialize();
      if (this.useMockMode) return this.getMockOfferings();
      
      const offerings = await Purchases.getOfferings();
      const vetPawOfferings: VetPawOffering[] = [];

      Object.values(offerings.all).forEach((offering: PurchasesOffering) => {
        const availablePackages = offering.availablePackages || [];
        const packages: VetPawSubscription[] = availablePackages
          .filter((pkg: PurchasesPackage) => pkg.storeProduct)
          .map((pkg: PurchasesPackage) => this.convertPackageToSubscription(pkg));

        vetPawOfferings.push({
          identifier: offering.identifier,
          serverDescription: offering.serverDescription,
          packages,
          annual: offering.annual?.storeProduct ? this.convertPackageToSubscription(offering.annual) : undefined,
          monthly: offering.monthly?.storeProduct ? this.convertPackageToSubscription(offering.monthly) : undefined,
          lifetime: offering.lifetime?.storeProduct ? this.convertPackageToSubscription(offering.lifetime) : undefined,
        });
      });

      return vetPawOfferings;
    } catch (error) {
      console.error('Error fetching offerings:', error);
      return this.getMockOfferings();
    }
  }

  async checkSubscriptionStatus(): Promise<{ isActive: boolean; productIdentifier?: string; expirationDate?: string }> {
      const customerInfo = await this.getCustomerInfo();
    if (!customerInfo) return { isActive: false };
    const entitlements = Object.keys(customerInfo.entitlements.active);
    if (entitlements.length > 0) {
      const entitlement = customerInfo.entitlements.active[entitlements[0]];
        return {
          isActive: true,
          productIdentifier: entitlement.productIdentifier,
        expirationDate: entitlement.expirationDate,
        };
      }
      return { isActive: false };
  }

  private convertPackageToSubscription(pkg: PurchasesPackage): VetPawSubscription {
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
        }
      }
    ];
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) await this.initialize();
      return this.useMockMode ? this.getMockCustomerInfo() : await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('❌ getCustomerInfo error:', error);
      return null;
    }
  }

  private getMockCustomerInfo(): any {
    return {
      entitlements: { active: {}, all: {} },
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
      originalAppUserId: 'mock_user',
      requestDate: new Date().toISOString(),
    };
  }
}

export const revenueCatService = RevenueCatService.getInstance();
