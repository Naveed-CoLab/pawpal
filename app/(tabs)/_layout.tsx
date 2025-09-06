import { Tabs } from 'expo-router';
import {
  Home,
  MessageCircle,
  Clock,
  User,
  Activity,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, user, retryLoadUserProfile } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('TabLayout: User not authenticated, redirecting to onboarding');
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading]);

  // Retry loading user profile if we have a minimal user object
  useEffect(() => {
    if (isAuthenticated && user && !user.phone) {
      // If user doesn't have phone (indicating minimal profile), try to load full profile
      const timer = setTimeout(() => {
        retryLoadUserProfile();
      }, 5000); // Wait 5 seconds before retrying
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, retryLoadUserProfile]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // Reusable icon wrapper for filled-style effect
  const renderIcon = (IconComponent: any, focused: boolean, color: string) => (
    <View
      style={{
        backgroundColor: focused ? '#ff990133' : 'transparent', // subtle orange background
        borderRadius: 12,
        padding: 6,
      }}
    >
      <IconComponent
        size={22}
        color={color}
        strokeWidth={1.8}
      />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff9901',
        tabBarInactiveTintColor: '#47463e',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          ...Platform.select({
            ios: {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            },
            android: {
              elevation: 6,
            },
          }),
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 6,
          paddingHorizontal: 20,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.body.medium,
          fontSize: 11,
          marginTop: 2,
          marginBottom: 4,
          letterSpacing: 0.2,
          fontWeight: '500',
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          paddingHorizontal: 4,
        },
        tabBarActiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) =>
            renderIcon(Home, focused, color),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) =>
            renderIcon(MessageCircle, focused, color),
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color, focused }) =>
            renderIcon(Activity, focused, color),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) =>
            renderIcon(Clock, focused, color),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) =>
            renderIcon(User, focused, color),
        }}
      />

      {/* Hidden tabs */}
      <Tabs.Screen name="coach" options={{ href: null }} />
      <Tabs.Screen name="health" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="mood" options={{ href: null }} />
    </Tabs>
  );
}
