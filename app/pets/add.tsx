import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { usePets } from '@/hooks/useDatabase';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar, ErrorMessages } from '@/components/ui/SnackbarProvider';
import { MediaUtils } from '@/lib/mediaUtils';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { PET_IMAGE_BUCKET, PET_IMAGE_PREFIX } from '@/constants/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Badge checking functionality for pets
const checkPetBadges = async (userId: string, showSnackbar: (message: string, type?: string) => void) => {
  try {
    // Count user's pets
    const { data: pets, error } = await supabase
      .from('pets')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      return;
    }

    const petCount = pets?.length || 0;

    // Award badges based on milestones
    if (petCount === 1) {
      showSnackbar('🏅 Badge Earned: Pet Parent! Your furry friend is lucky to have you! (+15 points)', 'success');
    } else if (petCount === 3) {
      showSnackbar('🏅 Badge Earned: Pack Leader! You\'re managing a whole pack! (+35 points)', 'success');
    }
  } catch (error) {
    // Silent error handling for production
  }
};

// Helper function to advance onboarding (removed - no longer needed)
const advanceOnboarding = async (userId: string) => {
  // No longer needed - onboarding is just a simple welcome message
  console.log('🎯 Onboarding: Pet added, but onboarding is now simplified');
};

export default function AddPetScreen() {
  const { createPet } = usePets();
  const { user } = useAuth();
  const { showError, showWarning, showSuccess } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [petData, setPetData] = useState({
    name: '',
    breed: '',
    age: '',
    gender: 'male' as 'male' | 'female',
  });

  const handleImagePicker = async () => {
    try {
      Alert.alert(
        'Add Pet Photo',
        'Choose how you want to add your pet\'s photo',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const result = await MediaUtils.captureImage();
              if (result) {
                setSelectedImage(result.uri);
              }
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const result = await MediaUtils.pickImageFromLibrary();
              if (result) {
                setSelectedImage(result.uri);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error with image picker:', error);
      showError('Failed to pick image. Please try again.');
    }
  };

  const handleCreatePet = async () => {
    if (!petData.name.trim()) {
      showWarning('Please enter your pet\'s name before continuing.');
      return;
    }

    if (!petData.age || isNaN(Number(petData.age))) {
      showWarning('Please enter a valid age for your pet.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🐕 Creating pet with data:', {
        name: petData.name.trim(),
        breed: petData.breed.trim() || 'Mixed Breed',
        age: Number(petData.age),
        gender: petData.gender
      });

      let uploadedUrl: string | undefined = undefined;
      if (selectedImage) {
        const bucket = PET_IMAGE_BUCKET; // e.g., 'public' or your actual bucket
        const keyPrefix = `${PET_IMAGE_PREFIX}/${user?.id || 'anonymous'}`;
        const result = await MediaUtils.uploadImageToSupabase(bucket, keyPrefix, selectedImage);
        if (!result.error && result.publicUrl) {
          showSuccess('Image uploaded successfully.');
        }
        if (result.error) {
          console.warn('Upload error:', result.error);
          showError('Failed to upload image. Please try again.');
          } else {
          uploadedUrl = result.publicUrl || undefined;
          console.log('✅ Image uploaded. Public URL:', uploadedUrl);
        }
      }

      const { data, error } = await createPet({
        name: petData.name.trim(),
        breed: petData.breed.trim() || 'Mixed Breed',
        age: Number(petData.age),
        gender: petData.gender,
        avatar_url: uploadedUrl,
      });

      console.log('🐕 Pet creation result:', { data, error });

      if (error) {
        console.error('❌ Pet creation error:', error);
        showError('Failed to create pet. Please try again.');
        return;
      }

      // Pet creation was successful (no error means success)
      console.log('✅ Pet created successfully');
      
      // Show immediate success feedback
      showSuccess(`🎉 ${petData.name.trim()} has been added to your VetPaw family!`);
      
      // Show detailed success popup
      Alert.alert(
        'Pet Added Successfully! 🎉',
        `${petData.name.trim()} has been added to your VetPaw family! Welcome to the pack! 🐾`,
        [
          {
            text: 'Great!',
            onPress: async () => {
              console.log('🎉 User acknowledged pet creation success');
              
              // Clear form
              setPetData({
                name: '',
                breed: '',
                age: '',
                gender: 'male',
              });
              setSelectedImage(null);
              
              // Check for pet milestone badges (use user ID since data might be different format)
              if (user?.id) {
                console.log('🏅 Checking for badges for user:', user.id);
                await checkPetBadges(user.id, showSuccess);
              }
              
              // Add 2-second delay before redirecting to home
              console.log('🏠 Redirecting to home in 2 seconds...');
              setTimeout(() => {
                router.push('/(tabs)/');
              }, 2000);
            }
          }
        ]
      );
    } catch (err) {
      console.error('💥 Error creating pet:', err);
      showError('Something went wrong while creating your pet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Your Pet</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pet Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                selectedImage 
                  ? { uri: selectedImage }
                  : require('@/assets/images/login page icon.png')
              }
              style={styles.avatar}
              resizeMode={selectedImage ? "cover" : "contain"}
            />
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={handleImagePicker}
            >
              <Camera size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarText}>
            {selectedImage ? 'Tap camera to change photo' : 'Add a photo (optional)'}
          </Text>
        </View>

        {/* Pet Information Form */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Pet Name *</Text>
            <TextInput
              style={styles.textInput}
              value={petData.name}
              onChangeText={(text) => setPetData(prev => ({ ...prev, name: text }))}
              placeholder="e.g., Max, Bella, Charlie"
              placeholderTextColor={Colors.disabled}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Breed</Text>
            <TextInput
              style={styles.textInput}
              value={petData.breed}
              onChangeText={(text) => setPetData(prev => ({ ...prev, breed: text }))}
              placeholder="e.g., Golden Retriever, Mixed Breed"
              placeholderTextColor={Colors.disabled}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Age (years) *</Text>
            <TextInput
              style={styles.textInput}
              value={petData.age}
              onChangeText={(text) => setPetData(prev => ({ ...prev, age: text }))}
              placeholder="e.g., 3"
              placeholderTextColor={Colors.disabled}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.genderContainer}>
              {(['male', 'female'] as const).map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderButton,
                    petData.gender === gender && styles.genderButtonActive
                  ]}
                  onPress={() => setPetData(prev => ({ ...prev, gender }))}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      petData.gender === gender && styles.genderButtonTextActive
                    ]}
                  >
                    {gender === 'male' ? '♂ Male' : '♀ Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Create Pet Button */}
        <Button
          title="Add My Pet"
          onPress={handleCreatePet}
          loading={loading}
          style={styles.createButton}
        />
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
  },
  formSection: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  genderButtonActive: {
    backgroundColor: Colors.primary,
  },
  genderButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
  },
  genderButtonTextActive: {
    color: Colors.white,
  },
  createButton: {
    marginTop: 20,
  },
}); 