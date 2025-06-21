# RevenueCat Setup Guide

Your app is currently showing "RevenueCat UI not available on this platform" because RevenueCat is running in **Preview API mode**. This happens when products aren't properly configured in the RevenueCat dashboard.

## Quick Fix Steps

### 1. Configure Products in RevenueCat Dashboard

1. **Go to RevenueCat Dashboard**: https://app.revenuecat.com/
2. **Navigate to Products**: Click on "Products" in the left sidebar
3. **Add Products**: 
   - Click "Add Product"
   - Add a monthly subscription (e.g., `premium_monthly`)
   - Add a yearly subscription (e.g., `premium_yearly`)
4. **Set Product Details**:
   - Product ID: Match your Google Play Console product IDs
   - Type: Subscription
   - Duration: Monthly/Yearly

### 2. Create Entitlements

1. **Go to Entitlements**: Click "Entitlements" in the left sidebar
2. **Create Premium Entitlement**:
   - Name: `premium`
   - Attach your products (`premium_monthly`, `premium_yearly`)

### 3. Create Offerings

1. **Go to Offerings**: Click "Offerings" in the left sidebar
2. **Create Default Offering**:
   - Identifier: `default`
   - Add your products with proper placement
   - Set monthly and yearly options

### 4. Configure Google Play Console

1. **Add In-App Products** in Google Play Console
2. **Product IDs** must match RevenueCat dashboard exactly
3. **Set up pricing** for each product
4. **Activate** the products

### 5. App Configuration

Your app is already configured with the RevenueCat API key:
```typescript
GOOGLE_API_KEY: 'goog_JsENQXAoXxQZBikUjFgmnHXbIwp'
```

## Testing

Once configured properly, you'll see:
- ✅ Real RevenueCat paywall instead of demo paywall
- ✅ Actual product pricing and descriptions
- ✅ Working purchase flow

## Current Behavior (Preview Mode)

When products aren't configured, the app shows:
- 🎭 Demo paywall with explanation
- ⚠️ "Preview API mode" warnings in logs
- 🔄 Fallback to mock purchase simulation

## Debug Information

Check the **Profile tab** for RevenueCat debug info (development mode only):
- Shows current subscription status
- Displays entitlements
- Shows any configuration issues

## Support

If you need help:
1. Check RevenueCat documentation: https://docs.revenuecat.com/
2. Verify your Google Play Console setup
3. Ensure product IDs match between platforms

---

**Note**: The current implementation will automatically fall back to a demo paywall when RevenueCat is in Preview mode, so your app won't crash - it just won't process real purchases until properly configured. 