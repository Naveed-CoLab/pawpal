# 🔧 RevenueCat ITEM_UNAVAILABLE Error Fix Guide

## 🚨 **The Problem**
You're getting `ProductNotAvailableForPurchaseError` with `ITEM_UNAVAILABLE` in both development and production builds, even though:
- ✅ Products are active in Google Play Console
- ✅ Testers are enabled
- ✅ Offerings are loading correctly

## 🔍 **Root Cause Analysis**

The issue is likely caused by **API key configuration problems**:

1. **Hardcoded API Key**: Your app is using a hardcoded API key that might not be properly configured
2. **Environment Mismatch**: Using production API key in development or vice versa
3. **Product Configuration**: Products not properly linked in RevenueCat dashboard

## 🛠️ **Step-by-Step Fix**

### **Step 1: Check Current API Key Configuration**

Use the debug panel to check your current configuration:

1. Open the debug panel in your app
2. Tap **"Check API Key Configuration"**
3. Review the issues and recommendations

### **Step 2: Get Correct API Key from RevenueCat Dashboard**

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Navigate to **Project Settings** → **API Keys**
3. Copy the correct API key for your platform:
   - **Android**: Key starting with `goog_`
   - **iOS**: Key starting with `appl_`

### **Step 3: Update API Key in Code**

Replace the hardcoded API key in these files:

#### **File: `project/lib/revenuecat.ts`**
```typescript
// Line 108: Replace this
const apiKey = Platform.OS === 'ios'
  ? 'appl_your_ios_api_key_here' // Replace with actual iOS key
  : 'goog_dgbtTIHVqfMOYcyTuDiaaZBreVi'; // Replace with actual Google key

// With this (use your actual keys from RevenueCat dashboard)
const apiKey = Platform.OS === 'ios'
  ? 'appl_YOUR_ACTUAL_IOS_KEY_HERE' // Replace with your iOS key
  : 'goog_YOUR_ACTUAL_GOOGLE_KEY_HERE'; // Replace with your Google key
```

#### **File: `project/hooks/useRevenueCat.ts`**
```typescript
// Line 53: Replace this
const apiKey = Platform.OS === 'ios' 
  ? 'appl_your_ios_api_key_here' // Replace with actual iOS key
  : 'goog_dgbtTIHVqfMOYcyTuDiaaZBreVi'; // Replace with actual Google key

// With this (use your actual keys from RevenueCat dashboard)
const apiKey = Platform.OS === 'ios' 
  ? 'appl_YOUR_ACTUAL_IOS_KEY_HERE' // Replace with your iOS key
  : 'goog_YOUR_ACTUAL_GOOGLE_KEY_HERE'; // Replace with your Google key
```

### **Step 4: Configure Products in RevenueCat Dashboard**

1. **Go to RevenueCat Dashboard** → **Products**
2. **Add your products**:
   - `pawpal_monthly` (monthly subscription)
   - `pawpal_annual` (annual subscription)
3. **Link to Google Play Console products**:
   - Map `pawpal_monthly` to your Google Play Console monthly product
   - Map `pawpal_annual` to your Google Play Console annual product

### **Step 5: Configure Offerings**

1. **Go to RevenueCat Dashboard** → **Offerings**
2. **Create/Edit "default" offering**:
   - Add `pawpal_monthly` package
   - Add `pawpal_annual` package
3. **Set as current offering**

### **Step 6: Environment-Specific Configuration**

#### **For Development:**
- Use **sandbox/test** API key from RevenueCat
- Ensure test products are configured
- Add test account to Google Play Console license testing

#### **For Production:**
- Use **production** API key from RevenueCat
- Ensure products are approved and active in Google Play Console
- Verify products are available in your target regions

### **Step 7: Google Play Console Configuration**

1. **Verify Product Status**:
   - Products should be **"Active"** (not draft)
   - Products should be **"Published"**

2. **License Testing**:
   - Add your test account email to **License Testing**
   - Ensure test account is in the same region as products

3. **Regional Availability**:
   - Check that products are available in your current region
   - Verify pricing is set for your region

### **Step 8: Test the Fix**

1. **Use Debug Panel**:
   - Tap **"Check API Key Configuration"**
   - Tap **"Diagnose ITEM_UNAVAILABLE Error"**
   - Review results and follow recommendations

2. **Test Purchase Flow**:
   - Try making a test purchase
   - Check if error is resolved

## 🔍 **Troubleshooting**

### **If API Key Check Shows Issues:**

1. **Invalid API Key Format**:
   - Ensure key starts with `goog_` for Android
   - Ensure key starts with `appl_` for iOS

2. **Placeholder API Key**:
   - Replace `appl_your_ios_api_key_here` with actual key
   - Replace `goog_dgbtTIHVqfMOYcyTuDiaaZBreVi` with actual key

3. **API Key Test Failed**:
   - Verify key in RevenueCat dashboard
   - Check network connectivity
   - Ensure products are configured

### **If Products Still Unavailable:**

1. **Check Google Play Console**:
   - Products must be **Active** and **Published**
   - Test account must be in **License Testing**
   - Products must be available in your region

2. **Check RevenueCat Dashboard**:
   - Products must be added to RevenueCat
   - Products must be linked to Google Play Console products
   - Products must be added to current offering

3. **Environment Issues**:
   - Development: Use sandbox API key and test products
   - Production: Use production API key and live products

## 📋 **Checklist**

- [ ] Updated API key in `project/lib/revenuecat.ts`
- [ ] Updated API key in `project/hooks/useRevenueCat.ts`
- [ ] Added products to RevenueCat dashboard
- [ ] Linked products to Google Play Console
- [ ] Configured offerings in RevenueCat
- [ ] Verified Google Play Console product status
- [ ] Added test account to license testing
- [ ] Tested with debug panel
- [ ] Tested purchase flow

## 🆘 **Still Having Issues?**

1. **Use Debug Panel**: Run all RevenueCat diagnostic tools
2. **Check Logs**: Look for specific error messages
3. **Contact RevenueCat Support**: If configuration looks correct
4. **Test on Different Device**: Try with a different Google account

## 🔗 **Useful Links**

- [RevenueCat Dashboard](https://app.revenuecat.com/)
- [Google Play Console](https://play.google.com/console/)
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing) 