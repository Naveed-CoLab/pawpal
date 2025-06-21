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
  const { updatePassword } = useAuth();
  const { access_token, refresh_token } = useLocalSearchParams();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    // If we don't have the required tokens, redirect back to forgot password
    if (!access_token || !refresh_token) {
      Alert.alert(
        'Invalid Reset Link',
        'This password reset link is invalid or has expired. Please request a new one.',
        [{ text: 'OK', onPress: () => router.replace('/auth/forgot-password') }]
      );
    }
  }, [access_token, refresh_token]);

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
            style={styles.updateButton}
          />
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
});