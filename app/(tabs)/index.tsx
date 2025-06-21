import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { usePets } from '@/hooks/useDatabase';
import { useDailyTips } from '@/hooks/useDailyTips';
import { useMoodLogs } from '@/hooks/useMoodLogs';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ChevronRight, Video, Bell, Sparkles } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Static images for tips (we'll cycle through these)
const tipImages = [
  require('@/assets/images/Image (13).png'),
  require('@/assets/images/Image (16).png'),
  require('@/assets/images/Image (17).png'),
];

// Helper function to get mood emoji and color
const getMoodDisplay = (mood: string) => {
  const moodMap: { [key: string]: { emoji: string; color: string; label: string } } = {
    happy: { emoji: '😊', color: '#4CAF50', label: 'Happy' },
    excited: { emoji: '🤩', color: '#ff9d00', label: 'Excited' },
    relaxed: { emoji: '😌', color: '#2196F3', label: 'Relaxed' },
    curious: { emoji: '🤔', color: '#9C27B0', label: 'Curious' },
    anxious: { emoji: '😰', color: '#FF5722', label: 'Anxious' },
    fearful: { emoji: '😨', color: '#F44336', label: 'Fearful' },
    bored: { emoji: '😑', color: '#607D8B', label: 'Bored' },
    'in pain': { emoji: '😣', color: '#E91E63', label: 'In Pain' },
    uncertain: { emoji: '😕', color: '#795548', label: 'Uncertain' },
  };
  
  return moodMap[mood] || { emoji: '🐕', color: '#4CAF50', label: 'Unknown' };
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { pets, loading: petsLoading, refetch: refetchPets } = usePets();
  
  // Get primary pet info for personalized tips
  const primaryPet = pets.length > 0 ? pets[0] : null;
  
  // Get mood logs for the primary pet
  const { moodLogs, getMoodStats } = useMoodLogs();
  
  // Get latest mood for the primary pet
  const petMoodLogs = primaryPet ? moodLogs.filter(log => log.pet_id === primaryPet.id) : [];
  const latestMood = petMoodLogs.length > 0 ? petMoodLogs[0] : null;
  const moodDisplay = latestMood ? getMoodDisplay(latestMood.mood) : getMoodDisplay('happy');
  
  // Use AI-powered daily tips
  const { 
    tips: aiTips, 
    loading: tipsLoading, 
    error: tipsError, 
    refreshTips 
  } = useDailyTips(
    primaryPet?.name,
    primaryPet?.breed,
    primaryPet?.age
  );
  
  // Get user name from auth user data
  const userName = user?.name || user?.full_name || 'Pet Parent';

  // Refresh pets data when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Add conditional check to ensure refetchPets is a function before calling it
      if (refetchPets && typeof refetchPets === 'function') {
        refetchPets();
      }
    }, [refetchPets])
  );
  
  // Get pet display info
  const dogName = primaryPet?.name || 'Your Pet';
  const dogBreed = primaryPet?.breed || 'Furry Friend';
  const dogAge = primaryPet?.age ? `${primaryPet.age} years` : '';

  const handleFeaturePress = (feature: string) => {
    switch (feature) {
      case 'live-coaching':
        router.push('/(tabs)/coach');
        break;
      case 'ai-chat':
        router.push('/(tabs)/chat');
        break;
      case 'health-checker':
        router.push('/(tabs)/health');
        break;
      case 'notifications':
        // Navigate to notifications screen or show notifications modal
        console.log('Opening notifications...');
        break;
      case 'snap-mood':
        router.push('/(tabs)/mood');
        break;
      case 'add-pet':
        router.push('/pets/add');
        break;
      default:
        // For now, navigate to a 404 page - you can replace these later
        router.push('/+not-found');
        break;
    }
  };

  const renderDailyTip = ({ item, index }: { item: any; index: number }) => {
    // Cycle through images for each tip
    const tipImage = tipImages[index % tipImages.length];
    
    return (
      <View style={styles.tipSlideItem}>
        <View style={styles.tipContent}>
          <View style={styles.tipTextSection}>
            <View style={styles.tipHeader}>
              <Sparkles size={16} color="#47463e" />
              <Text style={styles.tipCategory}>{item.category || 'health'}</Text>
            </View>
            <Text style={styles.tipText}>{item.text}</Text>
            <Text style={styles.tipSubtext}>AI-powered tip</Text>
          </View>
          <View style={styles.tipImageContainer}>
            <Image source={tipImage} style={styles.tipImage} resizeMode="contain" />
            <Image source={require('@/assets/images/Image (18).png')} style={styles.tipSecondImage} resizeMode="contain" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header with Logo and Notifications */}
        <View style={styles.topHeader}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/VetPaw Ai Logo.png')} 
              style={styles.appLogo} 
              resizeMode="contain"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => handleFeaturePress('notifications')}
          >
                          <Bell size={24} color="#47463e" />
            {/* Notification badge - show when there are unread notifications */}
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Enhanced Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back, {userName.split(' ')[0]}!</Text>
            {primaryPet && (
              <Text style={styles.welcomeSubtext}>How's {primaryPet.name} today? 🐕</Text>
            )}
          </View>

        </View>

        {/* Enhanced Dog Profile Widget */}
        <View style={styles.dogProfileWidget}>
          <View style={styles.dogAvatarContainer}>
            {/* Progress Ring around Avatar - shows weekly activity */}
            <View style={styles.progressRing}>
              <View style={[styles.progressFill, { 
                transform: [{ rotate: `${(petMoodLogs.length * 51.4)}deg` }] // 360/7 = 51.4deg per day
              }]} />
            </View>
            <Image 
              source={
                primaryPet?.avatar_url 
                  ? { uri: primaryPet.avatar_url }
                  : require('@/assets/images/login page icon.png')
              } 
              style={styles.dogAvatar} 
              resizeMode="cover"
            />
            <View style={[styles.moodIndicator, { backgroundColor: moodDisplay.color }]}>
              <Text style={styles.moodEmoji}>{moodDisplay.emoji}</Text>
            </View>
          </View>
          
          <View style={styles.dogInfoSection}>
            <Text style={styles.dogName}>{dogName}</Text>
            <Text style={styles.dogBreed}>{dogBreed}</Text>
            
            {primaryPet ? (
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Age</Text>
                  <Text style={styles.statValue}>{primaryPet.age || '?'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Weight</Text>
                  <Text style={styles.statValue}>{primaryPet.weight || '?'} kg</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Mood</Text>
                  <Text style={styles.statValue}>{moodDisplay.label}</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addPetButton}
                onPress={() => handleFeaturePress('add-pet')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.addPetText}>+ Add Your Pet</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {/* Row 1 - Live Coaching (Full Width) */}
          <View style={styles.featuresRow}>
            <TouchableOpacity 
              style={[styles.featureCard, styles.heroCard]}
              onPress={() => handleFeaturePress('live-coaching')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Live Coaching: Talk to James, expert dog coach"
              accessibilityRole="button"
            >
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <View style={styles.heroIconContainer}>
                    <Video size={32} color={Colors.white} />
                  </View>
                  <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>Live Coaching</Text>
                    <Text style={styles.heroSubtext}>Get real-time dog coaching (4-5 min)</Text>
                    <Text style={styles.heroDescription}>Talk to James, our expert vet coach!</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.heroButton} 
                  onPress={() => handleFeaturePress('live-coaching')}
                  accessibilityLabel="Start Live Coaching Session"
                >
                  <Text style={styles.heroButtonText}>Start Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.featuresRow}>
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('health-checker')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Symptom Checker: Check your dog's health symptoms"
              accessibilityRole="button"
            >
              <View style={styles.featureContent}>
                <Image
                  source={require('@/assets/images/symptoms.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText}>Symptom{'\n'}Checker</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('feeding-guide')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Feeding Guide: Get nutrition advice for your dog"
              accessibilityRole="button"
            >
              <View style={styles.featureContent}>
                <Image
                  source={require('@/assets/images/Feedign Guide.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText}>Feeding{'\n'}Guide</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={styles.featuresRow}>
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('snap-mood')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Snap My Mood: Analyze your dog's mood from photos"
              accessibilityRole="button"
            >
              <View style={styles.featureContent}>
                <View style={styles.snapMoodIcon}>
                  <Text style={styles.snapMoodEmoji}>📸</Text>
                </View>
                <Text style={styles.featureText}>Snap{'\n'}My Mood</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('behavior-coach')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Behavior Coach: Get expert training tips for your dog"
              accessibilityRole="button"
            >
              <View style={styles.featureContent}>
                <Image
                  source={require('@/assets/images/behaviour coach.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText}>Behavior{'\n'}Coach</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Tips */}
        <View style={styles.dailyTipsSection}>
          <View style={styles.dailyTipsHeader}>
            <View style={styles.tipsHeaderLeft}>
              <Text style={styles.dailyTipsTitle}>Daily Tips</Text>
              {primaryPet ? (
                <Text style={styles.tipsSubtitle}>for {primaryPet.name}</Text>
              ) : (
                <Text style={styles.tipsSubtitle}>personalized for you</Text>
              )}
            </View>
            <View style={styles.tipsBadge}>
              <Text style={styles.tipsBadgeText}>AI-POWERED</Text>
            </View>
          </View>
          
          <View style={styles.tipSliderContainer}>
            {tipsLoading && aiTips.length === 0 ? (
              <View style={styles.tipsLoadingContainer}>
                                  <ActivityIndicator size="large" color="#47463e" />
                <Text style={styles.loadingText}>Generating personalized tips...</Text>
              </View>
            ) : tipsError ? (
              <View style={styles.tipsErrorContainer}>
                <Text style={styles.errorText}>Using cached tips</Text>
                <Text style={styles.errorSubtext}>New tips will generate automatically</Text>
              </View>
            ) : (
              <FlatList
                data={aiTips}
                renderItem={renderDailyTip}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width - 48}
                decelerationRate="fast"
              />
            )}
          </View>
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
  scrollContent: {
    paddingBottom: 80,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  logoContainer: {
    flex: 1,
  },
  appLogo: {
    width: 150,
    height: 60,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff9d00', // VetPaw peachy orange
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF8E1',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    textAlign: 'center',
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 2,
  },
  welcomeSubtext: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    opacity: 0.8,
  },
  pawIcon: {
    width: 28,
    height: 28,
  },
  // Enhanced Dog Profile Widget
  dogProfileWidget: {
    backgroundColor: '#fff4bb',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffe4cc',
  },
  dogAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  progressRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#ffe8d6',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#4CAF50',
    transformOrigin: 'right center',
  },
  dogAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#ffb366',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  moodIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff2e6',
  },
  moodEmoji: {
    fontSize: 12,
  },
  dogInfoSection: {
    flex: 1,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#ffe98a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#ffe8d6',
    marginHorizontal: 8,
  },
  dogInfoText: {
    flex: 1,
  },
  dogName: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 2,
  },
  dogBreed: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginBottom: 6,
  },
  ownerName: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },
  addPetButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff9d00',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  addPetText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  featuresGrid: {
    marginBottom: 24,
  },
  featuredCard: {
    backgroundColor: '#ff9d00',
    marginBottom: 14,
    height: 90,
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#9d6a47',
    padding: 20,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  featuredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featuredTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  featuredTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  featuredSubtext: {
    fontSize: 11,
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.9,
  },
  startButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  startButtonText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 20, // Add padding to feature rows only
  },
  featureCard: {
    backgroundColor: '#fff8f0',
    width: (width - 54) / 2,
    height: 110,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#ffe8d6',
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    flex: 1,
    lineHeight: 16,
  },
  featuredText: {
    color: Colors.white,
    fontSize: 15,
  },
  featureSubtext: {
    fontSize: 11,
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 3,
  },
  dailyTipsSection: {
    marginBottom: 24,
  },
  dailyTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dailyTipsTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
  },
  tipSliderContainer: {
    paddingLeft: 20,
  },
  // New styles for AI-powered tips
  tipsHeaderLeft: {
    flex: 1,
  },
  tipsSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    opacity: 0.7,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFDC8E',
  },
  tipsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 40,
    height: 130, // Same fixed height as tip cards
    marginRight: 14,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginTop: 10,
  },
  tipsErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width - 40,
    height: 130, // Same fixed height as tip cards
    marginRight: 14,
    backgroundColor: '#fff4bb',
    borderRadius: 16,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f5d982',
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    opacity: 0.7,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#8B4513',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontFamily: Fonts.body.bold,
    color: 'white',
  },
  tipSlideItem: {
    backgroundColor: '#fff4bb',
    width: width - 40,
    height: 160, // Fixed height for consistent size
    borderRadius: 16,
    padding: 18,
    marginRight: 14,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f5d982',
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  tipTextSection: {
    flex: 1,
    marginRight: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#ffed8d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tipCategory: {
    fontSize: 9,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    textTransform: 'uppercase',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 15,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    lineHeight: 22,
    marginBottom: 6,
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  tipSubtext: {
    fontSize: 10,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  tipImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 4,
  },
  tipSecondImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  snapMoodIcon: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffeaa7',
    borderRadius: 21,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fdcb6e',
    shadowColor: '#ff9d00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  snapMoodEmoji: {
    fontSize: 22,
  },
  // Enhanced Hero Card (Live Coaching) - Warm VetPaw Theme
  heroCard: {
    backgroundColor: '#fff4bb', // Warm peachy background from VetPaw palette
    width: '100%', // Take full width of the row container
    minHeight: 140, // Increased for better text space
    borderRadius: 20, // Match other feature cards

    borderWidth: 2.5, // Slightly thicker border for emphasis
    borderColor: '#f5d982', // Primary color border for CTA emphasis
    padding: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minHeight: 100, // Ensure adequate vertical space
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12, // Space between text and button
  },
  heroIconContainer: {
    backgroundColor: '#ff9d00', // Primary background for icon
    borderRadius: 16,
    padding: 8,
    marginRight: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 8, // Space from button
  },
  heroTitle: {
    fontSize: 16, // Slightly smaller for better fit
    fontFamily: Fonts.heading.bold,
    color: '#544c3a', // VetPaw brown for consistency
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  heroSubtext: {
    fontSize: 11, // Adjusted for mobile
    fontFamily: Fonts.body.medium,
    color: '#544c3a', // VetPaw brown for consistency
    opacity: 0.8,
    marginBottom: 2,
    flexWrap: 'wrap',
    lineHeight: 14,
  },
  heroDescription: {
    fontSize: 9, // Smaller for mobile screens
    fontFamily: Fonts.body.regular,
    color: '#544c3a', // VetPaw brown for consistency
    opacity: 0.7,
    flexWrap: 'wrap',
    lineHeight: 12,
  },
  heroButton: {
    backgroundColor: '#ff9d00', // Primary CTA color
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 0, // No border for cleaner CTA look
    minWidth: 80,
    maxWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  heroButtonText: {
    fontSize: 13, // Slightly larger for CTA
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  tipsBadge: {
    backgroundColor: '#ff9800', // Warm orange for AI badge
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#ff9d00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },

});