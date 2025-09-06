import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CameraView } from '@/components/ui/CameraView';
import { PaywallButton } from '@/components/ui/PaywallButton';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/hooks/useAuth';
import { useCoaching } from '@/hooks/useCoaching';
import { useMediaAccess } from '@/hooks/useMediaAccess';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { usePets } from '@/hooks/useDatabase';
import { databaseService } from '@/lib/database';
import RevenueCatPaywall from '@/components/ui/RevenueCatPaywall';
import Purchases from 'react-native-purchases';
import { fixSubscriptionStatus } from '@/lib/fixSubscription';
import { Video, Mic, MicOff, Phone, PhoneOff, Star, Clock, CircleCheck as CheckCircle, ArrowLeft, Target, User, Play, Camera, CameraOff, Crown, Send, MessageCircle, Heart, Brain, Utensils, ChevronRight, History } from 'lucide-react-native';
import { ApiConfig } from '@/constants/apiConfig';

const { width, height } = Dimensions.get('window');

// Responsive sizing helpers
const responsiveWidth = (percentage: number) => (width * percentage) / 100;
const responsiveHeight = (percentage: number) => (height * percentage) / 100;
const responsiveFontSize = (size: number) => {
  const scale = width / 375; // Base on iPhone X width
  const newSize = size * scale;
  return Math.max(10, Math.min(newSize, size * 1.1)); // Reduced max scale and min size
};

interface CoachingState {
  status: 'setup' | 'connecting' | 'live' | 'completed';
  duration: number;
  isListening: boolean;
  isSpeaking: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
}

