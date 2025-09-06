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
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Snackbar } from '@/components/ui/Snackbar';
import { EngagingLoader } from '@/components/ui/EngagingLoader';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ArrowLeft } from 'lucide-react-native';
import { dynamicGoogleAuth } from '@/lib/googleAuthServiceDynamic';

const { width, height } = Dimensions.get('window');

// Password strength checker
const checkPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  
  // Complexity checks
  if (/[A-Z]/.test(password)) score += 1; // Has uppercase
  if (/[a-z]/.test(password)) score += 1; // Has lowercase
  if (/[0-9]/.test(password)) score += 1; // Has number
  if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special char
  
  let label = '';
  let color = '';
  
  switch (true) {
    case (score === 0):
      label = '';
      color = '';
      break;
    case (score <= 2):
      label = 'Weak';
      color = Colors.error;
      break;
    case (score <= 4):
      label = 'Medium';
      color = '#FFA500'; // Orange
      break;
    case (score === 5):
      label = 'Strong';
      color = '#4CAF50'; // Green
      break;
    default:
      label = '';
      color = '';
  }
  
  return { score, label, color };
};

export default function SignupScreen() {
  const { signUp, isAuthenticated, isLoading, signInWithFacebook } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });
  const [passwordStrength, setPasswordStrength] = useState({ 
    score: 0, 
    label: '', 
    color: '' 
  });
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Check password strength whenever password changes
  useEffect(() => {
    const strength = checkPasswordStrength(formData.password);
    setPasswordStrength(strength);
  }, [formData.password]);

  // Check if passwords match whenever either password field changes
  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordsMatch(false);
    }
  }, [formData.password, formData.confirmPassword]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      newErrors.terms = 'Please accept the Terms of Service';
    }

    if (!privacyAccepted) {
      newErrors.privacy = 'Please accept the Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    showSnackbar('Creating your account...', 'info');
    
    try {
      const { data, error } = await signUp(formData.email, formData.password, formData.name);

      if (error) {
        showSnackbar(error, 'error');
      } else {
        showSnackbar('Account created successfully!', 'success');
        setTimeout(() => {
          router.replace('/auth');
        }, 1500);
      }
    } catch (error) {
      showSnackbar('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    showSnackbar('Google sign-up is under maintenance. Please sign up with email.', 'info');
    return;
  };

  const handleFacebookSignup = async () => {
    if (Platform.OS === 'web') {
      try {
        showSnackbar('Redirecting to Facebook...', 'info');
        const { error } = await signInWithFacebook();
        
        if (error) {
          showSnackbar(error, 'error');
        }
        // Note: On web, this will redirect to Facebook OAuth
      } catch (error) {
        showSnackbar('Facebook signup failed', 'error');
      }
    } else {
      showSnackbar('Facebook signup will be available soon on mobile!', 'info');
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={Colors.backgroundGradient as [any, any]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={Colors.backgroundGradient as [any, any]}
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.welcomeText}>Join PawPal!</Text>
            <View style={styles.dogContainer}>
              <Image
                source={require('@/assets/images/login page icon.png')}
                style={styles.dogIcon}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start caring for your furry friend</Text>
        </View>

        {/* Signup Form Card */}
        <Card variant="elevated" style={styles.formCard}>
          <View style={styles.formContent}>
            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <Input
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                placeholder=""
                error={errors.name}
                style={styles.input}
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <Input
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.input}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <Input
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                placeholder=""
                secureTextEntry
                showPasswordToggle
                error={errors.password}
                style={styles.input}
              />
              {formData.password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4, 5].map((index) => (
                      <View
                        key={index}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor: 
                              index <= passwordStrength.score 
                                ? passwordStrength.color 
                                : '#E0E0E0',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  {passwordStrength.label && (
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  )}
                </View>
              )}
              <Text style={styles.passwordHint}>
                Use at least 8 characters with uppercase, lowercase, numbers, and special characters
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <Input
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                placeholder=""
                secureTextEntry
                showPasswordToggle
                error={errors.confirmPassword}
                style={styles.input}
              />
              {formData.confirmPassword.length > 0 && (
                <View style={styles.passwordMatchContainer}>
                  {passwordsMatch ? (
                    <Text style={styles.passwordMatch}>Passwords match ✓</Text>
                  ) : (
                    <Text style={styles.passwordMismatch}>Passwords don't match ✗</Text>
                  )}
                </View>
              )}
            </View>

            {/* Terms and Privacy Checkboxes */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkboxRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => Linking.openURL('https://vetpaw.app/terms')}
                    >
                      Terms of Service
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

              <TouchableOpacity 
                style={styles.checkboxRow}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                  {privacyAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text
                      style={styles.linkText}
                      onPress={() => Linking.openURL('https://vetpaw.app/privacy')}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>
              {errors.privacy && <Text style={styles.errorText}>{errors.privacy}</Text>}
            </View>

            {/* Create Account Button */}
            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              disabled={!termsAccepted || !privacyAccepted}
              style={StyleSheet.flatten([
                styles.signupButton,
                (!termsAccepted || !privacyAccepted) ? styles.signupButtonDisabled : null
              ])}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <Text style={styles.dividerText}>or</Text>
            </View>

            {/* Google Signup Button */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleSignup}
              activeOpacity={0.8}
              disabled={googleLoading || loading}
            >
              <Image
                source={require('@/assets/images/google logo.png')}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={styles.socialButtonText}>
                {googleLoading ? 'Signing up...' : 'Sign up with Google'}
              </Text>
            </TouchableOpacity>

        
          </View>
        </Card>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Engaging Loader for Signup */}
      {(loading || googleLoading) && (
        <EngagingLoader 
          type="signup" 
          showTip={true}
          showAnimation={true}
        />
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
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
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.12,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    flex: 1,
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
  },
  formCard: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  formContent: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.placeholderbg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    minHeight: 50,
  },
  signupButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 25,
    minHeight: 50,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  divider: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerText: {
    fontSize: 14,
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


  },

  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },

  socialButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
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
  passwordStrengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    width: 60,
    textAlign: 'right',
  },
  passwordHint: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.6,
    marginTop: 4,
    fontFamily: Fonts.body.regular,
  },
  passwordMatchContainer: {
    marginTop: 8,
  },
  passwordMatch: {
    color: '#4CAF50',
    fontSize: 14,
    fontFamily: Fonts.body.medium,
  },
  passwordMismatch: {
    color: Colors.error,
    fontSize: 14,
    fontFamily: Fonts.body.medium,
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#ff9d00',
    borderColor: '#ff9d00',
  },
  checkmark: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: Fonts.body.bold,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    lineHeight: 20,
  },
  linkText: {
    color: '#ff9d00',
    fontFamily: Fonts.body.semiBold,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 32,
  },
});