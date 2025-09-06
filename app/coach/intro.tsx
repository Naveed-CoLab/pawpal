import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { usePets } from '@/hooks/useDatabase';
import { mediaAccessService } from '@/lib/mediaAccess';
import { tavusLiveService } from '@/lib/tavusLiveService';
import { 
  Video, 
  Clock, 
  Star, 
  User, 
  Heart, 
  Zap, 
  Shield, 
  Camera, 
  Mic,
  ArrowLeft,
} from 'lucide-react-native';

export default function CoachIntroScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { pets } = usePets();

  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(true);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  // Get pet data from params or use primary pet
  useEffect(() => {
    if (params.petId && pets.length > 0) {
      const pet = pets.find((p: any) => p.id === params.petId);
      setSelectedPet(pet || pets[0]);
    } else if (pets.length > 0) {
      setSelectedPet(pets[0]);
    }
  }, [params.petId, pets]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setIsCheckingPermissions(true);
      const permissions = await mediaAccessService.checkPermissions();
      console.log('🔍 Checked permissions:', permissions);
      // Enable button if we have at least camera OR microphone
      const hasAnyPermission = Boolean(permissions.camera || permissions.microphone);
      console.log('🎯 Has any permission:', hasAnyPermission);
      setHasPermissions(hasAnyPermission);
    } catch (error) {
      console.log('Permission check failed:', error);
      setHasPermissions(false);
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const requestPermissions = async () => {
    try {
      setIsCheckingPermissions(true);
      const permissions = await mediaAccessService.requestPermissions();
      console.log('📝 Requested permissions:', permissions);
      // Enable button if we have at least camera OR microphone
      const hasAnyPermission = Boolean(permissions.camera || permissions.microphone);
      console.log('🎯 Has any permission after request:', hasAnyPermission);
      setHasPermissions(hasAnyPermission);
      
      if (hasAnyPermission) {
        Alert.alert(
          'Success!', 
          'Great! You can now start your coaching session with Luna.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permissions Needed',
          'Please allow camera or microphone access to use live coaching. You can try again or check your browser settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('Permission request failed:', error);
      Alert.alert(
        'Error',
        'Failed to request permissions. Please check your browser settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleStartSession = async () => {
    if (!user || !selectedPet) {
      Alert.alert('Error', 'Please make sure you have a pet added to your account.');
      return;
    }

    setIsLoading(true);
    
    // Navigate to live session with pet data
    router.push({
      pathname: '/coach/live',
      params: {
        petId: selectedPet.id,
        petName: selectedPet.name,
        petBreed: selectedPet.breed || '',
        petAge: selectedPet.age || '',
        petWeight: selectedPet.weight || '',
        concern: params.concern || 'general consultation',
        topicId: params.topicId || '',
        topicContext: params.topicContext || '',
      }
    });
    
    setIsLoading(false);
  };

  const formatAge = (age: any) => {
    if (!age) return 'Unknown age';
    
    // If age is already a number (years)
    if (typeof age === 'number') {
      return age === 1 ? '1 year' : `${age} years`;
    }
    
    // If age is a string that represents years
    if (typeof age === 'string' && !isNaN(Number(age))) {
      const ageNum = Number(age);
      return ageNum === 1 ? '1 year' : `${ageNum} years`;
    }
    
    // If it might be a birth date string, try to parse it
    try {
      const birth = new Date(age);
      if (!isNaN(birth.getTime())) {
        const now = new Date();
        const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        
        if (ageInMonths < 12) {
          return `${ageInMonths} months`;
        }
        
        const years = Math.floor(ageInMonths / 12);
        const months = ageInMonths % 12;
        
        if (months === 0) {
          return `${years} year${years > 1 ? 's' : ''}`;
        }
        
        return `${years}y ${months}m`;
      }
    } catch (error) {
      // Fall back to showing the age as-is
      return String(age);
    }
    
    return String(age);
  };

  if (!selectedPet) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff9d00" />
        <Text style={styles.loadingText}>Loading pet information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF8E1', '#ffffff']}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#544c3a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meet Luna</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Luna Introduction */}
        <Card variant="elevated" style={styles.jamesCard}>
          <View style={styles.jamesHeader}>
            <View style={styles.jamesAvatar}>
              <Image 
                source={require('@/assets/images/luna ai dog mentor.png')}
                style={styles.jamesImage}
                resizeMode="cover"
              />
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.jamesInfo}>
              <Text style={styles.jamesName}>Luna 👩‍⚕️</Text>
              <Text style={styles.jamesTitle}>AI Dog Mentor Vet & Behavior Specialist</Text>
              <View style={styles.jamesRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={14} color="#ff9d00" fill="#ff9d00" />
                ))}
                <Text style={styles.ratingText}>4.9 • 500+ sessions</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.jamesDescription}>
          Hi! I'm Luna – your expert AI dog mentor. I help with behavior, health, feeding, and daily routines. Let's make the next 2–3 minutes count! 🐾🎯
          </Text>
          
          <View style={styles.jamesFeatures}>
            <View style={styles.feature}>
              <Zap size={16} color="#ff9d00" />
              <Text style={styles.featureText}>Live Mentorship</Text>
            </View>
            <View style={styles.feature}>
              <Heart size={16} color="#ff9d00" />
              <Text style={styles.featureText}>Positive       Vibe</Text>
            </View>
            <View style={styles.feature}>
              <Shield size={16} color="#ff9d00" />
              <Text style={styles.featureText}>Expert       Advice</Text>
            </View>
          </View>
        </Card>

        {/* Pet Information */}
        <Card variant="elevated" style={styles.petCard}>
          <Text style={styles.sectionTitle}>Today's Session With:</Text>
          
          <View style={styles.petInfo}>
            <View style={styles.petAvatarContainer}>
              {selectedPet.avatar_url ? (
                <Image 
                  source={{ uri: selectedPet.avatar_url }}
                  style={styles.petAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.petAvatarPlaceholder}>
                  <Text style={styles.petAvatarEmoji}>🐕</Text>
                </View>
              )}
            </View>
            
            <View style={styles.petDetails}>
              <Text style={styles.petName}>{selectedPet.name}</Text>
              <Text style={styles.petBreed}>
                {selectedPet.breed || 'Mixed Breed'} • {formatAge(selectedPet.age)}
              </Text>
              {selectedPet.weight && (
                <Text style={styles.petWeight}>{selectedPet.weight} lbs</Text>
              )}
              <Text style={styles.petMood}>
                Ready for coaching! 🎯
              </Text>
            </View>
          </View>
        </Card>

        {/* Session Details */}
        <Card variant="elevated" style={styles.sessionCard}>
          <Text style={styles.sectionTitle}>What to Expect</Text>
          
          <View style={styles.sessionDetails}>
            <View style={styles.sessionDetail}>
              <Clock size={20} color="#ff9d00" />
              <Text style={styles.sessionDetailText}>2-3 minutes of expert advice</Text>
            </View>
            <View style={styles.sessionDetail}>
              <Video size={20} color="#ff9d00" />
              <Text style={styles.sessionDetailText}>Live video coaching with Luna</Text>
            </View>
            <View style={styles.sessionDetail}>
              <User size={20} color="#ff9d00" />
              <Text style={styles.sessionDetailText}>Personalized for {selectedPet.name}</Text>
            </View>
          </View>
        </Card>

        {/* Permission Request */}
        {!hasPermissions && (
          <Card variant="outlined" style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <Camera size={24} color="#ff9d00" />
              <View style={styles.permissionHeaderText}>
                <Text style={styles.permissionTitle}>Camera & Microphone Access</Text>
                <Text style={styles.permissionSubtitle}>Required for live coaching sessions</Text>
              </View>
            </View>
            
            <Text style={styles.permissionDescription}>
              To provide the best coaching experience, Luna needs access to your camera and microphone. 
              This allows for real-time interaction and personalized guidance.
            </Text>

            <View style={styles.permissionFeatures}>
              <View style={styles.permissionFeature}>
                <Camera size={16} color="#4CAF50" />
                <Text style={styles.permissionFeatureText}>See you and your pet</Text>
              </View>
              <View style={styles.permissionFeature}>
                <Mic size={16} color="#4CAF50" />
                <Text style={styles.permissionFeatureText}>Hear your questions</Text>
              </View>
            </View>

            <Button
              title={isCheckingPermissions ? "Requesting..." : "Allow Camera & Microphone"}
              onPress={requestPermissions}
              disabled={isCheckingPermissions}
              loading={isCheckingPermissions}
              style={styles.permissionButton}
            />
          </Card>
        )}

        {/* Start Session Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Start Live Session with Luna"
            onPress={handleStartSession}
            style={styles.startButton}
            disabled={isLoading || !hasPermissions}
            loading={isLoading}
          />
          
          <Text style={styles.disclaimerText}>
            {hasPermissions 
              ? `💡 Ready to start! Luna will provide real-time guidance for ${selectedPet.name}.`
              : '🔒 Please allow camera or microphone access to start your session.'
            }
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
  },
  jamesCard: {
    marginBottom: 16,
  },
  jamesHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  jamesAvatar: {
    position: 'relative',
    marginRight: 16,
  },
  jamesImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: '#ffffff',
  },
  jamesInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  jamesName: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 4,
  },
  jamesTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#7a6f5d',
    marginBottom: 8,
  },
  jamesRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#7a6f5d',
    marginLeft: 8,
  },
  jamesDescription: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 20,
    marginBottom: 16,
  },
  jamesFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginLeft: 6,
  },
  petCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 16,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  petAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f5f5f5',
  },
  petAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petAvatarEmoji: {
    fontSize: 30,
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#7a6f5d',
    marginBottom: 2,
  },
  petWeight: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#7a6f5d',
    marginBottom: 4,
  },
  petMood: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#ff9d00',
  },
  sessionCard: {
    marginBottom: 16,
  },
  sessionDetails: {
    marginBottom: 16,
  },
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDetailText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginLeft: 12,
    flex: 1,
  },
  permissionCard: {
    marginBottom: 16,
    borderColor: '#ff9d00',
    backgroundColor: '#FFF8E1',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 2,
  },
  permissionSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#7a6f5d',
  },
  permissionDescription: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 20,
    marginBottom: 16,
  },
  permissionFeatures: {
    marginBottom: 20,
  },
  permissionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionFeatureText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginLeft: 8,
  },
  permissionButton: {
    backgroundColor: '#ff9d00',
  },
  buttonContainer: {
    marginTop: 8,
  },
  startButton: {
    marginBottom: 16,
    backgroundColor: '#ff9d00',
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#7a6f5d',
    textAlign: 'center',
    lineHeight: 16,
  },
});

