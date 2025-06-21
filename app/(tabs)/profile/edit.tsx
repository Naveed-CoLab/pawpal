import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useDatabase';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Snackbar } from '@/components/ui/Snackbar';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ArrowLeft, Camera, Crown, Mail, User, Phone } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { subscription } = useSubscription();
  const { isSubscribed } = useRevenueCat();
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
  });
  
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Name must be at least 2 characters';
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanPhone = formData.phone.replace(/[\s\-\(\)\.]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    showSnackbar('Updating your profile...', 'info');
    
    try {
      // Prepare updates
      const updates: any = {
        full_name: formData.full_name.trim(),
      };

      // Include phone if provided
      if (formData.phone && formData.phone.trim()) {
        updates.phone = formData.phone.trim();
      }

      // If avatar was changed, update it
      if (newAvatar) {
        updates.avatar_url = newAvatar;
      }

      console.log('Updating profile with:', updates);

      // Update profile
      const { data, error } = await updateProfile(updates);

      if (error) {
        console.error('Profile update error:', error);
        showSnackbar(`Update failed: ${error}`, 'error');
      } else {
        console.log('Profile updated successfully:', data);
        showSnackbar('Profile updated successfully!', 'success');
        
        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Unexpected error updating profile:', error);
      showSnackbar('An unexpected error occurred', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setLoading(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permission to change your profile picture.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setNewAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionBadge = () => {
    if (isSubscribed) {
      return (
        <View style={styles.subscriptionBadge}>
          <Crown size={16} color={Colors.white} />
          <Text style={styles.subscriptionText}>Premium</Text>
        </View>
      );
    }
    
    return (
      <View style={[styles.subscriptionBadge, styles.freeBadge]}>
        <Text style={styles.freeText}>Free Plan</Text>
      </View>
    );
  };

  const getSubscriptionDetails = () => {
    if (isSubscribed && subscription) {
      const endDate = subscription.end_date 
        ? new Date(subscription.end_date).toLocaleDateString() 
        : 'Ongoing';
      
      return (
        <View style={styles.subscriptionDetails}>
          <Text style={styles.subscriptionPlan}>Premium Plan</Text>
          <Text style={styles.subscriptionDate}>
            {subscription.status === 'active' ? 'Active until: ' : 'Expires: '}{endDate}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.subscriptionDetails}>
        <Text style={styles.subscriptionPlan}>Free Plan</Text>
        <Text style={styles.subscriptionDate}>Limited features available</Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                newAvatar
                  ? { uri: newAvatar }
                  : formData.avatar_url
                  ? { uri: formData.avatar_url }
                  : require('@/assets/images/login page icon.png')
              }
              style={styles.avatar}
              resizeMode="cover"
            />
            {getSubscriptionBadge()}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handlePickImage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Camera size={20} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
          {getSubscriptionDetails()}
        </View>

        {/* Form Card */}
        <Card variant="elevated" style={styles.formCard}>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <User size={20} color={Colors.primary} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.full_name && styles.inputError
                ]}
                value={formData.full_name}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, full_name: text }));
                  if (errors.full_name) setErrors(prev => ({ ...prev, full_name: '' }));
                }}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.disabled}
                autoCorrect={false}
              />
              {errors.full_name && (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Mail size={20} color={Colors.disabled} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.inputDisabled
                ]}
                value={formData.email}
                editable={false}
                placeholder="Your email address"
                placeholderTextColor={Colors.disabled}
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Phone size={20} color={Colors.primary} />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Phone (Optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.phone && styles.inputError
                ]}
                value={formData.phone}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, phone: text }));
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                }}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.disabled}
                keyboardType="phone-pad"
                autoCorrect={false}
              />
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : (
                <Text style={styles.helperText}>For emergency contact only</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={isSaving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            loading={isSaving}
            style={styles.saveButton}
            disabled={isSaving}
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
            disabled={isSaving}
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
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
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  freeBadge: {
    backgroundColor: Colors.disabled,
  },
  subscriptionText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    marginLeft: 4,
  },
  freeText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  subscriptionDetails: {
    alignItems: 'center',
  },
  subscriptionPlan: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: 4,
  },
  subscriptionDate: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
  },
  formCard: {
    marginBottom: 32,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 28,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    backgroundColor: Colors.white,
    minHeight: 48,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: Colors.background,
    color: Colors.disabled,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.error,
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    marginTop: 6,
  },
  actionButtons: {
    gap: 16,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 12,
  },
});