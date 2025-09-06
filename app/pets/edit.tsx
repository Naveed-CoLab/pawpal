import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { usePets } from '@/hooks/useDatabase';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { MediaUtils } from '@/lib/mediaUtils';
import { Pet } from '@/lib/database';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { Button } from '@/components/ui/Button';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pets, updatePet } = usePets();
  const { showError, showWarning, showSuccess } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [petData, setPetData] = useState({
    name: '',
    breed: '',
    age: '',
    gender: 'unknown' as 'male' | 'female' | 'unknown',
  });
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);

  useEffect(() => {
    if (id && pets.length > 0) {
      const pet = pets.find(p => p.id === id);
      if (pet) {
        setCurrentPet(pet);
        setPetData({
          name: pet.name,
          breed: pet.breed,
          age: pet.age.toString(),
          gender: pet.gender,
        });
        setSelectedImage(pet.avatar_url || null);
      }
    }
  }, [id, pets]);

  const handleImagePicker = async () => {
    try {
      Alert.alert(
        'Update Pet Photo',
        'Choose how you want to update your pet\'s photo',
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
            text: 'Remove Photo',
            style: 'destructive',
            onPress: () => setSelectedImage(null),
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

  const handleUpdatePet = async () => {
    if (!currentPet) {
      showError('Pet not found. Please try again.');
      return;
    }

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
      const updates = {
        name: petData.name.trim(),
        breed: petData.breed.trim() || 'Mixed Breed',
        age: Number(petData.age),
        gender: petData.gender,
        avatar_url: selectedImage || undefined,
      };

      const { data, error } = await updatePet(currentPet.id, updates);

      if (data) {
        showSuccess('Pet updated successfully!');
        // Navigate back after a brief delay
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (err) {
      console.error('Error updating pet:', err);
      showError('Something went wrong while updating your pet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentPet) {
    return (
      <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading pet information...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.backgroundGradient} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit {currentPet.name}</Text>
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
            Tap camera to change photo
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
              {(['male', 'female', 'unknown'] as const).map((gender) => (
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
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Update Pet Button */}
        <Button
          title="Update Pet"
          onPress={handleUpdatePet}
          loading={loading}
          style={styles.updateButton}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 16,
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
  updateButton: {
    marginTop: 20,
  },
}); 