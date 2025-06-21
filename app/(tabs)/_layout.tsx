import { Tabs } from 'expo-router';
import {
  Home,
  Video,
  MessageCircle,
  Heart,
  Clock,
  User,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();

  // Auth guard - redirect to onboarding if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('TabLayout: User not authenticated, redirecting to onboarding');
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading]);

  // Prevent rendering tabs while checking auth
  if (isLoading) {
    return null;
  }

  // If not authenticated, don't render tabs (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ff9901',
        tabBarInactiveTintColor: '#47463e',

        /** 🔧 Clean modern navbar design matching reference */
        tabBarStyle: {
          backgroundColor: '#ffffff', // Clean white background
          borderTopWidth: 0, // Remove top border
          
          // Clean subtle shadow
          ...Platform.select({
            ios: {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
          }),

          // Perfect dimensions matching reference
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          paddingHorizontal: 20,
          
          // Clean flat design
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },

        tabBarLabelStyle: {
          fontFamily: Fonts.body.medium,
          fontSize: 11,
          marginTop: 6,
          marginBottom: 2,
          letterSpacing: 0.2,
          fontWeight: '500',
        },
        
        tabBarIconStyle: { 
          marginTop: 4,
          marginBottom: 0,
        },
        
        // Clean tab button styling
        tabBarItemStyle: {
          paddingVertical: 6,
          paddingHorizontal: 4,
        },
        
        // Remove active background
        tabBarActiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color, focused }) => (
            <Home 
              size={focused ? 24 : 22} 
              color={color}
              strokeWidth={focused ? 0 : 1.8}
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ size, color, focused }) => (
            <Video 
              size={focused ? 24 : 22} 
              color={color}
              strokeWidth={focused ? 0 : 1.8}
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, color, focused }) => (
            <MessageCircle 
              size={focused ? 24 : 22} 
              color={color}
              strokeWidth={focused ? 0 : 1.8}
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ size, color, focused }) => (
            <Heart 
              size={focused ? 24 : 22} 
              color={color}
              strokeWidth={focused ? 0 : 1.8}
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ size, color, focused }) => (
            <Clock 
              size={focused ? 24 : 22} 
              color={color}
              strokeWidth={focused ? 0 : 1.8}
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <User 
              size={focused ? 24 : 22} 
              color={color}
              strokeWidth={focused ? 0 : 1.8}
              fill={focused ? color : 'transparent'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}