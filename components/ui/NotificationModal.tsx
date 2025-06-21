import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { X, Bell, Heart, Stethoscope, MessageSquare, Crown } from 'lucide-react-native';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

interface NotificationSettings {
  pushNotifications: boolean;
  moodReminders: boolean;
  healthAlerts: boolean;
  coachingUpdates: boolean;
  premiumOffers: boolean;
  emailUpdates: boolean;
}

const defaultSettings: NotificationSettings = {
  pushNotifications: true,
  moodReminders: true,
  healthAlerts: true,
  coachingUpdates: true,
  premiumOffers: true,
  emailUpdates: false,
};

export function NotificationModal({ visible, onClose }: NotificationModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // In a real app, you'd also sync with your backend here
      console.log('📱 Notification settings saved:', newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const notificationOptions = [
    {
      key: 'pushNotifications' as keyof NotificationSettings,
      title: 'Push Notifications',
      description: 'Receive notifications on your device',
      icon: <Bell size={20} color="#ff9d00" />,
      important: true,
    },
    {
      key: 'moodReminders' as keyof NotificationSettings,
      title: 'Mood Check Reminders',
      description: 'Daily reminders to check your pet\'s mood',
      icon: <Heart size={20} color="#ff6b6b" />,
    },
    {
      key: 'healthAlerts' as keyof NotificationSettings,
      title: 'Health Alerts',
      description: 'Important health-related notifications',
      icon: <Stethoscope size={20} color="#4ecdc4" />,
    },
    {
      key: 'coachingUpdates' as keyof NotificationSettings,
      title: 'Coaching Updates',
      description: 'New coaching sessions and tips',
      icon: <MessageSquare size={20} color="#45b7d1" />,
    },
    {
      key: 'premiumOffers' as keyof NotificationSettings,
      title: 'Premium Offers',
      description: 'Special promotions and premium features',
      icon: <Crown size={20} color="#ffd93d" />,
    },
    {
      key: 'emailUpdates' as keyof NotificationSettings,
      title: 'Email Updates',
      description: 'Weekly newsletter and important updates',
      icon: <Bell size={20} color="#95a5a6" />,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Bell size={24} color="#ff9d00" />
            <Text style={styles.headerTitle}>Notification Preferences</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#544c3a" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>
              Customize which notifications you'd like to receive to stay updated on your pet's health and well-being.
            </Text>
          </View>

          {/* Notification Options */}
          <View style={styles.optionsContainer}>
            {notificationOptions.map((option) => (
              <View key={option.key} style={styles.optionItem}>
                <View style={styles.optionLeft}>
                  <View style={styles.iconContainer}>
                    {option.icon}
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                    {option.important && (
                      <Text style={styles.importantNote}>
                        Required for core app functionality
                      </Text>
                    )}
                  </View>
                </View>
                <Switch
                  value={settings[option.key]}
                  onValueChange={() => toggleSetting(option.key)}
                  trackColor={{ false: '#E5E5E5', true: '#ff9d0080' }}
                  thumbColor={settings[option.key] ? '#ff9d00' : '#F4F3F4'}
                  disabled={loading}
                />
              </View>
            ))}
          </View>

          {/* Info Section */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>📱 About Notifications</Text>
            <Text style={styles.infoText}>
              • Push notifications require device permissions{'\n'}
              • You can change these settings anytime{'\n'}
              • Critical health alerts will always be delivered{'\n'}
              • Email preferences are managed separately
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.systemSettingsButton}
              onPress={() => {
                Alert.alert(
                  'System Settings',
                  'To manage system-level notification permissions, go to your device Settings > Apps > VetPaw > Notifications',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.systemSettingsText}>Open System Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  descriptionContainer: {
    marginVertical: 20,
  },
  description: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 22,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#544c3a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#666666',
    lineHeight: 18,
  },
  importantNote: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#ff9d00',
    marginTop: 2,
  },
  infoContainer: {
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#45b7d1',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: '#544c3a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  systemSettingsButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  systemSettingsText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    textAlign: 'center',
  },
}); 