export default function CoachScreen() {
  const { user, isLoading } = useAuth();
  const { pets } = usePets();
  const { 
    permissions, 
    isLoading: mediaLoading, 
    error: mediaError,
    startStream, 
    stopStream, 
    toggleVideo, 
    toggleAudio,
    hasCamera,
    hasMicrophone 
  } = useMediaAccess();
  
  const { isSubscribed, customerInfo, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const [showPaywall, setShowPaywall] = useState(false);
  
  const {
    currentSession,
    sessionMessages,
    createSession,
    sendMessage,
    endSession,
    generateSummary,
    isSessionActive
  } = useCoaching();
  
  const [coachingState, setCoachingState] = useState<CoachingState>({
    status: 'setup',
    duration: 0,
    isListening: false,
    isSpeaking: false,
    cameraEnabled: true,
    micEnabled: true,
  });
  
  const [sessionSetup, setSessionSetup] = useState({
    petName: '',
    petBreed: '',
    petParentName: '',
    userConcern: '',
    selectedTopic: '',
  });
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  
  const sessionTimer = useRef<number | null>(null);

  // Luna's 4 focused coaching topics with app-appropriate colors
  const coachingTopics = [
    { 
      id: 'behavior-coaching', 
      title: 'Behavior Fix', 
      icon: '🧠', 
      gradient: ['#fff4bb', '#f5e97d'], // Light yellow gradient
      description: 'Train your dog smarter',
      examples: ['Barking', 'Anxiety', 'Leash pulling'],
      systemContext: 'The user wants to discuss dog behavior and training issues. Focus on behavioral modification, positive reinforcement techniques, and understanding canine psychology.'
    },
    { 
      id: 'feeding-nutrition', 
      title: 'Feeding Guide', 
      icon: '🥩', 
      gradient: ['#fff4bb', '#f5e97d'], // Light yellow gradient
      description: 'Perfect nutrition plan',
      examples: ['Diet plan', 'Portion size', 'Supplements'],
      systemContext: 'The user wants nutrition and feeding guidance. Focus on diet recommendations, feeding schedules, portion control, and nutritional needs based on age, breed, and health status.'
    },
    { 
      id: 'health-symptoms', 
      title: 'Health Check', 
      icon: '❤️', 
      gradient: ['#fff4bb', '#f5e97d'], // Light yellow gradient
      description: 'Symptoms & solutions',
      examples: ['Skin issues', 'Limping', 'Eye problems'],
      systemContext: 'The user wants to discuss health symptoms or concerns. Focus on symptom assessment, when to see a vet, first aid, and preventive health care. Always emphasize professional veterinary care for serious issues.'
    },
    { 
      id: 'daily-routine', 
      title: 'Daily Routine', 
      icon: '⏰', 
      gradient: ['#fff4bb', '#f5e97d'], // Light yellow gradient
      description: 'Perfect daily schedule',
      examples: ['Exercise plan', 'Sleep schedule', 'Activities'],
      systemContext: 'The user wants help creating daily routines and schedules. Focus on exercise needs, mental stimulation, sleep patterns, and creating structured daily activities for optimal dog health and happiness.'
    },
  ];

  // Auto-populate pet and user info if available
  useEffect(() => {
    if (pets.length > 0 && user) {
      const primaryPet = pets[0];
      const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || '';
      
      console.log('🔄 AUTO-POPULATION DEBUG:');
      console.log('- user.full_name:', user?.full_name);
      console.log('- user.name:', user?.name);
      console.log('- user.email:', user?.email);
      console.log('- Extracted userName:', userName);
      console.log('- Current sessionSetup.petParentName BEFORE:', sessionSetup.petParentName);
      
      setSessionSetup(prev => {
        const newSetup = {
          ...prev,
          petName: prev.petName ? prev.petName : primaryPet.name,
          petBreed: prev.petBreed ? prev.petBreed : (primaryPet.breed || ''),
          petParentName: prev.petParentName ? prev.petParentName : userName,
        };
        console.log('- prev.petParentName value:', `"${prev.petParentName}"`);
        console.log('- prev.petParentName ? check:', prev.petParentName ? 'true' : 'false');
        console.log('- userName value:', `"${userName}"`);
        console.log('- Setting petParentName TO:', `"${newSetup.petParentName}"`);
        return newSetup;
      });
    }
  }, [pets, user]);

  // Debug: Track sessionSetup changes
  useEffect(() => {
    console.log('📝 SESSION SETUP CHANGED - petParentName:', sessionSetup.petParentName);
  }, [sessionSetup.petParentName]);

  // Start session timer
  useEffect(() => {
    if (coachingState.status === 'live') {
      sessionTimer.current = setInterval(() => {
        setCoachingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    } else {
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
        sessionTimer.current = null;
      }
    }

    return () => {
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
      }
    };
  }, [coachingState.status]);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkSessionLimits = async () => {
    if (!user || !isSubscribed) return;

    // Check if yearly subscription (unlimited)
    const isYearly = customerInfo?.activeSubscriptions?.some((productId: string) => 
      productId.includes('yearly') || productId.includes('annual')
    );
    
    if (isYearly) {
      return; // Unlimited sessions for yearly plan
    }

    // Monthly plan gets 4 sessions per month
    const monthlyLimit = 4;
    
    try {
      const { data: userSessions } = await databaseService.getCoachingSessions(user.id);
      
      if (userSessions) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyUsed = userSessions.filter(session => {
          const sessionDate = new Date(session.created_at);
          return sessionDate.getMonth() === currentMonth && 
                 sessionDate.getFullYear() === currentYear &&
                 session.status === 'completed';
        }).length;

        if (monthlyUsed >= monthlyLimit) {
          Alert.alert(
            'Monthly Limit Reached',
            `You've used all ${monthlyLimit} sessions this month. Sessions reset monthly, or upgrade to yearly for unlimited coaching!`,
            [
              { text: 'OK', style: 'cancel' },
              { 
                text: 'Upgrade to Yearly', 
                onPress: () => setShowPaywall(true)
              }
            ]
          );
          throw new Error('Session limit reached');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Session limit reached') {
        throw error;
      }
      console.warn('Could not check session limits:', error);
    }
  };

  const startCoachingSession = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to start a coaching session.');
      return;
    }

    // Check if user is subscribed
    if (!isSubscribed) {
      setShowPaywall(true);
      return;
    }

    // Check session limits for monthly subscribers
    await checkSessionLimits();

    // Validate setup
    if (!sessionSetup.selectedTopic) {
      Alert.alert('Setup Required', 'Please select what you\'d like to work on with Luna.');
      return;
    }

    if (!sessionSetup.petParentName?.trim()) {
      Alert.alert('Setup Required', 'Please enter your name so Luna can greet you personally.');
      return;
    }

    // Check permissions
    if (!hasCamera || !hasMicrophone) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone access are required for live coaching sessions with Luna. Please enable them and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setCoachingState(prev => ({ ...prev, status: 'connecting' }));
    
    try {
      console.log('🎬 Starting coaching session with Luna...');
      
      // Start media stream
      const streamStarted = await startStream({
        video: coachingState.cameraEnabled,
        audio: coachingState.micEnabled
      });

      if (!streamStarted) {
        throw new Error('Failed to start camera and microphone');
      }

      // Get selected topic data
      const selectedTopicData = coachingTopics.find(t => t.id === sessionSetup.selectedTopic);
      
      const sessionData = {
        pet_name: sessionSetup.petName,
        pet_breed: sessionSetup.petBreed,
        user_name: sessionSetup.petParentName,
        user_concern: sessionSetup.userConcern || selectedTopicData?.title,
        topic_context: selectedTopicData?.systemContext,
      };

      // Debug: Log user name data for troubleshooting
      console.log('🎭 COACH SESSION DEBUG:');
      console.log('- Input field petParentName:', sessionSetup.petParentName);
      console.log('- Final user_name for Luna:', sessionData.user_name);
      console.log('- Pet name for Luna:', sessionData.pet_name);
      
      if (!sessionData.user_name) {
        console.log('ℹ️ INFO: No user name provided - user should enter their name for personalized greeting!');
      } else {
        console.log('✅ SUCCESS: Luna will greet user as:', sessionData.user_name);
      }

      const { data: session, error } = await createSession(sessionData);
      
      if (error || !session) {
        throw new Error(error || 'Failed to create session');
      }

      // Simulate connection time
      setTimeout(() => {
        setCoachingState(prev => ({ 
          ...prev, 
          status: 'live',
          duration: 0 
        }));
      }, 2000);
      
      console.log('✅ Live coaching session with Luna started');
    } catch (error) {
      console.error('Failed to start session:', error);
      Alert.alert(
        'Session Start Failed',
        'Unable to start the coaching session with Luna. Please check your camera and microphone permissions.',
        [{ text: 'OK' }]
      );
      setCoachingState(prev => ({ ...prev, status: 'setup' }));
    }
  };

  const endCoachingSession = async () => {
    if (!currentSession) return;

    try {
      console.log('🏁 Ending coaching session with Luna...');
      
      stopStream();
      
      const { error } = await endSession(currentSession.session_id);
      
      if (error) {
        console.error('Error ending session:', error);
      }

      // Generate session summary
      const { data: summary } = await generateSummary(currentSession.session_id);
      setSessionSummary(summary);
      
      setCoachingState(prev => ({ 
        ...prev, 
        status: 'completed',
        isListening: false,
        isSpeaking: false 
      }));
      
      console.log('✅ Coaching session with Luna ended successfully');
    } catch (error) {
      console.error('Error ending session:', error);
      setCoachingState(prev => ({ ...prev, status: 'completed' }));
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !currentSession) return;

    const message = currentMessage.trim();
    setCurrentMessage('');
    
    try {
      setCoachingState(prev => ({ ...prev, isSpeaking: true }));
      
      const { error } = await sendMessage(currentSession.session_id, message);
      
      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Message Error', 'Failed to send message to Luna. Please try again.');
      }
    } catch (error) {
      console.error('Error in message handling:', error);
    } finally {
      setCoachingState(prev => ({ ...prev, isSpeaking: false }));
    }
  };

  const handleToggleMic = () => {
    const newMicState = !coachingState.micEnabled;
    
    if (coachingState.status === 'live') {
      toggleAudio(newMicState);
    }
    
    setCoachingState(prev => ({ 
      ...prev, 
      micEnabled: newMicState,
      isListening: newMicState ? prev.isListening : false
    }));
  };

  const handleToggleCamera = () => {
    const newCameraState = !coachingState.cameraEnabled;
    
    if (coachingState.status === 'live') {
      toggleVideo(newCameraState);
    }
    
    setCoachingState(prev => ({ 
      ...prev, 
      cameraEnabled: newCameraState 
    }));
  };

  const startNewSession = () => {
    console.log('🔄 START NEW SESSION called - this will reset all values!');
    stopStream();
    setCoachingState({
      status: 'setup',
      duration: 0,
      isListening: false,
      isSpeaking: false,
      cameraEnabled: true,
      micEnabled: true,
    });
    const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || '';
    console.log('🔄 START NEW SESSION - setting petParentName to:', `"${userName}"`);
    setSessionSetup({
      petName: pets.length > 0 ? pets[0].name : '',
      petBreed: pets.length > 0 ? pets[0].breed || '' : '',
      petParentName: userName,
      userConcern: '',
      selectedTopic: '',
    });
    setCurrentMessage('');
    setRating(0);
    setSessionSummary(null);
  };

  // Paywall handling functions
  const handlePaywallSuccess = () => {
    setShowPaywall(false);
  };

  const handlePaywallClose = () => {
    setShowPaywall(false);
  };

  const handleRestorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      
      // Sync subscription status with database
      await fixSubscriptionStatus();
      
      if (Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  };

  // Render premium upgrade prompt
  const renderPremiumPrompt = () => (
    <ScrollView 
      style={styles.setupContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContentContainer}
    >
      <View style={styles.premiumPrompt}>
        <View style={styles.premiumIcon}>
          <Crown size={40} color="#ff9d00" />
        </View>
        <Text style={styles.premiumTitle}>Premium Feature</Text>
        <Text style={styles.premiumDescription}>
          AI Coaching with Luna is a premium feature. Upgrade to unlock personalized live coaching sessions for you and your pet!
        </Text>
        
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => setShowPaywall(true)}
        >
          <Crown size={20} color={Colors.white} />
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.upgradeButton, { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#ff9d00' }]}
          onPress={handleRestorePurchases}
        >
          <Text style={[styles.upgradeButtonText, { color: '#ff9d00' }]}>Restore Purchases</Text>
        </TouchableOpacity>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🎥</Text>
            <Text style={styles.featureText}>Live video coaching with Luna</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🧠</Text>
            <Text style={styles.featureText}>AI-powered behavior training</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>🩺</Text>
            <Text style={styles.featureText}>Professional health guidance</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>📊</Text>
            <Text style={styles.featureText}>Personalized coaching sessions</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>⚡</Text>
            <Text style={styles.featureText}>Real-time feedback & tips</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderSetupScreen = () => (
    <ScrollView 
      style={styles.setupContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContentContainer}
    >
      <View style={styles.headerSection}>
        <Text style={styles.sectionTitle}>Meet Luna 👩‍⚕️</Text>
        <Text style={styles.sectionSubtitle}>
          Your AI veterinarian ready to help with personalized guidance.
        </Text>
      </View>
      
      {/* Pet Information */}
      <Card variant="elevated" style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>Tell Luna About Your Dog</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Pet Parent Name</Text>
          <TextInput
            style={styles.textInput}
            value={sessionSetup.petParentName}
            onChangeText={(text) => setSessionSetup(prev => ({ ...prev, petParentName: text }))}
            placeholder="e.g., John, Sarah, Alex"
            placeholderTextColor={Colors.disabled}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Dog's Name</Text>
          <TextInput
            style={styles.textInput}
            value={sessionSetup.petName}
            onChangeText={(text) => setSessionSetup(prev => ({ ...prev, petName: text }))}
            placeholder="e.g., Max, Bella, Charlie"
            placeholderTextColor={Colors.disabled}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Breed (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={sessionSetup.petBreed}
            onChangeText={(text) => setSessionSetup(prev => ({ ...prev, petBreed: text }))}
            placeholder="e.g., Golden Retriever, Mixed"
            placeholderTextColor={Colors.disabled}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Additional Details (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={sessionSetup.userConcern}
            onChangeText={(text) => setSessionSetup(prev => ({ ...prev, userConcern: text }))}
            placeholder="Any specific details about your dog..."
            placeholderTextColor={Colors.disabled}
            multiline
            numberOfLines={2}
          />
        </View>
      </Card>
      
      {/* Topic Selection */}
      <Card variant="elevated" style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>What would you like to discuss?</Text>
        
        <View style={styles.topicsGrid}>
          {coachingTopics.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicCard,
                sessionSetup.selectedTopic === topic.id && styles.topicCardSelected
              ]}
              onPress={() => setSessionSetup(prev => ({ ...prev, selectedTopic: topic.id }))}
              activeOpacity={0.8}
            >
              <View style={styles.topicContent}>
                <Text style={styles.topicIcon}>{topic.icon}</Text>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription}>{topic.description}</Text>
                
                <View style={styles.examplesContainer}>
                  {topic.examples.slice(0, 3).map((example, index) => (
                    <Text key={index} style={styles.exampleText}>• {example}</Text>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
   
      
      <View style={styles.demoNotice}>
        <Video size={18} color={Colors.primary} />
        <Text style={styles.demoNoticeText}>
          Live video coaching with Luna
        </Text>
      </View>
      
      {/* Start Button */}
      <Button
        title="Start Live Session with Luna"
        onPress={() => {
          // Navigate to our intro screen with topic context
          const topicData = coachingTopics.find(t => t.id === sessionSetup.selectedTopic);
          router.push({
            pathname: '/coach/intro',
            params: {
              petName: sessionSetup.petName,
              petBreed: sessionSetup.petBreed,
              petParentName: sessionSetup.petParentName,
              concern: sessionSetup.userConcern || topicData?.title || 'General Consultation',
              topicId: sessionSetup.selectedTopic,
              topicContext: topicData?.systemContext || '',
            }
          });
        }}
        style={styles.startButton}
        disabled={!sessionSetup.selectedTopic || !sessionSetup.petParentName?.trim() || !hasCamera || !hasMicrophone || mediaLoading}
      />
    </ScrollView>
  );

  const renderConnecting = () => (
    <View style={styles.connectingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.connectingTitle}>Connecting to Luna...</Text>
      <Text style={styles.connectingSubtitle}>
        Preparing your live coaching session
      </Text>
      
      <View style={styles.preparationSteps}>
        <Text style={styles.stepText}>✓ Camera and microphone ready</Text>
        <Text style={styles.stepText}>✓ Connecting to Luna</Text>
        <Text style={styles.stepText}>⏳ Starting your session...</Text>
      </View>
    </View>
  );

  const renderLiveSession = () => (
    <View style={styles.liveSession}>
      {/* Session Header */}
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>Live with Luna 🐶</Text>
          <View style={styles.sessionMeta}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Clock size={16} color="#ff9d00" />
            <Text style={styles.sessionDuration}>{formatDuration(coachingState.duration)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.endButton}
          onPress={endCoachingSession}
          activeOpacity={0.8}
        >
          <PhoneOff size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Main Video Container */}
      <View style={styles.videoContainer}>
        {/* Luna Video (Main) */}
        <View style={styles.mainVideo}>
          <View style={styles.videoPlaceholder}>
            <User size={64} color="#ff9d00" />
            <Text style={styles.coachName}>Luna</Text>
            <Text style={styles.coachTitle}>Certified Dog Behavior Specialist</Text>
            
            {coachingState.isSpeaking && (
              <View style={styles.speakingIndicator}>
                <View style={styles.speakingDot} />
                <Text style={styles.speakingText}>Luna is responding...</Text>
              </View>
            )}
          </View>
          
          {/* Powered by Tavus */}
          <View style={styles.poweredBy}>
            <Text style={styles.poweredByText}>Powered by Tavus™</Text>
          </View>
        </View>

        {/* User Video (Picture-in-Picture) */}
        <View style={styles.userVideo}>
          <CameraView
            isEnabled={coachingState.cameraEnabled}
            facing="front"
            style={styles.userCameraView}
            onError={(error) => {
              console.error('Camera error:', error);
              Alert.alert('Camera Error', error);
            }}
          />
        </View>
      </View>

      {/* Chat Messages */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {sessionMessages.map((message, index) => (
          <View
            key={message.id}
            style={[
              styles.messageItem,
              message.speaker_type === 'user' ? styles.userMessage : styles.aiMessage
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <View style={styles.messageInputRow}>
          <TextInput
            style={styles.messageInput}
            value={currentMessage}
            onChangeText={setCurrentMessage}
            placeholder="Type your message to Luna..."
            placeholderTextColor={Colors.disabled}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              currentMessage.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={handleSendMessage}
            disabled={!currentMessage.trim() || coachingState.isSpeaking}
          >
            <Send size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            !coachingState.cameraEnabled && styles.controlButtonDisabled
          ]}
          onPress={handleToggleCamera}
          activeOpacity={0.8}
        >
          {coachingState.cameraEnabled ? (
            <Camera size={24} color={Colors.white} />
          ) : (
            <CameraOff size={24} color={Colors.white} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !coachingState.micEnabled && styles.controlButtonDisabled
          ]}
          onPress={handleToggleMic}
          activeOpacity={0.8}
        >
          {coachingState.micEnabled ? (
            <Mic size={24} color={Colors.white} />
          ) : (
            <MicOff size={24} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSessionSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryHeader}>
        <CheckCircle size={32} color={Colors.success} />
        <Text style={styles.summaryTitle}>Session Complete! 🎉</Text>
        <Text style={styles.summarySubtitle}>
          Great conversation with Luna about {sessionSetup.petName || 'your dog'}!
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sessionSummary && (
          <>
            {/* Session Overview */}
            <Card variant="elevated" style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Session Overview</Text>
              <View style={styles.summaryRow}>
                <Target size={16} color="#ff9d00" />
                <Text style={styles.summaryLabel}>Topic:</Text>
                <Text style={styles.summaryValue}>{sessionSummary.main_topic}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Clock size={16} color="#ff9d00" />
                <Text style={styles.summaryLabel}>Duration:</Text>
                <Text style={styles.summaryValue}>{formatDuration(coachingState.duration)}</Text>
              </View>
            </Card>

            {/* Key Points */}
            <Card variant="elevated" style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Key Points from Luna</Text>
              {sessionSummary.key_points.map((point: string, index: number) => (
                <Text key={index} style={styles.summaryListItem}>✓ {point}</Text>
              ))}
            </Card>

            {/* Recommendations */}
            <Card variant="elevated" style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Luna's Recommendations</Text>
              {sessionSummary.recommendations.map((rec: string, index: number) => (
                <Text key={index} style={styles.summaryListItem}>• {rec}</Text>
              ))}
            </Card>

            {/* Next Steps */}
            <Card variant="elevated" style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>Next Steps</Text>
              {sessionSummary.next_steps.map((step: string, index: number) => (
                <Text key={index} style={styles.summaryListItem}>• {step}</Text>
              ))}
            </Card>
          </>
        )}

        {/* Rating */}
        <Card variant="elevated" style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>How was your session with Luna?</Text>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.8}
              >
                <Star
                  size={32}
                  color={star <= rating ? Colors.warning : Colors.disabled}
                  fill={star <= rating ? Colors.warning : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.summaryActions}>
        <Button
          title="Book Another Session"
          onPress={startNewSession}
          style={styles.newSessionButton}
        />
        <Button
          title="Explore App"
          onPress={() => router.push('/(tabs)')}
          variant="outline"
          style={styles.exploreButton}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={responsiveFontSize(20)} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {coachingState.status === 'setup' ? 'AI Mentor' : 
             coachingState.status === 'connecting' ? 'Connecting...' :
             coachingState.status === 'completed' ? 'Session Summary' : 'Live with Luna'}
          </Text>
          
          {coachingState.status === 'setup' && (subscriptionLoading || isSubscribed) && (
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push('/coach/history')}
            >
              <History size={responsiveFontSize(20)} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* Loading state while checking subscription */}
          {coachingState.status === 'setup' && subscriptionLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Checking subscription status...</Text>
            </View>
          )}
          
          {/* Premium prompt for non-subscribers */}
          {coachingState.status === 'setup' && !subscriptionLoading && !isSubscribed && renderPremiumPrompt()}
          
          {/* Setup screen for subscribers */}
          {coachingState.status === 'setup' && !subscriptionLoading && isSubscribed && renderSetupScreen()}
          
          {/* Other states */}
          {coachingState.status === 'connecting' && renderConnecting()}
          {coachingState.status === 'live' && renderLiveSession()}
          {coachingState.status === 'completed' && renderSessionSummary()}
        </View>
      </View>

      {/* Premium Paywall Modal */}
      {showPaywall && (
        <RevenueCatPaywall
          visible={showPaywall}
          onDismiss={handlePaywallClose}
          onPurchaseCompleted={(customerInfo) => {
            console.log('Purchase completed:', customerInfo);
            handlePaywallSuccess();
          }}
          requiredEntitlementIdentifier="premium"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveWidth(6),
    paddingTop: responsiveHeight(8),
    paddingBottom: responsiveHeight(2.5),
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: responsiveWidth(6),
    width: responsiveWidth(10),
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
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
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
    paddingHorizontal: responsiveWidth(15),
  },
  historyButton: {
    position: 'absolute',
    right: responsiveWidth(6),
    width: responsiveWidth(10),
    height: responsiveWidth(10),
    borderRadius: responsiveWidth(5),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: responsiveWidth(6),
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(10),
  },
  loadingText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginTop: responsiveHeight(2),
    textAlign: 'center',
  },
  
  // Setup Screen Styles
  setupContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: responsiveHeight(4),
  },
  headerSection: {
    marginBottom: responsiveHeight(3.5),
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: responsiveFontSize(22),
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: responsiveHeight(0.8),
  },
  sectionSubtitle: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
    paddingHorizontal: responsiveWidth(8),
  },
  setupCard: {
    marginBottom: responsiveHeight(2),
  },
  setupCardTitle: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: responsiveHeight(1.5),
  },
  inputContainer: {
    marginBottom: responsiveHeight(1.5),
  },
  inputLabel: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.body.semiBold,
    color: Colors.text,
    marginBottom: responsiveHeight(0.8),
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: responsiveWidth(3),
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1.2),
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  textArea: {
    minHeight: responsiveHeight(8),
    textAlignVertical: 'top',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    gap: responsiveWidth(3),
    paddingHorizontal: 0,
  },
  topicCard: {
    width: '100%',
    backgroundColor: '#fff4bb',
    borderRadius: responsiveWidth(5),
    padding: 0,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e6d69a',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    minHeight: responsiveHeight(18),
    overflow: 'hidden',
    marginBottom: responsiveHeight(1.5),
  },
  topicCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondary,
    transform: [{ scale: 1.03 }],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  topicContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: responsiveWidth(4),
  },
  topicIcon: {
    fontSize: responsiveFontSize(28),
    marginBottom: responsiveHeight(0.8),
  },
  topicTitle: {
    fontSize: responsiveFontSize(13),
    fontFamily: Fonts.body.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: responsiveHeight(0.4),
  },
  topicDescription: {
    fontSize: responsiveFontSize(10),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: responsiveHeight(0.8),
    opacity: 0.8,
  },
  examplesContainer: {
    alignItems: 'center',
    width: '100%',
  },
  exampleText: {
    fontSize: responsiveFontSize(9),
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    marginBottom: responsiveHeight(0.2),
    textAlign: 'center',
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1.5),
    borderRadius: responsiveWidth(3),
    marginBottom: responsiveHeight(2),
  },
  permissionText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.primary,
    marginLeft: responsiveWidth(2),
  },
  permissionWarning: {
    backgroundColor: Colors.warning + '20',
    borderColor: Colors.warning,
    borderWidth: 1,
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1.5),
    borderRadius: responsiveWidth(3),
    marginBottom: responsiveHeight(2),
  },
  permissionWarningText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.semiBold,
    color: Colors.warning,
    marginBottom: responsiveHeight(1),
  },
  permissionDetail: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.body.regular,
    color: Colors.warning,
    marginBottom: responsiveHeight(0.25),
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1.5),
    borderRadius: responsiveWidth(3),
    marginBottom: responsiveHeight(3),
  },
  demoNoticeText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.primary,
    marginLeft: responsiveWidth(2),
    textAlign: 'center',
    flex: 1,
  },
  startButton: {
    marginTop: responsiveHeight(1),
  },

  // Connecting Styles
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveWidth(10),
  },
  connectingTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginTop: responsiveHeight(3),
    marginBottom: responsiveHeight(1),
    textAlign: 'center',
  },
  connectingSubtitle: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    marginBottom: responsiveHeight(5),
    paddingHorizontal: responsiveWidth(5),
  },
  preparationSteps: {
    alignItems: 'flex-start',
  },
  stepText: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: responsiveHeight(1.5),
  },

  // Live Session Styles
  liveSession: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsiveHeight(2),
    paddingHorizontal: responsiveWidth(2),
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: responsiveHeight(0.5),
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveWidth(3),
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveHeight(0.5),
    borderRadius: responsiveWidth(3),
  },
  liveDot: {
    width: responsiveWidth(1.5),
    height: responsiveWidth(1.5),
    borderRadius: responsiveWidth(0.75),
    backgroundColor: Colors.white,
    marginRight: responsiveWidth(1),
  },
  liveText: {
    fontSize: responsiveFontSize(10),
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  sessionDuration: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.primary,
  },
  endButton: {
    width: responsiveWidth(12),
    height: responsiveWidth(12),
    borderRadius: responsiveWidth(6),
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Video Styles
  videoContainer: {
    height: responsiveHeight(25),
    backgroundColor: '#1a1a1a',
    borderRadius: responsiveWidth(5),
    overflow: 'hidden',
    marginBottom: responsiveHeight(2),
    position: 'relative',
  },
  mainVideo: {
    flex: 1,
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
  },
  coachName: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.heading.bold,
    color: Colors.white,
    marginTop: responsiveHeight(2),
  },
  coachTitle: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.8,
    marginTop: responsiveHeight(0.5),
    textAlign: 'center',
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(0.75),
    borderRadius: responsiveWidth(5),
    marginTop: responsiveHeight(2),
  },
  speakingDot: {
    width: responsiveWidth(2),
    height: responsiveWidth(2),
    borderRadius: responsiveWidth(1),
    backgroundColor: Colors.white,
    marginRight: responsiveWidth(1.5),
  },
  speakingText: {
    fontSize: responsiveFontSize(12),
    fontFamily: Fonts.body.medium,
    color: Colors.white,
  },
  poweredBy: {
    position: 'absolute',
    bottom: responsiveHeight(1),
    right: responsiveWidth(2),
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveHeight(0.5),
    borderRadius: responsiveWidth(2),
  },
  poweredByText: {
    fontSize: responsiveFontSize(10),
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.8,
  },
  userVideo: {
    position: 'absolute',
    bottom: responsiveHeight(1.5),
    left: responsiveWidth(3),
    width: responsiveWidth(20),
    height: responsiveHeight(8),
    borderRadius: responsiveWidth(2),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  userCameraView: {
    flex: 1,
  },

  // Messages Styles
  messagesContainer: {
    flex: 1,
    maxHeight: responsiveHeight(25),
    marginBottom: responsiveHeight(2),
    paddingHorizontal: responsiveWidth(2),
  },
  messageItem: {
    marginBottom: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(3),
    paddingVertical: responsiveHeight(1),
    borderRadius: responsiveWidth(3),
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
  },

  // Message Input Styles
  messageInputContainer: {
    marginBottom: responsiveHeight(2),
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: responsiveWidth(5),
    paddingHorizontal: responsiveWidth(4),
    paddingVertical: responsiveHeight(1),
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageInput: {
    flex: 1,
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    maxHeight: responsiveHeight(10),
    paddingVertical: responsiveHeight(1),
  },
  sendButton: {
    width: responsiveWidth(9),
    height: responsiveWidth(9),
    borderRadius: responsiveWidth(4.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: responsiveWidth(2),
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.disabled,
    opacity: 0.6,
  },

  // Controls Styles
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: responsiveWidth(5),
    paddingVertical: responsiveHeight(2),
  },
  controlButton: {
    width: responsiveWidth(14),
    height: responsiveWidth(14),
    borderRadius: responsiveWidth(7),
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonDisabled: {
    backgroundColor: Colors.disabled,
  },

  // Summary Styles
  summaryContainer: {
    flex: 1,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: responsiveHeight(3),
  },
  summaryTitle: {
    fontSize: responsiveFontSize(24),
    fontFamily: Fonts.heading.bold,
    color: Colors.text,
    marginTop: responsiveHeight(1),
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    marginTop: responsiveHeight(0.5),
    paddingHorizontal: responsiveWidth(5),
  },
  summaryCard: {
    marginBottom: responsiveHeight(2),
  },
  summaryCardTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: Fonts.heading.semiBold,
    color: Colors.text,
    marginBottom: responsiveHeight(1.5),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveHeight(1),
  },
  summaryLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginLeft: responsiveWidth(2),
    marginRight: responsiveWidth(2),
  },
  summaryValue: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    flex: 1,
  },
  summaryListItem: {
    fontSize: responsiveFontSize(14),
    fontFamily: Fonts.body.regular,
    color: Colors.text,
    lineHeight: responsiveFontSize(20),
    marginBottom: responsiveHeight(0.75),
  },
  
  // Rating Styles
  ratingCard: {
    alignItems: 'center',
    marginBottom: responsiveHeight(3),
  },
  ratingTitle: {
    fontSize: responsiveFontSize(16),
    fontFamily: Fonts.body.medium,
    color: Colors.text,
    marginBottom: responsiveHeight(1.5),
    textAlign: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: responsiveWidth(2),
  },
  
  // Action Buttons
  summaryActions: {
    flexDirection: 'row',
    gap: responsiveWidth(3),
    paddingTop: responsiveHeight(2),
  },
  newSessionButton: {
    flex: 1,
  },
  exploreButton: {
    flex: 1,
  },

  // Premium prompt styles
  premiumPrompt: {
    margin: 16,
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff8e3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumDescription: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: Fonts.body.semiBold,
    color: Colors.white,
  },
  featureList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },
  premiumContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: responsiveWidth(6),
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    margin: responsiveWidth(4),
  },
});
