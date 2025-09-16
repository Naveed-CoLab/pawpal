import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { ChevronRight, Video, Bell, Sparkles, RefreshCw } from 'lucide-react-native';
import { OnboardingAvatar } from '@/components/ui/OnboardingAvatar';
import { MoodGauge } from '@/components/ui/MoodGauge';

const { width, height } = Dimensions.get('window');

// Milestone type definition
interface Milestone {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  type: 'achievement' | 'subscription' | 'badge' | 'welcome';
}

// Responsive sizing helpers
const responsiveWidth = (percentage: number) => (width * percentage) / 100;
const responsiveHeight = (percentage: number) => (height * percentage) / 100;
const responsiveFontSize = (size: number) => {
  const scale = width / 375; // Base on iPhone X width
  const newSize = size * scale;
  return Math.max(10, Math.min(newSize, size * 1.2)); // Min 10, max 120% of original
};

// Static images for tips (we'll cycle through these)
const tipImages = [
  require('@/assets/images/Image (13).png'),
  require('@/assets/images/Image (16).png'),
  require('@/assets/images/Image (17).png'),
];

// Helper function to get mood emoji and color
const getMoodDisplay = (mood: string) => {
  const moodMap: { [key: string]: { emoji: string; color: string; label: string } } = {
    happy: { emoji: '😊', color: '#ff9d00', label: 'Happy' },
    excited: { emoji: '🤩', color: '#ff9d00', label: 'Excited' },
    relaxed: { emoji: '😌', color: '#FFB300', label: 'Relaxed' },
    curious: { emoji: '🤔', color: '#9C27B0', label: 'Curious' },
    anxious: { emoji: '😰', color: '#FF5722', label: 'Anxious' },
    fearful: { emoji: '😨', color: '#F44336', label: 'Fearful' },
    bored: { emoji: '😑', color: '#607D8B', label: 'Bored' },
    'in pain': { emoji: '😣', color: '#E91E63', label: 'In Pain' },
    uncertain: { emoji: '😕', color: '#795548', label: 'Uncertain' },
  };
  
  return moodMap[mood] || { emoji: '🐕', color: '#ff9d00', label: 'Unknown' };
};

