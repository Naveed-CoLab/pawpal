import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Snackbar } from '@/components/ui/Snackbar';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ArrowLeft, Lock } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const { updatePassword, setSessionFromTokens, verifyPasswordResetToken } = useAuth();
  const params = useLocalSearchParams();
  
  // Extract different types of tokens/parameters
  const { access_token, refresh_token, token, token_hash, type } = params;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  const handleManualTokenEntry = async (tokenValue: string) => {
    if (!tokenValue || tokenValue.length < 10) return;
    
    console.log('🔧 Manual token entry attempt:', tokenValue.substring(0, 20) + '...');
    setSessionLoading(true);
    
    try {
      const { session, error } = await verifyPasswordResetToken(tokenValue);
      
      if (error) {
        console.error('❌ Manual token verification failed:', error);
        showSnackbar('Invalid token. Please check and try again.', 'error');
      } else {
        console.log('✅ Manual token verification successful');
        setSessionError('');
        showSnackbar('Token verified! You can now reset your password.', 'success');
      }
    } catch (error: any) {
      console.error('❌ Manual token error:', error);
      showSnackbar('Token verification failed. Please try again.', 'error');
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      // Debug: Log all URL parameters received
      console.log('=== PASSWORD RESET DEBUG ===');
      console.log('All URL params received:', params);
      console.log('access_token:', access_token);
      console.log('refresh_token:', refresh_token);
      console.log('token:', token);
      console.log('token_hash:', token_hash);
      console.log('type:', type);
      
      // Try Method 1: Direct access/refresh tokens (new Supabase flow)
      if (access_token && refresh_token) {
        console.log('🔑 Found access_token and refresh_token - using setSession method');
        
        // Convert array to string if needed (Expo Router sometimes returns arrays)
        const accessTokenStr = Array.isArray(access_token) ? access_token[0] : access_token;
        const refreshTokenStr = Array.isArray(refresh_token) ? refresh_token[0] : refresh_token;
        
        try {
          const { session, error } = await setSessionFromTokens(
            accessTokenStr as string, 
            refreshTokenStr as string
          );

          if (error) {
            console.error('❌ Failed to set session from tokens:', error);
            setSessionError(error);
            showErrorAlert('Expired Reset Link', 'This password reset link has expired. Please request a new one.');
          } else {
            console.log('✅ Session set successfully from access/refresh tokens');
            setSessionError('');
          }
        } catch (error: any) {
          console.error('❌ Unexpected error with access/refresh tokens:', error);
          setSessionError(error.message || 'Unknown error');
          showErrorAlert('Error', 'An error occurred while processing the reset link. Please try again.');
        }
      }
      // Try Method 2: Verification token (recovery token from email)
      else if (token || token_hash) {
        const verificationToken = (Array.isArray(token) ? token[0] : token) || 
                                 (Array.isArray(token_hash) ? token_hash[0] : token_hash);
        
        console.log('🔐 Found verification token - using verifyOtp method');
        console.log('Token type:', type);
        
        try {
          const { session, error } = await verifyPasswordResetToken(verificationToken as string);

          if (error) {
            console.error('❌ Failed to verify token:', error);
            setSessionError(error);
            showErrorAlert('Invalid Reset Link', 'This password reset link is invalid or has expired. Please request a new one.');
          } else {
            console.log('✅ Token verified successfully');
            setSessionError('');
          }
        } catch (error: any) {
          console.error('❌ Unexpected error with verification token:', error);
          setSessionError(error.message || 'Unknown error');
          showErrorAlert('Error', 'An error occurred while verifying the reset link. Please try again.');
        }
      }
      // No valid tokens found
      else {
        console.log('❌ No valid tokens found in URL parameters');
        setSessionError('Invalid reset link');
        showErrorAlert('Invalid Reset Link', 'This password reset link is invalid or has expired. Please request a new one.');
      }
      
      setSessionLoading(false);
    };

    const showErrorAlert = (title: string, message: string) => {
      Alert.alert(title, message, [
        { text: 'OK', onPress: () => router.replace('/auth/forgot-password') }
      ]);
    };

    initializeSession();
  }, [params, setSessionFromTokens, verifyPasswordResetToken]);

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (sessionError) {
      showSnackbar('Please request a new password reset link', 'error');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    showSnackbar('Updating password...', 'info');

    try {
      const { error } = await updatePassword(password);

      if (error) {
        showSnackbar(error, 'error');
      } else {
        showSnackbar('Password updated successfully!', 'success');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      }
    } catch (error) {
      showSnackbar('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={Colors.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Lock size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Please enter your new password below
          </Text>
        </View>

        <Card variant="elevated" style={styles.formCard}>
          {sessionLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Verifying reset link...</Text>
            </View>
          ) : sessionError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {sessionError === 'Invalid reset link' 
                  ? 'This reset link is invalid or has expired.' 
                  : 'Unable to verify reset link. Please try again.'}
              </Text>
              
              {/* Manual token input for Supabase verification URLs */}
              <View style={styles.manualTokenContainer}>
                <Text style={styles.manualTokenTitle}>Alternative: Manual Token Entry</Text>
                <Text style={styles.manualTokenDescription}>
                  If you received a Supabase verification link, copy the token from the URL and enter it below:
                </Text>
                <Input
                  label="Recovery Token"
                  placeholder="Enter the token from your email link"
                  onChangeText={handleManualTokenEntry}
                  style={styles.tokenInput}
                />
                <Text style={styles.tokenHelpText}>
                  Look for "token=" in your email link and copy everything after it until the next "&" symbol
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Input
                label="New Password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter new password"
                secureTextEntry
                showPasswordToggle
                error={errors.password}
              />

              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Confirm new password"
                secureTextEntry
                showPasswordToggle
                error={errors.confirmPassword}
              />

              <Button
                title="Update Password"
                onPress={handleResetPassword}
                loading={loading}
                disabled={sessionLoading || !!sessionError}
                style={styles.updateButton}
              />
            </>
          )}
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth')}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.visible}
        onHide={hideSnackbar}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    marginBottom: 24,
  },
  updateButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
  },
  loginLink: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  manualTokenContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
  },
  manualTokenTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  manualTokenDescription: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    marginBottom: 12,
    lineHeight: 20,
  },
  tokenInput: {
    marginBottom: 8,
  },
  tokenHelpText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});