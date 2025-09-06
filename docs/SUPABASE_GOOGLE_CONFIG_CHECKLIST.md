# 🔧 Supabase Google OAuth Configuration Checklist

## 🚨 CRITICAL: If accounts aren't being created, check these first!

### 1. 🎯 Supabase Dashboard - Authentication Settings

**Go to: Supabase Dashboard → Authentication → Providers**

#### ✅ Google Provider Must Be ENABLED
- [ ] Google provider is **ENABLED** (not just configured)
- [ ] Google Client ID is filled in
- [ ] Google Client Secret is filled in

#### ❌ Common Issue: Provider Not Enabled
Even if you have Client ID/Secret, the provider must be **actively enabled**!

### 2. 🔗 URL Configuration

**Go to: Supabase Dashboard → Authentication → URL Configuration**

#### Site URL:
```
vetpaw://
```

#### Redirect URLs (add ALL of these):
```
vetpaw://auth/callback
vetpaw://
https://auth.expo.io/@naveedahmedswe/vetpaw-ai-dog-care
```

### 3. 🔐 Google Cloud Console

**Go to: Google Cloud Console → APIs & Services → Credentials**

#### OAuth 2.0 Client ID Configuration:
- [ ] Client Type: **Web application** (not Android!)
- [ ] Authorized redirect URIs include:
  ```
  vetpaw://auth/callback
  vetpaw://
  https://your-project-ref.supabase.co/auth/v1/callback
  ```

### 4. 🧪 Test Configuration

Run this in your app console to test:
```javascript
// Test if Google provider is working
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { skipBrowserRedirect: true }
});

console.log('Test result:', { data: !!data.url, error: error?.message });
```

## 🚨 Common Configuration Errors

### Error: "Provider not found"
- **Fix**: Enable Google provider in Supabase Dashboard → Authentication → Providers

### Error: "Invalid redirect URI"
- **Fix**: Add exact redirect URIs to both Supabase and Google Console

### Error: "OAuth callback with invalid state"
- **Fix**: Ensure redirect URIs match EXACTLY between Supabase and Google

### No error but no account created
- **Fix**: Check if Google provider is actually **enabled** (not just configured)

## 🔍 Debugging Steps

1. **Check Supabase logs**: Dashboard → Logs → Auth logs
2. **Check browser network tab**: Look for failed OAuth requests
3. **Verify environment variables**: Google Client ID must match Supabase config
4. **Test with web redirect**: Try OAuth flow on web first to isolate mobile issues

## ✅ Success Indicators

When properly configured, you should see:
1. OAuth URL generated successfully
2. Google account selection screen appears
3. Account created in Supabase Dashboard → Authentication → Users
4. Session created and app navigates to home

## 🔧 Emergency Fix

If still not working, try the **minimal configuration**:

**Supabase Redirect URLs:**
```
vetpaw://
```

**Google Console Redirect URIs:**
```
vetpaw://
https://your-project-ref.supabase.co/auth/v1/callback
```

**App Code:**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'vetpaw://'
  }
});
```