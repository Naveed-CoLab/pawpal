import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';

export default function AuthCallback() {
  const { validateSession } = useAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('🔄 Processing auth callback...');
      
      // Give a moment for the auth session to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate the current session
      const isValid = await validateSession();
      
      if (isValid) {
        console.log('✅ Auth callback successful, redirecting to app');
        router.replace('/(tabs)');
      } else {
        console.log('❌ Auth callback failed, redirecting to login');
        router.replace('/auth');
      }
    } catch (error) {
      console.error('❌ Auth callback error:', error);
      router.replace('/auth');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
  },
};