// Convert mood + confidence (0-1) into a 0-100 score for the gauge
const getMoodScore = (mood: string, confidence?: number) => {
  const base = (
    mood === 'excited' ? 92 :
    mood === 'happy' ? 85 :
    mood === 'relaxed' ? 78 :
    mood === 'curious' ? 68 :
    mood === 'bored' ? 48 :
    mood === 'anxious' ? 32 :
    mood === 'fearful' ? 22 :
    mood === 'in pain' ? 12 :
    60
  );
  const conf = typeof confidence === 'number' ? Math.max(0, Math.min(1, confidence)) : 0.6;
  const score = base * (0.6 + 0.4 * conf); // weight confidence modestly
  return Math.max(0, Math.min(100, Math.round(score)));
};

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const { pets, loading: petsLoading, refetch: refetchPets } = usePets();
  const { isSubscribed } = useSubscriptionStatus();
  const { currentScreen, updateCurrentScreen, navigateToRoute } = useOnboarding();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Get primary pet info for personalized tips (memoized to prevent re-renders)
  const primaryPet = useMemo(() => pets.length > 0 ? pets[0] : null, [pets]);
  
  // Get mood logs for the primary pet
  const { moodLogs, getMoodStats } = useMoodLogs();
  
  // Get latest mood for the primary pet (memoized to prevent re-renders)
  const petMoodLogs = useMemo(() => {
    if (!primaryPet) return [] as typeof moodLogs;
    const logsForPet = moodLogs.filter(log => log.pet_id === primaryPet.id);
    // Ensure stable latest selection regardless of upstream ordering
    return logsForPet.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [primaryPet, moodLogs]);
  const latestMood = petMoodLogs.length > 0 ? petMoodLogs[0] : null;
  const moodDisplay = useMemo(() => (latestMood ? getMoodDisplay(latestMood.mood) : null), [latestMood]);
  
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

  // Get real user milestones based on actual activity (calculated directly with useMemo)
  const milestones = useMemo((): Milestone[] => {
    const milestonesArray: Milestone[] = [];
    
    // Check if user added their first pet
    if (pets.length > 0) {
      milestonesArray.push({
        id: 'first-pet',
        title: 'First Pet Added! 🐕',
        message: `You added ${pets[0].name} to your PawPal family!`,
        time: 'Recently',
        icon: '🐕',
        type: 'achievement'
      });
    }
    
    // Check if user is subscribed
    if (isSubscribed) {
      milestonesArray.push({
        id: 'premium-subscription',
        title: 'Premium Unlocked! 👑',
        message: 'You now have access to all premium features including Luna coaching!',
        time: 'Recently', 
        icon: '👑',
        type: 'subscription'
      });
    }
    
    // Check if user has mood logs (engagement badge)
    if (petMoodLogs.length > 0) {
      milestonesArray.push({
        id: 'mood-tracker',
        title: 'Mood Tracker Badge! 📸',
        message: `You've been tracking ${primaryPet?.name || 'your pet'}'s mood regularly!`,
        time: 'Recently',
        icon: '🏆',
        type: 'badge'
      });
    }
    
    // Welcome message for new users
    if (milestonesArray.length === 0) {
      milestonesArray.push({
        id: 'welcome',
        title: 'Welcome to PawPal! 🎉',
        message: 'Start by adding your first pet to unlock achievements and features!',
        time: 'Now',
        icon: '👋',
        type: 'welcome'
      });
    }
    
    return milestonesArray;
  }, [pets, isSubscribed, petMoodLogs, primaryPet]);

  // Refresh pets data when screen is focused (no longer includes milestone calculation)
  useFocusEffect(
    useCallback(() => {
      // Add conditional check to ensure refetchPets is a function before calling it
      if (refetchPets && typeof refetchPets === 'function') {
        refetchPets();
      }
      
      // Update current screen for onboarding
      updateCurrentScreen('home');
      
      // Check if this might be a new user and trigger onboarding check
      if (user?.id) {
        // Add a small delay to ensure components are mounted
        setTimeout(() => {
          console.log('🏠 Homepage: User detected, checking onboarding status');
          // The OnboardingAvatar component will handle the actual check
        }, 500);
      }
    }, [refetchPets, updateCurrentScreen, user?.id])
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
        // Open the notification modal
        setShowNotificationModal(true);
        break;
      case 'snap-mood':
        router.push('/(tabs)/mood');
        break;
      case 'add-pet':
        router.push('/pets/add');
        break;
      case 'behavior-coach':
      case 'behavior-trends':
      case 'trends':
        router.push('/(tabs)/trends');
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
              source={require('@/assets/images/PawPal Ai Logo.png')} 
              style={styles.appLogo} 
              resizeMode="contain"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setShowNotificationModal(true)}
          >
            <Bell size={24} color="#47463e" />
            {/* Show milestone count */}
            {milestones.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{milestones.length > 99 ? '99+' : String(milestones.length)}</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Feedback Icon */}
          <TouchableOpacity 
            style={styles.feedbackButton}
            onPress={() => router.push('/feedback')}
          >
            <Text style={styles.feedbackIcon}>💬</Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back, {(userName || 'Pet Parent').split(' ')[0]}!</Text>
            {primaryPet && (
              <Text style={styles.welcomeSubtext}>How's {primaryPet.name} today? 🐕</Text>
            )}
          </View>

        </View>

        {/* Enhanced Dog Profile Widget */}
        <View style={styles.dogProfileWidget}>
          {/* Row 1: Avatar left, name/breed right */}
          <View style={styles.dogHeaderRow}>
            <View style={styles.dogAvatarContainer}>
              {/* Progress Ring around Avatar - shows weekly activity */}
              <View style={styles.progressRing} />
              <Image 
                source={
                  primaryPet?.avatar_url 
                    ? { uri: primaryPet.avatar_url }
                    : require('@/assets/images/login page icon.png')
                } 
                style={styles.dogAvatar} 
                resizeMode="cover"
              />
              {latestMood && moodDisplay && (
                <View style={[styles.moodIndicator, { backgroundColor: moodDisplay.color }]}>
                  <Text style={styles.moodEmoji}>{moodDisplay.emoji}</Text>
                </View>
              )}
            </View>

            <View style={styles.dogInfoSection}>
              <Text style={styles.dogName}>{dogName}</Text>
              <Text style={styles.dogBreed}>{dogBreed}</Text>
            </View>
          </View>

          {/* Row 2: Age & Gender */}
          {primaryPet ? (
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Age</Text>
                <Text style={styles.statValue}>{primaryPet.age || '?'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Gender</Text>
                <Text style={styles.statValue}>{primaryPet.gender || '?'}</Text>
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

          {/* Row 3: Mood Gauge full width */}
          {latestMood && moodDisplay && (
            <View style={styles.moodRow}>
              <View style={styles.moodGaugeWrap}>
                <MoodGauge
                  score={getMoodScore(latestMood?.mood || 'happy', latestMood?.confidence)}
                />
              </View>
              <View style={styles.moodInfo}>
                <Text style={styles.moodTitle}>Latest Mood</Text>
                <Text style={styles.moodHeadline}>{moodDisplay.emoji} {moodDisplay.label}</Text>
                {!!(latestMood as any)?.advice && (
                  <Text style={styles.moodSnippet} numberOfLines={2}>
                    {(latestMood as any).advice}
                  </Text>
                )}
                {!((latestMood as any)?.advice) && (latestMood as any)?.context && (
                  <Text style={styles.moodSnippet} numberOfLines={2}>
                    {(latestMood as any).context}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          {/* Row 1 - Live Coaching (Full Width) */}
          <View style={styles.featuresRow}>
            <TouchableOpacity 
              style={[styles.featureCard, styles.heroCard]}
              onPress={() => handleFeaturePress('live-coaching')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Live Mentor: Talk to Luna, expert dog mentor"
              accessibilityRole="button"
            >
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <View style={styles.heroIconContainer}>
                    <Video size={32} color={Colors.white} />
                  </View>
                  <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>Live Mentor</Text>
                    <Text style={styles.heroSubtext} numberOfLines={1}>
                      Real-time guidance (4–5 min)
                    </Text>
                    <View style={styles.heroMetaRow}>
                      <View style={[styles.metaPill, styles.metaPillPrimary]}>
                        <Text style={styles.metaPillText}>AI Mentor</Text>
                      </View>
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>4–5 min</Text>
                      </View>
                    </View>
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
              accessibilityLabel="SymptoGuide: Check your dog's health symptoms"
              accessibilityRole="button"
            >
              <View style={styles.featureContent}>
                <Image
                  source={require('@/assets/images/symptom checker.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText}>Sympto{'\n'}Guide</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => handleFeaturePress('ai-chat')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Chat with Lumi: AI Dog Health Care Specialist "
              accessibilityRole="button"
            >
              <View style={styles.featureContent}>
                <Image
                  source={require('@/assets/images/lumi.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText}>Chat With {'\n'}Lumi</Text>
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
              <Image
                  source={require('@/assets/images/snap my mood.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
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
                  source={require('@/assets/images/behavior trend.png')}
                  style={styles.featureIcon}
                  resizeMode="contain"
                />
                <Text style={styles.featureText}>Behavior{'\n'}Trend</Text>
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
            
      {/* Simple Milestones Modal */}
      {showNotificationModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your PawPal Journey 🎉</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowNotificationModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.milestonesList}>
              {milestones.map((milestone) => (
                <View key={milestone.id} style={styles.milestoneItem}>
                  <View style={styles.milestoneIcon}>
                    <Text style={styles.milestoneEmoji}>{milestone.icon}</Text>
                  </View>
                  <View style={styles.milestoneContent}>
                    <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                    <Text style={styles.milestoneMessage}>{milestone.message}</Text>
                    <Text style={styles.milestoneTime}>{milestone.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowNotificationModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Onboarding Avatar for First-Time Users */}
      <OnboardingAvatar 
        currentScreen="home"
      />
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
    top: 4,
    right: 4,
    backgroundColor: '#ff9d00', // VetPaw peachy orange
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF8E1',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontFamily: Fonts.body.bold,
    textAlign: 'center',
    lineHeight: 10,
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
    color: Colors.text,
    marginBottom: 2,
  },
  welcomeSubtext: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.8,
  },
  pawIcon: {
    width: 28,
    height: 28,
  },
  // Enhanced Dog Profile Widget
  dogProfileWidget: {
    backgroundColor: Colors.white,
    marginHorizontal: responsiveWidth(5),
    marginBottom: responsiveHeight(3),
    borderRadius: responsiveWidth(6),
    padding: responsiveWidth(5),
    flexDirection: 'column',
    alignItems: 'stretch',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    minHeight: responsiveHeight(12),
  },
  dogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  dogAvatarContainer: {
    position: 'relative',
    marginRight: responsiveWidth(4),
  },
  progressRing: {
    position: 'absolute',
    top: -responsiveWidth(1.2),
    left: -responsiveWidth(1.2),
    width: responsiveWidth(23),
    height: responsiveWidth(23),
    borderRadius: responsiveWidth(11.5),
    borderWidth: 3,
    borderColor: Colors.primary + '33',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '0%',
    height: '100%',
    backgroundColor: Colors.primary,
    transformOrigin: 'right center',
  },
  dogAvatar: {
    width: responsiveWidth(20),
    height: responsiveWidth(20),
    borderRadius: responsiveWidth(10),
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  moodIndicator: {
    position: 'absolute',
    bottom: -responsiveWidth(0.5),
    right: -responsiveWidth(0.5),
    backgroundColor: '#FFB300',
    borderRadius: responsiveWidth(3),
    width: responsiveWidth(6),
    height: responsiveWidth(6),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  moodEmoji: {
    fontSize: responsiveFontSize(12),
  },
  dogInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: responsiveHeight(1.6),
    backgroundColor: '#fff4bb',
    borderRadius: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(1.2),
    minHeight: responsiveHeight(5),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: responsiveHeight(0.5),
  },
  statLabel: {
    fontSize: responsiveFontSize(10),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.7,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: responsiveFontSize(12),
  },
  statValue: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginTop: responsiveHeight(0.3),
    textAlign: 'center',
    lineHeight: responsiveFontSize(16),
    flexWrap: 'wrap',
    maxWidth: responsiveWidth(20),
  },
  statDivider: {
    width: 1,
    height: responsiveHeight(2.5),
    backgroundColor: Colors.border,
    marginHorizontal: responsiveWidth(2),
  },
  dogName: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: responsiveHeight(0.3),
    lineHeight: responsiveFontSize(24),
  },
  dogBreed: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: responsiveHeight(0.8),
    lineHeight: responsiveFontSize(16),
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(3),
    marginTop: responsiveHeight(1.2),
    width: '100%',
  },
  moodGaugeWrap: {
    flexBasis: responsiveWidth(48),
  },
  moodInfo: {
    flex: 1,
  },
  moodTitle: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    opacity: 0.7,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  moodHeadline: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  moodSnippet: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.8,
  },
  ownerName: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
  },
  addPetButton: {
    marginTop: responsiveHeight(0.8),
    paddingVertical: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(4),
    backgroundColor: Colors.primary,
    borderRadius: responsiveWidth(3),
    alignSelf: 'flex-start',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addPetText: {
    fontSize: responsiveFontSize(12),
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
    borderColor: 'transparent',
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: Colors.text,
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
    color: Colors.text,
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
    color: Colors.text,
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
    color: Colors.text,
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: '#D7B899',
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1.5,
    borderColor: '#D7B899',
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
    color: Colors.text,
    textTransform: 'uppercase',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: 15,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 6,
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  tipSubtext: {
    fontSize: 10,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
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
    borderWidth: 2,
    borderColor: '#D7B899',
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 8, // Space from button
    maxWidth: width - 220, // keep text within card so it doesn't overlap CTA
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaPill: {
    backgroundColor: '#FFE7B3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1C97A',
  },
  metaPillPrimary: {
    backgroundColor: '#ff9d00',
    borderColor: '#ff9d00',
  },
  metaPillText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
  },
  heroTrustRow: {
    marginTop: 6,
  },
  heroTrustText: {
    fontSize: 10,
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    opacity: 0.7,
  },
  heroTitle: {
    fontSize: responsiveFontSize(16), // Slightly smaller for better fit
    fontFamily: Fonts.heading.bold,
    color: Colors.text, // VetPaw brown for consistency
    marginBottom: responsiveHeight(0.3),
    flexWrap: 'wrap',
  },
  heroSubtext: {
    fontSize: responsiveFontSize(11), // Adjusted for mobile
    fontFamily: Fonts.body.medium,
    color: Colors.text, // VetPaw brown for consistency
    opacity: 0.8,
    marginBottom: responsiveHeight(0.2),
    flexWrap: 'wrap',
    lineHeight: responsiveFontSize(14),
    maxWidth: width * 0.52,
  },
  heroDescription: {
    fontSize: responsiveFontSize(9), // Smaller for mobile screens
    fontFamily: Fonts.body.regular,
    color: Colors.text, // VetPaw brown for consistency
    opacity: 0.7,
    flexWrap: 'wrap',
    lineHeight: responsiveFontSize(12),
    maxWidth: width * 0.56,
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  heroButtonText: {
    fontSize: responsiveFontSize(13), // Slightly larger for CTA
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tipsBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff8e1',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e6d69a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: Fonts.body.bold,
  },
  milestonesList: {
    maxHeight: height * 0.4,
  },
  milestoneItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  milestoneIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff8e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  milestoneEmoji: {
    fontSize: 24,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  milestoneMessage: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  milestoneTime: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: '#666',
  },
  modalCloseButton: {
    backgroundColor: '#ff9d00',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
  },
  debugButton: {
    position: 'relative',
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6d69a',
  },
  feedbackButton: {
    position: 'relative',
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6d69a',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  feedbackIcon: {
    fontSize: 20,
  },
}); 