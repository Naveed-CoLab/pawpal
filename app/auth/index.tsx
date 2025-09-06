import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
// Using Supabase direct Google OAuth - no need for additional imports
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { EngagingLoader } from '@/components/ui/EngagingLoader';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { inAppGoogleAuth } from '@/lib/googleAuthInApp';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { error: urlError } = useLocalSearchParams();
  const { 
    showSuccess, 
    showError, 
    showLoginNetworkError,
    showSnackbar 
  } = useSnackbar();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (urlError) {
      switch (urlError) {
        case 'auth_callback_error':
          showError('Authentication failed. Please try again.');
          break;
        default:
          showError('An error occurred during authentication.');
      }
    }
  }, [urlError]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)/');
    }
  }, [isAuthenticated, isLoading]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isNetworkError = (error: any) => {
    const errorString = error?.toString().toLowerCase() || '';
    return errorString.includes('network') || 
           errorString.includes('fetch') || 
           errorString.includes('connection') ||
           errorString.includes('timeout') ||
           errorString.includes('offline');
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    showSnackbar('Signing in to PawPal...', 'info');

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        // Check if it's a network error
        if (isNetworkError(error)) {
          showLoginNetworkError(() => handleLogin());
        } else {
          showError(error, 'Try Again', () => handleLogin());
        }
      } else {
        showSuccess('Welcome back to PawPal! 🐾');
        setTimeout(() => {
          router.replace('/(tabs)/');
        }, 1000);
      }
    } catch (error) {
      // Network or unexpected errors
      if (isNetworkError(error)) {
        showLoginNetworkError(() => handleLogin());
      } else {
        showError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    showSnackbar('Google sign-in is under maintenance. Please use email and password.', 'warning');
    return;
  };

  if (isLoading) {
    return (
      <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topHeaderRow}>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingHello}>Hello,</Text>
              <Text style={styles.greetingBack}>Back!</Text>
            </View>
            <View style={styles.dogContainer}>
              <Image
                source={require('@/assets/images/login page icon.png')}
                style={styles.dogIcon}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.welcomeSubtitle}>Welcome Back!</Text>
        </View>

        <Card variant="elevated" style={styles.formCard}>
          <Text style={styles.cardTitle}>Log in</Text>

          <View style={styles.formContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <Input
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordHeader}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <Input
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder=""
                secureTextEntry
                showPasswordToggle
                error={errors.password}
                style={styles.input}
              />
            </View>

            <Button
              title="Log in"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <Text style={styles.dividerText}>or</Text>
            </View>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
              disabled={googleLoading || loading}
            >
              <Image
                source={require('@/assets/images/google logo.png')}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialButtonText}>
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/signup')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Engaging Loader for Login */}
      {(loading || googleLoading) && (
        <EngagingLoader 
          type="login" 
          showTip={true}
          showAnimation={true}
        />
      )}

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: width * 0.045,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.08,
    paddingBottom: height * 0.12, // More space at bottom for footer
  },
  header: {
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: height * 0.015,
  },
  greetingTextContainer: {},
  greetingHello: {
    fontSize: width * 0.075,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  greetingBack: {
    fontSize: width * 0.075,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  dogContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dogIcon: {
    width: 40,
    height: 40,
  },
  welcomeSubtitle: {
    fontSize: width * 0.045,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: height * 0.04,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  cardTitle: {
    fontSize: width * 0.07,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  formContent: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    marginBottom: 8,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: width * 0.035,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.placeholderbg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: width * 0.04,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    minHeight: 50,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 25,
    minHeight: 50,
  },
  divider: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerText: {
    fontSize: width * 0.035,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.6,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
    shadowColor: Colors.text,

  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: width * 0.04,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  footerText: {
    fontSize: width * 0.04,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
  },
  signupLink: {
    fontSize: width * 0.04,
    fontFamily: Fonts.body.bold,
    color: Colors.primary,
  },
});
