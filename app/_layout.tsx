import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { initializePurchases } from '@/hooks/useRevenueCat';
import { SnackbarProvider } from '@/components/ui/SnackbarProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  
  // Initialize RevenueCat
  const { isInitialized, error } = initializePurchases();
  
  useEffect(() => {
    if (isInitialized) {
      console.log('🎯 RevenueCat initialization completed in _layout.tsx');
      if (error) {
        console.warn('⚠️ RevenueCat initialization warning:', error);
      }
    }
  }, [isInitialized, error]);

  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SnackbarProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" backgroundColor="#FFF8E1" />
    </SnackbarProvider>
  );
}