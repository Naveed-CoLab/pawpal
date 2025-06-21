import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Snackbar } from '@/components/ui/Snackbar';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    showSnackbar('Sending reset link...', 'info');
    
    try {
      const { error } = await resetPassword(email);

      if (error) {
        showSnackbar(error, 'error');
      } else {
        showSnackbar('Reset link sent! Check your email.', 'success');
        setTimeout(() => {
          router.back();
        }, 2000);
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
          <Image
            source={require('@/assets/images/login page icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password
          </Text>
        </View>

        <Card variant="elevated" style={styles.formCard}>
          <Input
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError('');
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />

          <Button
            title="Send Reset Link"
            onPress={handleResetPassword}
            loading={loading}
            style={styles.resetButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.back()}>
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
  logo: {
    width: 80,
    height: 80,
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
  resetButton: {
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