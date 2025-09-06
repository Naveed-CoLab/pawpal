# 📱 Google Sign-In Setup for Mobile

## 🔧 Configuration Requirements

### 1. Google Cloud Console Setup

#### Android Configuration
```
Package Name: com.vetpaw.vetpawaiapp
SHA-1 Certificate: [Your debug/release certificate]
Authorized redirect URIs:
- vetpaw://auth/google/callback
- vetpaw://auth/callback
```

#### OAuth Client Configuration
```
Client Type: Web application
Authorized redirect URIs:
- vetpaw://auth/google/callback
- https://auth.expo.io/@naveedahmedswe/vetpaw-ai-dog-care
```

### 2. Environment Variables (.env)
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id-here
EXPO_PUBLIC_GOOGLE_REDIRECT_URI=vetpaw://auth/google/callback
```

### 3. App Configuration (app.json)
```json
{
  "expo": {
    "scheme": "vetpaw",
    "android": {
      "package": "com.vetpaw.vetpawaiapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            { "scheme": "vetpaw", "host": "auth", "pathPrefix": "/google" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 4. Android Manifest Updates
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <data android:scheme="vetpaw" android:host="auth" android:pathPrefix="/google" />
  <category android:name="android.intent.category.BROWSABLE" />
  <category android:name="android.intent.category.DEFAULT" />
</intent-filter>
```

## 🚀 Implementation Examples

### Basic Usage
```tsx
import { mobileGoogleAuth } from '@/lib/googleAuthMobile';
import { GoogleSignInButton } from '@/components/ui/GoogleSignInButton';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await mobileGoogleAuth.signIn();
      if (result.success) {
        // Handle success
        console.log('User:', result.user);
      } else {
        // Handle error
        console.error('Error:', result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleSignInButton 
      onPress={handleGoogleSignIn}
      loading={loading}
      variant="outlined"
      size="large"
    />
  );
};
```

### Advanced Usage with Custom Styling
```tsx
<GoogleSignInButton 
  onPress={handleGoogleSignIn}
  loading={loading}
  variant="filled"
  size="medium"
  customText="Sign in with Google"
  showIcon={true}
/>
```

## 🛡️ Security Best Practices

### 1. Validate Redirect URIs
- Always use HTTPS for web redirects
- Use app schemes for mobile deep links
- Validate redirect URIs in your backend

### 2. Session Security
```typescript
// Always validate sessions after OAuth
const { data: { session }, error } = await supabase.auth.getSession();
if (session) {
  // Verify session is valid
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Session is valid
  }
}
```

### 3. Error Handling
```typescript
// Don't expose sensitive errors to users
if (error.message.includes('redirect_uri')) {
  showUserError('Authentication setup error. Please contact support.');
} else {
  showUserError('Sign-in failed. Please try again.');
}
```

## 📱 Mobile UX Best Practices

### 1. Loading States
```tsx
// Show loading immediately
<GoogleSignInButton loading={isSigningIn} />

// Provide feedback
showSnackbar('Signing in with Google...', 'info');
```

### 2. Haptic Feedback
```typescript
// Success feedback (iOS)
if (Platform.OS === 'ios') {
  const { notificationAsync, NotificationFeedbackType } = await import('expo-haptics');
  notificationAsync(NotificationFeedbackType.Success);
}
```

### 3. Error Recovery
```tsx
// Provide retry options
if (result.error && !result.error.includes('cancelled')) {
  showError(result.error, 'Try Again', () => handleGoogleSignIn());
}
```

## 🐛 Debugging

### Debug Information
```typescript
const debugInfo = mobileGoogleAuth.getDebugInfo();
console.log('Debug Info:', debugInfo);
```

### Common Issues
1. **Invalid redirect URI**: Check Google Console configuration
2. **Network errors**: Implement retry logic
3. **Session not found**: Add delay after OAuth callback
4. **Cancelled by user**: Don't show error for cancellation

## 📊 Testing

### Test Scenarios
1. ✅ Successful sign-in
2. ✅ User cancellation
3. ✅ Network failure
4. ✅ Invalid configuration
5. ✅ Session restoration after app restart

### Testing Commands
```bash
# Test OAuth flow
npx expo start
# Open on device and test Google sign-in

# Debug OAuth issues
adb logcat | grep -i oauth
```