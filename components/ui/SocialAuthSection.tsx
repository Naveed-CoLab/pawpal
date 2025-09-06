import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

interface SocialAuthSectionProps {
  onGoogleSignIn: () => Promise<void>;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

export function SocialAuthSection({
  onGoogleSignIn,
  loading = false,
  title = "Quick Sign In",
  subtitle = "Continue with your existing account"
}: SocialAuthSectionProps) {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await onGoogleSignIn();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <GoogleSignInButton
          onPress={handleGoogleSignIn}
          loading={googleLoading || loading}
          variant="outlined"
          size="large"
          customText="Continue with Google"
        />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  title: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  buttonContainer: {
    marginBottom: 20,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.textSecondary,
  },
});