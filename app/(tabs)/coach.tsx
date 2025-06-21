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
import { usePets } from '@/hooks/useDatabase';
import { Video, Mic, MicOff, Phone, PhoneOff, Star, Clock, CircleCheck as CheckCircle, ArrowLeft, Target, User, Play, Camera, CameraOff, Crown, Send } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface CoachingState {
  status: 'setup' | 'connecting' | 'live' | 'completed';
  duration: number;
  isListening: boolean;
  isSpeaking: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
}

export default function CoachScreen() {
  const { user } = useAuth();
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
  
  const { isSubscribed, loading: subscriptionLoading, presentPaywall } = useRevenueCat();
  
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
    userConcern: '',
    selectedConcern: '',
  });
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  
  const sessionTimer = useRef<NodeJS.Timeout | null>(null);

  // Common pet concerns for James coaching
  const concerns = [
    { id: 'leash-training', title: 'Leash Training', icon: '🚶‍♂️', description: 'Stop pulling and walk nicely' },
    { id: 'basic-commands', title: 'Basic Commands', icon: '🎯', description: 'Sit, stay, come, down' },
    { id: 'barking', title: 'Barking Issues', icon: '🔊', description: 'Reduce excessive barking' },
    { id: 'house-training', title: 'House Training', icon: '🏠', description: 'Potty training and accidents' },
    { id: 'anxiety', title: 'Anxiety & Stress', icon: '💙', description: 'Calm nervous behaviors' },
    { id: 'socialization', title: 'Socialization', icon: '🐕', description: 'Meeting people and dogs' },
    { id: 'jumping', title: 'Jumping on People', icon: '⬆️', description: 'Stop jumping behavior' },
    { id: 'general', title: 'General Questions', icon: '💬', description: 'Any training questions' },
  ];

  // Auto-populate pet info if available
  useEffect(() => {
    if (pets.length > 0 && !sessionSetup.petName) {
      const primaryPet = pets[0];
      setSessionSetup(prev => ({
        ...prev,
        petName: primaryPet.name,
        petBreed: primaryPet.breed || '',
      }));
    }
  }, [pets]);

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

  const startCoachingSession = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to start a coaching session.');
      return;
    }

    // Check if user is subscribed
    if (!isSubscribed) {
      const { success } = await presentPaywall();
      if (!success) return;
    }

    // Validate setup
    if (!sessionSetup.selectedConcern) {
      Alert.alert('Setup Required', 'Please select what you\'d like to work on with James.');
      return;
    }

    // Check permissions
    if (!hasCamera || !hasMicrophone) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone access are required for live coaching sessions with James. Please enable them and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setCoachingState(prev => ({ ...prev, status: 'connecting' }));
    
    try {
      console.log('🎬 Starting coaching session with James...');
      
      // Start media stream
      const streamStarted = await startStream({
        video: coachingState.cameraEnabled,
        audio: coachingState.micEnabled
      });

      if (!streamStarted) {
        throw new Error('Failed to start camera and microphone');
      }

      // Create coaching session
      const selectedConcernData = concerns.find(c => c.id === sessionSetup.selectedConcern);
      const sessionData = {
        pet_name: sessionSetup.petName,
        pet_breed: sessionSetup.petBreed,
        user_concern: sessionSetup.userConcern || selectedConcernData?.title,
      };

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
      
      console.log('✅ Live coaching session with James started');
    } catch (error) {
      console.error('Failed to start session:', error);
      Alert.alert(
        'Session Start Failed',
        'Unable to start the coaching session with James. Please check your camera and microphone permissions.',
        [{ text: 'OK' }]
      );
      setCoachingState(prev => ({ ...prev, status: 'setup' }));
    }
  };

  const endCoachingSession = async () => {
    if (!currentSession) return;

    try {
      console.log('🏁 Ending coaching session with James...');
      
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
      
      console.log('✅ Coaching session with James ended successfully');
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
        Alert.alert('Message Error', 'Failed to send message to James. Please try again.');
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
    stopStream();
    setCoachingState({
      status: 'setup',
      duration: 0,
      isListening: false,
      isSpeaking: false,
      cameraEnabled: true,
      micEnabled: true,
    });
    setSessionSetup({
      petName: pets.length > 0 ? pets[0].name : '',
      petBreed: pets.length > 0 ? pets[0].breed || '' : '',
      userConcern: '',
      selectedConcern: '',
    });
    setCurrentMessage('');
    setRating(0);
    setSessionSummary(null);
  };

  const renderSetupScreen = () => (
    <ScrollView 
      style={styles.setupContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContentContainer}
    >
      <Text style={styles.sectionTitle}>Meet James, Your AI Dog Coach! 🐶</Text>
      <Text style={styles.sectionSubtitle}>
        James is a certified canine behavior specialist ready to help you and your furry friend with personalized training sessions.
      </Text>
      
      {/* Subscription Status - Temporarily disabled */}
      {/* {!subscriptionLoading && !isSubscribed && (
        <Card variant="elevated" style={styles.premiumCard}>
          <View style={styles.premiumCardContent}>
            <Crown size={24} color="#ff9d00" />
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Premium Feature</Text>
              <Text style={styles.premiumDescription}>
                Live coaching sessions with James are available with Premium subscription
              </Text>
            </View>
          </View>
          <PaywallButton 
            title="Upgrade to Premium"
            style={styles.premiumButton}
            onSuccess={() => {
              // After successful purchase, we can continue
            }}
          />
        </Card>
      )} */}
      
      {/* Pet Information */}
      <Card variant="elevated" style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>Tell James About Your Dog</Text>
        
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
            placeholder="Any specific details about your dog's behavior..."
            placeholderTextColor={Colors.disabled}
            multiline
            numberOfLines={3}
          />
        </View>
      </Card>
      
      {/* Concern Selection */}
      <Card variant="elevated" style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>What would you like to work on?</Text>
        
        <View style={styles.concernsGrid}>
          {concerns.map((concern) => (
            <TouchableOpacity
              key={concern.id}
              style={[
                styles.concernCard,
                sessionSetup.selectedConcern === concern.id && styles.concernCardSelected
              ]}
              onPress={() => setSessionSetup(prev => ({ ...prev, selectedConcern: concern.id }))}
              activeOpacity={0.8}
            >
              <Text style={styles.concernIcon}>{concern.icon}</Text>
              <Text style={styles.concernTitle}>{concern.title}</Text>
              <Text style={styles.concernDescription}>{concern.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
      
      {/* Permission Status */}
      {mediaLoading && (
        <View style={styles.permissionStatus}>
          <ActivityIndicator size="small" color="#ff9d00" />
          <Text style={styles.permissionText}>Checking camera and microphone...</Text>
        </View>
      )}
      
      {!mediaLoading && (!hasCamera || !hasMicrophone) && (
        <View style={styles.permissionWarning}>
          <Text style={styles.permissionWarningText}>
            ⚠️ Camera and microphone access required for live coaching with James
          </Text>
          {!hasCamera && <Text style={styles.permissionDetail}>• Camera access needed</Text>}
          {!hasMicrophone && <Text style={styles.permissionDetail}>• Microphone access needed</Text>}
        </View>
      )}
      
      <View style={styles.demoNotice}>
        <Video size={20} color="#ff9d00" />
        <Text style={styles.demoNoticeText}>
          Experience live video coaching with James, your AI dog behavior specialist
        </Text>
      </View>
      
       {/* Start Button - Subscription temporarily disabled */}
       <Button
        title="Start Live Session with James"
        onPress={() => {
          // Navigate to our intro screen
          const concernData = concerns.find(c => c.id === sessionSetup.selectedConcern);
          router.push({
            pathname: '/coach/intro',
            params: {
              petName: sessionSetup.petName,
              petBreed: sessionSetup.petBreed,
              concern: sessionSetup.userConcern || concernData?.title || 'General Training',
              concernId: sessionSetup.selectedConcern,
            }
          });
        }}
        style={styles.startButton}
        disabled={!sessionSetup.selectedConcern || !hasCamera || !hasMicrophone || mediaLoading}
      />

      {/* View History Button */}
      <TouchableOpacity 
        style={styles.historyButton}
        onPress={() => router.push('/coach/history')}
      >
        <Text style={styles.historyButtonText}>View Previous Sessions</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderConnecting = () => (
    <View style={styles.connectingContainer}>
      <ActivityIndicator size="large" color="#ff9d00" />
      <Text style={styles.connectingTitle}>Connecting to James...</Text>
      <Text style={styles.connectingSubtitle}>
        Preparing your live coaching session
      </Text>
      
      <View style={styles.preparationSteps}>
        <Text style={styles.stepText}>✓ Camera and microphone ready</Text>
        <Text style={styles.stepText}>✓ Connecting to James</Text>
        <Text style={styles.stepText}>⏳ Starting your session...</Text>
      </View>
    </View>
  );

  const renderLiveSession = () => (
    <View style={styles.liveSession}>
      {/* Session Header */}
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>Live with James 🐶</Text>
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
        {/* James Video (Main) */}
        <View style={styles.mainVideo}>
          <View style={styles.videoPlaceholder}>
            <User size={64} color="#ff9d00" />
            <Text style={styles.coachName}>James</Text>
            <Text style={styles.coachTitle}>Certified Dog Behavior Specialist</Text>
            
            {coachingState.isSpeaking && (
              <View style={styles.speakingIndicator}>
                <View style={styles.speakingDot} />
                <Text style={styles.speakingText}>James is responding...</Text>
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
            placeholder="Type your message to James..."
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
          Great conversation with James about {sessionSetup.petName || 'your dog'}!
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
              <Text style={styles.summaryCardTitle}>Key Points from James</Text>
              {sessionSummary.key_points.map((point: string, index: number) => (
                <Text key={index} style={styles.summaryListItem}>✓ {point}</Text>
              ))}
            </Card>

            {/* Recommendations */}
            <Card variant="elevated" style={styles.summaryCard}>
              <Text style={styles.summaryCardTitle}>James's Recommendations</Text>
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
          <Text style={styles.ratingTitle}>How was your session with James?</Text>
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
          onPress={() => router.push('/(tabs)/')}
          variant="outline"
          style={styles.exploreButton}
        />
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={Colors.backgroundGradient}
      style={styles.container}
    >
      <View style={styles.header}>
        {coachingState.status !== 'setup' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (coachingState.status === 'live') {
                Alert.alert(
                  'End Session?',
                  'Are you sure you want to end your live session with James?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'End Session', onPress: endCoachingSession, style: 'destructive' },
                  ]
                );
              } else {
                startNewSession();
              }
            }}
          >
            <ArrowLeft size={24} color="#544c3a" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {coachingState.status === 'setup' ? 'Live AI Coaching with James' : 
           coachingState.status === 'connecting' ? 'Connecting to James...' :
           coachingState.status === 'completed' ? 'Session Summary' : 'Live with James'}
        </Text>
        
        {/* Premium Badge - Temporarily disabled */}
        {/* {isSubscribed && (
          <View style={styles.premiumBadge}>
            <Crown size={16} color={Colors.white} />
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        )} */}
      </View>

      <View style={styles.content}>
        {coachingState.status === 'setup' && renderSetupScreen()}
        {coachingState.status === 'connecting' && renderConnecting()}
        {coachingState.status === 'live' && renderLiveSession()}
        {coachingState.status === 'completed' && renderSessionSummary()}
      </View>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 24,
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
    color: '#544c3a',
    textAlign: 'center',
    flex: 1,
  },
  premiumBadge: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  
  // Setup Screen Styles
  setupContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  premiumCard: {
    marginBottom: 24,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: '#ff9d00',
  },
  premiumCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  premiumTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: '#ff9d00',
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 18,
  },
  premiumButton: {
    backgroundColor: '#ff9d00',
  },
  setupCard: {
    marginBottom: 20,
  },
  setupCardTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#544c3a',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    backgroundColor: Colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  concernsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  concernCard: {
    width: (width - 72) / 2,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  concernCardSelected: {
    borderColor: '#ff9d00',
    backgroundColor: Colors.secondary,
  },
  concernIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  concernTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.bold,
    color: '#544c3a',
    textAlign: 'center',
    marginBottom: 4,
  },
  concernDescription: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    lineHeight: 16,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#ff9d00',
    marginLeft: 8,
  },
  permissionWarning: {
    backgroundColor: Colors.warning + '20',
    borderColor: Colors.warning,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionWarningText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: Colors.warning,
    marginBottom: 8,
  },
  permissionDetail: {
    fontSize: 12,
    fontFamily: Fonts.body.regular,
    color: Colors.warning,
    marginBottom: 2,
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  demoNoticeText: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#ff9d00',
    marginLeft: 8,
    textAlign: 'center',
    flex: 1,
  },
  startButton: {
    marginTop: 8,
  },

  // Connecting Styles
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  connectingTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginTop: 24,
    marginBottom: 8,
  },
  connectingSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    marginBottom: 40,
  },
  preparationSteps: {
    alignItems: 'flex-start',
  },
  stepText: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginBottom: 12,
  },

  // Live Session Styles
  liveSession: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontFamily: Fonts.body.bold,
    color: Colors.white,
  },
  sessionDuration: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#ff9d00',
  },
  endButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
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
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: Colors.white,
    marginTop: 16,
  },
  coachTitle: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9d00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  speakingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    marginRight: 6,
  },
  speakingText: {
    fontSize: 12,
    fontFamily: Fonts.body.medium,
    color: Colors.white,
  },
  poweredBy: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  poweredByText: {
    fontSize: 10,
    fontFamily: Fonts.body.regular,
    color: Colors.white,
    opacity: 0.8,
  },
  userVideo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  userCameraView: {
    flex: 1,
  },

  // Messages Styles
  messagesContainer: {
    flex: 1,
    maxHeight: 200,
    marginBottom: 16,
  },
  messageItem: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#ff9d00',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
  },

  // Message Input Styles
  messageInputContainer: {
    marginBottom: 16,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#ff9d00',
  },
  sendButtonInactive: {
    backgroundColor: Colors.disabled,
  },

  // Controls Styles
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading.bold,
    color: '#544c3a',
    marginTop: 8,
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 16,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    textAlign: 'center',
    marginTop: 4,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontFamily: Fonts.heading.semiBold,
    color: '#544c3a',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginLeft: 8,
    marginRight: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: Colors.disabled,
    flex: 1,
  },
  summaryListItem: {
    fontSize: 14,
    fontFamily: Fonts.body.regular,
    color: '#544c3a',
    lineHeight: 20,
    marginBottom: 6,
  },
  
  // Rating Styles
  ratingCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingTitle: {
    fontSize: 16,
    fontFamily: Fonts.body.medium,
    color: '#544c3a',
    marginBottom: 12,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
  },
  
  // Action Buttons
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  newSessionButton: {
    flex: 1,
  },
  exploreButton: {
    flex: 1,
  },
  historyButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff9d00',
    borderRadius: 8,
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 14,
    fontFamily: Fonts.body.semiBold,
    color: '#ff9d00',
  },
});