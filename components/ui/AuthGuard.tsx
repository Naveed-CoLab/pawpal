import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingMessage?: string;
  requireAuth?: boolean;
}

interface AuthGuardStyles {
  container: object;
  loadingContainer: object;
  loadingText: object;
  errorContainer: object;
  errorTitle: object;
  errorText: object;
}

const styles: AuthGuardStyles = {
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: Fonts.nunito.medium,
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontFamily: Fonts.fredoka.semiBold,
    fontSize: 24,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.nunito.regular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
};

export default function AuthGuard({ 
  children, 
  fallback, 
  loadingMessage = 'Checking authentication...',
  requireAuth = true 
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </LinearGradient>
    );
  }

  // If auth is required but user is not authenticated, show fallback or default message
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Please sign in</Text>
          <Text style={styles.errorText}>
            You need to be signed in to access this feature.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  // Auth is complete and user is authenticated (or auth not required)
  return <>{children}</>;
}

// Export convenience hook for getting auth status
export function useAuthGuard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return {
    user,
    isLoading,
    isAuthenticated,
    canAccess: !isLoading && (isAuthenticated || !user), // Can access if not loading and either authenticated or no auth required
  };
}