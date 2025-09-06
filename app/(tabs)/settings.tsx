import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { PaywallButton } from '@/components/ui/PaywallButton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Settings as SettingsIcon, Bell, Shield, CreditCard, CircleHelp as HelpCircle, Star, ChevronRight, Volume2, Moon, Globe, LogOut, Crown, Cog } from 'lucide-react-native';
import { ConfigurationManager } from '@/components/ui/ConfigurationManager';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const { user, signOut, isLoading } = useAuth();
  const { isSubscribed, loading: subscriptionLoading, presentPaywallIfNeeded } = useRevenueCat();
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showConfigManager, setShowConfigManager] = useState(false);

  // Debug auth state
  useEffect(() => {
    console.log('Settings: Auth state changed', { 
      hasUser: !!user, 
      userEmail: user?.email,
      isLoading, 
      signingOut 
    });
  }, [user, isLoading, signingOut]);

  const handleUpgrade = async () => {
    // Use RevenueCat dashboard paywall with improved error handling
    const result = await presentPaywallIfNeeded('premium');
    
    if (result.success) {
      Alert.alert(
        'Welcome to Premium! 🎉',
        'You now have access to all premium features!',
        [{ text: 'Awesome!' }]
      );
    } else if (result.error && !result.error.includes('cancelled')) {
      Alert.alert(
        'Error',
        result.error || 'Failed to show premium options. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to get help?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Email Support', onPress: () => {} },
        { text: 'Live Chat', onPress: () => {} },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate PawPal',
      'Love using PawPal? Please rate us on the App Store!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Rate Now', onPress: () => {} },
      ]
    );
  };

  const handleSignOut = async () => {
    console.log('Settings: handleSignOut called', { isLoading, signingOut });
    
    setSigningOut(true);
    try {
      console.log('Settings: Starting sign out process (direct)');
      const { error } = await signOut();
      
      if (error) {
        console.error('Settings: Sign out error:', error);
        setSigningOut(false);
      } else {
        console.log('Settings: Sign out successful, auth guard will handle redirect');
      }
    } catch (error) {
      console.error('Settings: Unexpected sign out error:', error);
      setSigningOut(false);
    }
  };

  const settingSections = [
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Get reminders and health alerts',
          icon: <Bell size={20} color={Colors.primary} />,
          type: 'toggle' as const,
          value: notifications,
          onToggle: setNotifications,
        },
        {
          id: 'sound',
          title: 'Sound Effects',
          subtitle: 'Enable app sounds and voice responses',
          icon: <Volume2 size={20} color={Colors.primary} />,
          type: 'toggle' as const,
          value: soundEnabled,
          onToggle: setSoundEnabled,
        },
        {
          id: 'dark-mode',
          title: 'Dark Mode',
          subtitle: 'Coming soon',
          icon: <Moon size={20} color={Colors.primary} />,
          type: 'toggle' as const,
          value: darkMode,
          onToggle: setDarkMode,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'subscription',
          title: 'Subscription',
          subtitle: isSubscribed ? 'Premium Plan Active' : 'Upgrade to premium',
          icon: isSubscribed ? <Crown size={20} color={Colors.primary} /> : <CreditCard size={20} color={Colors.primary} />,
          type: 'navigation' as const,
          onPress: handleUpgrade,
        },
        {
          id: 'privacy',
          title: 'Privacy & Security',
          subtitle: 'Manage your data and privacy settings',
          icon: <Shield size={20} color={Colors.primary} />,
          type: 'navigation' as const,
          onPress: () => {},
        },
        {
          id: 'language',
          title: 'Language',
          subtitle: 'English (US)',
          icon: <Globe size={20} color={Colors.primary} />,
          type: 'navigation' as const,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & FAQ',
          subtitle: 'Get answers to common questions',
          icon: <HelpCircle size={20} color={Colors.primary} />,
          type: 'navigation' as const,
          onPress: handleSupport,
        },
        {
          id: 'rate',
          title: 'Rate PawPal',
          subtitle: 'Share your feedback with us',
          icon: <Star size={20} color={Colors.primary} />,
          type: 'action' as const,
          onPress: handleRateApp,
        },
        {
          id: 'config',
          title: 'API Configuration',
          subtitle: 'Manage app configuration settings',
          icon: <Cog size={20} color={Colors.primary} />,
          type: 'action' as const,
          onPress: () => setShowConfigManager(true),
        },
        {
          id: 'signout',
          title: 'Sign Out',
          subtitle: 'Sign out of your account',
          icon: <LogOut size={20} color={Colors.error} />,
          type: 'action' as const,
          onPress: handleSignOut,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.settingItem,
        (isLoading || signingOut) && styles.settingItemDisabled
      ]}
      onPress={() => {
        if (item.onPress) {
          item.onPress();
        }
      }}
      disabled={item.type === 'toggle' || isLoading || signingOut}
    >
      <View style={styles.settingIcon}>
        {item.icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle,
          item.id === 'signout' && { color: Colors.error }
        ]}>
          {item.id === 'signout' && signingOut ? 'Signing out...' : item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <View style={styles.settingAction}>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: Colors.disabled, true: Colors.primary }}
            thumbColor={Colors.white}
            disabled={isLoading || signingOut}
          />
        ) : (
          <ChevronRight size={20} color={Colors.disabled} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <SettingsIcon size={32} color={Colors.primary} />
          <Text style={styles.headerTitle}>Settings</Text>
          {user && (
            <Text style={styles.userInfo}>
              Signed in as {user.full_name || user.email || 'User'}
            </Text>
          )}
        </View>

        {/* Premium Upgrade Card */}
        {!isSubscribed && !subscriptionLoading && (
          <Card variant="elevated" style={styles.upgradeCard}>
            <LinearGradient
              colors={Colors.primaryGradient}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeContent}>
                <Crown size={32} color={Colors.white} style={styles.upgradeCrown} />
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeSubtitle}>
                  Unlock unlimited AI coaching and advanced features
                </Text>
                <PaywallButton
                  title="Upgrade Now"
                  style={styles.upgradeButton}
                  disabled={isLoading || signingOut}
                />
              </View>
            </LinearGradient>
          </Card>
        )}

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card variant="elevated" style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {renderSettingItem(item)}
                  {index < section.items.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>PawPal v1.0.0</Text>
          <Text style={styles.appCopyright}>
            © 2024 PawPal. Made with ❤️ for pet parents.
          </Text>
        </View>
      </ScrollView>

      {/* Configuration Manager */}
      <ConfigurationManager
        visible={showConfigManager}
        onClose={() => setShowConfigManager(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginTop: 8,
  },
  userInfo: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 4,
  },
  upgradeCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 0,
    overflow: 'hidden',
  },
  upgradeGradient: {
    padding: 20,
    borderRadius: 20,
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeCrown: {
    marginBottom: 12,
  },
  upgradeTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  sectionCard: {
    marginHorizontal: 24,
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.6,
    marginTop: 2,
  },
  settingAction: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.2,
    marginLeft: 68,
  },
  subscriptionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  subscriptionMenuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeSubscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeSubscriptionText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    marginLeft: 4,
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.6,
  },
  appCopyright: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 4,
  },
});