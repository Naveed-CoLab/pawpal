import { useState, useCallback } from 'react';
import { router } from 'expo-router';

export function useOnboarding() {
  const [currentScreen, setCurrentScreen] = useState('home');

  const navigateToRoute = useCallback((route: string) => {
    try {
      console.log('🧭 Onboarding navigation to:', route);
      router.push(route as any);
    } catch (error) {
      console.error('❌ Onboarding navigation error:', error);
    }
  }, []);

  const updateCurrentScreen = useCallback((screen: string) => {
    setCurrentScreen(screen);
  }, []);

  return {
    currentScreen,
    updateCurrentScreen,
    navigateToRoute,
  };
} 