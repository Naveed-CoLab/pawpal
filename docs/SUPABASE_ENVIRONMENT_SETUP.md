# 🔧 Supabase Environment Setup for VetPaw

Follow these steps to configure your Supabase environment variables for dynamic Google OAuth and RevenueCat integration.

## 📋 Required Environment Variables

Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Environment Variables**

### 🔐 Add These Secrets:

```bash
# Google OAuth Configuration (REQUIRED)
GOOGLE_OAUTH_CLIENT_ID=272010092004-la0167jf3d6o7f7g6hc50961ll7m7ujr.apps.googleusercontent.com
GOOGLE_OAUTH_REDIRECT_URI=vetpaw://auth/callback

# RevenueCat API Keys (REQUIRED for subscriptions)
REVENUECAT_GOOGLE_API_KEY=goog_dgbtTIHVqfMOYcyTuDiaaZBreVi
REVENUECAT_APPLE_API_KEY=appl_your_ios_key_here

# AI Service API Keys (OPTIONAL - has fallbacks)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Tavus Video Coaching (OPTIONAL)
TAVUS_API_KEY=your_tavus_api_key_here
TAVUS_PERSONA_ID=james-vet-coach
TAVUS_REPLICA_ID=james-vet-coach

# Security (OPTIONAL)
WEBHOOK_SECRET=your_webhook_secret_here
```

## 🎯 Priority Order

### 🚨 **CRITICAL** (App won't work without these):
1. `GOOGLE_OAUTH_CLIENT_ID` - For Google sign-in
2. `REVENUECAT_GOOGLE_API_KEY` - For Android subscriptions
3. `REVENUECAT_APPLE_API_KEY` - For iOS subscriptions (when you have iOS)

### ⚠️ **IMPORTANT** (Reduced functionality without these):
4. `GEMINI_API_KEY` - For AI features
5. `TAVUS_API_KEY` - For video coaching

### 📱 **OPTIONAL** (Has fallbacks or not yet implemented):
6. `OPENAI_API_KEY` - Alternative AI provider
7. `ELEVENLABS_API_KEY` - Voice features
8. `WEBHOOK_SECRET` - Additional security

## 🔍 How to Get These Keys:

### Google OAuth Client ID:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select your project
3. Enable Google+ API
4. Go to Credentials → OAuth 2.0 Client IDs
5. Create/find your Android client ID
6. Copy the Client ID (looks like: `xxxxx.apps.googleusercontent.com`)

### RevenueCat API Keys:
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Project Settings → API Keys
3. Copy **Google Play** key (starts with `goog_`)
4. Copy **App Store** key (starts with `appl_`) if you have iOS

### Gemini API Key:
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create API key
3. Copy the key (starts with `AIza`)

## 💾 After Adding Variables:

1. **Save** the environment variables in Supabase Dashboard
2. **Deploy** the edge function:
   ```bash
   cd project
   npx supabase functions deploy api-keys
   ```
3. **Test** the configuration in your app:
   - Settings → API Configuration
   - Check all services show as "Configured"

## 🚀 Deployment for Different Environments:

### Development:
```bash
GOOGLE_OAUTH_CLIENT_ID=dev-client-id
GOOGLE_OAUTH_REDIRECT_URI=vetpaw-dev://auth/callback
```

### Staging:
```bash
GOOGLE_OAUTH_CLIENT_ID=staging-client-id
GOOGLE_OAUTH_REDIRECT_URI=vetpaw-staging://auth/callback
```

### Production:
```bash
GOOGLE_OAUTH_CLIENT_ID=prod-client-id
GOOGLE_OAUTH_REDIRECT_URI=vetpaw://auth/callback
```

## 🔧 Troubleshooting:

### "Google OAuth Client ID not configured properly"
- ✅ Check the Client ID is set in Supabase environment variables
- ✅ Ensure it ends with `.apps.googleusercontent.com`
- ✅ Verify the edge function is deployed

### "Configuration not updating"
- ✅ Check edge function deployment was successful
- ✅ Wait 10 minutes for cache to expire, or use "Refresh Configuration"
- ✅ Verify user is authenticated when testing

### "RevenueCat keys missing"
- ✅ Ensure keys start with `goog_` (Android) or `appl_` (iOS)
- ✅ Check RevenueCat dashboard for correct project
- ✅ Verify keys are not test/sandbox keys for production

## 📱 Configuration Manager

Your app now includes a **Configuration Manager** in Settings:

**Settings → API Configuration**

This shows:
- ✅ Which services are properly configured
- 📋 Current Google OAuth settings
- 🔄 Cache status and refresh options
- 📖 Setup instructions

## 🎉 Benefits of This Setup:

✅ **No secrets in your code** - everything is server-side
✅ **Easy environment switching** - just change Supabase variables
✅ **App transfer ready** - new project = new Supabase setup
✅ **Automatic fallbacks** - app works even if API fails
✅ **Real-time updates** - change config without app updates

Your app is now **production-ready** and **fully transferable**! 🚀